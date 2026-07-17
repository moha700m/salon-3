import { ApiError } from '@/lib/api-errors';
import { generateSalonCampaignContent, type SalonCampaignSource } from '@/lib/campaign-content';
import { recordContactAction } from '@/lib/contact-service';
import { getLead } from '@/lib/leads-service';
import { buildWhatsAppUrl, formatSaudiLocal, normalizeSaudiPhone } from '@/lib/phone';
import { generatePreview } from '@/lib/preview-service';
import { enforceRateLimit } from '@/lib/rate-limit';
import { renderSalonAdPng } from '@/lib/salon-ad-image';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import type {
  LeadRecord,
  OutreachMessageRecord,
  PreviewRecord,
  SalonCampaignRecord,
  SalonCampaignService,
} from '@/types/domain';


export function nextCampaignVersion(current: Pick<SalonCampaignRecord, 'version'> | null): number {
  return (current?.version || 0) + 1;
}

export function campaignImageAfterAttempt(
  current: Pick<SalonCampaignRecord, 'advertisement_image_path' | 'advertisement_image_url'> | null,
  uploaded?: { path: string; url: string } | null,
): { path: string | null; url: string | null } {
  return {
    path: uploaded?.path || current?.advertisement_image_path || null,
    url: uploaded?.url || current?.advertisement_image_url || null,
  };
}

export function campaignApprovalBlockReason(campaign: Pick<SalonCampaignRecord, 'missing_fields' | 'advertisement_image_url' | 'whatsapp_message'>): string | null {
  if (campaign.missing_fields?.length) return 'أكمل اسم الصالون ورقم الواتساب ورابط المعاينة قبل التجهيز للإرسال.';
  if (!campaign.advertisement_image_url || !campaign.whatsapp_message) return 'الصورة أو الرسالة غير جاهزة بعد.';
  return null;
}

export function campaignMarkSentBlockReason(campaign: Pick<SalonCampaignRecord, 'generation_status' | 'send_status'>): string | null {
  if (campaign.send_status === 'sent') return 'تم تسجيل إرسال هذه الحملة مسبقًا.';
  if (campaign.generation_status !== 'ready_to_send') return 'اعتمد الحملة للمراجعة قبل تسجيل الإرسال.';
  return null;
}

export interface SalonCampaignInput {
  salonName?: string;
  ownerName?: string;
  phone?: string;
  whatsapp?: string;
  city?: string;
  district?: string;
  address?: string;
  mapsUrl?: string;
  workingHours?: string;
  services?: Array<{ name: string; price?: string }>;
  instagramUrl?: string;
  tiktokUrl?: string;
  websitePreviewUrl?: string;
  messageText?: string;
}

function optional(value?: string | null): string | null {
  const normalized = value?.replace(/\s+/g, ' ').trim();
  return normalized || null;
}

