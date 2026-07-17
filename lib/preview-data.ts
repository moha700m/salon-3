import { hashPreviewToken } from '@/lib/preview-access';
import { previewSlugCandidates } from '@/lib/preview-route';
import {
  hashPublicShareCode,
  isValidPublicShareCode,
  publicShareAccessState,
} from '@/lib/public-share';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import type { LeadRecord, PreviewRecord, SalonCampaignRecord } from '@/types/domain';

export interface PreviewBundle {
  preview: PreviewRecord;
  lead: LeadRecord;
  campaign: SalonCampaignRecord | null;
}

async function loadLead(preview: PreviewRecord): Promise<PreviewBundle | null> {
  const supabase = getSupabaseAdmin();
  const [{ data, error }, { data: campaign, error: campaignError }] = await Promise.all([
    supabase.from('leads').select('*').eq('id', preview.lead_id).maybeSingle(),
    supabase.from('salon_campaigns').select('*').eq('lead_id', preview.lead_id).maybeSingle(),
  ]);
  if (error) console.warn('preview_lead_lookup_failed', { code: error.code });
  if (campaignError) console.warn('preview_campaign_lookup_failed', { code: campaignError.code });
  if (!data) return null;
  return {
    preview,
    lead: data as LeadRecord,
    campaign: (campaign || null) as SalonCampaignRecord | null,
  };
}

export async function loadLegacyPreview(rawSlug: string, token?: string): Promise<PreviewBundle | null> {
  const supabase = getSupabaseAdmin();
  let preview: PreviewRecord | null = null;

  if (token?.trim()) {
    const { data, error } = await supabase
      .from('previews')
      .select('*')
      .eq('access_token_hash', hashPreviewToken(token.trim()))
      .maybeSingle();
    if (error) console.warn('preview_lookup_token_failed', { code: error.code });
    preview = data as PreviewRecord | null;
  }

  if (!preview) {
    const candidates = previewSlugCandidates(rawSlug);
    const { data, error } = await supabase
      .from('previews')
      .select('*')
      .in('slug', candidates)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) console.warn('preview_lookup_slug_failed', { code: error.code, candidateCount: candidates.length });
    preview = data as PreviewRecord | null;
  }

  return preview ? loadLead(preview) : null;
}

export type PublicShareLoadResult =
  | { state: 'ACTIVE'; bundle: PreviewBundle }
  | { state: 'INVALID_CODE' | 'NOT_FOUND' | 'DISABLED' | 'EXPIRED' };

export async function loadPublicSharePreview(code: string): Promise<PublicShareLoadResult> {
  if (!isValidPublicShareCode(code)) return { state: 'INVALID_CODE' };

  const { data, error } = await getSupabaseAdmin()
    .from('previews')
    .select('*')
    .eq('public_share_code_hash', hashPublicShareCode(code))
    .maybeSingle();
  if (error) console.warn('public_preview_lookup_failed', { code: error.code });

  const preview = data as PreviewRecord | null;
  const state = publicShareAccessState(preview, code);
  if (state !== 'ACTIVE') return { state };

  const bundle = await loadLead(preview as PreviewRecord);
  return bundle ? { state: 'ACTIVE', bundle } : { state: 'NOT_FOUND' };
}
