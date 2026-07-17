import { ApiError } from '@/lib/api-errors';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function enforceRateLimit(options: {
  action: string;
  fingerprint: string;
  maxRequests: number;
  windowMinutes: number;
}) {
  const supabase = getSupabaseAdmin();
  const since = new Date(Date.now() - options.windowMinutes * 60_000).toISOString();

  const { count, error } = await supabase
    .from('rate_limit_events')
    .select('id', { count: 'exact', head: true })
    .eq('action', options.action)
    .eq('fingerprint', options.fingerprint)
    .gte('created_at', since);

  if (error) throw new ApiError('تعذر التحقق من حد الاستخدام.', 500, 'RATE_LIMIT_CHECK_FAILED');
  if ((count || 0) >= options.maxRequests) {
    throw new ApiError('تم بلوغ حد الاستخدام المؤقت. حاول مرة أخرى بعد عدة دقائق.', 429, 'RATE_LIMITED');
  }

  const { error: insertError } = await supabase.from('rate_limit_events').insert({
    action: options.action,
    fingerprint: options.fingerprint,
  });
  if (insertError) throw new ApiError('تعذر تسجيل حد الاستخدام.', 500, 'RATE_LIMIT_WRITE_FAILED');
}
