import type { NextRequest } from 'next/server';
import { apiFailure, apiSuccess } from '@/lib/http';
import { regenerateMessage, updateMessage } from '@/lib/preview-service';
import { messageUpdateSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return apiSuccess({ message: await regenerateMessage(id) }, 201);
  } catch (error) {
    return apiFailure(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const parsed = messageUpdateSchema.parse(await request.json());
    return apiSuccess({ message: await updateMessage(parsed.messageId, parsed.messageText) });
  } catch (error) {
    return apiFailure(error);
  }
}
