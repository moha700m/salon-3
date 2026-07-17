export interface CleanBusinessDisplayNameOptions {
  preserveRatingSuffix?: boolean;
}

const trailingRatingPatterns = [
  /(?:^|[\s\-–—|،,:()])تقييم\s*[0-5](?:[.,]\d{1,2})?$/iu,
  /(?:^|[\s\-–—|،,:()])(?:تقييم\s*)?[0-5](?:[.,]\d{1,2})?\s*(?:نجوم?|نجمات?)$/iu,
  /(?:^|[\s\-–—|،,:()])(?:خمس|خمسة|أربع|أربعة|اربعة)\s+(?:نجوم?|نجمات?)$/iu,
  /(?:^|[\s\-–—|،,:()])rating\s*[0-5](?:[.,]\d{1,2})?$/iu,
  /(?:^|[\s\-–—|،,:()])(?:rating\s*)?[0-5](?:[.,]\d{1,2})?\s*(?:stars?)$/iu,
  /[\s\-–—|،,:()]*(?:⭐|★){3,5}$/u,
];

function trimTrailingSeparators(value: string): string {
  return value.replace(/[\s\-–—|،,:()]+$/gu, '').trim();
}

export function cleanBusinessDisplayName(
  originalName: string,
  options: CleanBusinessDisplayNameOptions = {},
): string {
  const original = originalName.trim();
  if (!original || options.preserveRatingSuffix) return original;

  let cleaned = original;
  for (let pass = 0; pass < 4; pass += 1) {
    const previous = cleaned;
    for (const pattern of trailingRatingPatterns) {
      cleaned = cleaned.replace(pattern, '');
    }
    cleaned = trimTrailingSeparators(cleaned);
    if (cleaned === previous) break;
  }

  return cleaned || original;
}
