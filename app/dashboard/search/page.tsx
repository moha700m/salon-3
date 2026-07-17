'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, LoaderCircle, MapPin, Search, Star } from 'lucide-react';
import { WebsiteStatusBadge } from '@/components/status-badge';
import type { LeadRecord } from '@/types/domain';

const defaultActivities = ['حلاق', 'صالون حلاقة رجالي', 'Barber shop', 'Hair salon'];
const stages = ['جاري البحث عن الأنشطة', 'جاري جلب التفاصيل', 'جاري استبعاد الأنشطة التي لديها مواقع', 'جاري حفظ النتائج', 'اكتمل البحث'];

export default function SearchCustomersPage() {
  const [city, setCity] = useState('الدمام');
  const [district, setDistrict] = useState('');
  const [limit, setLimit] = useState(20);
  const [activities, setActivities] = useState(defaultActivities);
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState('');
  const [results, setResults] = useState<LeadRecord[]>([]);
  const [summary, setSummary] = useState<{ resultsCount: number; newResultsCount: number; noWebsiteCount: number; missingPhoneCount: number } | null>(null);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setStage(current => Math.min(current + 1, stages.length - 2)), 1800);
    return () => window.clearInterval(timer);
  }, [running]);

  function toggleActivity(activity: string) {
    setActivities(current => current.includes(activity) ? current.filter(item => item !== activity) : [...current, activity]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setRunning(true); setStage(0); setError(''); setResults([]); setSummary(null);
    try {
      const response = await fetch('/api/leads/search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: 'السعودية', city, district, activityTypes: activities, limit }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'تعذر تنفيذ البحث.');
      setStage(stages.length - 1); setResults(payload.results || []); setSummary(payload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'حدث خطأ غير متوقع.');
    } finally { setRunning(false); }
  }

  return (
    <main>
      <header className="mb-8"><h1 className="text-3xl font-black md:text-4xl">البحث عن العملاء</h1><p className="mt-2 text-white/50">بحث رسمي عبر Google Places API (New) دون scraping.</p></header>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 md:p-8">
        <form onSubmit={submit} className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <Field label="الدولة"><select disabled className="input"><option>السعودية</option></select></Field>
          <Field label="المدينة"><input required value={city} onChange={event => setCity(event.target.value)} className="input" placeholder="الدمام" /></Field>
          <Field label="الحي أو المنطقة"><input value={district} onChange={event => setDistrict(event.target.value)} className="input" placeholder="اختياري" /></Field>
          <Field label="الحد الأقصى"><input type="number" min={1} max={60} value={limit} onChange={event => setLimit(Number(event.target.value))} className="input" /></Field>

          <div className="md:col-span-2 lg:col-span-4">
            <label className="mb-3 block text-sm font-bold text-white/70">نوع النشاط</label>
            <div className="flex flex-wrap gap-3">
              {defaultActivities.map(activity => <label key={activity} className={`cursor-pointer rounded-xl border px-4 py-3 text-sm font-bold ${activities.includes(activity) ? 'border-yellow-500 bg-yellow-500/10 text-yellow-200' : 'border-white/10 text-white/50'}`}><input type="checkbox" className="ml-2 accent-yellow-500" checked={activities.includes(activity)} onChange={() => toggleActivity(activity)} />{activity}</label>)}
            </div>
          </div>

          <div className="md:col-span-2 lg:col-span-4">
            <button disabled={running || activities.length === 0} className="inline-flex items-center gap-2 rounded-2xl bg-yellow-500 px-7 py-4 font-black text-black disabled:opacity-50">
              {running ? <><LoaderCircle className="animate-spin" size={18} /> جاري البحث</> : <><Search size={18} /> ابدأ البحث</>}
            </button>
          </div>
        </form>
      </section>

      {(running || stage > 0) ? <section className="mt-6 rounded-3xl border border-yellow-500/20 bg-yellow-500/[0.06] p-6"><div className="grid gap-3 md:grid-cols-5">{stages.map((text, index) => <div key={text} className={`rounded-xl border p-3 text-sm ${index < stage || (!running && index === stage) ? 'border-green-500/30 bg-green-500/10 text-green-200' : index === stage ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-200' : 'border-white/10 text-white/30'}`}>{index < stage || (!running && index === stage) ? <CheckCircle2 className="mb-2" size={17} /> : index === stage ? <LoaderCircle className="mb-2 animate-spin" size={17} /> : null}{text}</div>)}</div></section> : null}

      {error ? <div className="mt-6 flex gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200"><AlertTriangle className="shrink-0" /> {error}</div> : null}

      {summary ? <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Summary value={summary.resultsCount} label="إجمالي النتائج" /><Summary value={summary.newResultsCount} label="نتائج جديدة" /><Summary value={summary.noWebsiteCount} label="بدون موقع" /><Summary value={summary.missingPhoneCount} label="بدون رقم" /></section> : null}

      {results.length ? <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035]"><div className="flex items-center justify-between border-b border-white/10 px-6 py-5"><h2 className="text-xl font-black">النتائج المحفوظة</h2><Link href="/dashboard/leads?noWebsiteOnly=true" className="text-sm font-bold text-yellow-400">عرض العملاء بدون موقع</Link></div><div className="divide-y divide-white/10">{results.map(lead => <Link key={lead.id} href={`/dashboard/leads/${lead.id}`} className="grid gap-3 px-6 py-5 transition hover:bg-white/[0.035] md:grid-cols-[1.3fr_.8fr_.7fr_auto] md:items-center"><div><div className="font-black">{lead.name}</div><div className="mt-1 flex items-center gap-1 text-sm text-white/40"><MapPin size={14} /> {[lead.district, lead.city].filter(Boolean).join('، ')}</div></div><div className="text-sm text-white/55">{lead.phone_local || 'لا يوجد رقم'}</div><div className="inline-flex items-center gap-1 text-sm text-white/55"><Star size={14} className="text-yellow-500" /> {lead.rating || 0} ({lead.reviews_count})</div><WebsiteStatusBadge status={lead.website_status} /></Link>)}</div></section> : null}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="mb-2 block text-sm font-bold text-white/70">{label}</span>{children}</label>; }
function Summary({ value, label }: { value: number; label: string }) { return <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><div className="text-3xl font-black text-yellow-400">{value}</div><div className="mt-1 text-sm text-white/50">{label}</div></article>; }
