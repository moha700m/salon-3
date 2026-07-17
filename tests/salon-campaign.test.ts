import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import {
  buildFallbackWhatsAppMessage,
  fallbackCampaignContent,
  generateSalonCampaignContent,
  type SalonCampaignSource,
} from '@/lib/campaign-content';
import { normalizeSaudiPhone } from '@/lib/phone';
import {
  campaignApprovalBlockReason,
  campaignImageAfterAttempt,
  campaignMarkSentBlockReason,
  campaignMissingFields,
  nextCampaignVersion,
} from '@/lib/salon-campaign-service';
import { buildSalonAdSvg, renderSalonAdPng, SALON_AD_HEIGHT, SALON_AD_WIDTH } from '@/lib/salon-ad-image';
import { salonCampaignInputSchema } from '@/lib/validation';

const baseSource: SalonCampaignSource = {
  salonName: 'صالون الواجهة',
  ownerName: 'محمد',
  phone: '0501234567',
  whatsapp: '966501234567',
  city: 'الدمام',
  district: 'الشاطئ',
  address: 'شارع الخليج',
  mapsUrl: 'https://maps.google.com/?q=26,50',
  workingHours: 'يوميًا من 10 صباحًا إلى 12 مساءً',
  services: [
    { name: 'حلاقة شعر', price: '50 ر.س' },
    { name: 'تهذيب لحية', price: '30 ر.س' },
    { name: 'حلاقة شعر ولحية', price: null },
  ],
  instagramUrl: null,
  tiktokUrl: null,
  websitePreviewUrl: 'https://example.com/p/abc123',
};

test('normalizes Saudi WhatsApp number variants', () => {
  assert.equal(normalizeSaudiPhone('05 0123-4567'), '966501234567');
  assert.equal(normalizeSaudiPhone('+966 50 123 4567'), '966501234567');
  assert.equal(normalizeSaudiPhone('966501234567'), '966501234567');
});

test('fallback WhatsApp message is personal and has no unresolved variables', () => {
  const message = buildFallbackWhatsAppMessage(baseSource);
  assert.match(message, /السلام عليكم يا محمد/);
  assert.match(message, /صالون الواجهة/);
  assert.match(message, /https:\/\/example.com\/p\/abc123/);
  assert.doesNotMatch(message, /{{[^}]+}}/);
  assert.doesNotMatch(message, /الموقع مكتمل نهائيًا|موقعكم الرسمي/);
});

test('fallback without owner uses plural respectful version', () => {
  const message = buildFallbackWhatsAppMessage({ ...baseSource, ownerName: null });
  assert.match(message, /^السلام عليكم 👋/);
  assert.match(message, /إذا ناسبكم التصور/);
});

test('campaign missing fields only blocks required delivery fields', () => {
  assert.deepEqual(campaignMissingFields(baseSource), []);
  assert.deepEqual(
    campaignMissingFields({ ...baseSource, whatsapp: null, websitePreviewUrl: '' }),
    ['whatsapp', 'website_preview_url'],
  );
});

test('input validation allows optional values and rejects invalid preview URL', () => {
  const valid = salonCampaignInputSchema.parse({
    salonName: 'صالون الواجهة',
    ownerName: '',
    phone: '0501234567',
    whatsapp: '05 0123-4567',
    city: 'الدمام',
    services: [{ name: 'حلاقة شعر', price: '' }],
    websitePreviewUrl: 'https://example.com/p/abc123',
  });
  assert.equal(valid.services[0].name, 'حلاقة شعر');
  assert.throws(() => salonCampaignInputSchema.parse({ websitePreviewUrl: 'not-a-url' }));
});

test('image SVG uses only real salon data and selected services', () => {
  const content = fallbackCampaignContent(baseSource);
  const svg = buildSalonAdSvg({
    salonName: baseSource.salonName,
    phone: baseSource.phone,
    location: content.short_location,
    workingHours: content.short_working_hours,
    services: content.selected_services,
    content,
  });
  assert.match(svg, /صالون الواجهة/);
  assert.match(svg, /حلاقة شعر/);
  assert.match(svg, /50 ر\.س/);
  assert.doesNotMatch(svg, /{{[^}]+}}|Lorem Ipsum/);
});

