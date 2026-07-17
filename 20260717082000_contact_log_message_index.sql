# Salon Agent — دليل المشروع

منصة لاكتشاف محلات الحلاقة، إنشاء معاينات خاصة، وتجهيز رسائل واتساب للإرسال اليدوي.

## البنية

```text
app/dashboard/search/          البحث عن العملاء عبر Google Places
app/dashboard/leads/           قائمة العملاء وصفحات التفاصيل
app/preview/[slug]/            قالب المعاينة الخاص
app/api/leads/                 البحث والحفظ والتحديث والتواصل اليدوي
app/api/google-photo/          عرض صور Google رسميًا دون تخزين دائم
lib/google-places.ts           Google Places API (New) + cache
lib/openai-service.ts          النصوص والرسائل عبر OpenAI من الخادم
lib/preview-service.ts         إنشاء الروابط والتوكن والانتهاء
lib/contact-service.ts         فتح واتساب وتأكيد الإرسال يدويًا
supabase/migrations/           تغييرات قاعدة البيانات الإضافية
```

## قاعدة مهمة لواتساب

زر **فتح واتساب** ينشئ رابط `wa.me` فقط. لا توجد أي دالة تضغط زر الإرسال، ولا توجد جلسات أو QR أو Cookies محفوظة، ولا يوجد WhatsApp Cloud API في هذه النسخة.

## رابط المعاينة

```text
https://DOMAIN/preview/barber-name?token=SECURE_TOKEN
```

الرابط خاص، غير موجود في sitemap، يحمل `noindex,nofollow`، ويمكن تعطيله أو تحديد تاريخ انتهاء له.

## التحقق

```bash
npm ci
npm run check
```
