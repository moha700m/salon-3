import { ApiError } from '@/lib/api-errors';
import { buildPreviewAccess } from '@/lib/preview-link';
import { buildPublicShareUrl, createPublicShareCode, hashPublicShareCode } from '@/lib/public-share';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import type { PreviewRecord } from '@/types/domain';

export async function ensurePreviewAccess(preview: PreviewRecord): Promise<{ preview: PreviewRecord; url: string }> {
  const access = buildPreviewAccess(preview);
  const publicShareCodeHash = hashPublicShareCode(createPublicShareCode(preview.id));
  const url = buildPublicShareUrl(preview);
  if (
    preview.access_token_hash === access.tokenHash
    && preview.public_share_code_hash === publicShareCodeHash
  ) {
    return { preview, url };
  }

  const { data, error } = await getSupabaseAdmin()
    .from('previews')
    .update({
      access_token_hash: access.tokenHash,
      public_share_code_hash: publicShareCodeHash,
      updated_at: new Date().toISOString(),
    })
    .eq('id', preview.id)
    .select('*')
    .single();
  if (error || !data) throw new ApiError('تعذر تحديث حماية رابط المعاينة.', 500, 'PREVIEW_TOKEN_ROTATION_FAILED');
  return { preview: data as PreviewRecord, url };
}
