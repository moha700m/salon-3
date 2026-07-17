# Salon Agent — منصة اكتشاف عملاء صالونات الحلاقة

منصة عربية مبنية على **Next.js 16 + Supabase** تساعد على البحث عن محلات الحلاقة عبر Google Places API (New)، تمييز الأنشطة التي لا تملك موقعًا، إنشاء رابط معاينة خاص من قالب موحد، وتجهيز رسالة واتساب للمراجعة والإرسال اليدوي.

## التدفق الأساسي

1. افتح `/dashboard/search` وحدد المدينة والحي ونوع النشاط.
2. يجلب الخادم بيانات Google Places الرسمية ويحفظ النتائج دون تكرار باستخدام Google Place ID ورقم الهاتف.
3. راجع النتائج من `/dashboard/leads` وفلتر الأنشطة بدون موقع أو بدون هاتف.
4. أنشئ رابط معاينة خاص من صفحة تفاصيل العميل.
5. راجع الرسالة السعودية المقترحة وعدّلها.
6. اضغط **فتح واتساب** لفتح `wa.me` والرسالة مكتوبة مسبقًا.
7. اضغط زر الإرسال بنفسك داخل WhatsApp أو WhatsApp Web.
8. بعد الرجوع، اضغط **تم الإرسال** فقط لتسجيل حالة `CONTACTED` وسجل التواصل.

> هذه النسخة لا تستخدم WhatsApp Cloud API، ولا تتحكم في WhatsApp Web، ولا ترسل الرسائل تلقائيًا.

## أهم الصفحات

- `/dashboard` — نظرة عامة وإنشاء سريع من رابط Google Maps.
- `/dashboard/search` — البحث عن العملاء.
- `/dashboard/leads` — العملاء المحتملون والفلاتر والإجراءات الجماعية الآمنة.
- `/dashboard/leads/[id]` — التفاصيل، المعاينة، الرسالة، وسجل التواصل.
- `/p/[code]` — رابط مشاركة قصير وغير تسلسلي، مع `noindex,nofollow` ودعم التعطيل والانتهاء.
- `/preview/[slug]?token=...` — مسار المعاينة الخاص السابق محفوظ حتى لا تنكسر الروابط القديمة.
- `/site/[slug]` — المسار القديم محفوظ للتوافق مع النسخة السابقة.

## التشغيل المحلي

```bash
cp .env.example .env.local
npm ci
npm run dev
```

ثم افتح `http://localhost:3000/dashboard`.

## متغيرات البيئة

انسخ `.env.example` إلى `.env.local` وضع القيم السرية محليًا أو في Vercel فقط. لا تضع أي مفتاح داخل Git أو متغير يبدأ بـ `NEXT_PUBLIC_`، باستثناء عنوان التطبيق العام.

| المتغير | الحالة | الغرض |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` أو `SUPABASE_URL` | مطلوب | رابط مشروع Supabase. استخدم صيغة واحدة فقط. |
| `SUPABASE_SERVICE_ROLE_KEY` أو `SUPABASE_SECRET_KEY` | مطلوب | مفتاح الخادم فقط؛ لا يظهر للمتصفح. استخدم صيغة واحدة فقط. |
| `GOOGLE_PLACES_API_KEY` | مطلوب | جلب النشاط والصور من Google Places API (New). |
| `DASHBOARD_USERNAME` و`DASHBOARD_PASSWORD` | مطلوب في Production | حماية لوحة التحكم وواجهات الإدارة عبر Basic Auth. |
| `CRON_SECRET` | مطلوب في Production | حماية المسار اليومي `/api/cron/daily-discovery`. |
| `PREVIEW_TOKEN_SECRET` | موصى به بشدة | توقيع روابط المعاينة واشتقاق أكواد المشاركة القصيرة بمفتاح ثابت. عند غيابه يستخدم التطبيق مفتاح Supabase الخادمي كبديل. |
| `NEXT_PUBLIC_APP_URL` | موصى به | العنوان العام النهائي للتطبيق، ويُستخدم داخل روابط المعاينة. |
| `OPENAI_API_KEY` | اختياري | يولّد النصوص بالذكاء الاصطناعي؛ التطبيق يستخدم نصًا احتياطيًا آمنًا عند غيابه. |
| `OPENAI_MODEL` | اختياري | النموذج؛ الافتراضي `gpt-5-mini`. |
| `VERCEL_URL` و`VERCEL_PROJECT_PRODUCTION_URL` | تلقائي من Vercel | بدائل تلقائية لعنوان التطبيق؛ لا تضفها يدويًا. |
| `NODE_ENV` | تلقائي من التشغيل | يفعّل سلوك الإنتاج والحماية؛ لا تضفه يدويًا. |

## الفحص الكامل

```bash
npm run check
```

يشغّل TypeScript وESLint والاختبارات وبناء الإنتاج.

## قاعدة البيانات

توجد migrations الإضافية داخل:

```text
supabase/migrations/20260717080000_lead_platform_manual_whatsapp.sql
supabase/migrations/20260717081500_explicit_server_only_rls.sql
supabase/migrations/20260717082000_contact_log_message_index.sql
supabase/migrations/20260717102000_preview_access_reliability.sql
supabase/migrations/20260717132217_professional_preview_share_codes.sql
```

التغييرات إضافية ولا تحذف الجداول أو البيانات القديمة. Migration الرابط القصير تضيف hash فريدًا فقط؛ لا تخزن الكود بصيغته الخام. كل جداول لوحة التحكم محمية بـ RLS وسياسات منع صريحة للمتصفح، ويستخدم التطبيق مفتاح الخدمة من الخادم فقط.

## النشر

راجع `docs/DEPLOYMENT.md`. لا تضع أي secret داخل Git أو في متغير يبدأ بـ `NEXT_PUBLIC_` ما عدا القيم العامة المخصصة للمتصفح.

<!-- deployment-trigger: 2026-07-17 -->

## Deployment runtime

This build is pinned to Node.js 22.x and npm 10.9.2 for Vercel compatibility.
