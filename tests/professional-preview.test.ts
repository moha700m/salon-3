import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { contactStatusAfterAction } from '@/lib/contact-policy';
import {
  buildProfessionalOutreachVariants,
  cleanAboutText,
  countWords,
} from '@/lib/preview-copy';
import {
  buildPublicShareUrl,
  createPublicShareCode,
  hashPublicShareCode,
  publicShareAccessState,
} from '@/lib/public-share';

process.env.PREVIEW_TOKEN_SECRET = 'professional-preview-test-secret';

test('about text never displays URLs, hours, or ratings', () => {
  const about = cleanAboutText(
    'صالون أراكم في الدمام. التقييم 4.7 نجوم. ساعات العمل 10:00. https://example.test/p/code',
    'صالون أراكم',
  );
  assert.doesNotMatch(about, /https?:\/\/|ساعات العمل|تقييم|نجوم|10:00/i);
});

test('professional WhatsApp drafts stay natural, short, and unencoded', () => {
  const url = 'https://salon-1.example/p/A7kP92mQxyz';
  const variants = buildProfessionalOutreachVariants('صالون أراكم للحلاقة الرجالية', url);
  assert.equal(variants.length, 4);
  for (const message of variants) {
    assert.match(message, /صالون أراكم للحلاقة الرجالية/);
    assert.ok(message.includes(`\n${url}\n`));
    assert.doesNotMatch(message, /%D8|نموذج\s+(?:معاينة\s+)?بسيط|موقعكم جاهز/);
    assert.ok(countWords(message) >= 45 && countWords(message) <= 75);
  }
});

test('short share links are non-sequential and validate active preview state', () => {
  const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = 'https://salon-1.example';
  try {
    const previewId = '10000000-0000-4000-8000-000000000001';
    const code = createPublicShareCode(previewId);
    const secondCode = createPublicShareCode('10000000-0000-4000-8000-000000000002');
    const preview = {
      is_active: true,
      expires_at: '2099-01-01T00:00:00.000Z',
      public_share_code_hash: hashPublicShareCode(code),
    };
    assert.match(code, /^[A-Za-z0-9_-]{11}$/);
    assert.notEqual(secondCode, code);
    assert.equal(buildPublicShareUrl({ id: previewId }), `https://salon-1.example/p/${code}`);
    assert.equal(publicShareAccessState(preview, code), 'ACTIVE');
    assert.equal(publicShareAccessState(preview, 'wrong-code!'), 'INVALID_CODE');
    assert.equal(publicShareAccessState(preview, 'ABCDEFGHIJK'), 'NOT_FOUND');
    assert.equal(publicShareAccessState({ ...preview, is_active: false }, code), 'DISABLED');
    assert.equal(publicShareAccessState({ ...preview, expires_at: '2020-01-01T00:00:00.000Z' }, code), 'EXPIRED');
  } finally {
    if (previousAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
  }
});

test('short share route provides clear invalid, disabled, and expired states', () => {
  const source = fs.readFileSync('app/p/[code]/page.tsx', 'utf8');
  assert.match(source, /رابط المعاينة غير صحيح/);
  assert.match(source, /انتهت صلاحية المعاينة/);
  assert.match(source, /المعاينة غير متاحة/);
});

test('opening WhatsApp does not mark the lead as contacted', () => {
  assert.equal(contactStatusAfterAction('READY_TO_CONTACT', 'OPENED_WHATSAPP'), 'READY_TO_CONTACT');
  assert.equal(contactStatusAfterAction('READY_TO_CONTACT', 'MARKED_SENT'), 'CONTACTED');
});

test('preview UI includes explicit mobile overflow safeguards', () => {
  const source = fs.readFileSync('components/preview-experience.tsx', 'utf8');
  assert.match(source, /overflow-x-clip/);
  assert.match(source, /overflow-wrap:anywhere/);
  assert.match(source, /clamp\(2rem, 8\.8vw, 5rem\)/);
  assert.match(source, /min-h-11/);
});

test('migration adds a unique hashed share code without removing data', () => {
  const sql = fs.readFileSync('supabase/migrations/20260717132217_professional_preview_share_codes.sql', 'utf8');
  assert.match(sql, /add column if not exists public_share_code_hash text/i);
  assert.match(sql, /create unique index if not exists[\s\S]*public_share_code_hash/i);
  assert.doesNotMatch(sql, /\bdrop\s+(?:table|column)\b/i);
});
