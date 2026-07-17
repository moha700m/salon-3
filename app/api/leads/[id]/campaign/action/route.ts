import type { NextRequest } from 'next/server';
import { apiFailure, apiSuccess } from '@/lib/http';
import {
  approveSalonCampaign,
  campaignClientResult,
  markSalonCampaignFailed,
  markSalonCampaignSent,
} from '@/lib/salon-campaign-service';
import { salonCampaignActionSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const input = salonCampaignActionSchema.parse(await request.json());
    const campaign = input.action === 'APPROVE'
      ? await approveSalonCampaign(id)
      : input.action === 'MARK_SENT'
        ? await markSalonCampaignSent(id)
        : await markSalonCampaignFailed(id, input.reason);
    return apiSuccess({ campaign, result: campaignClientResult(campaign) });
  } catch (error) {
    return apiFailure(error);
  }
}
