import type { NextRequest } from 'next/server';
import { getPlaceFromMapUrl } from '@/lib/google-places';
import { apiFailure, apiSuccess } from '@/lib/http';
import { upsertLeadFromPlace } from '@/lib/leads-service';
import { generatePreview } from '@/lib/preview-service';
import { requestFingerprint } from '@/lib/request';
import { enforceRateLimit } from '@/lib/rate-limit';
import { createFromMapSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit({
      action: 'create_from_map',
      fingerprint: requestFingerprint(request),
      maxRequests: 12,
      windowMinutes: 15,
    });
    const input = createFromMapSchema.parse(await request.json());
    const profile = await getPlaceFromMapUrl(input.googleMapsUrl);
    const { lead, created, duplicateBy } = await upsertLeadFromPlace(profile);
    const generated = await generatePreview(lead.id, { expiresInDays: 30, regenerate: false });

    return apiSuccess({
      lead,
      created,
      duplicateBy,
      preview: generated.preview,
      previewUrl: generated.url,
      message: generated.message,
      usedFallback: generated.usedFallback || false,
      manualOnly: true,
    }, 201);
  } catch (error) {
    return apiFailure(error);
  }
}
