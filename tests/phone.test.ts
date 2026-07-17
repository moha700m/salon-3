import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWhatsAppUrl, normalizeSaudiPhone } from '@/lib/phone';

test('normalizes Saudi 05 number', () => assert.equal(normalizeSaudiPhone('050 995 5337'), '966509955337'));
test('normalizes +966 number', () => assert.equal(normalizeSaudiPhone('+966 50 995 5337'), '966509955337'));
test('removes spaces, hyphens, and parentheses', () => assert.equal(normalizeSaudiPhone('(050)-995-5337'), '966509955337'));
test('rejects missing or invalid number', () => assert.equal(normalizeSaudiPhone('013-123-4567'), null));
test('builds encoded wa.me link without sending', () => assert.equal(buildWhatsAppUrl('0509955337', 'السلام عليكم'), 'https://wa.me/966509955337?text=%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85%20%D8%B9%D9%84%D9%8A%D9%83%D9%85'));
