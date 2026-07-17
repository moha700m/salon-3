import type { ContactStatus } from '@/types/domain';

export function contactBlocked(status: ContactStatus): { blocked: boolean; reason?: string } {
  if (status === 'DO_NOT_CONTACT') return { blocked: true, reason: 'تم اختيار عدم التواصل مع هذا النشاط.' };
  if (status === 'NOT_INTERESTED') return { blocked: true, reason: 'النشاط غير مهتم، لذلك تم تعطيل التواصل.' };
  return { blocked: false };
}
