import type { Metadata } from 'next';
import { CalendarDays, ExternalLink, MapPin, MessageCircle, Phone, Scissors, Star } from 'lucide-react';
import { buildWhatsAppUrl } from '@/lib/phone';
import { hashPreviewToken, previewAccessState } from '@/lib/preview-access';
import { previewSlugCandidates } from '@/lib/preview-route';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import type { LeadRecord, PlacePhoto, PreviewRecord, PreviewService } from '@/types/domain';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'رابط معاينة خاص',
    robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } },
  };
}

async function loadPreview(rawSlug: string, token?: string) {
  const supabase = getSupabaseAdmin();
  let preview: PreviewRecord | null = null;

  // The token is the strongest lookup key and avoids Unicode/URL-encoding mismatches in Arabic slugs.
  if (token?.trim()) {
    const { data, error } = await supabase
      .from('previews')
      .select('*')
      .eq('access_token_hash', hashPreviewToken(token.trim()))
      .maybeSingle();
    if (error) console.warn('preview_lookup_token_failed', { code: error.code });
    preview = data as PreviewRecord | null;
  }

  if (!preview) {
    const candidates = previewSlugCandidates(rawSlug);
    const { data, error } = await supabase
      .from('previews')
      .select('*')
      .in('slug', candidates)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) console.warn('preview_lookup_slug_failed', { code: error.code, candidateCount: candidates.length });
    preview = data as PreviewRecord | null;
  }

  if (!preview) return null;
  const { data: lead, error: leadError } = await supabase.from('leads').select('*').eq('id', preview.lead_id).maybeSingle();
  if (leadError) console.warn('preview_lead_lookup_failed', { code: leadError.code });
  if (!lead) return null;
  return { preview, lead: lead as LeadRecord };
}

