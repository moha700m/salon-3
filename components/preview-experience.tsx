import {
  BadgeCheck,
  CalendarDays,
  ChevronDown,
  CircleCheck,
  Droplets,
  ExternalLink,
  Camera,
  MapPin,
  Music2,
  MessageCircle,
  Navigation,
  Phone,
  Sparkles,
  Star,
  UserRound,
  WandSparkles,
} from 'lucide-react';
import Image from 'next/image';
import { cleanBusinessDisplayName } from '@/lib/business-name';
import {
  cleanAboutText,
  cleanHeroTagline,
  cleanMarketingDescription,
} from '@/lib/preview-copy';
import { buildWhatsAppUrl } from '@/lib/phone';
import type { LeadRecord, PlacePhoto, PreviewRecord, PreviewService } from '@/types/domain';

interface PreviewExperienceProps {
  lead: LeadRecord;
  preview: PreviewRecord;
}

const SERVICE_ICONS = [UserRound, WandSparkles, Sparkles, Droplets, BadgeCheck, CircleCheck] as const;

function marketingDescription(preview: PreviewRecord): string {
  const value = preview.theme_json?.marketingDescription;
  return cleanMarketingDescription(typeof value === 'string' ? value : null);
}

function categoryLabel(primaryType: string | null): string {
  if (primaryType === 'barber_shop' || primaryType === 'hair_salon') return 'حلاقة وعناية رجالية';
  return 'عناية شخصية';
}

function fallbackServices(primaryType: string | null): PreviewService[] {
  const isBarber = primaryType === 'barber_shop' || primaryType === 'hair_salon';
  const names = isBarber
    ? [
        ['قص شعر رجالي', 'قصة مرتبة تناسب أسلوبك وتفضيلاتك.'],
        ['تهذيب اللحية', 'تحديد وتشذيب يمنح اللحية مظهرًا أنيقًا.'],
        ['تدريج وتشذيب', 'تفاصيل دقيقة وانتقالات نظيفة بين الأطوال.'],
        ['حلاقة وتنظيف', 'عناية متكاملة للحصول على مظهر منتعش ومرتب.'],
        ['تصفيف الشعر', 'تصفيف عملي أو مناسب للمناسبات حسب الطلب.'],
        ['تجهيز للمناسبات', 'إطلالة متكاملة قابلة للتخصيص للمناسبات.'],
      ]
    : [
        ['عناية شخصية', 'خدمة قابلة للتخصيص حسب ما يقدمه النشاط.'],
        ['تصفيف وتجهيز', 'تنسيق المظهر بما يناسب احتياج العميل.'],
        ['استشارة مظهر', 'اقتراحات عامة تساعد في اختيار الخدمة المناسبة.'],
        ['خدمة للمناسبات', 'تجهيز مرن للمناسبات والمواعيد الخاصة.'],
      ];

  return names.map(([name, description]) => ({ name, description, editable: true }));
}

