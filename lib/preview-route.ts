import { slugify } from '@/lib/slug';

function safeDecode(value: string): string {
  let decoded = value;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return decoded;
}

export function normalizePreviewSlug(rawSlug: string): string {
  return slugify(safeDecode(rawSlug).normalize('NFKC'));
}

export function previewSlugCandidates(rawSlug: string): string[] {
  const trimmed = rawSlug.trim();
  const decoded = safeDecode(trimmed).trim();
  const normalized = normalizePreviewSlug(decoded);
  return [...new Set([trimmed, decoded, normalized].filter(Boolean))];
}
