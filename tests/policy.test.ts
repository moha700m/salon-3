import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { contactBlocked } from '@/lib/contact-policy';
import { upstreamErrorMessage } from '@/lib/api-errors';
import { determineWebsiteStatus } from '@/lib/website-status';
import { createPreviewToken, hashPreviewToken, previewAccessState } from '@/lib/preview-access';

process.env.PREVIEW_TOKEN_SECRET = 'test-secret-long-enough';

test('distinguishes website present and missing', () => {
  assert.equal(determineWebsiteStatus('https://example.com'), 'HAS_WEBSITE');
  assert.equal(determineWebsiteStatus(undefined), 'NO_WEBSITE');
});
test('blocks DO_NOT_CONTACT and NOT_INTERESTED', () => {
  assert.equal(contactBlocked('DO_NOT_CONTACT').blocked, true);
  assert.equal(contactBlocked('NOT_INTERESTED').blocked, true);
  assert.equal(contactBlocked('READY_TO_CONTACT').blocked, false);
});
test('validates preview token and expiration', () => {
  const token = createPreviewToken('00000000-0000-0000-0000-000000000001', 'test-barber');
  const preview = { is_active: true, expires_at: '2099-01-01T00:00:00.000Z', access_token_hash: hashPreviewToken(token) };
  assert.equal(previewAccessState(preview, token), 'ACTIVE');
  assert.equal(previewAccessState(preview, 'wrong'), 'INVALID_TOKEN');
  assert.equal(previewAccessState({ ...preview, expires_at: '2020-01-01T00:00:00.000Z' }, token), 'EXPIRED');
  assert.equal(previewAccessState({ ...preview, is_active: false }, token), 'DISABLED');
});
test('maps quota and permission failures to clear errors', () => {
  assert.match(upstreamErrorMessage('GOOGLE', 429), /حد Google Places/);
  assert.match(upstreamErrorMessage('GOOGLE', 403), /تفعيل API/);
  assert.match(upstreamErrorMessage('OPENAI', 429), /حد OpenAI/);
});
test('migration enforces unique Google Place ID', () => {
  const sql = fs.readFileSync('supabase/migrations/20260717080000_lead_platform_manual_whatsapp.sql', 'utf8');
  assert.match(sql, /google_place_id text not null unique/i);
});

test('preview access migration enforces unique token hashes', () => {
  const sql = fs.readFileSync('supabase/migrations/20260717102000_preview_access_reliability.sql', 'utf8');
  assert.match(sql, /unique index[\s\S]*access_token_hash/i);
});
