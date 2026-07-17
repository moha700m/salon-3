import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { getAppUrl } from '@/lib/app-url';
import type { PreviewRecord } from '@/types/domain';

const PUBLIC_SHARE_CODE_PATTERN = /^[A-Za-z0-9_-]{11}$/;

function shareSecret(): string {
  const secret = process.env.PREVIEW_TOKEN_SECRET
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error('Preview share secret is not configured.');
  return secret;
}

export function createPublicShareCode(previewId: string): string {
  return createHmac('sha256', shareSecret())
    .update(`public-preview:${previewId}`)
    .digest('base64url')
    .slice(0, 11);
}

export function hashPublicShareCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

export function isValidPublicShareCode(code: string): boolean {
  return PUBLIC_SHARE_CODE_PATTERN.test(code);
}

export function buildPublicShareUrl(preview: Pick<PreviewRecord, 'id'>): string {
  return `${getAppUrl()}/p/${createPublicShareCode(preview.id)}`;
}

export function publicShareAccessState(
  preview: Pick<PreviewRecord, 'is_active' | 'expires_at' | 'public_share_code_hash'> | null,
  code: string,
  now = new Date(),
): 'ACTIVE' | 'INVALID_CODE' | 'NOT_FOUND' | 'DISABLED' | 'EXPIRED' {
  if (!isValidPublicShareCode(code)) return 'INVALID_CODE';
  if (!preview?.public_share_code_hash) return 'NOT_FOUND';
  if (!preview.is_active) return 'DISABLED';
  if (preview.expires_at && new Date(preview.expires_at).getTime() <= now.getTime()) return 'EXPIRED';

  const actual = Buffer.from(hashPublicShareCode(code), 'hex');
  const expected = Buffer.from(preview.public_share_code_hash, 'hex');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return 'NOT_FOUND';
  return 'ACTIVE';
}
