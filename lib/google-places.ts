import { ApiError, upstreamErrorMessage } from '@/lib/api-errors';
import { determineWebsiteStatus } from '@/lib/website-status';
import { formatSaudiLocal, normalizeSaudiPhone } from '@/lib/phone';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import type { PlacePhoto, WebsiteStatus } from '@/types/domain';

const PLACES_API_BASE = 'https://places.googleapis.com/v1';
const CACHE_DAYS = 21;

interface LocalizedText { text?: string }
interface AddressComponent { longText?: string; shortText?: string; types?: string[] }
interface GooglePhoto {
  name?: string;
  widthPx?: number;
  heightPx?: number;
  authorAttributions?: Array<{ displayName?: string; uri?: string; photoUri?: string }>;
}

interface PlaceApiResponse {
  id?: string;
  displayName?: LocalizedText;
  formattedAddress?: string;
  addressComponents?: AddressComponent[];
  internationalPhoneNumber?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  location?: { latitude?: number; longitude?: number };
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  businessStatus?: string;
  types?: string[];
  primaryType?: string;
  primaryTypeDisplayName?: LocalizedText;
  photos?: GooglePhoto[];
}

interface SearchResponse { places?: PlaceApiResponse[]; nextPageToken?: string }

export interface GooglePlaceProfile {
  googlePlaceId: string;
  name: string;
  phoneLocal: string | null;
  phoneInternational: string | null;
  address: string;
  city: string;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  reviewsCount: number;
  businessStatus: string | null;
  mapsUrl: string;
  websiteUrl: string | null;
  websiteStatus: WebsiteStatus;
  openingHours: string[];
  photos: PlacePhoto[];
  primaryType: string | null;
  types: string[];
  raw: Record<string, unknown>;
}

export interface SearchPlacesInput {
  country: string;
  city: string;
  district?: string;
  activityTypes: string[];
  limit: number;
}

function getApiKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new ApiError('Google Places غير مهيأ.', 503, 'GOOGLE_NOT_CONFIGURED');
  return key;
}

const SEARCH_FIELDS = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.addressComponents',
  'places.internationalPhoneNumber',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.googleMapsUri',
  'places.rating',
  'places.userRatingCount',
  'places.location',
  'places.regularOpeningHours',
  'places.businessStatus',
  'places.types',
  'places.primaryType',
  'places.primaryTypeDisplayName',
  'places.photos',
  'nextPageToken',
].join(',');

const DETAIL_FIELDS = SEARCH_FIELDS
  .split(',')
  .filter(field => field !== 'nextPageToken')
  .map(field => field.replace(/^places\./, ''))
  .join(',');

function addressPart(place: PlaceApiResponse, accepted: string[]): string | null {
  const component = place.addressComponents?.find(item => item.types?.some(type => accepted.includes(type)));
  return component?.longText || component?.shortText || null;
}

function inferCity(place: PlaceApiResponse): string {
  return addressPart(place, ['locality', 'administrative_area_level_2', 'administrative_area_level_1'])
    || place.formattedAddress?.split(',').map(part => part.trim()).filter(Boolean).at(-2)
    || 'السعودية';
}

function inferDistrict(place: PlaceApiResponse): string | null {
  return addressPart(place, ['neighborhood', 'sublocality_level_1', 'sublocality', 'administrative_area_level_3']);
}

function sanitizeRaw(place: PlaceApiResponse): Record<string, unknown> {
  const withoutPhotoNames = { ...place };
  delete withoutPhotoNames.photos;
  return withoutPhotoNames as Record<string, unknown>;
}

