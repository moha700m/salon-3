export interface LegacyBarberContent {
  hero_title_ar: string;
  hero_title_en: string;
  tagline_ar: string;
  tagline_en: string;
  about_ar: string;
  about_en: string;
  services: Array<{ name_ar: string; name_en: string; description_ar: string; icon: string }>;
  whatsapp_message_ar: string;
  whatsapp_message_en: string;
}

export function fallbackBarberContent(name: string, rating: number): LegacyBarberContent {
  return {
    hero_title_ar: `${name} — نموذج رقمي قابل للتخصيص`,
    hero_title_en: `${name} — Customizable Digital Preview`,
    tagline_ar: 'عرض مرتب لمعلومات النشاط',
    tagline_en: 'A clear presentation of business information',
    about_ar: `${name} نشاط حلاقة مسجل في خرائط Google. يعرض هذا النموذج المعلومات العامة المتوفرة، ويمكن تعديل المحتوى والخدمات قبل الاستخدام الفعلي. التقييم الظاهر هو ${rating || 0} نجمة وفق البيانات المتاحة.`,
    about_en: `${name} is listed on Google Maps. This preview shows available public information and can be customized before real use.`,
    services: [
      { name_ar: 'قص الشعر', name_en: 'Haircut', description_ar: 'خدمة عامة مقترحة قابلة للتعديل.', icon: 'scissors' },
      { name_ar: 'تهذيب اللحية', name_en: 'Beard Trim', description_ar: 'خدمة مقترحة يجب تأكيد توفرها.', icon: 'beard' },
      { name_ar: 'حلاقة كاملة', name_en: 'Classic Shave', description_ar: 'صياغة عامة دون أسعار أو وعود.', icon: 'razor' },
      { name_ar: 'تصفيف الشعر', name_en: 'Hair Styling', description_ar: 'خدمة عامة قابلة للتخصيص.', icon: 'shampoo' },
    ],
    whatsapp_message_ar: `مرحباً ${name}، هذه معاينة تجريبية قابلة للتخصيص.`,
    whatsapp_message_en: `Hello ${name}, this is a customizable preview.`,
  };
}
