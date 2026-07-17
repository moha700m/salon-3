import { apiFailure, apiSuccess } from '@/lib/http';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('leads')
      .select('id,name,city,district,rating,reviews_count,phone_local,phone_international,website_status,contact_status,updated_at,previews(id,slug,is_active,expires_at)')
      .order('updated_at', { ascending: false })
      .limit(8);
    if (error) throw new Error('تعذر تحميل أحدث العملاء.');
    return apiSuccess({ data: data || [] });
  } catch (error) {
    return apiFailure(error);
  }
}
