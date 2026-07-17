import { ApiError } from '@/lib/api-errors';
import { contactBlocked } from '@/lib/contact-policy';
import { getLead, updateLead } from '@/lib/leads-service';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function recordContactAction(input: {
  leadId: string;
  action: 'OPENED_WHATSAPP' | 'MARKED_SENT' | 'NOT_SENT' | 'DO_NOT_CONTACT';
  messageId?: string;
  messageSnapshot?: string;
  notes?: string;
}) {
  const supabase = getSupabaseAdmin();
  const lead = await getLead(input.leadId);
  const policy = contactBlocked(lead.contact_status);

  if (input.action === 'OPENED_WHATSAPP' && policy.blocked) {
    throw new ApiError(policy.reason || 'التواصل معطل.', 409, 'CONTACT_BLOCKED');
  }

  const now = new Date().toISOString();
  if (input.action === 'MARKED_SENT') {
    if (policy.blocked) throw new ApiError(policy.reason || 'التواصل معطل.', 409, 'CONTACT_BLOCKED');
    await updateLead(input.leadId, { contact_status: 'CONTACTED' });
    await supabase.from('leads').update({ last_contacted_at: now }).eq('id', input.leadId);
    if (input.messageId) {
      await supabase.from('outreach_messages').update({ status: 'sent', sent_at: now }).eq('id', input.messageId);
    }
  }

  if (input.action === 'DO_NOT_CONTACT') {
    await updateLead(input.leadId, {
      contact_status: 'DO_NOT_CONTACT',
      contact_block_reason: input.notes || 'تم تحديد عدم التواصل مجددًا من لوحة التحكم.',
    });
  }

  const dbAction = input.action === 'DO_NOT_CONTACT' ? 'STATUS_CHANGED' : input.action;
  const { data, error } = await supabase.from('contact_logs').insert({
    lead_id: input.leadId,
    message_id: input.messageId || null,
    channel: 'whatsapp',
    action: dbAction,
    message_snapshot: input.messageSnapshot || null,
    contacted_at: input.action === 'MARKED_SENT' ? now : null,
    notes: input.notes || null,
  }).select('*').single();
  if (error) throw new ApiError('تعذر حفظ سجل التواصل.', 500);
  return data;
}
