import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiFailure, apiSuccess } from '@/lib/http';
import { setPreviewState } from '@/lib/preview-service';

const schema = z.object({
  is_active: z.boolean().optional(),
  expires_at: z.string().datetime().nullable().optional(),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return apiSuccess({ preview: await setPreviewState(id, schema.parse(await request.json())) });
  } catch (error) {
    return apiFailure(error);
  }
}
