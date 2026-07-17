import OpenAI from 'openai';
import { z } from 'zod';
import type { LeadRecord, SalonCampaignAIContent, SalonCampaignService } from '@/types/domain';

let client: OpenAI | null = null;

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new OpenAI({ apiKey });
  return client;
}

const serviceSchema = z.object({
  name: z.string().trim().min(2).max(80),
  price: z.string().trim().max(30).nullable(),
});

const contentSchema = z.object({
  salon_title: z.string().trim().min(2).max(120),
  salon_description: z.string().trim().min(10).max(300),
  marketing_headline: z.string().trim().min(3).max(100),
  short_location: z.string().trim().max(140),
  short_working_hours: z.string().trim().max(140),
  selected_services: z.array(serviceSchema).max(5),
  whatsapp_message: z.string().trim().min(20).max(1800),
  image_text: z.object({
    title: z.string().trim().min(2).max(120),
    subtitle: z.string().trim().min(2).max(120),
    description: z.string().trim().min(5).max(220),
    location: z.string().trim().max(140),
    working_hours: z.string().trim().max(140),
    cta: z.string().trim().min(2).max(60),
  }),
});

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    salon_title: { type: 'string' },
    salon_description: { type: 'string' },
    marketing_headline: { type: 'string' },
    short_location: { type: 'string' },
    short_working_hours: { type: 'string' },
    selected_services: {
      type: 'array',
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          price: { type: ['string', 'null'] },
        },
        required: ['name', 'price'],
      },
    },
    whatsapp_message: { type: 'string' },
    image_text: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: { type: 'string' },
        subtitle: { type: 'string' },
        description: { type: 'string' },
        location: { type: 'string' },
        working_hours: { type: 'string' },
        cta: { type: 'string' },
      },
      required: ['title', 'subtitle', 'description', 'location', 'working_hours', 'cta'],
    },
  },
  required: [
    'salon_title',
    'salon_description',
    'marketing_headline',
    'short_location',
    'short_working_hours',
    'selected_services',
    'whatsapp_message',
    'image_text',
  ],
} as const;

export interface SalonCampaignSource {
  salonName: string;
  ownerName?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  city?: string | null;
  district?: string | null;
  address?: string | null;
  mapsUrl?: string | null;
  workingHours?: string | null;
  services: SalonCampaignService[];
  instagramUrl?: string | null;
  tiktokUrl?: string | null;
  websitePreviewUrl: string;
}

function conciseLocation(source: SalonCampaignSource): string {
  return [source.district, source.city].filter(Boolean).join(' – ');
}

function conciseHours(value?: string | null): string {
  if (!value?.trim()) return '';
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length <= 120 ? normalized : `${normalized.slice(0, 117).trim()}…`;
}

function selectedRealServices(services: SalonCampaignService[]): SalonCampaignService[] {
  return services
    .filter(service => service.name.trim().length >= 2)
    .slice(0, 5)
    .map(service => ({ name: service.name.trim(), price: service.price?.trim() || null }));
}

export function buildFallbackWhatsAppMessage(source: SalonCampaignSource): string {
  const greeting = source.ownerName?.trim()
    ? `السلام عليكم يا ${source.ownerName.trim()} 👋`
    : 'السلام عليكم 👋';
  const audience = source.ownerName?.trim() ? 'لك' : 'لكم';
  const ending = source.ownerName?.trim() ? 'إذا ناسبك التصور' : 'إذا ناسبكم التصور';

  return [
    greeting,
    `جهزنا ${audience} تصورًا أوليًا لموقع خاص بـ ${source.salonName}، وحطينا فيه اسم الصالون والخدمات والموقع وطرق التواصل والحجز.`,
    'تقدر تشوف نسخة المعاينة من هنا:',
    source.websitePreviewUrl,
    'الموقع متوافق مع الجوال، والعميل يقدر يشوف الخدمات والأسعار المتوفرة ويتواصل معكم على واتساب ويفتح موقع المحل على الخريطة بسهولة.',
    'أرفقت لك صورة توضح شكل الموقع.',
    `${ending} نضبط البيانات النهائية ونجهزه باسم الصالون بالكامل.`,
  ].join('\n');
}

export function fallbackCampaignContent(source: SalonCampaignSource): SalonCampaignAIContent {
  const location = conciseLocation(source);
  const workingHours = conciseHours(source.workingHours);
  const services = selectedRealServices(source.services);

  return {
    salon_title: `${source.salonName} للحلاقة الرجالية`,
    salon_description: `تصور أولي لموقع احترافي يعرّف بخدمات ${source.salonName} ويسهّل على العملاء التواصل والحجز والوصول إلى الموقع.`,
    marketing_headline: `موقع احترافي خاص بـ ${source.salonName}`,
    short_location: location,
    short_working_hours: workingHours,
    selected_services: services,
    whatsapp_message: buildFallbackWhatsAppMessage(source),
    image_text: {
      title: source.salonName,
      subtitle: 'للحلاقة الرجالية',
      description: 'شاهد الخدمات والأسعار والموقع واحجز موعدك بسهولة',
      location,
      working_hours: workingHours,
      cta: 'شاهد موقعك الجديد',
    },
    model: 'fallback',
    used_fallback: true,
  };
}

