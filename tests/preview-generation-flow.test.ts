import test from 'node:test';
import assert from 'node:assert/strict';

const environmentKeys = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SECRET_KEY',
  'PREVIEW_TOKEN_SECRET',
  'NEXT_PUBLIC_APP_URL',
  'OPENAI_API_KEY',
] as const;

test('generates a short preview link and natural outreach draft without changing the stored name', async () => {
  const savedEnvironment = Object.fromEntries(environmentKeys.map(key => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  const leadId = '20000000-0000-4000-8000-000000000001';
  const originalName = 'صالون أراكم للحلاقة الرجالية 5 نجوم';
  let insertedPreview: Record<string, unknown> | null = null;
  let insertedMessage: Record<string, unknown> | null = null;

  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://preview-flow.mock';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';
  process.env.PREVIEW_TOKEN_SECRET = 'mock-preview-token-secret';
  process.env.NEXT_PUBLIC_APP_URL = 'https://salon-1.example';
  delete process.env.SUPABASE_SECRET_KEY;
  delete process.env.OPENAI_API_KEY;

  const lead = {
    id: leadId,
    google_place_id: 'ChIJPreviewFlow',
    name: originalName,
    phone_local: '0509955337',
    phone_international: '966509955337',
    address: 'حي الفيصلية، الدمام',
    city: 'الدمام',
    district: 'الفيصلية',
    latitude: 26.42,
    longitude: 50.08,
    rating: 4.3,
    reviews_count: 54,
    business_status: 'OPERATIONAL',
    maps_url: 'https://www.google.com/maps/place/?q=place_id:ChIJPreviewFlow',
    website_url: null,
    website_status: 'NO_WEBSITE',
    opening_hours_json: [],
    photos_json: [],
    place_data_json: {},
    primary_type: 'barber_shop',
    types_json: ['barber_shop'],
    contact_status: 'NO_WEBSITE',
    contact_block_reason: null,
    notes: null,
    last_contacted_at: null,
    last_google_fetch_at: '2026-07-17T00:00:00.000Z',
    created_at: '2026-07-17T00:00:00.000Z',
    updated_at: '2026-07-17T00:00:00.000Z',
  };

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : undefined;
    const url = new URL(request?.url || input.toString());
    const method = init?.method || request?.method || 'GET';
    const bodyText = typeof init?.body === 'string' ? init.body : '';
    const body = bodyText ? JSON.parse(bodyText) as Record<string, unknown> : {};

    if (url.hostname !== 'preview-flow.mock') throw new Error(`Unexpected request: ${method} ${url}`);

    if (url.pathname === '/rest/v1/leads') {
      if (method === 'PATCH') return Response.json({ ...lead, ...body });
      return Response.json(lead);
    }
    if (url.pathname === '/rest/v1/previews') {
      if (method === 'POST') {
        insertedPreview = {
          ...body,
          created_at: '2026-07-17T00:00:00.000Z',
          updated_at: '2026-07-17T00:00:00.000Z',
        };
        return Response.json(insertedPreview);
      }
      return Response.json([]);
    }
    if (url.pathname === '/rest/v1/outreach_messages') {
      if (method === 'POST') {
        insertedMessage = {
          id: '30000000-0000-4000-8000-000000000001',
          ...body,
          created_at: '2026-07-17T00:00:00.000Z',
          updated_at: '2026-07-17T00:00:00.000Z',
        };
        return Response.json(insertedMessage);
      }
      return Response.json([]);
    }

    throw new Error(`Unexpected Supabase endpoint: ${method} ${url}`);
  }) as typeof fetch;

  try {
    const { generatePreview } = await import('@/lib/preview-service');
    const result = await generatePreview(leadId, { expiresInDays: 30 });
    const previewPayload = insertedPreview as Record<string, unknown> | null;
    const messagePayload = insertedMessage as Record<string, unknown> | null;

    assert.match(result.url, /^https:\/\/salon-1\.example\/p\/[A-Za-z0-9_-]{11}$/);
    assert.ok(previewPayload);
    assert.ok(messagePayload);
    assert.equal(previewPayload.title, 'صالون أراكم للحلاقة الرجالية');
    assert.equal(lead.name, originalName);
    assert.match(String(previewPayload.public_share_code_hash), /^[0-9a-f]{64}$/);
    assert.match(String(messagePayload.message_text), /صالون أراكم للحلاقة الرجالية/);
    assert.match(String(messagePayload.message_text), /https:\/\/salon-1\.example\/p\//);
    assert.doesNotMatch(String(messagePayload.message_text), /%D8|نموذج\s+(?:معاينة\s+)?بسيط/);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of environmentKeys) {
      const value = savedEnvironment[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
