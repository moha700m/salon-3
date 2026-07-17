import type { ContactStatus, WebsiteStatus } from '@/types/domain';

const contactLabels: Record<ContactStatus, string> = {
  NEW: 'جديد', NEEDS_REVIEW: 'يحتاج مراجعة', NO_WEBSITE: 'بدون موقع', PREVIEW_GENERATING: 'جاري إنشاء المعاينة',
  PREVIEW_READY: 'المعاينة جاهزة', READY_TO_CONTACT: 'جاهز للتواصل', CONTACTED: 'تم التواصل', REPLIED: 'ردّ',
  INTERESTED: 'مهتم', NOT_INTERESTED: 'غير مهتم', DO_NOT_CONTACT: 'عدم التواصل', PHONE_MISSING: 'لا يوجد رقم', ERROR: 'خطأ',
};

const styles: Record<string, string> = {
  NEW: 'border-blue-500/30 bg-blue-500/10 text-blue-200', NEEDS_REVIEW: 'border-orange-500/30 bg-orange-500/10 text-orange-200',
  NO_WEBSITE: 'border-purple-500/30 bg-purple-500/10 text-purple-200', PREVIEW_GENERATING: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-200',
  PREVIEW_READY: 'border-green-500/30 bg-green-500/10 text-green-200', READY_TO_CONTACT: 'border-green-500/30 bg-green-500/10 text-green-200',
  CONTACTED: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200', REPLIED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  INTERESTED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200', NOT_INTERESTED: 'border-red-500/30 bg-red-500/10 text-red-200',
  DO_NOT_CONTACT: 'border-red-500/30 bg-red-500/10 text-red-200', PHONE_MISSING: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-300',
  ERROR: 'border-red-500/30 bg-red-500/10 text-red-200', HAS_WEBSITE: 'border-blue-500/30 bg-blue-500/10 text-blue-200',
  NEEDS_REVIEW_WEBSITE: 'border-orange-500/30 bg-orange-500/10 text-orange-200', NO_WEBSITE_STATUS: 'border-purple-500/30 bg-purple-500/10 text-purple-200',
};

export function ContactStatusBadge({ status }: { status: ContactStatus }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${styles[status]}`}>{contactLabels[status]}</span>;
}

export function WebsiteStatusBadge({ status }: { status: WebsiteStatus }) {
  const key = status === 'NO_WEBSITE' ? 'NO_WEBSITE_STATUS' : status === 'NEEDS_REVIEW' ? 'NEEDS_REVIEW_WEBSITE' : 'HAS_WEBSITE';
  const label = status === 'NO_WEBSITE' ? 'بدون موقع' : status === 'HAS_WEBSITE' ? 'لديه موقع' : 'يحتاج مراجعة';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${styles[key]}`}>{label}</span>;
}
