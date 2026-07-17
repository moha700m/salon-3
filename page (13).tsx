import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getFreshGooglePhoto } from '@/lib/google-places';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const placeId = request.nextUrl.searchParams.get('placeId');
    const index = Number(request.nextUrl.searchParams.get('index') || '0');
    const width = Number(request.nextUrl.searchParams.get('width') || '1200');
    if (!placeId || !Number.isInteger(index) || index < 0 || index > 9) {
      return NextResponse.json({ error: 'طلب صورة غير صالح.' }, { status: 400 });
    }
    const { photoUri } = await getFreshGooglePhoto(placeId, index, width);
    return NextResponse.redirect(photoUri, {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'الصورة غير متاحة.' }, { status: 404 });
  }
}
