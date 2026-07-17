import { ApiError } from '@/lib/api-errors';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import type { GooglePlaceProfile } from '@/lib/google-places';
import { ensurePreviewAccess } from '@/lib/preview-access-service';
import type { ContactStatus, LeadRecord, OutreachMessageRecord, PreviewRecord, SalonCampaignRecord } from '@/types/domain';

function profileRow(profile: GooglePlaceProfile) {
  const defaultStatus: ContactStatus = profile.phoneInternational
    ? (profile.websiteStatus === 'NO_WEBSITE' ? 'NO_WEBSITE' : 'NEW')
    : 'PHONE_MISSING';

  return {
    google_place_id: profile.googlePlaceId,
    name: profile.name,
    phone_local: profile.phoneLocal,
    phone_international: profile.phoneInternational,
    address: profile.address,
    city: profile.city,
    district: profile.district,
    latitude: profile.latitude,
    longitude: profile.longitude,
    rating: profile.rating,
    reviews_count: profile.reviewsCount,
    business_status: profile.businessStatus,
    maps_url: profile.mapsUrl,
    website_url: profile.websiteUrl,
    website_status: profile.websiteStatus,
    opening_hours_json: profile.openingHours,
    photos_json: profile.photos,
    place_data_json: profile.raw,
    primary_type: profile.primaryType,
    types_json: profile.types,
    contact_status: defaultStatus,
    last_google_fetch_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function upsertLeadFromPlace(profile: GooglePlaceProfile): Promise<{ lead: LeadRecord; created: boolean; duplicateBy?: 'phone' }> {
  const supabase = getSupabaseAdmin();
  const row = profileRow(profile);

  const { data: existingPlace, error: placeError } = await supabase
    .from('leads')
    .select('*')
    .eq('google_place_id', profile.googlePlaceId)
    .maybeSingle();
  if (placeError) throw new ApiError('تعذر التحقق من تكرار Google Place ID.', 500);

  if (existingPlace) {
    const preservedStatus = ['CONTACTED','REPLIED','INTERESTED','NOT_INTERESTED','DO_NOT_CONTACT'].includes(existingPlace.contact_status)
      ? existingPlace.contact_status
      : row.contact_status;
    const { data, error } = await supabase.from('leads').update({ ...row, contact_status: preservedStatus }).eq('id', existingPlace.id).select('*').single();
    if (error) throw new ApiError('تعذر تحديث بيانات العميل.', 500);
    return { lead: data as LeadRecord, created: false };
  }

  if (profile.phoneInternational) {
    const { data: existingPhone, error: phoneError } = await supabase
      .from('leads')
      .select('*')
      .eq('phone_international', profile.phoneInternational)
      .maybeSingle();
    if (phoneError) throw new ApiError('تعذر التحقق من تكرار رقم الهاتف.', 500);
    if (existingPhone) {
      await supabase.from('leads').update({
        updated_at: new Date().toISOString(),
        contact_status: existingPhone.contact_status === 'NEW' ? 'NEEDS_REVIEW' : existingPhone.contact_status,
        contact_block_reason: existingPhone.contact_block_reason || `ظهر رقم الهاتف نفسه لنشاط آخر: ${profile.name}`,
      }).eq('id', existingPhone.id);
      return { lead: existingPhone as LeadRecord, created: false, duplicateBy: 'phone' };
    }
  }

  const { data, error } = await supabase.from('leads').insert(row).select('*').single();
  if (error) throw new ApiError('تعذر حفظ العميل المحتمل.', 500);
  return { lead: data as LeadRecord, created: true };
}

export async function getLead(id: string): Promise<LeadRecord> {
  const { data, error } = await getSupabaseAdmin().from('leads').select('*').eq('id', id).single();
  if (error || !data) throw new ApiError('العميل غير موجود.', 404, 'LEAD_NOT_FOUND');
  return data as LeadRecord;
}

export async function getLeadDetails(id: string) {
  const supabase = getSupabaseAdmin();
  const lead = await getLead(id);
  const [{ data: previews }, { data: messages }, { data: logs }, { data: campaign }] = await Promise.all([
    supabase.from('previews').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    supabase.from('outreach_messages').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    supabase.from('contact_logs').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    supabase.from('salon_campaigns').select('*').eq('lead_id', id).maybeSingle(),
  ]);
  const securedPreviews = await Promise.all(
    ((previews || []) as PreviewRecord[]).map(async preview => {
      const secured = await ensurePreviewAccess(preview);
      return { ...secured.preview, url: secured.url };
    }),
  );
  return {
    lead,
    previews: securedPreviews,
    messages: (messages || []) as OutreachMessageRecord[],
    contactLogs: logs || [],
    campaign: (campaign || null) as SalonCampaignRecord | null,
  };
}

export interface LeadListFilters {
  noWebsiteOnly?: boolean;
  hasPhone?: boolean;
  city?: string;
  minRating?: number;
  minReviews?: number;
  contactStatus?: ContactStatus;
  previewState?: 'ANY' | 'READY' | 'MISSING';
  query?: string;
  page: number;
  pageSize: number;
}

export async function listLeads(filters: LeadListFilters) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('leads')
    .select('*, previews(id,slug,is_active,expires_at,created_at)', { count: 'exact' })
    .order('updated_at', { ascending: false });

  if (filters.noWebsiteOnly) query = query.eq('website_status', 'NO_WEBSITE');
  if (filters.hasPhone) query = query.not('phone_international', 'is', null);
  if (filters.city) query = query.eq('city', filters.city);
  if (typeof filters.minRating === 'number') query = query.gte('rating', filters.minRating);
  if (typeof filters.minReviews === 'number') query = query.gte('reviews_count', filters.minReviews);
  if (filters.contactStatus) query = query.eq('contact_status', filters.contactStatus);
  if (filters.query) {
    const escaped = filters.query.replace(/[,%()]/g, '');
    query = query.or(`name.ilike.%${escaped}%,phone_local.ilike.%${escaped}%,phone_international.ilike.%${escaped}%`);
  }

  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;
  const { data, count, error } = await query.range(from, to);
  if (error) throw new ApiError('تعذر تحميل قائمة العملاء.', 500);

  let rows = data || [];
  if (filters.previewState === 'READY') rows = rows.filter(row => Array.isArray(row.previews) && row.previews.length > 0);
  if (filters.previewState === 'MISSING') rows = rows.filter(row => !Array.isArray(row.previews) || row.previews.length === 0);
  return { data: rows, count: count || 0, page: filters.page, pageSize: filters.pageSize };
}

export async function updateLead(id: string, values: Partial<Pick<LeadRecord, 'contact_status' | 'notes' | 'contact_block_reason'>>) {
  const { data, error } = await getSupabaseAdmin().from('leads').update({ ...values, updated_at: new Date().toISOString() }).eq('id', id).select('*').single();
  if (error) throw new ApiError('تعذر تحديث بيانات العميل.', 500);
  return data as LeadRecord;
}

export async function cityOptions(): Promise<string[]> {
  const { data } = await getSupabaseAdmin().from('leads').select('city').order('city');
  return [...new Set((data || []).map(item => item.city).filter(Boolean))];
}
