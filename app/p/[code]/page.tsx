import type { Metadata } from 'next';
import { PreviewError, PreviewExperience } from '@/components/preview-experience';
import { loadPublicSharePreview } from '@/lib/preview-data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const result = await loadPublicSharePreview(code);
  if (result.state !== 'ACTIVE') {
    return {
      title: 'رابط معاينة خاص',
      robots: { index: false, follow: false, nocache: true },
    };
  }
  const { preview, lead, campaign } = result.bundle;
  const description = preview.about_text || `نسخة معاينة لموقع ${lead.name}`;
  return {
    title: `${preview.title || lead.name} | نسخة معاينة`,
    description,
    openGraph: {
      title: preview.title || lead.name,
      description,
      type: 'website',
      locale: 'ar_SA',
      images: campaign?.advertisement_image_url ? [{ url: campaign.advertisement_image_url, width: 1080, height: 1350, alt: `إعلان ${lead.name}` }] : undefined,
    },
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: { index: false, follow: false, noimageindex: true },
    },
  };
}

export default async function PublicSharePreviewPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const result = await loadPublicSharePreview(code);

  if (result.state === 'INVALID_CODE' || result.state === 'NOT_FOUND') {
    return <PreviewError title="رابط المعاينة غير صحيح" description="تأكد من نسخ رابط المشاركة القصير كاملًا." />;
  }
  if (result.state === 'EXPIRED') {
    return <PreviewError title="انتهت صلاحية المعاينة" description="هذا الرابط لم يعد متاحًا. اطلب رابطًا جديدًا." />;
  }
  if (result.state === 'DISABLED') {
    return <PreviewError title="المعاينة غير متاحة" description="تم تعطيل هذا الرابط من لوحة التحكم." />;
  }
  if (result.state !== 'ACTIVE') {
    return <PreviewError title="رابط المعاينة غير صحيح" description="تأكد من نسخ رابط المشاركة القصير كاملًا." />;
  }

  return <PreviewExperience lead={result.bundle.lead} preview={result.bundle.preview} />;
}
