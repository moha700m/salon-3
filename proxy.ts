import { NextRequest, NextResponse } from 'next/server';

function unauthorized(message = 'Authentication required') {
  return new NextResponse(message, {
    status: message === 'Authentication required' ? 401 : 503,
    headers: message === 'Authentication required' ? { 'WWW-Authenticate': 'Basic realm="Salon Agent Dashboard", charset="UTF-8"' } : undefined,
  });
}

export function proxy(request: NextRequest) {
  const username = process.env.DASHBOARD_USERNAME;
  const password = process.env.DASHBOARD_PASSWORD;

  if (!username || !password) {
    return process.env.NODE_ENV === 'production'
      ? unauthorized('Dashboard authentication is not configured.')
      : NextResponse.next();
  }

  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Basic ')) return unauthorized();

  try {
    const decoded = atob(authorization.slice(6));
    const separator = decoded.indexOf(':');
    if (separator < 0) return unauthorized();
    const suppliedUser = decoded.slice(0, separator);
    const suppliedPassword = decoded.slice(separator + 1);
    if (suppliedUser !== username || suppliedPassword !== password) return unauthorized();
  } catch {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/create-from-map',
    '/api/dashboard/:path*',
    '/api/leads/:path*',
    '/api/previews/:path*',
  ],
};
