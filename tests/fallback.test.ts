import test from 'node:test';
import assert from 'node:assert/strict';
import { fallbackCopy } from '@/lib/openai-service';
import { countWords } from '@/lib/preview-copy';

test('OpenAI fallback stays factual and contains no invented prices', () => {
  const copy = fallbackCopy({ name: 'حلاق الاختبار 5 نجوم', city: 'الدمام', district: null, rating: 4.5, reviews_count: 20 }, 'https://example.test/p/A7kP92mQxyz');
  assert.equal(copy.services.length, 0);
  assert.equal(copy.messageVariants.length, 4);
  assert.ok(copy.messageVariants.every(message => message.includes('حلاق الاختبار') && message.includes('https://example.test/p/')));
  assert.ok(copy.messageVariants.every(message => countWords(message) >= 45 && countWords(message) <= 75));
  assert.ok(copy.messageVariants.every(message => !/%D8|نموذج بسيط|موقعكم جاهز/.test(message)));
  assert.doesNotMatch(copy.aboutText, /https?:\/\/|ساعات العمل|تقييم|نجوم/);
});
