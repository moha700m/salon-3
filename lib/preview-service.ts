import { randomUUID } from 'node:crypto';
import { ApiError } from '@/lib/api-errors';
import { ensurePreviewAccess } from '@/lib/preview-access-service';
import { generatePreviewCopy } from '@/lib/openai-service';
import { createPreviewToken, hashPreviewToken } from '@/lib/preview-access';
import { buildPublicShareUrl, createPublicShareCode, hashPublicShareCode } from '@/lib/public-share';
import { slugify } from '@/lib/slug';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getLead, updateLead } from '@/lib/leads-service';
import type { OutreachMessageRecord, PreviewRecord } from '@/types/domain';

async function uniqueSlug(name: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  const base = slugify(name);
  for (let index = 0; index < 20; index += 1) {
    const suffix = index === 0 ? '' : `-${index + 1}`;
    const slug = `${base}${suffix}`;
    const { data } = await supabase.from('previews').select('id').eq('slug', slug).maybeSingle();
    if (!data) return slug;
  }
  return `${base}-${randomUUID().slice(0, 8)}`;
}

function canReusePreview(preview: PreviewRecord, now = Date.now()): boolean {
  return preview.is_active && (!preview.expires_at || new Date(preview.expires_at).getTime() > now);
}

export async function getLatestPreview(leadId: string): Promise<PreviewRecord | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('previews')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new ApiError('تعذر تحميل المعاينة.', 500);
  return data as PreviewRecord | null;
}

export async function generatePreview(leadId: string, options: { expiresInDays: number; regenerate?: boolean }) {
  const supabase = getSupabaseAdmin();
  const lead = await getLead(leadId);
  await updateLead(leadId, { contact_status: 'PREVIEW_GENERATING' });

  const current = await getLatestPreview(leadId);

  if (current && !options.regenerate && canReusePreview(current)) {
    const secured = await ensurePreviewAccess(current);
    await updateLead(leadId, { contact_status: lead.phone_international ? 'READY_TO_CONTACT' : 'PHONE_MISSING' });
    return {
      preview: secured.preview,
      url: secured.url,
      message: await getLatestMessage(leadId),
      reused: true,
    };
  }

  const slug = await uniqueSlug(lead.name);
  const previewId = randomUUID();
  const token = createPreviewToken(previewId, slug);
  const expiresAt = new Date(Date.now() + options.expiresInDays * 86_400_000).toISOString();
  const publicShareCodeHash = hashPublicShareCode(createPublicShareCode(previewId));
  const shortUrl = buildPublicShareUrl({ id: previewId });
  const copy = await generatePreviewCopy(lead, shortUrl);

  const { data: preview, error } = await supabase.from('previews').insert({
    id: previewId,
    lead_id: leadId,
    slug,
    access_token_hash: hashPreviewToken(token),
    public_share_code_hash: publicShareCodeHash,
    title: copy.displayName,
    subtitle: copy.heroTagline,
    about_text: copy.aboutText,
    services_json: copy.services,
    gallery_json: lead.photos_json,
    theme_json: {
      primary: '#eab308',
      secondary: '#050505',
      source: 'default',
      marketingDescription: copy.marketingDescription,
    },
    is_active: true,
    expires_at: expiresAt,
  }).select('*').single();

  if (error) {
    await updateLead(leadId, { contact_status: 'ERROR' });
    throw new ApiError('تعذر حفظ رابط المعاينة.', 500);
  }

  const latestVersion = await latestMessageVersion(leadId);
  const selectedMessage = copy.messageVariants[latestVersion % copy.messageVariants.length] || copy.messageVariants[0];
  const { data: message, error: messageError } = await supabase.from('outreach_messages').insert({
    lead_id: leadId,
    preview_id: preview.id,
    message_text: selectedMessage,
    message_content: selectedMessage,
    recipient_phone: lead.phone_international,
    channel: 'whatsapp',
    language: 'ar',
    status: 'pending',
    ai_model: copy.model,
    version: latestVersion + 1,
  }).select('*').single();

  if (messageError) throw new ApiError('تم إنشاء المعاينة لكن تعذر حفظ الرسالة.', 500);
  await updateLead(leadId, { contact_status: lead.phone_international ? 'READY_TO_CONTACT' : 'PHONE_MISSING' });

  const secured = await ensurePreviewAccess(preview as PreviewRecord);
  return {
    preview: secured.preview,
    url: secured.url,
    message: message as OutreachMessageRecord,
    usedFallback: copy.usedFallback,
    reused: false,
  };
}

async function latestMessageVersion(leadId: string): Promise<number> {
  const { data } = await getSupabaseAdmin()
    .from('outreach_messages')
    .select('version')
    .eq('lead_id', leadId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.version || 0;
}

export async function getLatestMessage(leadId: string): Promise<OutreachMessageRecord | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('outreach_messages')
    .select('*')
    .eq('lead_id', leadId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new ApiError('تعذر تحميل رسالة التواصل.', 500);
  return data as OutreachMessageRecord | null;
}

export async function regenerateMessage(leadId: string) {
  const supabase = getSupabaseAdmin();
  const lead = await getLead(leadId);
  const preview = await getLatestPreview(leadId);
  if (!preview) throw new ApiError('أنشئ رابط المعاينة أولًا.', 409, 'PREVIEW_REQUIRED');
  const secured = await ensurePreviewAccess(preview);
  const url = secured.url;
  const copy = await generatePreviewCopy(lead, url);
  const version = await latestMessageVersion(leadId) + 1;
  const messageText = copy.messageVariants[(version - 1) % copy.messageVariants.length] || copy.messageVariants[0];
  const { data, error } = await supabase.from('outreach_messages').insert({
    lead_id: leadId,
    preview_id: preview.id,
    message_text: messageText,
    message_content: messageText,
    recipient_phone: lead.phone_international,
    channel: 'whatsapp',
    language: 'ar',
    status: 'pending',
    ai_model: copy.model,
    version,
  }).select('*').single();
  if (error) throw new ApiError('تعذر حفظ الرسالة الجديدة.', 500);
  return data as OutreachMessageRecord;
}

export async function updateMessage(messageId: string, messageText: string) {
  const { data, error } = await getSupabaseAdmin().from('outreach_messages').update({
    message_text: messageText,
    message_content: messageText,
    updated_at: new Date().toISOString(),
  }).eq('id', messageId).select('*').single();
  if (error) throw new ApiError('تعذر تعديل الرسالة.', 500);
  return data as OutreachMessageRecord;
}

export async function setPreviewState(previewId: string, values: { is_active?: boolean; expires_at?: string | null }) {
  const { data, error } = await getSupabaseAdmin().from('previews').update({
    ...values,
    updated_at: new Date().toISOString(),
  }).eq('id', previewId).select('*').single();
  if (error) throw new ApiError('تعذر تحديث رابط المعاينة.', 500);
  return data as PreviewRecord;
}
