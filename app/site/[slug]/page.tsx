import { notFound } from 'next/navigation';
import {
  CalendarDays,
  ExternalLink,
  MapPin,
  MessageCircle,
  Phone,
  Scissors,
  Star,
} from 'lucide-react';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { normalizePhone } from '@/lib/google-places';
import { fallbackBarberContent } from '@/lib/site-content';

export const dynamic = 'force-dynamic';

type Service = {
  name_ar: string;
  name_en?: string;
  description_ar?: string;
};


type LegacySite = {
  id: string;
  subdomain: string;
  deployed_url: string;
  ai_description_ar: string | null;
  ai_description_en: string | null;
  services: Service[];
  status: string;
  barbers: {
    id: string; name_ar: string; name_en: string | null; phone: string | null; whatsapp: string | null;
    rating: number | null; review_count: number; address: string | null; city: string; google_maps_url: string | null; business_hours: string[];
  };
};
async function getSite(slug: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('generated_websites')
    .select(`
      id,
      subdomain,
      deployed_url,
      ai_description_ar,
      ai_description_en,
      services,
      status,
      barbers!inner(
        id,
        name_ar,
        name_en,
        phone,
        whatsapp,
        rating,
        review_count,
        address,
        city,
        google_maps_url,
        business_hours
      )
    `)
    .eq('subdomain', slug)
    .eq('status', 'live')
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as unknown as LegacySite | null;
}

