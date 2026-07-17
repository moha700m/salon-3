'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, Copy, ExternalLink, Globe, LoaderCircle, MapPin, MessageCircle, Search, Sparkles, Users } from 'lucide-react';
import { buildWhatsAppUrl } from '@/lib/phone';

interface KPIs { potential_customers: number; websites_ready: number; contacted: number; positive_replies: number }
interface RecentLead {
  id: string; name: string; city: string; district: string | null; rating: number | null; reviews_count: number;
  phone_local: string | null; website_status: string; contact_status: string; previews?: Array<{ id: string; slug: string }>;
}
interface QuickResult {
  lead: { id: string; name: string; phone_international: string | null; city: string; website_status: string };
  previewUrl: string;
  message: { id: string; message_text: string } | null;
  usedFallback: boolean;
}

export default function DashboardHome() {
  const [kpis, setKpis] = useState<KPIs>({ potential_customers: 0, websites_ready: 0, contacted: 0, positive_replies: 0 });
  const [recent, setRecent] = useState<RecentLead[]>([]);
  const [mapsUrl, setMapsUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<QuickResult | null>(null);
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    const [kpiRes, recentRes] = await Promise.all([
      fetch('/api/dashboard/kpis', { cache: 'no-store' }),
      fetch('/api/dashboard/recent-barbers', { cache: 'no-store' }),
    ]);
    const kpi = await kpiRes.json();
    const list = await recentRes.json();
    if (kpi.success) setKpis(kpi);
    if (list.success) setRecent(list.data || []);
  }

  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setError(''); setResult(null);
    try {
      const response = await fetch('/api/create-from-map', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ googleMapsUrl: mapsUrl }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'تعذر إنشاء المعاينة.');
      setResult(payload);
      setMessage(payload.message?.message_text || '');
      setNotice('تم إنشاء رابط المعاينة الخاص. لم تُرسل أي رسالة.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'حدث خطأ غير متوقع.');
    } finally { setLoading(false); }
  }

  async function copy(value: string, text: string) {
    await navigator.clipboard.writeText(value); setNotice(text); window.setTimeout(() => setNotice(''), 2500);
  }

  const whatsappUrl = result?.lead.phone_international ? buildWhatsAppUrl(result.lead.phone_international, message) : null;

  return (
    <main>
      <header className="mb-8">
        <h1 className="text-3xl font-black md:text-4xl">لوحة التحكم</h1>
        <p className="mt-2 text-white/50">اكتشف الأنشطة، أنشئ روابط معاينة خاصة، ثم راجع الرسالة وافتح واتساب يدويًا.</p>
      </header>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Users />} value={kpis.potential_customers} label="بدون موقع" />
        <Kpi icon={<Globe />} value={kpis.websites_ready} label="معاينات جاهزة" />
        <Kpi icon={<MessageCircle />} value={kpis.contacted} label="تم التواصل" />
        <Kpi icon={<CheckCircle2 />} value={kpis.positive_replies} label="ردود إيجابية" />
      </section>

      <section className="mb-8 overflow-hidden rounded-[2rem] border border-yellow-500/30 bg-gradient-to-br from-yellow-500/15 via-white/[0.025] to-transparent p-6 md:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5 text-sm text-yellow-300"><Sparkles size={15} /> إنشاء سريع من رابط</div>
            <h2 className="text-3xl font-black">الصق رابط Google Maps</h2>
            <p className="mt-3 leading-8 text-white/55">يُحفظ النشاط كعميل محتمل، ثم تُنشأ معاينة خاصة ومسودة رسالة. لا يتم إرسال أي شيء تلقائيًا.</p>
            <form onSubmit={submit} className="mt-6 flex flex-col gap-3 md:flex-row">
              <input type="url" required value={mapsUrl} onChange={event => setMapsUrl(event.target.value)} placeholder="https://maps.app.goo.gl/..." dir="ltr" className="min-w-0 flex-1 rounded-2xl border border-white/15 bg-black/60 px-5 py-4 text-left outline-none focus:border-yellow-500" />
              <button disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-yellow-500 px-6 py-4 font-black text-black disabled:opacity-60">
                {loading ? <><LoaderCircle className="animate-spin" size={18} /> جاري الإنشاء</> : <><Sparkles size={18} /> أنشئ المعاينة</>}
              </button>
            </form>
            {error ? <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div> : null}
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/40 p-6">
            <h3 className="font-black">الطريقة الصحيحة</h3>
            <ol className="mt-5 space-y-4 text-sm leading-7 text-white/60">
              <li>1. أنشئ رابط المعاينة الخاص.</li><li>2. راجع النص وعدّله.</li><li>3. اضغط «فتح واتساب».</li><li>4. اضغط الإرسال بنفسك داخل واتساب.</li><li>5. ارجع واضغط «تم الإرسال» من تفاصيل العميل.</li>
            </ol>
          </div>
        </div>
      </section>

      {result ? (
        <section className="mb-8 rounded-[2rem] border border-green-500/25 bg-green-500/[0.06] p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-2 font-black text-green-300"><CheckCircle2 size={19} /> رابط المعاينة الخاص جاهز</div>
              <h2 className="text-2xl font-black">{result.lead.name}</h2>
              <p className="mt-2 text-sm text-white/45">{result.lead.city} · {result.lead.website_status === 'NO_WEBSITE' ? 'لا يظهر له موقع إلكتروني' : 'راجع حالة الموقع'}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a href={result.previewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-yellow-500 px-4 py-3 font-black text-black"><ExternalLink size={17} /> فتح المعاينة</a>
                <button onClick={() => copy(result.previewUrl, 'تم نسخ رابط المعاينة.')} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 font-bold"><Copy size={17} /> نسخ الرابط</button>
                <Link href={`/dashboard/leads/${result.lead.id}`} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 font-bold"><MapPin size={17} /> تفاصيل العميل</Link>
              </div>
            </div>
            <div className="w-full lg:max-w-xl">
              <label className="mb-2 block text-sm font-bold">مسودة الرسالة</label>
              <textarea value={message} onChange={event => setMessage(event.target.value)} rows={7} className="w-full rounded-2xl border border-white/15 bg-black/60 p-4 leading-7 outline-none focus:border-yellow-500" />
              <div className="mt-3 flex flex-wrap gap-3">
                <button onClick={() => copy(message, 'تم نسخ الرسالة.')} className="rounded-xl border border-white/15 px-4 py-3 font-bold">نسخ الرسالة</button>
                {whatsappUrl ? <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-green-500 px-4 py-3 font-black text-black"><MessageCircle size={17} /> فتح واتساب</a> : <span className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-200">لا يوجد رقم صالح</span>}
              </div>
              <p className="mt-3 text-xs text-white/40">فتح واتساب لا يغيّر الحالة ولا يرسل الرسالة. اضغط الإرسال بنفسك.</p>
            </div>
          </div>
        </section>
      ) : null}

      {notice ? <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-black shadow-2xl">{notice}</div> : null}

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035]">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5"><h2 className="text-xl font-black">أحدث العملاء</h2><Link href="/dashboard/search" className="inline-flex items-center gap-2 text-sm font-bold text-yellow-400"><Search size={16} /> بحث جديد</Link></div>
        <div className="divide-y divide-white/10">
          {recent.length ? recent.map(item => (
            <Link key={item.id} href={`/dashboard/leads/${item.id}`} className="flex flex-col gap-3 px-6 py-5 transition hover:bg-white/[0.035] md:flex-row md:items-center md:justify-between">
              <div><div className="font-black">{item.name}</div><div className="mt-1 text-sm text-white/45">{[item.district, item.city].filter(Boolean).join('، ')} · {item.rating || 0} ★ ({item.reviews_count})</div></div>
              <div className="text-sm text-white/55">{item.phone_local || 'لا يوجد رقم'} · {item.previews?.length ? 'معاينة جاهزة' : 'بدون معاينة'}</div>
            </Link>
          )) : <div className="p-10 text-center text-white/40">ابدأ البحث لإضافة العملاء المحتملين.</div>}
        </div>
      </section>
    </main>
  );
}

function Kpi({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-5"><div className="mb-5 grid h-11 w-11 place-items-center rounded-2xl bg-yellow-500/10 text-yellow-500">{icon}</div><div className="text-3xl font-black">{value}</div><div className="mt-1 text-sm font-bold text-white/55">{label}</div></article>;
}