function toProfile(place: PlaceApiResponse): GooglePlaceProfile {
  if (!place.id || !place.displayName?.text) {
    throw new ApiError('بيانات المكان من Google غير مكتملة.', 502, 'GOOGLE_INCOMPLETE_PLACE');
  }

  const phoneInternational = normalizeSaudiPhone(place.internationalPhoneNumber || place.nationalPhoneNumber);
  const photos: PlacePhoto[] = (place.photos || []).slice(0, 6).map((photo, index) => ({
    placeId: place.id,
    index,
    widthPx: photo.widthPx,
    heightPx: photo.heightPx,
    authorAttributions: photo.authorAttributions || [],
  }));

  return {
    googlePlaceId: place.id,
    name: place.displayName.text,
    phoneLocal: formatSaudiLocal(phoneInternational),
    phoneInternational,
    address: place.formattedAddress || '',
    city: inferCity(place),
    district: inferDistrict(place),
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
    rating: typeof place.rating === 'number' ? place.rating : null,
    reviewsCount: place.userRatingCount || 0,
    businessStatus: place.businessStatus || null,
    mapsUrl: place.googleMapsUri || `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(place.id)}`,
    websiteUrl: place.websiteUri?.trim() || null,
    websiteStatus: determineWebsiteStatus(place.websiteUri),
    openingHours: place.regularOpeningHours?.weekdayDescriptions || [],
    photos,
    primaryType: place.primaryType || null,
    types: place.types || [],
    raw: sanitizeRaw(place),
  };
}

async function googleFetch<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...init.headers,
      'X-Goog-Api-Key': getApiKey(),
    },
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = upstreamErrorMessage('GOOGLE', response.status);
    throw new ApiError(payload?.error?.message ? `${message} (${payload.error.message})` : message, response.status, 'GOOGLE_API_ERROR');
  }
  return payload as T;
}

async function getCached(placeId: string): Promise<GooglePlaceProfile | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('place_cache')
    .select('place_data_json, expires_at')
    .eq('google_place_id', placeId)
    .maybeSingle();
  if (error || !data || new Date(data.expires_at).getTime() <= Date.now()) return null;
  return data.place_data_json as GooglePlaceProfile;
}