export default async function BarberSitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await getSite(slug);
  if (!site) notFound();

  const barber = site.barbers;
  const fallback = fallbackBarberContent(barber.name_ar, Number(barber.rating || 0));
  const services = (Array.isArray(site.services) && site.services.length > 0 ? site.services : fallback.services) as Service[];
  const openingHours = Array.isArray(barber.business_hours) ? barber.business_hours : [];
  const whatsapp = normalizePhone(barber.whatsapp || barber.phone || '');
  const whatsappHref = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(`مرحباً، أرغب بحجز موعد لدى ${barber.name_ar}`)}`
    : undefined;

  return (
    <main className="min-h-screen overflow-hidden bg-black text-white" dir="rtl">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <a href="#top" className="flex items-center gap-3 font-black">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-yellow-500 text-black">
              <Scissors size={22} />
            </span>
            <span>{barber.name_ar}</span>
          </a>
          <nav className="hidden items-center gap-6 text-sm text-white/70 md:flex">
            <a href="#services" className="hover:text-yellow-400">الخدمات</a>
            <a href="#hours" className="hover:text-yellow-400">أوقات العمل</a>
            <a href="#contact" className="hover:text-yellow-400">التواصل</a>
          </nav>
          {whatsappHref ? (
            <a href={whatsappHref} target="_blank" rel="noreferrer" className="rounded-xl bg-yellow-500 px-4 py-2.5 text-sm font-black text-black transition hover:bg-yellow-400">
              احجز الآن
            </a>
          ) : null}
        </div>
      </header>

      <section id="top" className="relative flex min-h-screen items-center pt-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(234,179,8,0.18),transparent_32%),radial-gradient(circle_at_85%_70%,rgba(234,179,8,0.10),transparent_34%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-[1.2fr_.8fr]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-300">
              <Star size={15} fill="currentColor" />
              {Number(barber.rating || 0).toFixed(1)} من 5
              {barber.review_count ? <span className="text-white/45">({barber.review_count} تقييم)</span> : null}
            </div>
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.28em] text-yellow-500">Premium Barber Experience</p>
            <h1 className="max-w-4xl text-5xl font-black leading-[1.15] md:text-7xl">
              {barber.name_ar}
              <span className="mt-3 block text-yellow-500">أناقة تبدأ من التفاصيل</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-9 text-white/65">
              {site.ai_description_ar || fallback.about_ar}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              {whatsappHref ? (
                <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl bg-yellow-500 px-6 py-4 font-black text-black hover:bg-yellow-400">
                  <MessageCircle size={19} /> تواصل عبر واتساب
                </a>
              ) : null}
              {barber.phone ? (
                <a href={`tel:${barber.phone}`} className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-6 py-4 font-bold hover:border-yellow-500/60">
                  <Phone size={19} /> اتصال مباشر
                </a>
              ) : null}
              {barber.google_maps_url ? (
                <a href={barber.google_maps_url || undefined} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-6 py-4 font-bold hover:border-yellow-500/60">
                  <MapPin size={19} /> الموقع على الخريطة
                </a>
              ) : null}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="aspect-square rounded-[2.5rem] border border-yellow-500/20 bg-gradient-to-br from-yellow-500/20 via-zinc-950 to-black p-1 shadow-2xl shadow-yellow-500/10">
              <div className="grid h-full place-items-center rounded-[2.35rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0))]">
                <Scissors size={150} strokeWidth={1.1} className="text-yellow-500/55" />
              </div>
            </div>
            <div className="absolute -bottom-5 -left-4 rounded-3xl bg-yellow-500 px-6 py-5 text-black shadow-xl">
              <div className="text-3xl font-black">{Number(barber.rating || 0).toFixed(1)}★</div>
              <div className="text-xs font-bold">تقييم Google</div>
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="border-y border-white/10 bg-zinc-950/80 py-24">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mb-14 max-w-2xl">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-yellow-500">Services</p>
            <h2 className="text-4xl font-black md:text-5xl">خدمات مقترحة لتجربة متكاملة</h2>
            <p className="mt-4 leading-8 text-white/50">الخدمات المعروضة عامة وقابلة للتعديل، ويجب تأكيد توفرها مع النشاط.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service, index) => (
              <article key={`${service.name_ar}-${index}`} className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 transition hover:-translate-y-1 hover:border-yellow-500/40">
                <div className="mb-6 grid h-13 w-13 place-items-center rounded-2xl bg-yellow-500/10 text-yellow-500">
                  <Scissors size={23} />
                </div>
                <h3 className="text-xl font-black">{service.name_ar}</h3>
                <p className="mt-2 min-h-12 text-sm leading-6 text-white/50">{service.description_ar || 'خدمة احترافية بعناية عالية بالتفاصيل.'}</p>
                <div className="mt-6 border-t border-white/10 pt-5 text-sm font-bold text-yellow-500">قابلة للتخصيص</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="hours" className="py-24">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-8">
            <div className="mb-7 flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-yellow-500/10 text-yellow-500"><CalendarDays /></span>
              <div>
                <p className="text-sm text-yellow-500">Business Hours</p>
                <h2 className="text-2xl font-black">أوقات العمل</h2>
              </div>
            </div>
            {openingHours.length > 0 ? (
              <div className="space-y-3">
                {openingHours.map((line: string) => (
                  <div key={line} className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/70">{line}</div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-white/10 bg-black/40 p-5 leading-7 text-white/55">تواصل مع الصالون لتأكيد أوقات العمل والمواعيد المتاحة.</p>
            )}
          </div>

          <div id="contact" className="rounded-[2rem] border border-yellow-500/20 bg-gradient-to-br from-yellow-500/15 to-transparent p-8">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-500">Contact</p>
            <h2 className="mt-3 text-3xl font-black">جاهز للحجز؟</h2>
            <p className="mt-4 leading-8 text-white/60">تواصل مباشرة مع {barber.name_ar} لتأكيد الخدمات والمواعيد والتفاصيل.</p>
            <div className="mt-8 space-y-4">
              <ContactRow icon={<MapPin size={20} />} label="العنوان" value={barber.address || barber.city} href={barber.google_maps_url || undefined} />
              {barber.phone ? <ContactRow icon={<Phone size={20} />} label="الهاتف" value={barber.phone} href={`tel:${barber.phone}`} /> : null}
              {whatsappHref ? <ContactRow icon={<MessageCircle size={20} />} label="واتساب" value="محادثة مباشرة" href={whatsappHref} /> : null}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-white/35">
        <p>© 2026 {barber.name_ar} — نموذج موقع احترافي</p>
        {barber.google_maps_url ? (
          <a href={barber.google_maps_url || undefined} target="_blank" rel="noreferrer" className="mt-2 inline-block text-white/45 hover:text-yellow-400">
            بيانات النشاط عبر Google Maps
          </a>
        ) : null}
      </footer>
    </main>
  );
}

function ContactRow({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href?: string }) {
  const content = (
    <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/35 p-4 transition hover:border-yellow-500/40">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-yellow-500/10 text-yellow-500">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-white/40">{label}</div>
        <div className="truncate font-bold">{value}</div>
      </div>
      {href ? <ExternalLink size={16} className="text-white/35" /> : null}
    </div>
  );

  return href ? <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">{content}</a> : content;
}
