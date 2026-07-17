export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = 'BAD_REQUEST',
  ) {
    super(message);
  }
}

export function safeErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message.replace(/sk-[A-Za-z0-9_-]+/g, '[REDACTED]');
  return 'حدث خطأ غير متوقع.';
}

export function upstreamErrorMessage(service: 'GOOGLE' | 'OPENAI', status: number): string {
  if (status === 429) return service === 'GOOGLE'
    ? 'تم بلوغ حد Google Places مؤقتًا. حاول بعد قليل أو راجع الحصة.'
    : 'تم بلوغ حد OpenAI مؤقتًا. حاول بعد قليل.';
  if (status === 403 && service === 'GOOGLE') return 'تعذر استخدام Google Places. تحقق من تفعيل API والفوترة والقيود على المفتاح.';
  return service === 'GOOGLE' ? 'تعذر جلب البيانات من Google Places.' : 'تعذر توليد النص بالذكاء الاصطناعي.';
}
