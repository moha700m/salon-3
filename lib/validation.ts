import { z } from 'zod';
import { CONTACT_STATUSES } from '@/types/domain';

export const searchLeadsSchema = z.object({
  country: z.string().trim().min(2).max(80).default('السعودية'),
  city: z.string().trim().min(2, 'اختر المدينة.').max(80),
  district: z.string().trim().max(120).optional().default(''),
  activityTypes: z.array(z.string().trim().min(2).max(80)).min(1).max(6),
  limit: z.coerce.number().int().min(1).max(60).default(20),
});

export const createFromMapSchema = z.object({
  googleMapsUrl: z.string().url().max(2048),
});

export const leadFiltersSchema = z.object({
  noWebsiteOnly: z.coerce.boolean().optional(),
  hasPhone: z.coerce.boolean().optional(),
  city: z.string().trim().max(80).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  minReviews: z.coerce.number().int().min(0).optional(),
  contactStatus: z.enum(CONTACT_STATUSES).optional(),
  previewState: z.enum(['ANY', 'READY', 'MISSING']).optional(),
  query: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const updateLeadSchema = z.object({
  contact_status: z.enum(CONTACT_STATUSES).optional(),
  notes: z.string().max(5000).nullable().optional(),
  contact_block_reason: z.string().max(500).nullable().optional(),
});

export const previewOptionsSchema = z.object({
  expiresInDays: z.coerce.number().int().min(1).max(180).default(30),
  regenerate: z.boolean().optional().default(false),
});

export const messageUpdateSchema = z.object({
  messageId: z.string().uuid(),
  messageText: z.string().trim().min(10).max(2000),
});

export const contactActionSchema = z.object({
  action: z.enum(['OPENED_WHATSAPP', 'MARKED_SENT', 'NOT_SENT', 'DO_NOT_CONTACT']),
  messageId: z.string().uuid().optional(),
  messageSnapshot: z.string().max(2000).optional(),
  notes: z.string().max(1000).optional(),
});

const optionalUrl = z.union([z.string().trim().url().max(2048), z.literal('')]).optional().default('');
const optionalText = (max: number) => z.string().trim().max(max).optional().default('');

export const salonCampaignServiceSchema = z.object({
  name: z.string().trim().min(2, 'اسم الخدمة قصير جدًا.').max(80),
  price: z.string().trim().max(30).refine(value => {
    if (!value) return true;
    const numeric = Number(value.replace(/[^0-9.]/g, ''));
    return Number.isFinite(numeric) && numeric >= 0 && numeric <= 100000;
  }, 'السعر غير منطقي.').optional().default(''),
});

export const salonCampaignInputSchema = z.object({
  salonName: z.string().trim().min(2, 'اسم الصالون مطلوب.').max(160),
  ownerName: optionalText(120),
  phone: optionalText(40),
  whatsapp: optionalText(40),
  city: optionalText(80),
  district: optionalText(120),
  address: optionalText(300),
  mapsUrl: optionalUrl,
  workingHours: optionalText(500),
  services: z.array(salonCampaignServiceSchema).max(20).optional().default([]),
  instagramUrl: optionalUrl,
  tiktokUrl: optionalUrl,
  websitePreviewUrl: optionalUrl,
  messageText: z.string().trim().max(2500).optional().default(''),
});

export const salonCampaignPatchSchema = salonCampaignInputSchema.partial().extend({
  generationStatus: z.enum(['draft','generating','ready_for_review','ready_to_send','partial_failure','failed']).optional(),
  sendStatus: z.enum(['not_sent','ready','sent','failed']).optional(),
});

export const salonCampaignActionSchema = z.object({
  action: z.enum(['APPROVE', 'MARK_SENT', 'MARK_FAILED']),
  reason: z.string().trim().max(500).optional(),
});
