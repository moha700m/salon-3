import { getAppUrl } from '@/lib/app-url';
import { createPreviewToken, hashPreviewToken } from '@/lib/preview-access';

export interface PreviewAccessLink {
  token: string;
  tokenHash: string;
  url: string;
}

export function buildPreviewAccess(preview: { id: string; slug: string }): PreviewAccessLink {
  const token = createPreviewToken(preview.id, preview.slug);
  return {
    token,
    tokenHash: hashPreviewToken(token),
    url: `${getAppUrl()}/preview/${encodeURIComponent(preview.slug)}?token=${encodeURIComponent(token)}`,
  };
}

export function buildPreviewUrl(preview: { id: string; slug: string }): string {
  return buildPreviewAccess(preview).url;
}
