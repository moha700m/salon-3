import type { NextRequest } from 'next/server';
import { apiFailure, apiSuccess } from '@/lib/http';
import { requestFingerprint } from '@/lib/request';
import {
  campaignClientResult,
  generateSalonCampaign,
  getSalonCampaign,
  updateSalonCampaign,
} from '@/lib/salon-campaign-service';
import { salonCampaignInputSchema, salonCampaignPatchSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const campaign = await getSalonCampaign(id);
    return apiSuccess({
      campaign,
      result: campaign ? campaignClientResult(campaign) : null,
    });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const values = salonCampaignInputSchema.parse(await request.json());
    const campaign = await generateSalonCampaign(id, values, requestFingerprint(request));
    return apiSuccess({ campaign, result: campaignClientResult(campaign) }, 201);
  } catch (error) {
    return apiFailure(error);
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const values = salonCampaignPatchSchema.parse(await request.json());
    const campaign = await updateSalonCampaign(id, values);
    return apiSuccess({ campaign, result: campaignClientResult(campaign) });
  } catch (error) {
    return apiFailure(error);
  }
}
