import type { WebsiteStatus } from '@/types/domain';

export function determineWebsiteStatus(websiteUri?: string | null): WebsiteStatus {
  if (typeof websiteUri === 'string' && websiteUri.trim()) return 'HAS_WEBSITE';
  if (websiteUri === null || websiteUri === undefined || websiteUri === '') return 'NO_WEBSITE';
  return 'NEEDS_REVIEW';
}
