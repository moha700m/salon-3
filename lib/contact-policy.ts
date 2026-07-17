import type { ContactStatus } from '@/types/domain';

export type ContactAction = 'OPENED_WHATSAPP' | 'MARKED_SENT' | 'NOT_SENT' | 'DO_NOT_CONTACT';

export function contactBlocked(status: ContactStatus): { blocked: boolean; reason?: string } {
  if (status === 'DO_NOT_CONTACT') return { blocked: true, reason: 'تم اختيار عدم التواصل مع هذا النشاط.' };
  if (status === 'NOT_INTERESTED') return { blocked: true, reason: 'النشاط غير مهتم، لذلك تم تعطيل التواصل.' };
  return { blocked: false };
}

export function contactStatusAfterAction(status: ContactStatus, action: ContactAction): ContactStatus {
  if (action === 'MARKED_SENT') return 'CONTACTED';
  if (action === 'DO_NOT_CONTACT') return 'DO_NOT_CONTACT';
  return status;
}
