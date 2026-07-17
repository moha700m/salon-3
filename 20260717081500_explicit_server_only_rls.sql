# نشر Salon Agent على Supabase وVercel

## 1. Supabase

طبّق migrations الموجودة في `supabase/migrations` بالترتيب. هذه النسخة تستخدم جداول `leads`, `previews`, `contact_logs`, `search_jobs`, و`place_cache` مع RLS وسياسات منع للمتصفح.

لا تضع `SUPABASE_SERVICE_ROLE_KEY` في الواجهة أو داخل متغير يبدأ بـ `NEXT_PUBLIC_`.

## 2. متغيرات Vercel

المطلوبة للتشغيل:

- `OPENAI_API_KEY`
- `GOOGLE_PLACES_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DASHBOARD_USERNAME`
- `DASHBOARD_PASSWORD`
- `CRON_SECRET`

الموصى بها:

- `NEXT_PUBLIC_APP_URL`
- `OPENAI_MODEL`، والافتراضي `gpt-5-mini`
- `PREVIEW_TOKEN_SECRET` لتوقيع توكنات المعاينة بمفتاح مستقل
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` فقط إذا أضيفت لاحقًا وظائف متصفح تحتاج المفتاح العام؛ التطبيق الحالي لا يعتمد عليه للوصول للبيانات

استخدم القيم في بيئات **Production وPreview وDevelopment** حسب الحاجة، ثم نفّذ Redeploy بعد أي إضافة أو تغيير.

## 3. Google Places API (New)

فعّل Places API (New) واربط Billing، ثم قيّد المفتاح على هذه الخدمة وعلى الاستخدام من خادم Vercel. البحث والتفاصيل تتم من API Routes على الخادم، وليست من المتصفح.

المنصة تستخدم cache لبيانات المكان مدة 21 يومًا. صور Google لا تُنزّل للتخزين الدائم؛ تُطلب من Google عند العرض مع بيانات الإسناد.

## 4. OpenAI

المفتاح يستخدم من الخادم فقط لتوليد نص المعاينة ورسالة التواصل. يوجد محتوى احتياطي آمن عند فشل API، دون أسعار أو ادعاءات مختلقة.

## 5. WhatsApp اليدوي

لا تحتاج Meta Business أو WhatsApp Cloud API. النظام ينشئ رابطًا بهذا الشكل:

```text
https://wa.me/9665XXXXXXXX?text=ENCODED_MESSAGE
```

يفتح الرابط المحادثة والرسالة جاهزة، لكن المستخدم هو من يضغط إرسال. لا تتغير الحالة إلى `CONTACTED` إلا بعد الضغط على **تم الإرسال** في لوحة التحكم.

## 6. الحماية

لوحة التحكم محمية بـ Basic Auth من خلال `DASHBOARD_USERNAME` و`DASHBOARD_PASSWORD`. في الإنتاج، إذا لم تتم تهيئتهما، يفشل الدخول بشكل مغلق بدل كشف البيانات.

المعاينات عامة فقط لمن يملك الرابط والتوكن، ولا تكشف بيانات لوحة التحكم أو سجل التواصل.

## 7. Cron

`vercel.json` يشغّل اكتشافًا يوميًا عند 06:00 UTC، أي 09:00 بتوقيت السعودية. المسار محمي بـ `CRON_SECRET`، ولا يرسل أي رسالة واتساب.
