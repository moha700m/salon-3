'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Image as ImageIcon,
  LoaderCircle,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Send,
  Trash2,
} from 'lucide-react';
import type { LeadRecord, SalonCampaignRecord } from '@/types/domain';

interface Props {
  lead: LeadRecord;
  previewUrl?: string | null;
  campaign: SalonCampaignRecord | null;
  onReload: () => Promise<void>;
}

interface FormState {
  salonName: string;
  ownerName: string;
  phone: string;
  whatsapp: string;
  city: string;
  district: string;
  address: string;
  mapsUrl: string;
  workingHours: string;
  services: Array<{ name: string; price: string }>;
  instagramUrl: string;
  tiktokUrl: string;
  websitePreviewUrl: string;
  messageText: string;
}

function campaignForm(lead: LeadRecord, previewUrl: string | null | undefined, campaign: SalonCampaignRecord | null): FormState {
  return {
    salonName: campaign?.salon_name || lead.name,
    ownerName: campaign?.owner_name || '',
    phone: campaign?.phone || lead.phone_local || lead.phone_international || '',
    whatsapp: campaign?.whatsapp || lead.phone_international || lead.phone_local || '',
    city: campaign?.city || lead.city || '',
    district: campaign?.district || lead.district || '',
    address: campaign?.address || lead.address || '',
    mapsUrl: campaign?.maps_url || lead.maps_url || '',
    workingHours: campaign?.working_hours || lead.opening_hours_json?.join(' · ') || '',
    services: (campaign?.services_json || []).map(service => ({ name: service.name, price: service.price || '' })),
    instagramUrl: campaign?.instagram_url || '',
    tiktokUrl: campaign?.tiktok_url || '',
    websitePreviewUrl: campaign?.website_preview_url || previewUrl || '',
    messageText: campaign?.whatsapp_message || '',
  };
}

const missingLabels: Record<string, string> = {
  salon_name: 'اسم الصالون',
  whatsapp: 'رقم واتساب صحيح',
  website_preview_url: 'رابط معاينة الموقع',
};

const generationLabels: Record<string, string> = {
  draft: 'مسودة',
  generating: 'جاري الإنشاء',
  ready_for_review: 'جاهز للمراجعة',
  ready_to_send: 'جاهز للإرسال',
  partial_failure: 'مكتمل جزئيًا',
  failed: 'فشل الإنشاء',
};

const sendLabels: Record<string, string> = {
  not_sent: 'لم يُرسل',
  ready: 'جاهز للإرسال',
  sent: 'تم الإرسال',
  failed: 'فشل الإرسال',
};

