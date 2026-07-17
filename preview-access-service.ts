'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Copy, ExternalLink, LoaderCircle, MapPin, MessageCircle, Phone, RefreshCw, Save, XCircle } from 'lucide-react';
import { ContactStatusBadge, WebsiteStatusBadge } from '@/components/status-badge';
import { buildWhatsAppUrl } from '@/lib/phone';
import type { LeadRecord, OutreachMessageRecord, PreviewRecord } from '@/types/domain';

interface PreviewWithUrl extends PreviewRecord { url: string }
interface ContactLog { id: string; action: string; message_snapshot: string | null; contacted_at: string | null; notes: string | null; created_at: string }
interface DetailPayload { lead: LeadRecord; previews: PreviewWithUrl[]; messages: OutreachMessageRecord[]; contactLogs: ContactLog[] }

export default function LeadDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<DetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [messageText, setMessageText] = useState('');
  const [notes, setNotes] = useState('');

  async function load() {
    setLoading(true);
    const response = await fetch(`/api/leads/${id}`, { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok || !payload.success) setError(payload.error || 'تعذر تحميل العميل.');
    else {
      setData(payload);
      setMessageText(payload.messages?.[0]?.message_text || '');
      setNotes(payload.lead.notes || '');
    }
    setLoading(false);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (id) void load(); }, [id]);

  const lead = data?.lead;
  const preview = data?.previews?.[0];
  const message = data?.messages?.[0];
  const whatsappUrl = lead?.phone_international ? buildWhatsAppUrl(lead.phone_international, messageText) : null;
  const blocked = lead?.contact_status === 'DO_NOT_CONTACT' || lead?.contact_status === 'NOT_INTERESTED';

  function toast(text: string) { setNotice(text); window.setTimeout(() => setNotice(''), 2500); }
  async function copy(text: string, label: string) { await navigator.clipboard.writeText(text); toast(label); }

  async function createPreview(regenerate = false) {
    setWorking('preview'); setError('');
    const response = await fetch(`/api/leads/${id}/preview`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresInDays: 30, regenerate }) });
    const payload = await response.json();
    if (!response.ok || !payload.success) setError(payload.error || 'تعذر إنشاء المعاينة.');
    else { toast(payload.reused ? 'المعاينة الحالية جاهزة.' : 'تم إنشاء رابط المعاينة الخاص.'); await load(); }
    setWorking('');
  }

  async function regenerateMessage() {
    setWorking('message'); setError('');
    const response = await fetch(`/api/leads/${id}/message`, { method: 'POST' });
    const payload = await response.json();
    if (!response.ok || !payload.success) setError(payload.error || 'تعذر توليد الرسالة.');
    else { setMessageText(payload.message.message_text); toast('تم توليد صيغة جديدة.'); await load(); }
    setWorking('');
  }

  async function saveMessage() {
    if (!message) return;
    setWorking('save-message');
    const response = await fetch(`/api/leads/${id}/message`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messageId: message.id, messageText }) });
    const payload = await response.json();
    if (!response.ok || !payload.success) setError(payload.error || 'تعذر حفظ الرسالة.'); else toast('تم حفظ تعديل الرسالة.');
    setWorking('');
  }

  async function saveNotes() {
    setWorking('notes');
    const response = await fetch(`/api/leads/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes }) });
    const payload = await response.json();
    if (!response.ok || !payload.success) setError(payload.error || 'تعذر حفظ الملاحظات.'); else toast('تم حفظ الملاحظات.');
    setWorking('');
  }

  async function logAction(action: 'OPENED_WHATSAPP' | 'MARKED_SENT' | 'NOT_SENT' | 'DO_NOT_CONTACT') {
    const response = await fetch(`/api/leads/${id}/contact`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, messageId: message?.id, messageSnapshot: messageText, notes: action === 'DO_NOT_CONTACT' ? 'طلب عدم التواصل أو قرار إداري.' : undefined }) });
    const payload = await response.json();
    if (!response.ok || !payload.success) setError(payload.error || 'تعذر تسجيل الإجراء.');
    else { toast(action === 'MARKED_SENT' ? 'تم تسجيل أن الرسالة أُرسلت.' : action === 'NOT_SENT' ? 'بقيت الحالة دون تغيير.' : action === 'DO_NOT_CONTACT' ? 'تم تعطيل التواصل.' : 'تم فتح واتساب فقط.'); await load(); }
  }

  function openWhatsApp() {
    if (!whatsappUrl || blocked) return;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    void logAction('OPENED_WHATSAPP');
  }

  async function togglePreview() {
    if (!preview) return;
    setWorking('preview-state');
    const response = await fetch(`/api/previews/${preview.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !preview.is_active }) });
    const payload = await response.json();
    if (!response.ok || !payload.success) setError(payload.error || 'تعذر تحديث الرابط.'); else { toast(preview.is_active ? 'تم تعطيل الرابط.' : 'تم تفعيل الرابط.'); await load(); }
    setWorking('');
  }

  if (loading) return <div className="flex items-center justify-center gap-2 py-24 text-white/45"><LoaderCircle className="animate-spin" /> جاري تحميل التفاصيل</div>;
  if (!lead || !data) return <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">{error || 'العميل غير موجود.'}</div>;

  return (
    <main>
      <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div><div className="mb-3 flex flex-wrap gap-2"><WebsiteStatusBadge status={lead.website_status} /><ContactStatusBadge status={lead.contact_status} /></div><h1 className="text-3xl font-black md:text-4xl">{lead.name}</h1><p className="mt-2 text-white/50">{[lead.district, lead.city].filter(Boolean).join('، ')}</p></div>
        <div className="flex flex-wrap gap-3"><a href={lead.maps_url || '#'} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 font-bold"><MapPin size={17} /> خرائط Google</a>{lead.phone_local ? <a href={`tel:${lead.phone_local}`} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 font-bold"><Phone size={17} /> اتصال</a> : null}</div>
      </header>

      {lead.last_contacted_at ? <div className="mb-6 flex gap-3 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 text-orange-100"><AlertTriangle className="shrink-0" /><div><div className="font-black">تم التواصل سابقًا</div><div className="text-sm opacity-70">{new Date(lead.last_contacted_at).toLocaleString('ar-SA')}</div></div></div> : null}
      {blocked ? <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">زر واتساب معطل: {lead.contact_block_reason || (lead.contact_status === 'DO_NOT_CONTACT' ? 'تم تحديد عدم التواصل.' : 'النشاط غير مهتم.')}</div> : null}
      {error ? <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div> : null}

      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="الهاتف" value={lead.phone_local || 'غير متوفر'} /><Info label="التقييم" value={`${lead.rating || 0} ★ (${lead.reviews_count})`} /><Info label="حالة النشاط" value={lead.business_status || 'غير واضحة'} /><Info label="نوع النشاط" value={lead.primary_type || 'غير محدد'} />
      </section>

      <section className="mb-6 grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
          <h2 className="text-xl font-black">بيانات Google Places</h2>
          <dl className="mt-5 space-y-4 text-sm"><DataRow label="العنوان" value={lead.address || 'غير متوفر'} /><DataRow label="رقم دولي" value={lead.phone_international || 'غير متوفر'} /><DataRow label="الموقع الإلكتروني" value={lead.website_url || 'لا يوجد رابط موقع'} /><DataRow label="الإحداثيات" value={lead.latitude && lead.longitude ? `${lead.latitude}, ${lead.longitude}` : 'غير متوفرة'} /></dl>
          {lead.opening_hours_json?.length ? <div className="mt-6"><h3 className="mb-3 font-black">ساعات العمل</h3><div className="space-y-2">{lead.opening_hours_json.map(line => <div key={line} className="rounded-xl bg-black/40 px-4 py-3 text-sm text-white/60">{line}</div>)}</div></div> : null}
        </article>
        <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
          <div className="flex items-center justify-between"><h2 className="text-xl font-black">الصور المتاحة</h2><span className="text-xs text-white/35">عبر Google Places</span></div>
          {lead.photos_json?.length ? <div className="mt-5 grid grid-cols-2 gap-3">{lead.photos_json.slice(0, 4).map((photo, index) => <div key={index} className="overflow-hidden rounded-2xl border border-white/10"><img src={`/api/google-photo?placeId=${encodeURIComponent(lead.google_place_id)}&index=${index}&width=700`} alt={`صورة ${lead.name} ${index + 1}`} className="aspect-[4/3] w-full object-cover" loading="lazy" /><Attribution names={(photo.authorAttributions || []).map(item => item.displayName).filter(Boolean) as string[]} /></div>)}</div> : <div className="mt-5 rounded-2xl border border-dashed border-white/15 p-10 text-center text-white/35">لا توجد صور متاحة. يمكن إضافة صور بديلة لاحقًا.</div>}
        </article>
      </section>

      <section className="mb-6 rounded-3xl border border-yellow-500/20 bg-yellow-500/[0.05] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><h2 className="text-xl font-black">رابط المعاينة الخاص</h2><p className="mt-1 text-sm text-white/45">لا يظهر في sitemap وموسوم noindex, nofollow.</p></div><div className="flex flex-wrap gap-3">{preview ? <><button onClick={() => copy(preview.url, 'تم نسخ رابط المعاينة.')} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 font-bold"><Copy size={17} /> نسخ الرابط</button><a href={preview.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-yellow-500 px-4 py-3 font-black text-black"><ExternalLink size={17} /> فتح المعاينة</a><button onClick={togglePreview} disabled={working === 'preview-state'} className="rounded-xl border border-white/15 px-4 py-3 font-bold">{preview.is_active ? 'تعطيل الرابط' : 'تفعيل الرابط'}</button><button onClick={() => createPreview(true)} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 font-bold"><RefreshCw size={16} /> إنشاء نسخة جديدة</button></> : <button onClick={() => createPreview(false)} disabled={working === 'preview'} className="inline-flex items-center gap-2 rounded-xl bg-yellow-500 px-5 py-3 font-black text-black">{working === 'preview' ? <LoaderCircle className="animate-spin" size={17} /> : <ExternalLink size={17} />} إنشاء المعاينة</button>}</div></div>
        {preview ? <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-black"><iframe src={preview.url} title={`معاينة ${lead.name}`} className="h-[520px] w-full" /></div> : null}
        {preview ? <div className="mt-3 text-xs text-white/40">ينتهي: {preview.expires_at ? new Date(preview.expires_at).toLocaleString('ar-SA') : 'بدون تاريخ'} · الحالة: {preview.is_active ? 'فعال' : 'معطل'}</div> : null}
      </section>

      <section className="mb-6 rounded-3xl border border-white/10 bg-white/[0.035] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><h2 className="text-xl font-black">رسالة التواصل</h2><p className="mt-1 text-sm text-white/45">راجع النص وعدّله قبل فتح واتساب.</p></div><button onClick={regenerateMessage} disabled={!preview || working === 'message'} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 font-bold disabled:opacity-40"><RefreshCw size={16} /> إعادة التوليد</button></div>
        <textarea value={messageText} onChange={event => setMessageText(event.target.value)} rows={8} className="mt-5 w-full rounded-2xl border border-white/15 bg-black/60 p-4 leading-8 outline-none focus:border-yellow-500" placeholder={preview ? 'جاري تجهيز الرسالة...' : 'أنشئ المعاينة أولًا'} />
        <div className="mt-4 flex flex-wrap gap-3"><button onClick={saveMessage} disabled={!message || working === 'save-message'} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 font-bold disabled:opacity-40"><Save size={16} /> حفظ التعديل</button><button onClick={() => copy(messageText, 'تم نسخ الرسالة.')} disabled={!messageText} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 font-bold disabled:opacity-40"><Copy size={16} /> نسخ الرسالة</button><button onClick={openWhatsApp} disabled={!whatsappUrl || blocked || !messageText} className="inline-flex items-center gap-2 rounded-xl bg-green-500 px-5 py-3 font-black text-black disabled:opacity-40"><MessageCircle size={17} /> فتح واتساب</button></div>
        <p className="mt-3 text-xs text-white/40">فتح واتساب يجهز الرسالة فقط. لن يضغط النظام زر الإرسال ولن يغيّر الحالة إلى CONTACTED.</p>
        <div className="mt-5 flex flex-wrap gap-3 border-t border-white/10 pt-5"><button onClick={() => logAction('MARKED_SENT')} disabled={!message || blocked} className="inline-flex items-center gap-2 rounded-xl bg-yellow-500 px-5 py-3 font-black text-black disabled:opacity-40"><CheckCircle2 size={17} /> تم الإرسال</button><button onClick={() => logAction('NOT_SENT')} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 font-bold"><XCircle size={17} /> لم أرسل</button><button onClick={() => logAction('DO_NOT_CONTACT')} className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 font-bold text-red-200">عدم التواصل مجددًا</button></div>
      </section>

      <section className="mb-6 grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-6"><h2 className="text-xl font-black">ملاحظات خاصة</h2><textarea value={notes} onChange={event => setNotes(event.target.value)} rows={6} className="mt-4 w-full rounded-2xl border border-white/15 bg-black/60 p-4 outline-none focus:border-yellow-500" /><button onClick={saveNotes} className="mt-3 rounded-xl bg-white/10 px-4 py-3 font-bold">حفظ الملاحظات</button></article>
        <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-6"><h2 className="text-xl font-black">سجل التواصل</h2><div className="mt-4 space-y-3">{data.contactLogs.length ? data.contactLogs.map(log => <div key={log.id} className="rounded-xl border border-white/10 bg-black/35 p-4 text-sm"><div className="font-bold">{actionLabel(log.action)}</div><div className="mt-1 text-white/40">{new Date(log.created_at).toLocaleString('ar-SA')}</div>{log.notes ? <div className="mt-2 text-white/55">{log.notes}</div> : null}</div>) : <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-white/35">لا يوجد سجل بعد.</div>}</div></article>
      </section>

      {notice ? <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-black shadow-2xl">{notice}</div> : null}
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) { return <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><div className="text-xs text-white/40">{label}</div><div className="mt-2 font-black">{value}</div></article>; }
function DataRow({ label, value }: { label: string; value: string }) { return <div className="flex flex-col gap-1 border-b border-white/10 pb-3 last:border-0"><dt className="text-white/35">{label}</dt><dd className="break-words font-bold text-white/75">{value}</dd></div>; }
function Attribution({ names }: { names: string[] }) { return names.length ? <div className="bg-black/80 px-3 py-2 text-[10px] text-white/55">الصورة: {names.join('، ')} · Google</div> : <div className="bg-black/80 px-3 py-2 text-[10px] text-white/45">صورة عبر Google Places</div>; }
function actionLabel(action: string) { return ({ OPENED_WHATSAPP: 'تم فتح واتساب دون إرسال', MARKED_SENT: 'تم تأكيد الإرسال يدويًا', NOT_SENT: 'لم يتم الإرسال', STATUS_CHANGED: 'تم تغيير حالة التواصل', NOTE_ADDED: 'تمت إضافة ملاحظة' } as Record<string,string>)[action] || action; }
