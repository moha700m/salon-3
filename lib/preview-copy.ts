import type { PreviewService } from '@/types/domain';

const URL_PATTERN = /(?:https?:\/\/|www\.)\S+/giu;
const STRUCTURED_INFO_PATTERN = /(?:https?:\/\/|www\.|ساعات?\s+العمل|أوقات?\s+العمل|التقييم|تقييم|نجوم?|مراجعات?|google\s*maps|خرائط\s*google|\b\d{1,2}:\d{2}\b)/iu;
const RATING_PATTERN = /(?:⭐|★|[0-5](?:[.,]\d{1,2})?\s*(?:من\s*5|نجوم?)|تقييم)/iu;
const PROHIBITED_OUTREACH = /(?:نموذج\s+(?:معاينة\s+)?بسيط|موقعكم\s+جاهز|اعتمادًا\s+على\s+المعلومات\s+العامة\s+في\s+خرائط\s+Google)/iu;

export const DEFAULT_HERO_TAGLINE = 'أناقة تبدأ من التفاصيل';

export function countWords(value: string): number {
  return value.trim().split(/\s+/u).filter(Boolean).length;
}

function compact(value: string): string {
  return value.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

export function cleanHeroTagline(value?: string | null, displayName?: string): string {
  const candidate = compact((value || '').replace(URL_PATTERN, ''));
  const words = countWords(candidate);
  if (
    words < 3
    || words > 7
    || RATING_PATTERN.test(candidate)
    || (displayName && candidate.includes(displayName))
  ) {
    return DEFAULT_HERO_TAGLINE;
  }
  return candidate;
}

export function fallbackAboutText(displayName: string): string {
  return `يقدّم ${displayName} تجربة عناية رجالية تركّز على التفاصيل والمظهر المرتب. صُممت هذه الصفحة لتوضيح الخدمات ووسائل التواصل بطريقة واضحة وسهلة من الجوال.`;
}

export function cleanAboutText(value: string | null | undefined, displayName: string): string {
  const candidate = compact((value || '').replace(URL_PATTERN, ''));
  const words = countWords(candidate);
  const nameOccurrences = candidate.split(displayName).length - 1;
  if (!candidate || words < 20 || words > 45 || nameOccurrences > 1 || STRUCTURED_INFO_PATTERN.test(candidate)) {
    return fallbackAboutText(displayName);
  }
  return candidate;
}

export function cleanMarketingDescription(value?: string | null): string {
  const candidate = compact((value || '').replace(URL_PATTERN, ''));
  if (!candidate || countWords(candidate) > 24 || STRUCTURED_INFO_PATTERN.test(candidate)) {
    return 'حضور رقمي مرتب يسهّل على العميل معرفة النشاط والوصول إلى وسائل التواصل من الجوال.';
  }
  return candidate;
}



const BARBER_FALLBACK_SERVICES: PreviewService[] = [
  {
    name: 'قص شعر رجالي',
    description: 'قصات مرتبة وكلاسيكية أو عصرية بحسب ذوق العميل.',
    editable: true,
  },
  {
    name: 'تهذيب اللحية',
    description: 'ترتيب وتحديد اللحية لإطلالة أنيقة ومتوازنة.',
    editable: true,
  },
  {
    name: 'تدريج وتشذيب',
    description: 'عناية دقيقة بالتفاصيل والجوانب وخطوط الشعر.',
    editable: true,
  },
  {
    name: 'حلاقة وتنظيف',
    description: 'حلاقة مرتبة ولمسات نهائية تمنح مظهرًا نظيفًا.',
    editable: true,
  },
  {
    name: 'تصفيف الشعر',
    description: 'تصفيف يناسب شكل الوجه والمظهر المطلوب.',
    editable: true,
  },
  {
    name: 'تجهيز للمناسبات',
    description: 'لمسات عناية وتصفيف لإطلالة مناسبة للمناسبة.',
    editable: true,
  },
];

export function fallbackPreviewServices(primaryType?: string | null): PreviewService[] {
  if (primaryType === 'barber_shop' || primaryType === 'hair_salon' || !primaryType) {
    return BARBER_FALLBACK_SERVICES.map(service => ({ ...service }));
  }

  return [
    {
      name: 'عناية بالمظهر',
      description: 'خدمة عامة قابلة للتخصيص بحسب ما يقدمه النشاط فعليًا.',
      editable: true,
    },
    {
      name: 'تجهيز شخصي',
      description: 'عناية مرتبة تناسب احتياج العميل والمناسبة.',
      editable: true,
    },
    {
      name: 'استشارة واختيار',
      description: 'مساعدة العميل في اختيار الخدمة الأنسب له.',
      editable: true,
    },
  ];
}

export function resolvePreviewServices(
  services: PreviewService[] | null | undefined,
  primaryType?: string | null,
): { services: PreviewService[]; isFallback: boolean } {
  const valid = (services || []).filter(service => service?.name?.trim());
  return valid.length
    ? { services: valid, isFallback: false }
    : { services: fallbackPreviewServices(primaryType), isFallback: true };
}

function validOutreachMessage(message: string, displayName: string, previewUrl: string): boolean {
  const words = countWords(message);
  const nameOccurrences = message.split(displayName).length - 1;
  const urls = message.match(/https?:\/\/\S+/giu) || [];
  return words >= 45
    && words <= 75
    && nameOccurrences === 1
    && urls.length === 1
    && urls[0] === previewUrl
    && message.includes(`\n${previewUrl}\n`)
    && !message.includes('%D8')
    && !PROHIBITED_OUTREACH.test(message);
}

export function buildProfessionalOutreachVariants(
  displayName: string,
  previewUrl: string,
  aiMessage?: string | null,
): string[] {
  const variants = [
    `السلام عليكم، معك محمد.
جهزت لكم تصورًا سريعًا لموقع يعرّف بخدمات ${displayName} ويسهّل وصول العملاء لكم من الجوال. التصور يرتب معلومات النشاط والخدمات ووسائل التواصل في صفحة واضحة وسريعة.

رابط المعاينة:
${previewUrl}

إذا ناسبكم التصور أرسل لكم التفاصيل، وإن ما كان مناسب ما راح أكرر التواصل. يعطيكم العافية.`,
    `حياكم الله، معكم محمد.
أعددت تصورًا مختصرًا لصفحة رقمية تخص ${displayName} وتعرض الخدمات ومعلومات التواصل بشكل مرتب يناسب استخدام الجوال. الهدف أن يشاهد العميل المعلومات المهمة بسرعة ويصل للاتصال أو الاتجاهات بسهولة.

رابط المعاينة:
${previewUrl}

يسعدني أوضح لكم التفاصيل إذا ناسبكم الأسلوب، وإذا ما كان مناسب يكفيني تنبيهكم ولن أكرر التواصل. كل التقدير لكم.`,
    `السلام عليكم، أنا محمد.
عملت تصورًا أوليًا لموقع أنيق لـ ${displayName} يقدّم نبذة واضحة عن النشاط، ويرتب الخدمات وطرق التواصل والاتجاهات في تجربة مريحة على الجوال. هذا مجرد تصور قابل للمراجعة والتعديل قبل أي خطوة أخرى.

رابط المعاينة:
${previewUrl}

إذا أعجبكم التصور أشارككم التفاصيل، وإذا ما ناسبكم أخبروني وما راح أكرر الرسالة. شكرًا لوقتكم.`,
    `أسعد الله يومكم، معكم محمد.
جهزت تصورًا سريعًا يوضح كيف ممكن يظهر ${displayName} في صفحة احترافية وسهلة على الجوال، مع ترتيب الخدمات ومعلومات الموقع وأزرار الاتصال والاتجاهات بشكل مباشر وواضح للعملاء.

رابط المعاينة:
${previewUrl}

إذا حابين نكمل أرسل لكم التفاصيل بكل وضوح، وإذا الفكرة ما ناسبتكم يكفيني رد مختصر ولن أكرر التواصل. يعطيكم العافية.`,
  ].map(compact);

  const normalizedAi = compact((aiMessage || '')
    .replace(/\{\{\s*PREVIEW_URL\s*\}\}/giu, previewUrl)
    .replace(URL_PATTERN, previewUrl));

  const ordered = validOutreachMessage(normalizedAi, displayName, previewUrl)
    ? [normalizedAi, ...variants]
    : variants;

  return [...new Set(ordered)]
    .filter(message => validOutreachMessage(message, displayName, previewUrl))
    .slice(0, 4);
}