export function SalonCampaignPanel({ lead, previewUrl, campaign, onReload }: Props) {
  const [form, setForm] = useState<FormState>(() => campaignForm(lead, previewUrl, campaign));
  const [editing, setEditing] = useState(!campaign);
  const [working, setWorking] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setForm(campaignForm(lead, previewUrl, campaign));
    if (!campaign) setEditing(true);
  }, [lead, previewUrl, campaign]);

  const canOpenWhatsApp = Boolean(campaign?.whatsapp_link && campaign.whatsapp_message && campaign.whatsapp);
  const missing = campaign?.missing_fields || [];
  const hasRequiredFields = missing.length === 0;

  const statusTone = useMemo(() => {
    if (campaign?.generation_status === 'failed' || campaign?.send_status === 'failed') return 'border-red-500/30 bg-red-500/10 text-red-100';
    if (campaign?.generation_status === 'partial_failure') return 'border-orange-500/30 bg-orange-500/10 text-orange-100';
    if (campaign?.generation_status === 'ready_to_send' || campaign?.send_status === 'sent') return 'border-green-500/30 bg-green-500/10 text-green-100';
    return 'border-yellow-500/25 bg-yellow-500/[0.07] text-yellow-100';
  }, [campaign]);

  function toast(text: string) {
    setNotice(text);
    window.setTimeout(() => setNotice(''), 2600);
  }

  function field<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(current => ({ ...current, [key]: value }));
  }

  function updateService(index: number, key: 'name' | 'price', value: string) {
    field('services', form.services.map((service, currentIndex) => currentIndex === index ? { ...service, [key]: value } : service));
  }

  function removeService(index: number) {
    field('services', form.services.filter((_, currentIndex) => currentIndex !== index));
  }

  function requestBody() {
    return {
      ...form,
      services: form.services.filter(service => service.name.trim()),
    };
  }

  async function generate() {
    setWorking('generate');
    setError('');
    try {
      const response = await fetch(`/api/leads/${lead.id}/campaign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody()),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'تعذر إنشاء الصورة والرسالة.');
      toast(payload.campaign.generation_status === 'partial_failure'
        ? 'تم إنشاء الموقع والرسالة، لكن الصورة تحتاج إلى إعادة توليد.'
        : 'تم إنشاء الموقع والصورة والرسالة.');
      setEditing(false);
      await onReload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذر إنشاء الحملة.');
    } finally {
      setWorking('');
    }
  }

  async function save() {
    if (!campaign) return generate();
    setWorking('save');
    setError('');
    try {
      const response = await fetch(`/api/leads/${lead.id}/campaign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody()),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'تعذر حفظ التعديلات.');
      toast('تم حفظ بيانات الصالون والرسالة.');
      setEditing(false);
      await onReload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذر حفظ التعديلات.');
    } finally {
      setWorking('');
    }
  }

  async function action(actionName: 'APPROVE' | 'MARK_SENT' | 'MARK_FAILED') {
    if (actionName === 'MARK_SENT' && !window.confirm('هل أرسلت الصورة والرسالة فعليًا إلى صاحب الصالون؟')) return;
    setWorking(actionName);
    setError('');
    try {
      const response = await fetch(`/api/leads/${lead.id}/campaign/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionName }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'تعذر تحديث الحالة.');
      toast(actionName === 'APPROVE' ? 'أصبحت الحملة جاهزة للإرسال.' : actionName === 'MARK_SENT' ? 'تم تسجيل الإرسال بنجاح.' : 'تم تسجيل فشل الإرسال.');
      await onReload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذر تحديث الحالة.');
    } finally {
      setWorking('');
    }
  }

  async function copyMessage() {
    const text = campaign?.whatsapp_message || form.messageText;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    toast('تم نسخ رسالة واتساب.');
  }

  function openWhatsApp() {
    if (!campaign?.whatsapp_link) return;
    const mobile = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const parsed = new URL(campaign.whatsapp_link);
    const phone = parsed.pathname.replace(/\D/g, '');
    const text = parsed.searchParams.get('text') || '';
    const destination = mobile
      ? campaign.whatsapp_link
      : `https://web.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}`;
    window.location.assign(destination);
  }

  return (
    <section className="mb-6 overflow-hidden rounded-3xl border border-amber-400/20 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,.12),transparent_32%),rgba(255,255,255,.035)]">
      <div className="border-b border-white/10 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-black text-amber-300"><ImageIcon size={17} /> معاينة رسالة الصالون</div>
            <h2 className="text-2xl font-black">الموقع + الصورة الإعلانية + رسالة واتساب</h2>
            <p className="mt-2 text-sm leading-7 text-white/45">لا يتم إرسال أي شيء تلقائيًا. راجع النتيجة ثم افتح واتساب وأرفق الصورة بنفسك.</p>
          </div>
          <div className={`flex flex-wrap gap-2 rounded-2xl border px-4 py-3 text-sm font-bold ${statusTone}`}>
            <span>{generationLabels[campaign?.generation_status || 'draft']}</span>
            <span className="opacity-40">•</span>
            <span>{sendLabels[campaign?.send_status || 'not_sent']}</span>
          </div>
        </div>
      </div>

      {error ? <div className="m-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-100">{error}</div> : null}
      {campaign?.last_error ? <div className="mx-6 mt-6 flex gap-3 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 text-orange-100"><AlertTriangle className="shrink-0" size={20} /><span>{campaign.last_error}</span></div> : null}
      {missing.length ? (
        <div className="mx-6 mt-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-100">
          <div className="font-black">البيانات الناقصة قبل الإرسال:</div>
          <div className="mt-2 flex flex-wrap gap-2">{missing.map(item => <span key={item} className="rounded-full bg-black/30 px-3 py-1.5 text-xs font-bold">{missingLabels[item] || item}</span>)}</div>
        </div>
      ) : null}

      <div className="grid gap-6 p-6 xl:grid-cols-[.88fr_1.12fr]">
        <article className="rounded-3xl border border-white/10 bg-black/35 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><div className="font-black">الصورة الإعلانية</div><div className="mt-1 text-xs text-white/35">1080 × 1350 PNG</div></div>
            {campaign?.advertisement_image_url ? <a href={campaign.advertisement_image_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs font-bold"><Download size={15} /> حفظ الصورة</a> : null}
          </div>
          {campaign?.advertisement_image_url ? (
            <img src={campaign.advertisement_image_url} alt={`إعلان ${campaign?.salon_name || lead.name}`} className="mx-auto aspect-[4/5] max-h-[680px] w-full rounded-2xl border border-white/10 object-contain" />
          ) : (
            <div className="grid aspect-[4/5] place-items-center rounded-2xl border border-dashed border-white/15 bg-black/40 p-8 text-center text-white/35">
              <div><ImageIcon className="mx-auto mb-3" /><p>أنشئ الحملة لعرض الصورة الإعلانية هنا.</p></div>
            </div>
          )}
        </article>

        <article className="rounded-3xl border border-white/10 bg-black/35 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><div className="font-black">الرسالة والروابط</div><div className="mt-1 text-xs text-white/35">راجع النص قبل فتح واتساب.</div></div>
            <button onClick={() => setEditing(value => !value)} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm font-bold"><Pencil size={15} /> {editing ? 'إخفاء التعديل' : 'تعديل البيانات'}</button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <MiniInfo label="اسم الصالون" value={campaign?.salon_name || form.salonName || lead.name} />
            <MiniInfo label="رقم واتساب" value={campaign?.whatsapp || form.whatsapp || 'غير متوفر'} />
            <MiniInfo label="رابط الموقع" value={campaign?.website_preview_url || form.websitePreviewUrl || 'غير متوفر'} wide />
            <MiniInfo label="حالة البيانات" value={hasRequiredFields ? 'مكتملة للإرسال' : 'تحتاج استكمال'} />
          </div>

          <textarea
            dir="rtl"
            rows={9}
            value={form.messageText}
            onChange={event => field('messageText', event.target.value)}
            className="mt-5 w-full rounded-2xl border border-white/15 bg-black/60 p-4 leading-8 outline-none focus:border-amber-400"
            placeholder="ستظهر رسالة واتساب بعد إنشاء الحملة."
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={copyMessage} disabled={!campaign?.whatsapp_message && !form.messageText} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 font-bold disabled:opacity-40"><Copy size={16} /> نسخ الرسالة</button>
            {campaign?.website_preview_url ? <a href={campaign.website_preview_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 font-bold"><ExternalLink size={16} /> فتح رابط الموقع</a> : null}
            <button onClick={openWhatsApp} disabled={!canOpenWhatsApp} className="inline-flex items-center gap-2 rounded-xl bg-green-500 px-4 py-3 font-black text-black disabled:opacity-40"><MessageCircle size={17} /> فتح واتساب</button>
          </div>
          <p className="mt-3 text-xs leading-6 text-white/40">بعد فتح واتساب، أرفق الصورة المحفوظة يدويًا ثم راجع الرسالة واضغط الإرسال بنفسك.</p>
        </article>
      </div>

      {editing ? (
        <div className="border-t border-white/10 p-6">
          <h3 className="text-lg font-black">بيانات التخصيص</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="اسم الصالون" value={form.salonName} onChange={value => field('salonName', value)} required />
            <Field label="اسم صاحب الصالون أو المسؤول" value={form.ownerName} onChange={value => field('ownerName', value)} />
            <Field label="رقم الاتصال" value={form.phone} onChange={value => field('phone', value)} />
            <Field label="رقم واتساب" value={form.whatsapp} onChange={value => field('whatsapp', value)} required />
            <Field label="المدينة" value={form.city} onChange={value => field('city', value)} />
            <Field label="الحي" value={form.district} onChange={value => field('district', value)} />
            <Field label="العنوان" value={form.address} onChange={value => field('address', value)} />
            <Field label="رابط Google Maps" value={form.mapsUrl} onChange={value => field('mapsUrl', value)} />
            <Field label="أوقات العمل المختصرة" value={form.workingHours} onChange={value => field('workingHours', value)} />
            <Field label="رابط معاينة الموقع" value={form.websitePreviewUrl} onChange={value => field('websitePreviewUrl', value)} required />
            <Field label="رابط إنستغرام" value={form.instagramUrl} onChange={value => field('instagramUrl', value)} />
            <Field label="رابط تيك توك" value={form.tiktokUrl} onChange={value => field('tiktokUrl', value)} />
          </div>

          <div className="mt-7">
            <div className="flex items-center justify-between gap-3"><h4 className="font-black">الخدمات والأسعار</h4><button onClick={() => field('services', [...form.services, { name: '', price: '' }])} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm font-bold"><Plus size={15} /> إضافة خدمة</button></div>
            <div className="mt-3 space-y-3">
              {form.services.length ? form.services.map((service, index) => (
                <div key={index} className="grid gap-3 rounded-2xl border border-white/10 bg-black/30 p-3 sm:grid-cols-[1fr_180px_auto]">
                  <input value={service.name} onChange={event => updateService(index, 'name', event.target.value)} placeholder="اسم الخدمة" className="rounded-xl border border-white/15 bg-black/60 px-4 py-3 outline-none focus:border-amber-400" />
                  <input value={service.price} onChange={event => updateService(index, 'price', event.target.value)} placeholder="السعر أو اتركه فارغًا" className="rounded-xl border border-white/15 bg-black/60 px-4 py-3 outline-none focus:border-amber-400" />
                  <button onClick={() => removeService(index)} aria-label="حذف الخدمة" className="grid min-h-12 place-items-center rounded-xl border border-red-500/25 bg-red-500/10 px-4 text-red-200"><Trash2 size={17} /></button>
                </div>
              )) : <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-white/35">لا توجد خدمات مدخلة. لن نخترع خدمات أو أسعارًا داخل الصورة.</div>}
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3 border-t border-white/10 p-6">
        <button onClick={generate} disabled={Boolean(working)} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-black text-black disabled:opacity-50">{working === 'generate' ? <LoaderCircle className="animate-spin" size={17} /> : <RefreshCw size={17} />} {campaign ? 'إعادة إنشاء الصورة والرسالة' : 'إنشاء الصورة والرسالة'}</button>
        <button onClick={save} disabled={Boolean(working)} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 font-bold disabled:opacity-50"><Save size={17} /> حفظ التعديلات</button>
        <button onClick={() => action('APPROVE')} disabled={!campaign || !hasRequiredFields || campaign.generation_status === 'ready_to_send' || Boolean(working)} className="inline-flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-5 py-3 font-bold text-green-100 disabled:opacity-35"><Check size={17} /> جاهز للإرسال</button>
        <button onClick={() => action('MARK_SENT')} disabled={!campaign || campaign.generation_status !== 'ready_to_send' || campaign.send_status === 'sent' || Boolean(working)} className="inline-flex items-center gap-2 rounded-xl bg-green-500 px-5 py-3 font-black text-black disabled:opacity-35"><Send size={17} /> تم الإرسال</button>
        {campaign?.send_status === 'sent' ? <span className="inline-flex items-center gap-2 rounded-xl border border-green-500/25 bg-green-500/10 px-4 py-3 text-sm font-bold text-green-100"><CheckCircle2 size={17} /> تم تسجيل الإرسال</span> : null}
      </div>

      {notice ? <div className="fixed bottom-5 left-1/2 z-[80] -translate-x-1/2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-black shadow-2xl">{notice}</div> : null}
    </section>
  );
}

function Field({ label, value, onChange, required = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return <label className="grid gap-2 text-sm"><span className="font-bold text-white/65">{label}{required ? <span className="mr-1 text-amber-300">*</span> : null}</span><input value={value} onChange={event => onChange(event.target.value)} className="rounded-xl border border-white/15 bg-black/60 px-4 py-3 outline-none focus:border-amber-400" /></label>;
}

function MiniInfo({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <div className={`rounded-2xl border border-white/10 bg-white/[0.03] p-4 ${wide ? 'sm:col-span-2' : ''}`}><div className="text-xs text-white/35">{label}</div><div className="mt-2 break-all text-sm font-bold text-white/75">{value}</div></div>;
}