export function PreviewExperience({ lead, preview }: PreviewExperienceProps) {
  const displayName = cleanBusinessDisplayName(lead.name);
  const tagline = cleanHeroTagline(preview.subtitle, displayName);
  const aboutText = cleanAboutText(preview.about_text, displayName);
  const savedServices = (preview.services_json || []) as PreviewService[];
  const services = savedServices.length ? savedServices : fallbackServices(lead.primary_type);
  const gallery = ((preview.gallery_json?.length ? preview.gallery_json : lead.photos_json) || []) as PlacePhoto[];
  const theme = preview.theme_json || {};
  const themeValue = (key: string) => typeof theme[key] === 'string' && String(theme[key]).trim() ? String(theme[key]).trim() : null;
  const whatsappNumber = themeValue('whatsapp') || lead.phone_international;
  const contactPhone = themeValue('phone') || lead.phone_local;
  const mapsUrl = themeValue('mapsUrl') || lead.maps_url;
  const locationDistrict = themeValue('district') || lead.district;
  const locationCity = themeValue('city') || lead.city;
  const workingHours = themeValue('workingHours') ? [themeValue('workingHours') as string] : lead.opening_hours_json;
  const instagramUrl = themeValue('instagramUrl');
  const tiktokUrl = themeValue('tiktokUrl');
  const whatsappUrl = whatsappNumber
    ? buildWhatsAppUrl(whatsappNumber, `السلام عليكم، أرغب في حجز موعد لدى ${displayName}.`)
    : null;

  return (
    <main className="min-h-screen overflow-x-clip bg-[#050505] pb-24 text-white sm:pb-0" dir="rtl">
      <div className="fixed inset-x-0 top-0 z-[60] border-b border-amber-300/20 bg-amber-400 px-3 py-1.5 text-center text-[11px] font-black leading-4 text-black">
        معاينة خاصة · المحتوى والخدمات قابلة للتخصيص
      </div>

      <header className="fixed inset-x-0 top-7 z-50 border-b border-white/10 bg-black/65 backdrop-blur-2xl">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <a href="#top" className="flex min-w-0 items-center gap-3 font-black">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-amber-300/30 bg-amber-300/10 text-lg text-amber-300">
              {displayName.charAt(0)}
            </span>
            <span className="max-w-[13rem] overflow-hidden text-ellipsis whitespace-nowrap text-sm sm:max-w-sm sm:text-base">
              {displayName}
            </span>
          </a>
          <nav className="hidden items-center gap-7 text-sm text-white/60 lg:flex">
            <a className="transition hover:text-white" href="#about">النبذة</a>
            <a className="transition hover:text-white" href="#services">الخدمات</a>
            <a className="transition hover:text-white" href="#gallery">الصور</a>
            <a className="transition hover:text-white" href="#contact">التواصل</a>
          </nav>
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="shine-button inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-amber-300 px-4 text-xs font-black text-black sm:px-5 sm:text-sm"
            >
              <MessageCircle size={16} />
              استفسار
            </a>
          ) : null}
        </div>
      </header>

      <section id="top" className="relative isolate flex min-h-[760px] items-end overflow-hidden pt-28 sm:min-h-[820px] lg:min-h-screen">
        <HeroBackdrop lead={lead} displayName={displayName} gallery={gallery} />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/45 to-black/30" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(0,0,0,.92)_0%,rgba(0,0,0,.46)_52%,rgba(0,0,0,.16)_100%)] max-lg:bg-[linear-gradient(0deg,rgba(0,0,0,.96)_0%,rgba(0,0,0,.38)_65%,rgba(0,0,0,.2)_100%)]" />
        <div className="hero-grain absolute inset-0 -z-10 opacity-70" />
        <div className="hero-beam absolute -left-24 top-24 -z-10 h-80 w-80 rounded-full bg-amber-300/20 blur-[110px]" />

        <div className="mx-auto grid w-full max-w-7xl items-end gap-10 px-4 pb-16 sm:px-6 sm:pb-20 lg:grid-cols-[1.12fr_.88fr] lg:pb-24">
          <div className="max-w-3xl">
            <div className="hero-enter hero-delay-1 mb-5 inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-black/35 px-3.5 py-2 text-xs font-black text-amber-200 backdrop-blur-xl sm:text-sm">
              <Sparkles size={15} />
              {categoryLabel(lead.primary_type)}
            </div>
            <h1
              className="hero-enter hero-delay-2 max-w-[24ch] font-black leading-[1.05] tracking-[-0.04em] text-white [overflow-wrap:anywhere] [text-wrap:balance]"
              style={{ fontSize: 'clamp(2rem, 8.8vw, 5rem)' }}
            >
              {displayName}
            </h1>
            <p className="hero-enter hero-delay-3 mt-5 max-w-xl text-lg font-bold leading-8 text-amber-200 [text-wrap:balance] sm:text-2xl">
              {tagline}
            </p>
            <div className="hero-enter hero-delay-4 mt-7 flex flex-wrap items-center gap-3">
              <RatingPill rating={lead.rating} reviewsCount={lead.reviews_count} />
              {locationDistrict || locationCity ? (
                <div className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/15 bg-black/30 px-4 text-sm text-white/75 backdrop-blur-xl">
                  <MapPin size={17} className="text-amber-300" />
                  {[locationDistrict, locationCity].filter(Boolean).join('، ')}
                </div>
              ) : null}
            </div>
            <div className="hero-enter hero-delay-5 mt-8 grid max-w-xl grid-cols-2 gap-3 sm:flex sm:flex-wrap">
              {whatsappUrl ? (
                <ActionLink href={whatsappUrl} external primary icon={<MessageCircle size={18} />}>
                  فتح واتساب
                </ActionLink>
              ) : null}
              {contactPhone ? (
                <ActionLink href={`tel:${contactPhone}`} icon={<Phone size={18} />}>
                  اتصال
                </ActionLink>
              ) : null}
              {mapsUrl ? (
                <ActionLink href={mapsUrl} external wideOnMobile icon={<Navigation size={18} />}>
                  الاتجاهات
                </ActionLink>
              ) : null}
            </div>
          </div>

          <HeroPhotoRail lead={lead} displayName={displayName} gallery={gallery} />
        </div>

        <a href="#about" aria-label="الانتقال إلى النبذة" className="scroll-cue absolute bottom-5 left-1/2 hidden -translate-x-1/2 text-white/55 sm:block">
          <ChevronDown size={28} />
        </a>
      </section>

      <div className="overflow-hidden border-y border-white/10 bg-amber-300 py-3 text-black">
        <div className="marquee-track flex w-max items-center gap-7 whitespace-nowrap text-xs font-black sm:text-sm">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex items-center gap-7">
              <span>تفاصيل تصنع الفرق</span><span>✦</span>
              <span>تجربة مريحة من الجوال</span><span>✦</span>
              <span>خدمات قابلة للتخصيص</span><span>✦</span>
              <span>وصول مباشر للنشاط</span><span>✦</span>
            </div>
          ))}
        </div>
      </div>

      <section id="about" className="section-reveal border-b border-white/10 bg-zinc-950/85 py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
          <div>
            <SectionHeading eyebrow="تعرف على النشاط" title="أناقة واضحة، وتجربة تبدأ قبل الوصول" />
            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/[.06] px-4 py-2 text-xs font-bold text-amber-200">
              <BadgeCheck size={15} />
              تصور مبدئي قابل للمراجعة والتخصيص
            </div>
          </div>
          <div className="grid gap-5">
            <article className="premium-card rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 sm:p-9">
              <p className="text-lg leading-9 text-white/78 sm:text-xl sm:leading-10">{aboutText}</p>
            </article>
            <article className="premium-card grid gap-5 rounded-[2rem] border border-amber-300/20 bg-amber-300/[0.055] p-6 sm:grid-cols-[auto_1fr] sm:items-center sm:p-8">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-300 text-black">
                <Sparkles size={24} />
              </span>
              <div>
                <div className="text-sm font-black text-amber-300">حضور رقمي مرتب</div>
                <p className="mt-2 leading-8 text-white/65">{marketingDescription(preview)}</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="services" className="section-reveal py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading eyebrow="الخدمات" title="ما يمكن للنشاط تقديمه" />
            <p className="max-w-xl text-sm leading-7 text-white/50 sm:text-base">
              الخدمات والأسعار المعروضة مأخوذة من البيانات المدخلة، وتبقى قابلة للمراجعة قبل النشر النهائي.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.slice(0, 6).map((service, index) => {
              const Icon = SERVICE_ICONS[index % SERVICE_ICONS.length];
              return (
                <article key={`${service.name}-${index}`} className="service-card premium-card group relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl border border-amber-300/15 bg-amber-300/10 text-amber-300 transition duration-500 group-hover:-translate-y-1 group-hover:bg-amber-300 group-hover:text-black">
                      <Icon size={21} />
                    </span>
                    <span className="text-xs font-black text-white/20">0{index + 1}</span>
                  </div>
                  <h3 className="mt-7 text-xl font-black sm:text-2xl">{service.name}</h3>
                  <p className="mt-3 text-sm leading-7 text-white/55">{service.description}</p>
                  {service.price ? <div className="mt-4 inline-flex rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1.5 text-sm font-black text-amber-200">{service.price}</div> : null}
                  <div className="mt-6 flex items-center gap-2 text-xs font-bold text-amber-200/75">
                    <CircleCheck size={14} />
                    قابل للتخصيص
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {gallery.length ? (
        <section id="gallery" className="section-reveal border-y border-white/10 bg-zinc-950/85 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <SectionHeading eyebrow="معرض الصور" title="لقطات من Google Maps" />
              <p className="max-w-lg text-sm leading-7 text-white/45">
                الصور المتاحة للنشاط عبر Google Places، مع إبقاء مصدرها ونسبها لأصحابها.
              </p>
            </div>
            <div className="mt-10 grid auto-rows-[210px] gap-4 sm:grid-cols-2 sm:auto-rows-[260px] lg:grid-cols-3">
              {gallery.slice(0, 6).map((photo, index) => (
                <figure
                  key={index}
                  className={`premium-card group relative overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-900 ${index === 0 ? 'sm:row-span-2 lg:col-span-2' : ''}`}
                >
                  <Image
                    src={`/api/google-photo?placeId=${encodeURIComponent(lead.google_place_id)}&index=${index}&width=1400`}
                    alt={`صورة ${displayName} ${index + 1}`}
                    fill
                    sizes={index === 0 ? '(max-width: 1024px) 100vw, 66vw' : '(max-width: 640px) 100vw, 33vw'}
                    className="object-cover transition duration-700 group-hover:scale-[1.045]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <figcaption className="absolute inset-x-0 bottom-0 p-4 text-[11px] text-white/60 sm:p-5">
                    {photo.authorAttributions?.length
                      ? <>الصورة: {photo.authorAttributions.map(item => item.displayName).filter(Boolean).join('، ')} · Google</>
                      : 'صورة عبر Google Places'}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="section-reveal py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:px-6 lg:grid-cols-2">
          <article id="hours" className="premium-card rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 sm:p-9">
            <CardTitle icon={<CalendarDays size={22} />} eyebrow="ساعات العمل" title="متى نستقبلكم؟" />
            {workingHours?.length ? (
              <div className="mt-7 space-y-3">
                {workingHours.map(line => (
                  <div key={line} className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm leading-6 text-white/70">
                    {line}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-7 rounded-2xl border border-white/10 bg-black/35 p-5 leading-8 text-white/55">
                تواصل مع النشاط لتأكيد ساعات العمل.
              </p>
            )}
          </article>

          <article id="ratings" className="premium-card rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 sm:p-9">
            <CardTitle icon={<Star size={22} />} eyebrow="التقييمات" title="آراء العملاء على Google" />
            <div className="mt-8 flex flex-wrap items-end gap-5">
              <div className="text-6xl font-black text-amber-300">{formatRating(lead.rating)}</div>
              <div className="pb-2">
                <div className="flex gap-1 text-amber-300" aria-label={`${formatRating(lead.rating)} من 5`}>
                  {Array.from({ length: 5 }, (_, index) => <Star key={index} size={18} fill={index < Math.round(Number(lead.rating || 0)) ? 'currentColor' : 'none'} />)}
                </div>
                <div className="mt-2 text-sm text-white/50">{lead.reviews_count} تقييمًا على Google</div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section id="contact" className="section-reveal border-t border-white/10 bg-zinc-950/85 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="overflow-hidden rounded-[2.5rem] border border-amber-300/20 bg-[radial-gradient(circle_at_top_right,rgba(252,211,77,.18),transparent_32%),linear-gradient(135deg,rgba(255,255,255,.06),rgba(255,255,255,.015))] p-6 sm:p-10 lg:p-14">
            <div className="grid items-end gap-10 lg:grid-cols-[1fr_auto]">
              <div>
                <p className="text-sm font-black text-amber-300">جاهز للتواصل؟</p>
                <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight [text-wrap:balance] sm:text-5xl">
                  خذ الخطوة التالية بسهولة
                </h2>
                <p className="mt-4 max-w-2xl leading-8 text-white/55">
                  اختر وسيلة التواصل المناسبة أو افتح موقع النشاط في خرائط Google مباشرة.
                </p>
              </div>
              {whatsappUrl ? (
                <ActionLink href={whatsappUrl} external primary icon={<MessageCircle size={19} />}>
                  تواصل عبر واتساب
                </ActionLink>
              ) : null}
            </div>
            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              <InfoCard icon={<MapPin size={22} />} label="العنوان" value={themeValue('address') || lead.address || [locationDistrict, locationCity].filter(Boolean).join('، ')} />
              {mapsUrl ? <InfoCard icon={<Navigation size={22} />} label="الاتجاهات" value="فتح الموقع في خرائط Google" href={mapsUrl} /> : null}
              {contactPhone ? <InfoCard icon={<Phone size={22} />} label="الاتصال" value={contactPhone} href={`tel:${contactPhone}`} /> : null}
            </div>
            {instagramUrl || tiktokUrl ? (
              <div className="mt-5 flex flex-wrap gap-3">
                {instagramUrl ? <ActionLink href={instagramUrl} external icon={<Camera size={18} />}>إنستغرام</ActionLink> : null}
                {tiktokUrl ? <ActionLink href={tiktokUrl} external icon={<Music2 size={18} />}>تيك توك</ActionLink> : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <footer className="px-4 py-9 text-center text-sm text-white/35">
        تصور معاينة قابل للمراجعة والتخصيص لـ {displayName}
      </footer>

      <div className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/85 p-2 shadow-2xl backdrop-blur-2xl sm:hidden">
        {whatsappUrl ? (
          <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-300 text-sm font-black text-black">
            <MessageCircle size={18} /> واتساب
          </a>
        ) : null}
        {contactPhone ? (
          <a href={`tel:${contactPhone}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[.04] text-sm font-black">
            <Phone size={18} /> اتصال
          </a>
        ) : null}
      </div>
    </main>
  );
}

function HeroBackdrop({ lead, displayName, gallery }: { lead: LeadRecord; displayName: string; gallery: PlacePhoto[] }) {
  if (gallery.length) {
    return (
      <Image
        src={`/api/google-photo?placeId=${encodeURIComponent(lead.google_place_id)}&index=0&width=1800`}
        alt={displayName}
        fill
        sizes="100vw"
        priority
        className="hero-photo -z-20 object-cover object-center"
      />
    );
  }

  return (
    <div className="absolute inset-0 -z-20 overflow-hidden bg-[radial-gradient(circle_at_15%_20%,rgba(252,211,77,.24),transparent_25%),radial-gradient(circle_at_85%_75%,rgba(252,211,77,.13),transparent_28%),linear-gradient(135deg,#18120a_0%,#090909_45%,#020202_100%)]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:52px_52px]" />
      <div className="absolute left-[8%] top-[22%] text-[34vw] font-black leading-none text-amber-300/[.035] sm:text-[20rem]">{displayName.charAt(0)}</div>
    </div>
  );
}

function HeroPhotoRail({ lead, displayName, gallery }: { lead: LeadRecord; displayName: string; gallery: PlacePhoto[] }) {
  if (gallery.length < 2) {
    return (
      <div className="hero-enter hero-delay-5 hidden justify-self-end lg:block">
        <div className="premium-card max-w-sm rounded-[2rem] border border-white/10 bg-black/30 p-5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-300 text-black"><BadgeCheck size={21} /></span>
            <div>
              <div className="font-black">تجربة مصممة للجوال</div>
              <div className="mt-1 text-xs text-white/45">معلومات واضحة ووصول سريع</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hero-enter hero-delay-5 hidden w-full max-w-md grid-cols-2 gap-4 justify-self-end lg:grid">
      {gallery.slice(1, 3).map((_, index) => (
        <div key={index} className={`${index === 1 ? 'mt-14' : ''} premium-card relative aspect-[3/4] overflow-hidden rounded-[2rem] border border-white/15 bg-black/30 shadow-2xl`}>
          <Image
            src={`/api/google-photo?placeId=${encodeURIComponent(lead.google_place_id)}&index=${index + 1}&width=900`}
            alt={`${displayName} ${index + 2}`}
            fill
            sizes="20vw"
            className="object-cover transition duration-700 hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>
      ))}
    </div>
  );
}

function formatRating(rating: number | null): string {
  return Number(rating || 0).toFixed(1);
}

function RatingPill({ rating, reviewsCount }: { rating: number | null; reviewsCount: number }) {
  return (
    <div className="inline-flex min-h-12 max-w-full items-center gap-3 rounded-full border border-white/15 bg-black/30 px-4 backdrop-blur-xl">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-300 text-black"><Star size={16} fill="currentColor" /></span>
      <div className="min-w-0">
        <div className="font-black">{formatRating(rating)} <span className="text-xs font-normal text-white/45">من 5</span></div>
        <div className="text-[11px] text-white/45">{reviewsCount} تقييمًا</div>
      </div>
    </div>
  );
}

function ActionLink({
  href,
  icon,
  children,
  external = false,
  primary = false,
  wideOnMobile = false,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  external?: boolean;
  primary?: boolean;
  wideOnMobile?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      className={`inline-flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-full px-4 text-sm font-black transition duration-300 sm:px-6 ${wideOnMobile ? 'col-span-2 sm:col-span-1' : ''} ${primary ? 'shine-button bg-amber-300 text-black hover:-translate-y-0.5 hover:bg-amber-200' : 'border border-white/15 bg-black/30 text-white backdrop-blur-xl hover:-translate-y-0.5 hover:bg-white/[0.09]'}`}
    >
      {icon}
      <span>{children}</span>
    </a>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="max-w-3xl">
      <p className="flex items-center gap-2 text-sm font-black text-amber-300"><span className="h-px w-8 bg-amber-300" />{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black leading-tight tracking-[-.025em] [text-wrap:balance] sm:text-5xl">{title}</h2>
    </div>
  );
}

function CardTitle({ icon, eyebrow, title }: { icon: React.ReactNode; eyebrow: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-300/10 text-amber-300">{icon}</span>
      <div>
        <div className="text-xs font-bold text-amber-300">{eyebrow}</div>
        <h2 className="mt-1 text-xl font-black sm:text-2xl">{title}</h2>
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href?: string }) {
  const content = (
    <div className="premium-card flex h-full min-w-0 items-start gap-4 rounded-[1.75rem] border border-white/10 bg-black/25 p-5 sm:p-6">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-300/10 text-amber-300">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-white/40">{label}</div>
        <div className="mt-2 font-bold leading-7 text-white/80 [overflow-wrap:anywhere]">{value}</div>
      </div>
      {href ? <ExternalLink size={16} className="mt-1 shrink-0 text-white/35" /> : null}
    </div>
  );

  return href ? (
    <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined}>{content}</a>
  ) : content;
}

export function PreviewError({ title, description }: { title: string; description: string }) {
  return (
    <main className="grid min-h-screen place-items-center overflow-x-hidden bg-black px-4 text-white" dir="rtl">
      <div className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-white/[0.035] p-7 text-center sm:p-10">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-300 text-black"><Sparkles /></span>
        <h1 className="mt-6 text-2xl font-black sm:text-3xl">{title}</h1>
        <p className="mt-4 leading-8 text-white/55">{description}</p>
        <div className="mt-6 text-xs font-bold text-amber-300">رابط معاينة خاص</div>
      </div>
    </main>
  );
}