export default async function PrivatePreviewPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ token?: string }> }) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const record = await loadPreview(slug, query.token);
  if (!record) return <PreviewError title="الرابط غير موجود" description="تأكد من نسخ رابط المعاينة الخاص كاملًا." />;

  const state = previewAccessState(record.preview, query.token);
  if (state === 'INVALID_TOKEN') return <PreviewError title="رمز المعاينة غير صحيح" description="هذا الرابط خاص. استخدم الرابط الكامل الذي يحتوي على token." />;
  if (state === 'EXPIRED') return <PreviewError title="انتهت صلاحية المعاينة" description="اطلب رابط معاينة جديدًا من صاحب المنصة." />;
  if (state === 'DISABLED') return <PreviewError title="تم تعطيل المعاينة" description="هذا الرابط غير متاح حاليًا." />;

  const { lead, preview } = record;
  const services = (preview.services_json || []) as PreviewService[];
  const gallery = (preview.gallery_json || []) as PlacePhoto[];
  const whatsappUrl = lead.phone_international ? buildWhatsAppUrl(lead.phone_international, `السلام عليكم، أرغب بالاستفسار عن الخدمات لدى ${lead.name}`) : null;

  return (
    <main className="min-h-screen overflow-hidden bg-black text-white" dir="rtl">
      <div className="fixed inset-x-0 top-0 z-50 border-b border-yellow-500/20 bg-yellow-500 px-4 py-2 text-center text-xs font-black text-black">رابط معاينة خاص · نموذج تجريبي قابل للتخصيص</div>
      <header className="fixed inset-x-0 top-8 z-40 border-b border-white/10 bg-black/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4"><a href="#top" className="flex items-center gap-3 font-black"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-yellow-500 text-black"><Scissors size={22} /></span><span>{lead.name}</span></a><nav className="hidden gap-6 text-sm text-white/60 md:flex"><a href="#services">الخدمات</a><a href="#hours">ساعات العمل</a><a href="#contact">التواصل</a></nav>{whatsappUrl ? <a href={whatsappUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-yellow-500 px-4 py-2.5 text-sm font-black text-black">استفسار</a> : null}</div>
      </header>

      <section id="top" className="relative flex min-h-screen items-center pt-32"><div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(234,179,8,0.18),transparent_32%),radial-gradient(circle_at_85%_70%,rgba(234,179,8,0.10),transparent_34%)]" /><div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-[1.15fr_.85fr]"><div><div className="mb-5 inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-300"><Star size={15} fill="currentColor" /> {Number(lead.rating || 0).toFixed(1)} من 5 {lead.reviews_count ? <span className="text-white/40">({lead.reviews_count} تقييم)</span> : null}</div><p className="mb-3 text-sm font-bold tracking-[0.2em] text-yellow-500">BARBER PREVIEW</p><h1 className="max-w-4xl text-5xl font-black leading-[1.15] md:text-7xl">{preview.title}<span className="mt-3 block text-yellow-500">{preview.subtitle}</span></h1><p className="mt-7 max-w-2xl text-lg leading-9 text-white/65">{preview.about_text}</p><div className="mt-9 flex flex-wrap gap-3">{whatsappUrl ? <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl bg-yellow-500 px-6 py-4 font-black text-black"><MessageCircle size={19} /> فتح واتساب</a> : null}{lead.phone_local ? <a href={`tel:${lead.phone_local}`} className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-6 py-4 font-bold"><Phone size={19} /> اتصال</a> : null}{lead.maps_url ? <a href={lead.maps_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-6 py-4 font-bold"><MapPin size={19} /> الاتجاهات</a> : null}</div></div><HeroVisual lead={lead} photo={gallery[0]} /></div></section>

      <section id="services" className="border-y border-white/10 bg-zinc-950/80 py-24"><div className="mx-auto max-w-7xl px-5"><div className="mb-14 max-w-2xl"><p className="mb-3 text-sm font-bold tracking-[0.2em] text-yellow-500">SERVICES</p><h2 className="text-4xl font-black md:text-5xl">خدمات قابلة للتعديل</h2><p className="mt-4 leading-8 text-white/50">هذه خدمات عامة مقترحة للنموذج، ويجب تأكيد توفرها مع النشاط قبل استخدام الموقع فعليًا. لا توجد أسعار مختلقة.</p></div><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">{services.map((service, index) => <article key={`${service.name}-${index}`} className="rounded-3xl border border-white/10 bg-white/[0.035] p-6"><span className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-yellow-500/10 text-yellow-500"><Scissors size={22} /></span><h3 className="text-xl font-black">{service.name}</h3><p className="mt-3 text-sm leading-7 text-white/50">{service.description}</p><div className="mt-5 text-xs font-bold text-yellow-400">قابلة للتخصيص</div></article>)}</div></div></section>

      {gallery.length ? <section className="py-24"><div className="mx-auto max-w-7xl px-5"><div className="mb-10"><p className="text-sm font-bold tracking-[0.2em] text-yellow-500">GALLERY</p><h2 className="mt-3 text-4xl font-black">صور النشاط</h2></div><div className="grid gap-4 md:grid-cols-3">{gallery.slice(0, 6).map((photo, index) => <figure key={index} className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-950"><img src={`/api/google-photo?placeId=${encodeURIComponent(lead.google_place_id)}&index=${index}&width=1000`} alt={`صورة ${lead.name} ${index + 1}`} className="aspect-[4/3] w-full object-cover" loading="lazy" /><figcaption className="px-4 py-3 text-[11px] text-white/45">{photo.authorAttributions?.length ? <>الصورة: {photo.authorAttributions.map(item => item.displayName).filter(Boolean).join('، ')} · Google</> : 'صورة عبر Google Places'}</figcaption></figure>)}</div></div></section> : null}

      <section id="hours" className="border-y border-white/10 bg-zinc-950/80 py-24"><div className="mx-auto grid max-w-7xl gap-8 px-5 lg:grid-cols-2"><div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-8"><div className="mb-7 flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-yellow-500/10 text-yellow-500"><CalendarDays /></span><div><p className="text-sm text-yellow-500">BUSINESS HOURS</p><h2 className="text-2xl font-black">ساعات العمل</h2></div></div>{lead.opening_hours_json?.length ? <div className="space-y-3">{lead.opening_hours_json.map(line => <div key={line} className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/70">{line}</div>)}</div> : <p className="rounded-xl border border-white/10 bg-black/40 p-5 text-white/55">تواصل مع النشاط لتأكيد ساعات العمل.</p>}</div><div id="contact" className="rounded-[2rem] border border-yellow-500/20 bg-gradient-to-br from-yellow-500/15 to-transparent p-8"><p className="text-sm font-bold tracking-[0.2em] text-yellow-500">CONTACT</p><h2 className="mt-3 text-3xl font-black">معلومات التواصل</h2><p className="mt-4 leading-8 text-white/60">تواصل مباشرة لتأكيد الخدمات والمواعيد والتفاصيل.</p><div className="mt-8 space-y-4"><ContactRow icon={<MapPin />} label="العنوان" value={lead.address || lead.city} href={lead.maps_url} />{lead.phone_local ? <ContactRow icon={<Phone />} label="الهاتف" value={lead.phone_local} href={`tel:${lead.phone_local}`} /> : null}{whatsappUrl ? <ContactRow icon={<MessageCircle />} label="واتساب" value="فتح المحادثة" href={whatsappUrl} /> : null}</div></div></div></section>

      <footer className="py-10 text-center text-sm text-white/35"><p>نموذج تجريبي قابل للتخصيص لـ {lead.name}</p>{lead.maps_url ? <a href={lead.maps_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-white/50">بيانات النشاط عبر Google Maps</a> : null}</footer>
    </main>
  );
}

