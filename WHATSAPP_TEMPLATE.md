import type { NextRequest } from 'next/server';
import { apiFailure, apiSuccess } from '@/lib/http';
import { cityOptions, listLeads } from '@/lib/leads-service';
import { leadFiltersSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const filters = leadFiltersSchema.parse(params);
    const [result, cities] = await Promise.all([listLeads(filters), cityOptions()]);
    return apiSuccess({ ...result, cities });
  } catch (error) {
    return apiFailure(error);
  }
}
