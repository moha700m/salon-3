import test from 'node:test';
import assert from 'node:assert/strict';

const environmentKeys = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY', 'GOOGLE_PLACES_API_KEY', 'OPENAI_API_KEY'] as const;

test('imports a Google Maps place through mocked Google Places and Supabase services', async () => {
  const savedEnvironment = Object.fromEntries(environmentKeys.map(key => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  const requests: Array<{ hostname: string; pathname: string; method: string }> = [];

  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.mock';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';
  process.env.GOOGLE_PLACES_API_KEY = 'mock-google-places-key';
  delete process.env.SUPABASE_SECRET_KEY;
  delete process.env.OPENAI_API_KEY;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : undefined;
    const url = new URL(request?.url || input.toString());
    const method = init?.method || request?.method || 'GET';
    requests.push({ hostname: url.hostname, pathname: url.pathname, method });

    if (url.hostname === 'www.google.com') return new Response(null, { status: 200 });
    if (url.hostname === 'places.googleapis.com') {
      return Response.json({
        id: 'ChIJ1234567890',
        displayName: { text: 'صالون الاختبار' },
        formattedAddress: 'الدمام، السعودية',
        addressComponents: [{ longText: 'الدمام', types: ['locality'] }],
        internationalPhoneNumber: '+966 50 995 5337',
        googleMapsUri: 'https://www.google.com/maps/place/?q=place_id:ChIJ1234567890',
        rating: 4.7,
        userRatingCount: 12,
        location: { latitude: 26.42, longitude: 50.09 },
        regularOpeningHours: { weekdayDescriptions: ['الأحد: 10:00 ص – 10:00 م'] },
        types: ['barber_shop'],
        primaryType: 'barber_shop',
        photos: [],
      });
    }
    if (url.hostname === 'supabase.mock' && url.pathname.startsWith('/rest/v1/place_cache')) {
      return Response.json([]);
    }
    throw new Error(`Unexpected mocked request: ${method} ${url}`);
  }) as typeof fetch;

  try {
    const { getPlaceFromMapUrl } = await import('@/lib/google-places');
    const profile = await getPlaceFromMapUrl('https://www.google.com/maps/search/?api=1&query_place_id=ChIJ1234567890');

    assert.equal(profile.googlePlaceId, 'ChIJ1234567890');
    assert.equal(profile.name, 'صالون الاختبار');
    assert.equal(profile.phoneInternational, '966509955337');
    assert.equal(profile.websiteStatus, 'NO_WEBSITE');
    assert.ok(requests.some(request => request.hostname === 'places.googleapis.com'));
    assert.ok(requests.some(request => request.hostname === 'supabase.mock' && request.pathname === '/rest/v1/place_cache'));
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of environmentKeys) {
      const value = savedEnvironment[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
