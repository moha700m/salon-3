'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { CheckSquare, LoaderCircle, Search, Square, Star } from 'lucide-react';
import { ContactStatusBadge, WebsiteStatusBadge } from '@/components/status-badge';
import type { ContactStatus, LeadRecord } from '@/types/domain';

interface LeadWithPreviews extends LeadRecord { previews?: Array<{ id: string; slug: string; is_active: boolean; expires_at: string | null }> }
const statusOptions: Array<{ value: ContactStatus | ''; label: string }> = [
  { value: '', label: 'كل الحالات' }, { value: 'NEW', label: 'جديد' }, { value: 'NO_WEBSITE', label: 'بدون موقع' },
  { value: 'READY_TO_CONTACT', label: 'جاهز للتواصل' }, { value: 'CONTACTED', label: 'تم التواصل' },
  { value: 'INTERESTED', label: 'مهتم' }, { value: 'NOT_INTERESTED', label: 'غير مهتم' }, { value: 'DO_NOT_CONTACT', label: 'عدم التواصل' },
];

export default function LeadsPage() {
  const [rows, setRows] = useState<LeadWithPreviews[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [filters, setFilters] = useState({ query: '', city: '', minRating: '', minReviews: '', contactStatus: '', previewState: 'ANY', noWebsiteOnly: true, hasPhone: false });

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value !== '' && value !== false && value !== 'ANY') params.set(key, String(value)); });
    const response = await fetch(`/api/leads?${params.toString()}`, { cache: 'no-store' });
    const payload = await response.json();
    if (payload.success) { setRows(payload.data || []); setCities(payload.cities || []); }
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent) { event.preventDefault(); await load(); }
  function toggle(id: string) { setSelected(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]); }
  const allSelected = rows.length > 0 && rows.every(row => selected.includes(row.id));
  function toggleAll() { setSelected(allSelected ? [] : rows.map(row => row.id)); }

  async function bulk(action: 'GENERATE_PREVIEWS' | 'SET_STATUS', status?: ContactStatus) {
    if (!selected.length) return;
    setNotice('جاري تنفيذ الإجراء...');
    const response = await fetch('/api/leads/bulk', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: selected, action, status }),
    });
    const payload = await response.json();
    setNotice(payload.success ? 'تم تنفيذ الإجراء الجماعي.' : payload.error || 'تعذر تنفيذ الإجراء.');
    if (payload.success) { setSelected([]); await load(); }
    window.setTimeout(() => setNotice(''), 3000);
  }

  return (
    <main>
      <header className="mb-8"><h1 className="text-3xl font-black md:text-4xl">العملاء المحتملون</h1><p className="mt-2 text-white/50">فلترة العملاء وإنشاء المعاينات وإدارة حالة التواصل دون إرسال جماعي.</p></header>

      <form onSubmit={submit} className="mb-6 grid gap-4 rounded-3xl border border-white/10 bg-white/[0.035] p-5 md:grid-cols-3 lg:grid-cols-4">
        <input value={filters.query} onChange={e => setFilters({ ...filters, query: e.target.value })} placeholder="بحث بالاسم أو الرقم" className="input" />
        <select value={filters.city} onChange={e => setFilters({ ...filters, city: e.target.value })} className="input"><option value="">كل المدن</option>{cities.map(city => <option key={city}>{city}</option>)}</select>
        <select value={filters.contactStatus} onChange={e => setFilters({ ...filters, contactStatus: e.target.value })} className="input">{statusOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
        <select value={filters.previewState} onChange={e => setFilters({ ...filters, previewState: e.target.value })} className="input"><option value="ANY">كل المعاينات</option><option value="READY">تم إنشاء نموذج</option><option value="MISSING">لم يتم إنشاء نموذج</option></select>
        <input type="number" min="0" max="5" step="0.5" value={filters.minRating} onChange={e => setFilters({ ...filters, minRating: e.target.value })} placeholder="أقل تقييم" className="input" />
        <input type="number" min="0" value={filters.minReviews} onChange={e => setFilters({ ...filters, minReviews: e.target.value })} placeholder="أقل عدد مراجعات" className="input" />
        <label className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm"><input type="checkbox" checked={filters.noWebsiteOnly} onChange={e => setFilters({ ...filters, noWebsiteOnly: e.target.checked })} className="accent-yellow-500" /> بدون موقع فقط</label>
        <label className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm"><input type="checkbox" checked={filters.hasPhone} onChange={e => setFilters({ ...filters, hasPhone: e.target.checked })} className="accent-yellow-500" /> لديه رقم هاتف</label>
        <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-500 px-5 py-3 font-black text-black"><Search size={17} /> تطبيق الفلاتر</button>
      </form>

      {selected.length ? <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-yellow-500/25 bg-yellow-500/[0.06] p-4"><span className="font-bold">تم تحديد {selected.length}</span><button onClick={() => bulk('GENERATE_PREVIEWS')} className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-black text-black">إنشاء معاينات</button><button onClick={() => bulk('SET_STATUS', 'NEEDS_REVIEW')} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold">تعيين: يحتاج مراجعة</button><span className="text-xs text-white/40">لا يوجد إرسال واتساب جماعي.</span></div> : null}

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035]">
        <div className="hidden grid-cols-[auto_1.4fr_.7fr_.65fr_.65fr_.7fr_auto] gap-4 border-b border-white/10 px-5 py-4 text-xs font-bold text-white/40 lg:grid">
          <button onClick={toggleAll}>{allSelected ? <CheckSquare size={18} /> : <Square size={18} />}</button><span>المحل</span><span>الهاتف</span><span>التقييم</span><span>الموقع</span><span>التواصل</span><span>الإجراء</span>
        </div>
        {loading ? <div className="flex items-center justify-center gap-2 p-12 text-white/45"><LoaderCircle className="animate-spin" /> جاري التحميل</div> : rows.length ? <div className="divide-y divide-white/10">{rows.map(lead => (
          <div key={lead.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[auto_1.4fr_.7fr_.65fr_.65fr_.7fr_auto] lg:items-center">
            <button onClick={() => toggle(lead.id)} className="hidden lg:block">{selected.includes(lead.id) ? <CheckSquare className="text-yellow-400" size={18} /> : <Square size={18} className="text-white/30" />}</button>
            <div><div className="flex items-start gap-3"><button onClick={() => toggle(lead.id)} className="mt-1 lg:hidden">{selected.includes(lead.id) ? <CheckSquare className="text-yellow-400" size={18} /> : <Square size={18} />}</button><div><div className="font-black">{lead.name}</div><div className="mt-1 text-sm text-white/40">{[lead.district, lead.city].filter(Boolean).join('، ')}</div><div className="mt-2 text-xs text-white/30">آخر تحديث: {new Date(lead.updated_at).toLocaleDateString('ar-SA')}</div></div></div></div>
            <div className="text-sm text-white/60">{lead.phone_local || 'لا يوجد'}</div>
            <div className="inline-flex items-center gap-1 text-sm"><Star size={14} className="text-yellow-500" /> {lead.rating || 0} <span className="text-white/35">({lead.reviews_count})</span></div>
            <WebsiteStatusBadge status={lead.website_status} />
            <ContactStatusBadge status={lead.contact_status} />
            <div className="flex gap-2"><Link href={`/dashboard/leads/${lead.id}`} className="rounded-xl bg-white/10 px-3 py-2 text-sm font-bold hover:bg-white/15">التفاصيل</Link>{lead.previews?.length ? <span className="rounded-xl border border-green-500/20 bg-green-500/10 px-3 py-2 text-xs text-green-200">نموذج جاهز</span> : null}</div>
          </div>
        ))}</div> : <div className="p-12 text-center text-white/40">لا توجد نتائج مطابقة.</div>}
      </section>
      {notice ? <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-black">{notice}</div> : null}
    </main>
  );
}
