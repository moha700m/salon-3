import type { NextRequest } from 'next/server';
import { apiFailure, apiSuccess } from '@/lib/http';
import { searchGooglePlaces } from '@/lib/google-places';
import { upsertLeadFromPlace } from '@/lib/leads-service';
import { requestFingerprint } from '@/lib/request';
import { enforceRateLimit } from '@/lib/rate-limit';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { searchLeadsSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const fingerprint = requestFingerprint(request);
  const supabase = getSupabaseAdmin();
  let jobId: string | null = null;

  try {
    await enforceRateLimit({ action: 'lead_search', fingerprint, maxRequests: 8, windowMinutes: 15 });
    const input = searchLeadsSchema.parse(await request.json());
    const query = [input.activityTypes.join(' / '), input.district, input.city, input.country].filter(Boolean).join(' - ');

    const { data: job, error: jobError } = await supabase.from('search_jobs').insert({
      query,
      country: input.country,
      city: input.city,
      district: input.district || null,
      activity_types: input.activityTypes,
      requested_limit: input.limit,
      status: 'RUNNING',
      request_fingerprint: fingerprint,
    }).select('id').single();
    if (jobError) throw new Error('تعذر بدء سجل البحث.');
    jobId = job.id;

    const profiles = await searchGooglePlaces(input);
    const saved = [];
    let createdCount = 0;
    let phoneDuplicates = 0;

    for (const profile of profiles) {
      const result = await upsertLeadFromPlace(profile);
      saved.push(result.lead);
      if (result.created) createdCount += 1;
      if (result.duplicateBy === 'phone') phoneDuplicates += 1;
    }

    await supabase.from('search_jobs').update({
      status: 'COMPLETED',
      results_count: saved.length,
      new_results_count: createdCount,
      completed_at: new Date().toISOString(),
    }).eq('id', jobId);

    return apiSuccess({
      jobId,
      results: saved,
      resultsCount: saved.length,
      newResultsCount: createdCount,
      phoneDuplicates,
      noWebsiteCount: saved.filter(item => item.website_status === 'NO_WEBSITE').length,
      missingPhoneCount: saved.filter(item => !item.phone_international).length,
    });
  } catch (error) {
    if (jobId) {
      await supabase.from('search_jobs').update({
        status: error instanceof Error && error.message.includes('حد الاستخدام') ? 'RATE_LIMITED' : 'FAILED',
        error_message: error instanceof Error ? error.message.slice(0, 500) : 'Unknown error',
        completed_at: new Date().toISOString(),
      }).eq('id', jobId);
    }
    return apiFailure(error);
  }
}