function validUrl(value?: string | null): string | null {
  const normalized = optional(value);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function sanitizeServices(input?: Array<{ name: string; price?: string | null }>): SalonCampaignService[] {
  return (input || [])
    .map(service => ({
      name: service.name.replace(/\s+/g, ' ').trim(),
      price: optional(service.price),
    }))
    .filter(service => service.name.length >= 2)
    .slice(0, 20);
}

function defaultWorkingHours(lead: LeadRecord): string | null {
  if (!lead.opening_hours_json?.length) return null;
  return lead.opening_hours_json.join(' · ');
}

function sourceFrom(
  lead: LeadRecord,
  previewUrl: string,
  input: SalonCampaignInput,
  current: SalonCampaignRecord | null,
): SalonCampaignSource {
  const whatsappCandidate = input.whatsapp || current?.whatsapp || lead.phone_international || lead.phone_local || '';
  const phoneCandidate = input.phone || current?.phone || lead.phone_local || lead.phone_international || '';
  const whatsapp = normalizeSaudiPhone(whatsappCandidate);
  const phoneNormalized = normalizeSaudiPhone(phoneCandidate);

  return {
    salonName: optional(input.salonName ?? current?.salon_name) || lead.name.trim(),
    ownerName: optional(input.ownerName ?? current?.owner_name),
    phone: phoneNormalized ? formatSaudiLocal(phoneNormalized) : optional(phoneCandidate),
    whatsapp,
    city: optional(input.city ?? current?.city ?? lead.city),
    district: optional(input.district ?? current?.district ?? lead.district),
    address: optional(input.address ?? current?.address ?? lead.address),
    mapsUrl: validUrl(input.mapsUrl ?? current?.maps_url ?? lead.maps_url),
    workingHours: optional(input.workingHours ?? current?.working_hours ?? defaultWorkingHours(lead)),
    services: sanitizeServices(input.services !== undefined ? input.services : current?.services_json || []),
    instagramUrl: validUrl(input.instagramUrl ?? current?.instagram_url),
    tiktokUrl: validUrl(input.tiktokUrl ?? current?.tiktok_url),
    websitePreviewUrl: validUrl(input.websitePreviewUrl) || previewUrl,
  };
}

export function campaignMissingFields(source: SalonCampaignSource): string[] {
  const missing: string[] = [];
  if (!source.salonName) missing.push('salon_name');
  if (!source.whatsapp || !normalizeSaudiPhone(source.whatsapp)) missing.push('whatsapp');
  if (!validUrl(source.websitePreviewUrl)) missing.push('website_preview_url');
  return missing;
}

async function ensureAdsBucket() {
  const storage = getSupabaseAdmin().storage;
  const { data } = await storage.getBucket('salon-ads');
  if (data) return;
  const { error } = await storage.createBucket('salon-ads', {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/png'],
  });
  if (error && !/already exists/i.test(error.message)) {
    throw new ApiError('تعذر تجهيز مساحة حفظ الصورة.', 500, 'STORAGE_BUCKET_FAILED');
  }
}

function safeFileSlug(lead: LeadRecord): string {
  return `salon-${lead.id.replaceAll('-', '').slice(0, 16)}`;
}

async function uploadAdvertisement(lead: LeadRecord, buffer: Buffer): Promise<{ path: string; url: string }> {
  await ensureAdsBucket();
  const timestamp = Date.now();
  const filePath = `${safeFileSlug(lead)}/salon-ad-${safeFileSlug(lead)}-${timestamp}.png`;
  const bucket = getSupabaseAdmin().storage.from('salon-ads');
  const { error } = await bucket.upload(filePath, buffer, {
    contentType: 'image/png',
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw new ApiError('تعذر رفع الصورة الإعلانية.', 500, 'IMAGE_UPLOAD_FAILED');
  const { data } = bucket.getPublicUrl(filePath);
  return { path: filePath, url: data.publicUrl };
}

async function latestCampaignMessage(leadId: string): Promise<OutreachMessageRecord | null> {
  const { data } = await getSupabaseAdmin()
    .from('outreach_messages')
    .select('*')
    .eq('lead_id', leadId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as OutreachMessageRecord | null;
}

async function saveOutreachMessage(input: {
  lead: LeadRecord;
  preview: PreviewRecord;
  messageText: string;
  whatsapp: string | null;
  model?: string;
}): Promise<OutreachMessageRecord> {
  const supabase = getSupabaseAdmin();
  const current = await latestCampaignMessage(input.lead.id);
  if (current) {
    const { data, error } = await supabase.from('outreach_messages').update({
      preview_id: input.preview.id,
      message_text: input.messageText,
      message_content: input.messageText,
      recipient_phone: input.whatsapp,
      ai_model: input.model || current.ai_model,
      status: 'pending',
      updated_at: new Date().toISOString(),
    }).eq('id', current.id).select('*').single();
    if (error) throw new ApiError('تعذر حفظ رسالة واتساب.', 500, 'MESSAGE_SAVE_FAILED');
    return data as OutreachMessageRecord;
  }

  const { data, error } = await supabase.from('outreach_messages').insert({
    lead_id: input.lead.id,
    preview_id: input.preview.id,
    message_text: input.messageText,
    message_content: input.messageText,
    recipient_phone: input.whatsapp,
    channel: 'whatsapp',
    language: 'ar',
    status: 'pending',
    ai_model: input.model || 'fallback',
    version: 1,
  }).select('*').single();
  if (error) throw new ApiError('تعذر حفظ رسالة واتساب.', 500, 'MESSAGE_SAVE_FAILED');
  return data as OutreachMessageRecord;
}

async function syncPreview(input: {
  lead: LeadRecord;
  preview: PreviewRecord;
  source: SalonCampaignSource;
  content: Awaited<ReturnType<typeof generateSalonCampaignContent>>;
}): Promise<PreviewRecord> {
  const supabase = getSupabaseAdmin();
  const services = input.content.selected_services.map(service => ({
    name: service.name,
    description: service.price ? `السعر: ${service.price}` : 'الخدمة متاحة وفق تفاصيل الصالون.',
    price: service.price,
    editable: true,
  }));
  const theme = {
    ...(input.preview.theme_json || {}),
    source: 'salon-campaign',
    marketingDescription: input.content.salon_description,
    ownerName: input.source.ownerName,
    phone: input.source.phone,
    whatsapp: input.source.whatsapp,
    city: input.source.city,
    district: input.source.district,
    address: input.source.address,
    mapsUrl: input.source.mapsUrl,
    workingHours: input.source.workingHours,
    instagramUrl: input.source.instagramUrl,
    tiktokUrl: input.source.tiktokUrl,
    websitePreviewUrl: input.source.websitePreviewUrl,
  };

  const { data, error } = await supabase.from('previews').update({
    title: input.source.salonName,
    subtitle: input.content.marketing_headline,
    about_text: input.content.salon_description,
    services_json: services,
    theme_json: theme,
    updated_at: new Date().toISOString(),
  }).eq('id', input.preview.id).select('*').single();
  if (error) throw new ApiError('تعذر تخصيص موقع الصالون.', 500, 'PREVIEW_SYNC_FAILED');

  const leadUpdates: Record<string, unknown> = { name: input.source.salonName, updated_at: new Date().toISOString() };
  if (input.source.phone) {
    const normalized = normalizeSaudiPhone(input.source.phone);
    if (normalized) {
      leadUpdates.phone_international = normalized;
      leadUpdates.phone_local = formatSaudiLocal(normalized);
    }
  }
  if (input.source.city) leadUpdates.city = input.source.city;
  if (input.source.district) leadUpdates.district = input.source.district;
  if (input.source.address) leadUpdates.address = input.source.address;
  if (input.source.mapsUrl) leadUpdates.maps_url = input.source.mapsUrl;
  if (input.source.workingHours) leadUpdates.opening_hours_json = [input.source.workingHours];
  await supabase.from('leads').update(leadUpdates).eq('id', input.lead.id);

  return data as PreviewRecord;
}

export async function getSalonCampaign(leadId: string): Promise<SalonCampaignRecord | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('salon_campaigns')
    .select('*')
    .eq('lead_id', leadId)
    .maybeSingle();
  if (error) throw new ApiError('تعذر تحميل معاينة رسالة الصالون.', 500, 'CAMPAIGN_LOAD_FAILED');
  return data as SalonCampaignRecord | null;
}

async function saveGeneratingState(
  lead: LeadRecord,
  preview: PreviewRecord,
  source: SalonCampaignSource,
  current: SalonCampaignRecord | null,
  missingFields: string[],
): Promise<SalonCampaignRecord> {
  const row = {
    lead_id: lead.id,
    preview_id: preview.id,
    salon_name: source.salonName,
    owner_name: source.ownerName,
    phone: source.phone,
    whatsapp: source.whatsapp,
    city: source.city,
    district: source.district,
    address: source.address,
    maps_url: source.mapsUrl,
    working_hours: source.workingHours,
    services_json: source.services,
    instagram_url: source.instagramUrl,
    tiktok_url: source.tiktokUrl,
    website_preview_url: source.websitePreviewUrl,
    missing_fields: missingFields,
    generation_status: 'generating',
    send_status: 'not_sent',
    last_error: null,
    version: nextCampaignVersion(current),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await getSupabaseAdmin()
    .from('salon_campaigns')
    .upsert(row, { onConflict: 'lead_id' })
    .select('*')
    .single();
  if (error) throw new ApiError('تعذر بدء إنشاء حملة الصالون.', 500, 'CAMPAIGN_START_FAILED');
  return data as SalonCampaignRecord;
}

export async function generateSalonCampaign(
  leadId: string,
  input: SalonCampaignInput,
  fingerprint: string,
): Promise<SalonCampaignRecord> {
  await enforceRateLimit({ action: 'salon_campaign_generate', fingerprint, maxRequests: 5, windowMinutes: 10 });
  const lead = await getLead(leadId);
  const current = await getSalonCampaign(leadId);
  const previewResult = await generatePreview(leadId, { expiresInDays: 30, regenerate: false });
  const source = sourceFrom(lead, previewResult.url, input, current);
  const missingFields = campaignMissingFields(source);
  const campaign = await saveGeneratingState(lead, previewResult.preview, source, current, missingFields);

  try {
    const content = await generateSalonCampaignContent(lead, source);
    const preview = await syncPreview({ lead, preview: previewResult.preview, source, content });
    const messageText = optional(input.messageText) || content.whatsapp_message;
    const whatsappLink = source.whatsapp && messageText
      ? buildWhatsAppUrl(source.whatsapp, messageText)
      : null;
    await saveOutreachMessage({
      lead,
      preview,
      messageText,
      whatsapp: source.whatsapp || null,
      model: content.model,
    });

    let uploadedImage: { path: string; url: string } | null = null;
    let imageError: string | null = null;
    try {
      const image = await renderSalonAdPng({
        salonName: source.salonName,
        phone: source.phone || source.whatsapp,
        location: content.short_location,
        workingHours: content.short_working_hours,
        services: content.selected_services,
        content,
      });
      uploadedImage = await uploadAdvertisement(lead, image);
    } catch (error) {
      imageError = error instanceof Error ? error.message : 'تعذر إنشاء الصورة.';
      console.error('salon_campaign_image_failed', { leadId, error: imageError });
    }
    const preservedImage = campaignImageAfterAttempt(current, uploadedImage);

    const generationStatus = imageError ? 'partial_failure' : 'ready_for_review';
    const { data, error } = await getSupabaseAdmin().from('salon_campaigns').update({
      preview_id: preview.id,
      ai_content_json: content,
      advertisement_image_path: preservedImage.path,
      advertisement_image_url: preservedImage.url,
      whatsapp_message: messageText,
      whatsapp_link: whatsappLink,
      missing_fields: missingFields,
      generation_status: generationStatus,
      send_status: 'not_sent',
      last_error: imageError,
      generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', campaign.id).select('*').single();
    if (error) throw new ApiError('تعذر حفظ النتيجة النهائية.', 500, 'CAMPAIGN_SAVE_FAILED');
    return data as SalonCampaignRecord;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'تعذر إنشاء الحملة.';
    await getSupabaseAdmin().from('salon_campaigns').update({
      generation_status: 'failed',
      last_error: message,
      updated_at: new Date().toISOString(),
    }).eq('id', campaign.id);
    throw error;
  }
}

export async function updateSalonCampaign(
  leadId: string,
  input: SalonCampaignInput,
): Promise<SalonCampaignRecord> {
  const campaign = await getSalonCampaign(leadId);
  if (!campaign) throw new ApiError('أنشئ معاينة رسالة الصالون أولًا.', 404, 'CAMPAIGN_NOT_FOUND');
  const lead = await getLead(leadId);
  const previewUrl = validUrl(input.websitePreviewUrl) || campaign.website_preview_url || '';
  const source = sourceFrom(lead, previewUrl, input, campaign);
  const messageText = optional(input.messageText) || campaign.whatsapp_message;
  const missingFields = campaignMissingFields(source);
  const whatsappLink = source.whatsapp && messageText ? buildWhatsAppUrl(source.whatsapp, messageText) : null;

  const storedContent = campaign.ai_content_json as Record<string, unknown>;
  const contentForSave = {
    ...storedContent,
    short_location: [source.district, source.city].filter(Boolean).join(' – '),
    short_working_hours: source.workingHours || '',
    selected_services: source.services.slice(0, 5),
    whatsapp_message: messageText || '',
    image_text: {
      ...((storedContent.image_text as Record<string, unknown> | undefined) || {}),
      title: source.salonName,
      subtitle: 'للحلاقة الرجالية',
      location: [source.district, source.city].filter(Boolean).join(' – '),
      working_hours: source.workingHours || '',
      cta: 'شاهد موقعك الجديد',
    },
  };

  const { data, error } = await getSupabaseAdmin().from('salon_campaigns').update({
    salon_name: source.salonName,
    owner_name: source.ownerName,
    phone: source.phone,
    whatsapp: source.whatsapp,
    city: source.city,
    district: source.district,
    address: source.address,
    maps_url: source.mapsUrl,
    working_hours: source.workingHours,
    services_json: source.services,
    instagram_url: source.instagramUrl,
    tiktok_url: source.tiktokUrl,
    website_preview_url: source.websitePreviewUrl,
    ai_content_json: contentForSave,
    whatsapp_message: messageText,
    whatsapp_link: whatsappLink,
    missing_fields: missingFields,
    generation_status: 'ready_for_review',
    send_status: 'not_sent',
    updated_at: new Date().toISOString(),
  }).eq('id', campaign.id).select('*').single();
  if (error) throw new ApiError('تعذر حفظ تعديلات الحملة.', 500, 'CAMPAIGN_UPDATE_FAILED');

  const preview = campaign.preview_id
    ? ({ id: campaign.preview_id, theme_json: {} } as PreviewRecord)
    : null;
  if (preview) {
    const content = contentForSave;
    if ('salon_description' in content && 'selected_services' in content) {
      const { data: previewData } = await getSupabaseAdmin().from('previews').select('*').eq('id', campaign.preview_id).maybeSingle();
      if (previewData) {
        await syncPreview({
          lead,
          preview: previewData as PreviewRecord,
          source,
          content: content as Awaited<ReturnType<typeof generateSalonCampaignContent>>,
        });
      }
    }
  }

  const latestMessage = await latestCampaignMessage(leadId);
  if (latestMessage && messageText) {
    await getSupabaseAdmin().from('outreach_messages').update({
      message_text: messageText,
      message_content: messageText,
      recipient_phone: source.whatsapp,
      status: 'pending',
      updated_at: new Date().toISOString(),
    }).eq('id', latestMessage.id);
  }

  return data as SalonCampaignRecord;
}

export async function approveSalonCampaign(leadId: string): Promise<SalonCampaignRecord> {
  const campaign = await getSalonCampaign(leadId);
  if (!campaign) throw new ApiError('الحملة غير موجودة.', 404, 'CAMPAIGN_NOT_FOUND');
  const blockReason = campaignApprovalBlockReason(campaign);
  if (blockReason) {
    throw new ApiError(blockReason, 409, campaign.missing_fields?.length ? 'CAMPAIGN_MISSING_FIELDS' : 'CAMPAIGN_NOT_READY');
  }
  const { data, error } = await getSupabaseAdmin().from('salon_campaigns').update({
    generation_status: 'ready_to_send',
    send_status: 'ready',
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', campaign.id).select('*').single();
  if (error) throw new ApiError('تعذر اعتماد الحملة.', 500, 'CAMPAIGN_APPROVE_FAILED');
  return data as SalonCampaignRecord;
}

export async function markSalonCampaignSent(leadId: string): Promise<SalonCampaignRecord> {
  const campaign = await getSalonCampaign(leadId);
  if (!campaign) throw new ApiError('الحملة غير موجودة.', 404, 'CAMPAIGN_NOT_FOUND');
  const blockReason = campaignMarkSentBlockReason(campaign);
  if (blockReason) {
    throw new ApiError(blockReason, 409, campaign.send_status === 'sent' ? 'CAMPAIGN_ALREADY_SENT' : 'CAMPAIGN_NOT_APPROVED');
  }

  const latestMessage = await latestCampaignMessage(leadId);
  await recordContactAction({
    leadId,
    action: 'MARKED_SENT',
    messageId: latestMessage?.id,
    messageSnapshot: campaign.whatsapp_message || undefined,
    notes: 'تم تسجيل الإرسال يدويًا من قسم معاينة رسالة الصالون.',
  });

  const { data, error } = await getSupabaseAdmin().from('salon_campaigns').update({
    send_status: 'sent',
    sent_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', campaign.id).select('*').single();
  if (error) throw new ApiError('تعذر تسجيل حالة الإرسال.', 500, 'CAMPAIGN_SENT_FAILED');
  return data as SalonCampaignRecord;
}

export async function markSalonCampaignFailed(leadId: string, reason?: string): Promise<SalonCampaignRecord> {
  const campaign = await getSalonCampaign(leadId);
  if (!campaign) throw new ApiError('الحملة غير موجودة.', 404, 'CAMPAIGN_NOT_FOUND');
  const { data, error } = await getSupabaseAdmin().from('salon_campaigns').update({
    send_status: 'failed',
    last_error: optional(reason) || 'تعذر إرسال الرسالة، ويمكن نسخها وإرسالها يدويًا.',
    updated_at: new Date().toISOString(),
  }).eq('id', campaign.id).select('*').single();
  if (error) throw new ApiError('تعذر تحديث حالة الإرسال.', 500, 'CAMPAIGN_FAILED_STATUS');
  return data as SalonCampaignRecord;
}

export function campaignClientResult(campaign: SalonCampaignRecord) {
  return {
    salon_name: campaign.salon_name,
    website_preview_url: campaign.website_preview_url || '',
    advertisement_image_url: campaign.advertisement_image_url || '',
    whatsapp_message: campaign.whatsapp_message || '',
    whatsapp_link: campaign.whatsapp_link || '',
    whatsapp_number: campaign.whatsapp || '',
    missing_fields: campaign.missing_fields || [],
    generation_status: campaign.generation_status,
    send_status: campaign.send_status,
  };
}
