import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { PreviewRecord } from '@/types/domain';

function tokenSecret(): string {
  const secret = process.env.PREVIEW_TOKEN_SECRET
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error('Preview token secret is not configured.');
  return secret;
}

export function createPreviewToken(previewId: string, slug: string): string {
  return createHmac('sha256', tokenSecret())
    .update(`${previewId}:${slug}`)
    .digest('base64url');
}

export function hashPreviewToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function tokenMatches(token: string, expectedHash?: string | null): boolean {
  if (!expectedHash) return true;
  const actual = Buffer.from(hashPreviewToken(token), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function previewAccessState(
  preview: Pick<PreviewRecord, 'is_active' | 'expires_at' | 'access_token_hash'>,
  token?: string | null,
  now = new Date(),
): 'ACTIVE' | 'DISABLED' | 'EXPIRED' | 'INVALID_TOKEN' {
  if (!preview.is_active) return 'DISABLED';
  if (preview.expires_at && new Date(preview.expires_at).getTime() <= now.getTime()) return 'EXPIRED';
  if (preview.access_token_hash && (!token || !tokenMatches(token, preview.access_token_hash))) return 'INVALID_TOKEN';
  return 'ACTIVE';
}
