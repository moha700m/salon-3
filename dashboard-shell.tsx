import type { NextRequest } from 'next/server';
import { apiFailure, apiSuccess } from '@/lib/http';
import { generatePreview } from '@/lib/preview-service';
import { previewOptionsSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const options = previewOptionsSchema.parse(await request.json().catch(() => ({})));
    return apiSuccess(await generatePreview(id, options), 201);
  } catch (error) {
    return apiFailure(error);
  }
}