function HeroVisual({ lead, photo }: { lead: LeadRecord; photo?: PlacePhoto }) {
  return <div className="relative mx-auto w-full max-w-lg"><div className="aspect-square overflow-hidden rounded-[2.5rem] border border-yellow-500/20 bg-gradient-to-br from-yellow-500/20 via-zinc-950 to-black p-1 shadow-2xl shadow-yellow-500/10"><div className="grid h-full place-items-center overflow-hidden rounded-[2.35rem] border border-white/10">{photo ? <img src={`/api/google-photo?placeId=${encodeURIComponent(lead.google_place_id)}&index=0&width=1000`} alt={lead.name} className="h-full w-full object-cover" /> : <Scissors size={150} strokeWidth={1.1} className="text-yellow-500/55" />}</div></div><div className="absolute -bottom-5 -left-4 rounded-3xl bg-yellow-500 px-6 py-5 text-black shadow-xl"><div className="text-3xl font-black">{Number(lead.rating || 0).toFixed(1)}★</div><div className="text-xs font-bold">تقييم Google</div></div></div>;
}
function ContactRow({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href?: string | null }) { const content = <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/35 p-4"><span className="grid h-11 w-11 place-items-center rounded-xl bg-yellow-500/10 text-yellow-500">{icon}</span><div className="min-w-0 flex-1"><div className="text-xs text-white/40">{label}</div><div className="truncate font-bold">{value}</div></div>{href ? <ExternalLink size={16} className="text-white/35" /> : null}</div>; return href ? <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">{content}</a> : content; }
function PreviewError({ title, description }: { title: string; description: string }) { return <main className="grid min-h-screen place-items-center bg-black px-5 text-white" dir="rtl"><div className="max-w-lg rounded-[2rem] border border-white/10 bg-white/[0.035] p-10 text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-yellow-500 text-black"><Scissors /></span><h1 className="mt-6 text-3xl font-black">{title}</h1><p className="mt-4 leading-8 text-white/55">{description}</p><div className="mt-6 text-sm text-yellow-400">رابط معاينة خاص</div></div></main>; }