function preserveServices(
  original: SalonCampaignService[],
  generated: SalonCampaignService[],
): SalonCampaignService[] {
  const normalized = original.map(item => ({ name: item.name.trim(), price: item.price?.trim() || null }));
  const byName = new Map(normalized.map(item => [item.name.toLowerCase(), item]));
  const selected = generated
    .map(item => byName.get(item.name.trim().toLowerCase()))
    .filter((item): item is SalonCampaignService => Boolean(item));
  return (selected.length ? selected : normalized).slice(0, 5);
}

function ensureOriginalValues(content: z.infer<typeof contentSchema>, source: SalonCampaignSource): SalonCampaignAIContent {
  const fallback = fallbackCampaignContent(source);
  const message = content.whatsapp_message
    .replaceAll('{{salon_name}}', source.salonName)
    .replaceAll('{{owner_name}}', source.ownerName?.trim() || '')
    .replaceAll('{{website_preview_url}}', source.websitePreviewUrl)
    .trim();
  const validMessage = message.includes(source.salonName) && message.includes(source.websitePreviewUrl)
    ? message
    : fallback.whatsapp_message;

  return {
    salon_title: content.salon_title.includes(source.salonName) ? content.salon_title : fallback.salon_title,
    salon_description: content.salon_description,
    marketing_headline: content.marketing_headline.includes(source.salonName)
      ? content.marketing_headline
      : fallback.marketing_headline,
    short_location: fallback.short_location,
    short_working_hours: fallback.short_working_hours,
    selected_services: preserveServices(source.services, content.selected_services),
    whatsapp_message: validMessage,
    image_text: {
      title: source.salonName,
      subtitle: 'للحلاقة الرجالية',
      description: content.image_text.description || fallback.image_text.description,
      location: fallback.short_location,
      working_hours: fallback.short_working_hours,
      cta: 'شاهد موقعك الجديد',
    },
  };
}

export async function generateSalonCampaignContent(
  _lead: LeadRecord,
  source: SalonCampaignSource,
): Promise<SalonCampaignAIContent> {
  const openai = getClient();
  if (!openai) return fallbackCampaignContent(source);

  const model = process.env.OPENAI_MODEL || 'gpt-5-mini';
  const immutableData = {
    salon_name: source.salonName,
    owner_name: source.ownerName || '',
    phone: source.phone || '',
    whatsapp: source.whatsapp || '',
    city: source.city || '',
    district: source.district || '',
    address: source.address || '',
    maps_url: source.mapsUrl || '',
    working_hours: source.workingHours || '',
    services: source.services,
    instagram_url: source.instagramUrl || '',
    tiktok_url: source.tiktokUrl || '',
    website_preview_url: source.websitePreviewUrl,
  };

  try {
    const response = await openai.responses.create({
      model,
      input: [
        {
          role: 'system',
          content: [{
            type: 'input_text',
            text: [
              'أنت كاتب سعودي لمواقع صالونات الحلاقة الرجالية.',
              'أعد JSON فقط وفق المخطط المطلوب.',
              'اكتب رسالة واتساب قصيرة ومحترمة وطبيعية ولا تبدو آلية، وبحد أقصى 3 رموز تعبيرية.',
              'استخدم عبارات تصور أولي أو نسخة معاينة أو نموذج مبدئي فقط، ولا تدّع أن الموقع رسمي أو نهائي.',
              'لا تغيّر أو تخترع اسم الصالون أو المالك أو الأرقام أو الأسعار أو المدينة أو الحي أو الروابط أو أوقات العمل أو أسماء الخدمات.',
              'اختر من 3 إلى 5 خدمات من القائمة المدخلة فقط. إذا كانت القائمة فارغة فأعد selected_services فارغة.',
              'يجب أن تحتوي رسالة واتساب على اسم الصالون ورابط المعاينة كما وصلا حرفيًا.',
              'لا تضع متغيرات {{...}} في الناتج.',
            ].join('\n'),
          }],
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: JSON.stringify(immutableData) }],
        },
      ],
      text: {
        verbosity: 'low',
        format: {
          type: 'json_schema',
          name: 'salon_campaign_content',
          strict: true,
          schema: responseSchema,
        },
      },
    });

    const parsed = contentSchema.parse(JSON.parse(response.output_text));
    return {
      ...ensureOriginalValues(parsed, source),
      model,
      used_fallback: false,
    };
  } catch (error) {
    console.warn('salon_campaign_openai_failed', {
      message: error instanceof Error ? error.message : 'unknown',
    });
    return fallbackCampaignContent(source);
  }
}
