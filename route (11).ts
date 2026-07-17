import { apiFailure, apiSuccess } from '@/lib/http';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('lead_dashboard_kpis').select('*').single();
    if (error) throw new Error('تعذر تحميل مؤشرات الأداء.');
    return apiSuccess({
      potential_customers: Number(data.potential_customers || 0),
      websites_ready: Number(data.previews_ready || 0),
      contacted: Number(data.contacted || 0),
      positive_replies: Number(data.positive_replies || 0),
    });
  } catch (error) {
    return apiFailure(error);
  }
}