test('renders a high-quality 1080x1350 PNG from the fixed template', async () => {
  const content = fallbackCampaignContent(baseSource);
  const buffer = await renderSalonAdPng({
    salonName: baseSource.salonName,
    phone: baseSource.phone,
    location: content.short_location,
    workingHours: content.short_working_hours,
    services: content.selected_services,
    content,
  });
  const metadata = await sharp(buffer).metadata();
  assert.equal(metadata.format, 'png');
  assert.equal(metadata.width, SALON_AD_WIDTH);
  assert.equal(metadata.height, SALON_AD_HEIGHT);
  assert.ok(buffer.length > 50_000);
});


test('full salon data produces selected services, location, and review-ready copy', () => {
  const content = fallbackCampaignContent(baseSource);
  assert.equal(content.selected_services.length, 3);
  assert.equal(content.short_location, 'الشاطئ – الدمام');
  assert.equal(content.image_text.title, 'صالون الواجهة');
  assert.match(content.whatsapp_message, /تصورًا أوليًا/);
});

test('services without prices remain price-free and social links are optional', () => {
  const source: SalonCampaignSource = {
    ...baseSource,
    services: [{ name: 'حلاقة شعر', price: null }, { name: 'تهذيب لحية', price: null }],
    instagramUrl: null,
    tiktokUrl: null,
  };
  const content = fallbackCampaignContent(source);
  assert.deepEqual(content.selected_services.map(item => item.price), [null, null]);
  const parsed = salonCampaignInputSchema.parse({
    salonName: source.salonName,
    whatsapp: source.whatsapp,
    city: source.city,
    websitePreviewUrl: source.websitePreviewUrl,
    services: source.services.map(item => ({ name: item.name, price: '' })),
  });
  assert.equal(parsed.instagramUrl, '');
  assert.equal(parsed.tiktokUrl, '');
});

test('OpenAI failure or missing key falls back without changing immutable fields', async () => {
  const original = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const lead = {
      name: baseSource.salonName,
      city: baseSource.city,
      district: baseSource.district,
    } as never;
    const content = await generateSalonCampaignContent(lead, baseSource);
    assert.equal(content.used_fallback, true);
    assert.equal(content.image_text.title, baseSource.salonName);
    assert.match(content.whatsapp_message, new RegExp(baseSource.websitePreviewUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  } finally {
    if (original) process.env.OPENAI_API_KEY = original;
  }
});

test('failed image regeneration preserves the last valid image', () => {
  const current = { advertisement_image_path: 'old/image.png', advertisement_image_url: 'https://cdn.example/old.png' };
  assert.deepEqual(campaignImageAfterAttempt(current, null), {
    path: 'old/image.png',
    url: 'https://cdn.example/old.png',
  });
  assert.deepEqual(campaignImageAfterAttempt(current, { path: 'new/image.png', url: 'https://cdn.example/new.png' }), {
    path: 'new/image.png',
    url: 'https://cdn.example/new.png',
  });
});

test('campaign regeneration increments version and duplicate sends are blocked', () => {
  assert.equal(nextCampaignVersion(null), 1);
  assert.equal(nextCampaignVersion({ version: 4 }), 5);
  assert.match(campaignMarkSentBlockReason({ generation_status: 'ready_for_review', send_status: 'not_sent' }) || '', /اعتمد الحملة/);
  assert.match(campaignMarkSentBlockReason({ generation_status: 'ready_to_send', send_status: 'sent' }) || '', /مسبقًا/);
  assert.equal(campaignMarkSentBlockReason({ generation_status: 'ready_to_send', send_status: 'ready' }), null);
});

test('approval requires the image, message, and required fields', () => {
  assert.match(campaignApprovalBlockReason({ missing_fields: ['whatsapp'], advertisement_image_url: 'x', whatsapp_message: 'رسالة' }) || '', /أكمل/);
  assert.match(campaignApprovalBlockReason({ missing_fields: [], advertisement_image_url: null, whatsapp_message: 'رسالة' }) || '', /غير جاهزة/);
  assert.equal(campaignApprovalBlockReason({ missing_fields: [], advertisement_image_url: 'https://cdn/image.png', whatsapp_message: 'رسالة صالحة' }), null);
});
