import OpenAI from 'openai';
import type { LeadRecord, PreviewService } from '@/types/domain';

let client: OpenAI | null = null;

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new OpenAI({ apiKey });
  return client;
}

export interface GeneratedPreviewCopy {
  title: string;
  subtitle: string;
  aboutText: string;
  marketingSummary: string;
  services: PreviewService[];
  messageVariants: string[];
  model: string;
  usedFallback: boolean;
}

const genericServices: PreviewService[] = [
  { name: 'قص الشعر', description: 'خدمة عامة قابلة للتعديل وفق الخدمات الفعلية لدى المحل.', editable: true },
  { name: 'تهذيب اللحية', description: 'خدمة مقترحة للنموذج، ويجب تأكيد توفرها مع النشاط.', editable: true },
  { name: 'حلاقة كاملة', description: 'صياغة عامة قابلة للتخصيص دون أسعار أو وعود غير مؤكدة.', editable: true },
  { name: 'تصفيف الشعر', description: 'خدمة عامة يمكن تعديل اسمها ووصفها قبل إطلاق الموقع.', editable: true },
];

export function fallbackCopy(lead: Pick<LeadRecord, 'name' | 'city' | 'district' | 'rating' | 'reviews_count'>, previewUrl: string): GeneratedPreviewCopy {
  const location = [lead.district, lead.city].filter(Boolean).join('، ');
  return {
    title: lead.name,
    subtitle: `نموذج رقمي مبسط لعرض معلومات ${lead.name} على الجوال`,
    aboutText: `${lead.name} نشاط حلاقة مسجل في خرائط Google${location ? ` في ${location}` : ''}. تعرض هذه الصفحة المعلومات المتوفرة للعامة فقط، ويمكن تعديل النصوص والخدمات قبل الاستخدام الفعلي.`,
    marketingSummary: `معاينة سريعة توضح كيف يمكن عرض معلومات ${lead.name} بصورة مرتبة ومتجاوبة.`,
    services: genericServices,
    messageVariants: [
      `السلام عليكم، معك محمد. شفت نشاط ${lead.name} في خرائط Google ولاحظت أن ما فيه موقع واضح للعملاء، فسويت لكم نموذجًا مجانيًا سريعًا يوضح كيف ممكن يظهر نشاطكم على الجوال: ${previewUrl} إذا ناسبكم أشرح لكم التفاصيل، وإذا ما يناسبكم أعتذر ولن أكرر التواصل.`,
      `السلام عليكم، أنا محمد. جهزت نموذج معاينة بسيط لـ ${lead.name} اعتمادًا على المعلومات العامة في خرائط Google، فقط لتشوفون شكل حضور مرتب على الجوال: ${previewUrl} إذا حابين أوضح الفكرة أنا حاضر، وإذا ما يناسبكم يكفيني تنبيه ولن أتواصل مرة ثانية.`,
      `حياكم الله، معك محمد. أثناء بحثي عن أنشطة الحلاقة ظهر لي ${lead.name} وما لقيت له موقعًا واضحًا، فعملت نموذجًا تجريبيًا مجانيًا: ${previewUrl} ما تم نشره كموقع مستقل وهو قابل للتعديل بالكامل. إذا مهتمين أشرح التفاصيل، وإن لم يناسبكم أعتذر ولن أكرر الرسالة.`,
    ],
    model: 'fallback',
    usedFallback: true,
  };
}

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    subtitle: { type: 'string' },
    aboutText: { type: 'string' },
    marketingSummary: { type: 'string' },
    services: {
      type: 'array',
      minItems: 4,
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          editable: { type: 'boolean' },
        },
        required: ['name', 'description', 'editable'],
      },
    },
    messageVariants: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: { type: 'string' },
    },
  },
  required: ['title', 'subtitle', 'aboutText', 'marketingSummary', 'services', 'messageVariants'],
} as const;

export async function generatePreviewCopy(lead: LeadRecord, previewUrl: string): Promise<GeneratedPreviewCopy> {
  const openai = getClient();
  if (!openai) return fallbackCopy(lead, previewUrl);

  const model = process.env.OPENAI_MODEL || 'gpt-5-mini';
  const realData = {
    name: lead.name,
    city: lead.city,
    district: lead.district,
    address: lead.address,
    rating: lead.rating,
    reviewsCount: lead.reviews_count,
    openingHours: lead.opening_hours_json,
    primaryType: lead.primary_type,
    previewUrl,
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
                'أنت كاتب محتوى سعودي لمنصة تنشئ نماذج مواقع تجريبية لمحلات الحلاقة.',
                'استخدم المعلومات الحقيقية المقدمة فقط. لا تخترع أسعارًا أو خبرات أو خدمات مؤكدة.',
                'الخدمات الأربع يجب أن تكون خدمات عامة قابلة للتعديل، واكتب بوضوح في الوصف أنها مقترحة أو قابلة للتعديل.',
                'أنشئ ثلاث رسائل واتساب قصيرة وطبيعية ومختلفة، تتضمن اسم النشاط ورابط المعاينة، ولا تدعي طلب العميل للموقع أو وجود اتفاق سابق.',
                'كل رسالة يجب أن تتضمن طريقة مهذبة لطلب عدم التواصل مرة أخرى.',
                'استخدم العربية السعودية الطبيعية دون مبالغة.',
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

    const parsed = JSON.parse(response.output_text) as Omit<GeneratedPreviewCopy, 'model' | 'usedFallback'>;
    return { ...parsed, model, usedFallback: false };
  } catch {
    return fallbackCopy(lead, previewUrl);
  }
}
