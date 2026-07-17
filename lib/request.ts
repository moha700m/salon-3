import type { NextRequest } from 'next/server';
import { createHash } from 'node:crypto';

export function requestFingerprint(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const userAgent = request.headers.get('user-agent') || 'unknown';
  return createHash('sha256').update(`${forwarded || 'unknown'}:${userAgent}`).digest('hex');
}
