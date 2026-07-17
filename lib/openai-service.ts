import OpenAI from 'openai';
import { cleanBusinessDisplayName } from '@/lib/business-name';
import {
  buildProfessionalOutreachVariants,
  cleanAboutText,
  cleanHeroTagline,
  cleanMarketingDescription,
  fallbackAboutText,
} from '@/lib/preview-copy';
import type { LeadRecord, PreviewService } from '@/types/domain';

let client: OpenAI | null = null;

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new OpenAI({ apiKey });
  return client;
}

export interface GeneratedPreviewCopy {
  displayName: string;
  heroTagline: string;
  aboutText: string;
  marketingDescription: string;
  services: PreviewService[];
  messageVariants: string[];
  model: string;
  usedFallback: boolean;
}

export function fallbackCopy(
  lead: Pick<LeadRecord, 'name' | 'city' | 'district' | 'rating' | 'reviews_count'>,
  previewUrl: string,
): GeneratedPreviewCopy {
  const displayName = cleanBusinessDisplayName(lead.name);
  return {
    displayName,
    heroTagline: 'أناقة تبدأ من التفاصيل',
    aboutText: fallbackAboutText(displayName),
    marketingDescription: 'حضور رقمي مرتب يسهّل على العميل معرفة النشاط والوصول إلى وسائل التواصل من الجوال.',
    services: [],
    messageVariants: buildProfessionalOutreachVariants(displayName, previewUrl),
    model: 'fallback',
    usedFallback: true,
  };
}

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    heroTagline: { type: 'string' },
    aboutText: { type: 'string' },
    marketingDescription: { type: 'string' },
    whatsappMessage: { type: 'string' },
  },
  required: ['heroTagline', 'aboutText', 'marketingDescription', 'whatsappMessage'],
} as const;

interface OpenAIPreviewCopy {
  heroTagline: string;
  aboutText: string;
  marketingDescription: string;
  whatsappMessage: string;
}

export async function generatePreviewCopy(lead: LeadRecord, previewUrl: string): Promise<GeneratedPreviewCopy> {
  const openai = getClient();
  if (!openai) return fallbackCopy(lead, previewUrl);

  const displayName = cleanBusinessDisplayName(lead.name);
  const model = process.env.OPENAI_MODEL || 'gpt-5-mini';
  const realData = {
    displayName,
    city: lead.city,
    district: lead.district,
    primaryType: lead.primary_type,
    previewUrlPlaceholder: '{{PREVIEW_URL}}',
  };

  try {
    const response = await openai.responses.create({
      model,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: [
                'أنت كاتب محتوى سعودي لمنصة تنشئ تصورات مواقع احترافية لأنشطة الحلاقة والعناية الرجالية.',
                'أعد JSON فقط بالمفاتيح: heroTagline وaboutText وmarketingDescription وwhatsappMessage.',
                'لا تكرر اسم النشاط أكثر من مرة داخل كل حقل، ولا تضع التقييم داخل العنوان أو أي نص تسويقي.',
                'لا تضع رابطًا أو ساعات عمل أو تقييمًا داخل aboutText.',
                'لا تختلق أسعارًا أو خدمات أو سنوات خبرة أو وعودًا لا تؤكدها البيانات.',
                'heroTagline من 3 إلى 7 كلمات، وaboutText من 20 إلى 45 كلمة.',
                'استخدم عربية سعودية طبيعية وابتعد عن: الأفضل على الإطلاق، رقم واحد، خبرة عشرات السنوات.',
                'whatsappMessage من 45 إلى 75 كلمة، ويذكر اسم النشاط مرة واحدة، ولا يدعي أن العميل طلب الموقع أو أن الموقع جاهز.',
                'ضع {{PREVIEW_URL}} في سطر مستقل داخل whatsappMessage ولا تستخدم URL فعليًا أو نصًا URL-encoded.',
                'لا تستخدم عبارة نموذج بسيط أو نموذج معاينة بسيط.',
              ].join('\n'),
            },
          ],
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: JSON.stringify(realData) }],
        },
      ],
      text: {
        verbosity: 'low',
        format: {
          type: 'json_schema',
          name: 'salon_preview_copy',
          strict: true,
          schema: responseSchema,
        },
      },
    });

    const parsed = JSON.parse(response.output_text) as OpenAIPreviewCopy;
    return {
      displayName,
      heroTagline: cleanHeroTagline(parsed.heroTagline, displayName),
      aboutText: cleanAboutText(parsed.aboutText, displayName),
      marketingDescription: cleanMarketingDescription(parsed.marketingDescription),
      services: [],
      messageVariants: buildProfessionalOutreachVariants(displayName, previewUrl, parsed.whatsappMessage),
      model,
      usedFallback: false,
    };
  } catch {
    return fallbackCopy(lead, previewUrl);
  }
}
