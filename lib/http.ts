import { NextResponse } from 'next/server';
import { ApiError, safeErrorMessage } from '@/lib/api-errors';

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status });
}

export function apiFailure(error: unknown) {
  const status = error instanceof ApiError ? error.status : 500;
  const code = error instanceof ApiError ? error.code : 'INTERNAL_ERROR';
  return NextResponse.json({ success: false, error: safeErrorMessage(error), code }, { status });
}
