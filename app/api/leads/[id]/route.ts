import type { NextRequest } from 'next/server';
import { apiFailure, apiSuccess } from '@/lib/http';
import { getLeadDetails, updateLead } from '@/lib/leads-service';
import { updateLeadSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return apiSuccess(await getLeadDetails(id));
  } catch (error) {
    return apiFailure(error);
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const values = updateLeadSchema.parse(await request.json());
    return apiSuccess({ lead: await updateLead(id, values) });
  } catch (error) {
    return apiFailure(error);
  }
}
