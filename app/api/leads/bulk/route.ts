import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiFailure, apiSuccess } from '@/lib/http';
import { generatePreview } from '@/lib/preview-service';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { CONTACT_STATUSES } from '@/types/domain';

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(20),
  action: z.enum(['SET_STATUS', 'GENERATE_PREVIEWS']),
  status: z.enum(CONTACT_STATUSES).optional(),
});

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const input = schema.parse(await request.json());
    if (input.action === 'SET_STATUS') {
      if (!input.status) throw new Error('اختر الحالة.');
      const { error } = await getSupabaseAdmin().from('leads').update({
        contact_status: input.status,
        updated_at: new Date().toISOString(),
      }).in('id', input.ids);
      if (error) throw new Error('تعذر تحديث العملاء.');
      return apiSuccess({ updated: input.ids.length });
    }

    const generated = [];
    for (const id of input.ids) {
      try {
        generated.push(await generatePreview(id, { expiresInDays: 30, regenerate: false }));
      } catch (error) {
        generated.push({ leadId: id, error: error instanceof Error ? error.message : 'فشل' });
      }
    }
    return apiSuccess({ generated });
  } catch (error) {
    return apiFailure(error);
  }
}
