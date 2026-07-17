import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { searchGooglePlaces } from '@/lib/google-places';
import { upsertLeadFromPlace } from '@/lib/leads-service';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const maxDuration = 60;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const started = new Date().toISOString();
  const { data: run } = await supabase.from('workflow_runs').insert({
    status: 'running',
    triggered_by: 'cron',
    started_at: started,
    messages_sent: 0,
  }).select('id').single();

  try {
    const { data: settings } = await supabase.from('workflow_settings').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle();
    if (settings && settings.cron_enabled === false) {
      if (run) await supabase.from('workflow_runs').update({ status: 'skipped', completed_at: new Date().toISOString() }).eq('id', run.id);
      return NextResponse.json({ success: true, skipped: true, reason: 'Cron disabled' });
    }

    const cities: string[] = settings?.target_cities || ['الدمام', 'الخبر'];
    const dailyLimit = Math.min(Number(settings?.daily_limit || 10), 30);
    let discovered = 0;
    let created = 0;

    for (const city of cities) {
      const places = await searchGooglePlaces({
        country: 'السعودية',
        city,
        activityTypes: ['حلاق', 'صالون حلاقة رجالي'],
        limit: Math.max(1, Math.ceil(dailyLimit / cities.length)),
      });
      for (const place of places) {
        const saved = await upsertLeadFromPlace(place);
        discovered += 1;
        if (saved.created) created += 1;
      }
    }

    if (run) await supabase.from('workflow_runs').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      discovered_count: discovered,
      new_barbers_count: created,
      websites_generated: 0,
      messages_sent: 0,
    }).eq('id', run.id);

    return NextResponse.json({ success: true, discovered, created, messagesSent: 0, manualWhatsAppOnly: true });
  } catch (error) {
    if (run) await supabase.from('workflow_runs').update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      errors: [{ message: error instanceof Error ? error.message : 'Unknown error' }],
    }).eq('id', run.id);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Cron failed' }, { status: 500 });
  }
}
