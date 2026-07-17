import type { NextRequest } from 'next/server';
import { recordContactAction } from '@/lib/contact-service';
import { apiFailure, apiSuccess } from '@/lib/http';
import { contactActionSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const input = contactActionSchema.parse(await request.json());
    return apiSuccess({ log: await recordContactAction({ leadId: id, ...input }) }, 201);
  } catch (error) {
    return apiFailure(error);
  }
}
