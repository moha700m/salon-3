import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePreviewSlug, previewSlugCandidates } from '@/lib/preview-route';

test('normalizes an Arabic preview slug from an encoded URL segment', () => {
  const slug = 'صالون-الرجل-الوحش-للحلاقة-الرجالية';
  assert.equal(normalizePreviewSlug(encodeURIComponent(slug)), slug);
  assert.ok(previewSlugCandidates(encodeURIComponent(slug)).includes(slug));
});

test('removes hidden direction marks and normalizes duplicate encoding safely', () => {
  const slugWithMark = `صالون\u200f-الباشق`;
  assert.equal(normalizePreviewSlug(encodeURIComponent(encodeURIComponent(slugWithMark))), 'صالون-الباشق');
});
