import type { Metadata } from 'next';
import { PreviewError, PreviewExperience } from '@/components/preview-experience';
import { previewAccessState } from '@/lib/preview-access';
import { loadLegacyPreview } from '@/lib/preview-data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const bundle = await loadLegacyPreview(slug, query.token);
  if (!bundle) {
    return { title: 'رابط معاينة خاص', robots: { index: false, follow: false, nocache: true } };
  }
  const description = bundle.preview.about_text || `نسخة معاينة لموقع ${bundle.lead.name}`;
  return {
    title: `${bundle.preview.title || bundle.lead.name} | نسخة معاينة`,
    description,
    openGraph: {
      title: bundle.preview.title || bundle.lead.name,
      description,
      type: 'website',
      locale: 'ar_SA',
      images: bundle.campaign?.advertisement_image_url ? [{ url: bundle.campaign.advertisement_image_url, width: 1080, height: 1350, alt: `إعلان ${bundle.lead.name}` }] : undefined,
    },
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: { index: false, follow: false, noimageindex: true },
    },
  };
}

export default async function LegacyPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const bundle = await loadLegacyPreview(slug, query.token);
  if (!bundle) {
    return <PreviewError title="الرابط غير موجود" description="تأكد من نسخ رابط المعاينة الخاص كاملًا." />;
  }

  const state = previewAccessState(bundle.preview, query.token);
  if (state === 'INVALID_TOKEN') {
    return <PreviewError title="رمز المعاينة غير صحيح" description="هذا الرابط خاص، وتلزم نسخته الكاملة لفتح المعاينة." />;
  }
  if (state === 'EXPIRED') {
    return <PreviewError title="انتهت صلاحية المعاينة" description="اطلب رابط معاينة جديدًا من صاحب المنصة." />;
  }
  if (state === 'DISABLED') {
    return <PreviewError title="تم تعطيل المعاينة" description="هذا الرابط غير متاح حاليًا." />;
  }

  return <PreviewExperience lead={bundle.lead} preview={bundle.preview} />;
}
