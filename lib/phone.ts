export function digitsOnly(value: string): string {
  return value.replace(/[^0-9]/g, '');
}

export function normalizeSaudiPhone(value?: string | null): string | null {
  if (!value) return null;
  let digits = digitsOnly(value);
  if (!digits) return null;

  if (digits.startsWith('00966')) digits = digits.slice(2);
  if (digits.startsWith('9660')) digits = `966${digits.slice(4)}`;
  if (digits.startsWith('05')) digits = `966${digits.slice(1)}`;
  if (digits.startsWith('5') && digits.length === 9) digits = `966${digits}`;

  if (!/^9665\d{8}$/.test(digits)) return null;
  return digits;
}

export function formatSaudiLocal(value?: string | null): string | null {
  const normalized = normalizeSaudiPhone(value);
  if (!normalized) return null;
  return `0${normalized.slice(3)}`;
}

export function buildWhatsAppUrl(phone: string, message: string): string | null {
  const normalized = normalizeSaudiPhone(phone);
  if (!normalized || !message.trim()) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message.trim())}`;
}