async function cacheProfile(profile: GooglePlaceProfile): Promise<void> {
  const supabase = getSupabaseAdmin();
  const expiresAt = new Date(Date.now() + CACHE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await supabase.from('place_cache').upsert({
    google_place_id: profile.googlePlaceId,
    place_data_json: profile,
    fetched_at: new Date().toISOString(),
    expires_at: expiresAt,
  }, { onConflict: 'google_place_id' });
}

export async function getPlaceDetails(placeId: string, options?: { bypassCache?: boolean }): Promise<GooglePlaceProfile> {
  if (!options?.bypassCache) {
    const cached = await getCached(placeId);
    if (cached) return cached;
  }
  const place = await googleFetch<PlaceApiResponse>(
    `${PLACES_API_BASE}/places/${encodeURIComponent(placeId)}?languageCode=ar&regionCode=SA`,
    { headers: { 'X-Goog-FieldMask': DETAIL_FIELDS } },
  );
  const profile = toProfile(place);
  await cacheProfile(profile);
  return profile;
}

export async function searchGooglePlaces(input: SearchPlacesInput): Promise<GooglePlaceProfile[]> {
  const unique = new Map<string, GooglePlaceProfile>();
  const terms = input.activityTypes.length ? input.activityTypes : ['حلاق', 'barber shop'];

  for (const activity of terms) {
    if (unique.size >= input.limit) break;
    let pageToken: string | undefined;
    let pages = 0;

    do {
      const remaining = input.limit - unique.size;
      const body: Record<string, unknown> = {
        textQuery: [activity, input.district, input.city, input.country].filter(Boolean).join(' '),
        languageCode: 'ar',
        regionCode: 'SA',
        pageSize: Math.min(20, Math.max(1, remaining)),
        includePureServiceAreaBusinesses: false,
      };
      if (pageToken) body.pageToken = pageToken;
      if (/barber/i.test(activity)) {
        body.includedType = 'barber_shop';
        body.strictTypeFiltering = false;
      } else if (/hair|صالون/i.test(activity)) {
        body.includedType = 'hair_salon';
        body.strictTypeFiltering = false;
      }

      const payload = await googleFetch<SearchResponse>(`${PLACES_API_BASE}/places:searchText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Goog-FieldMask': SEARCH_FIELDS },
        body: JSON.stringify(body),
      });

      for (const place of payload.places || []) {
        if (!place.id || unique.has(place.id)) continue;
        const profile = toProfile(place);
        unique.set(profile.googlePlaceId, profile);
        await cacheProfile(profile);
        if (unique.size >= input.limit) break;
      }

      pageToken = payload.nextPageToken;
      pages += 1;
    } while (pageToken && pages < 3 && unique.size < input.limit);
  }

  return [...unique.values()].slice(0, input.limit);
}

function allowedGoogleHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === 'maps.app.goo.gl' || host.endsWith('.google.com') || host === 'google.com' || host.endsWith('.google.sa') || host === 'google.sa';
}

export function validateGoogleMapsUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new ApiError('رابط Google Maps غير صالح.'); }
  if (url.protocol !== 'https:' || !allowedGoogleHost(url.hostname)) throw new ApiError('استخدم رابط Google Maps رسميًا فقط.');
  return url;
}

async function resolveGoogleMapsRedirect(input: string): Promise<string> {
  let current = validateGoogleMapsUrl(input).toString();
  for (let index = 0; index < 5; index += 1) {
    const response = await fetch(current, {
      method: 'GET',
      redirect: 'manual',
      cache: 'no-store',
      headers: { 'User-Agent': 'SalonAgent/1.0' },
    });
    await response.body?.cancel().catch(() => undefined);
    if (response.status < 300 || response.status >= 400) return response.url || current;
    const location = response.headers.get('location');
    if (!location) return current;
    const next = new URL(location, current);
    validateGoogleMapsUrl(next.toString());
    current = next.toString();
  }
  return current;
}

function parseMapReference(value: string): { placeId?: string; query?: string } {
  const decoded = decodeURIComponent(value);
  const url = new URL(value);
  const placeId = url.searchParams.get('query_place_id')
    || decoded.match(/!1s(ChI[A-Za-z0-9_-]{10,})/)?.[1]
    || decoded.match(/place_id[:=](ChI[A-Za-z0-9_-]+)/)?.[1];
  const pathQuery = decoded.match(/\/maps\/place\/([^/@?]+)/i)?.[1] || decoded.match(/\/place\/([^/@?]+)/i)?.[1];
  const query = url.searchParams.get('q') || url.searchParams.get('query') || pathQuery;
  return { placeId: placeId || undefined, query: query?.replace(/\+/g, ' ').trim() || undefined };
}

export async function getPlaceFromMapUrl(input: string): Promise<GooglePlaceProfile> {
  const resolved = await resolveGoogleMapsRedirect(input);
  const parsed = parseMapReference(resolved);
  if (parsed.placeId) return getPlaceDetails(parsed.placeId);
  if (!parsed.query) throw new ApiError('لم أستطع استخراج اسم النشاط من الرابط. استخدم زر مشاركة في Google Maps ثم انسخ الرابط.');

  const payload = await googleFetch<SearchResponse>(`${PLACES_API_BASE}/places:searchText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-FieldMask': SEARCH_FIELDS },
    body: JSON.stringify({ textQuery: parsed.query, languageCode: 'ar', regionCode: 'SA', pageSize: 1 }),
  });
  const first = payload.places?.[0];
  if (!first) throw new ApiError('لم يتم العثور على نشاط مطابق للرابط.', 404, 'PLACE_NOT_FOUND');
  const profile = toProfile(first);
  await cacheProfile(profile);
  return profile;
}

export async function getFreshGooglePhoto(placeId: string, index: number, maxWidth = 1200): Promise<{
  photoUri: string;
  attributions: GooglePhoto['authorAttributions'];
}> {
  const place = await googleFetch<PlaceApiResponse>(
    `${PLACES_API_BASE}/places/${encodeURIComponent(placeId)}?languageCode=ar&regionCode=SA`,
    { headers: { 'X-Goog-FieldMask': 'id,photos' } },
  );
  const photo = place.photos?.[index];
  if (!photo?.name) throw new ApiError('الصورة غير متاحة حاليًا.', 404, 'PHOTO_NOT_FOUND');

  const media = await googleFetch<{ photoUri?: string }>(
    `${PLACES_API_BASE}/${photo.name}/media?maxWidthPx=${Math.min(1600, Math.max(200, maxWidth))}&skipHttpRedirect=true`,
    {},
  );
  if (!media.photoUri) throw new ApiError('تعذر تحميل الصورة من Google.', 502, 'PHOTO_MEDIA_MISSING');
  return { photoUri: media.photoUri, attributions: photo.authorAttributions || [] };
}

// Backward-compatible helper for the legacy /site route.
export { normalizeSaudiPhone as normalizePhone } from '@/lib/phone';
