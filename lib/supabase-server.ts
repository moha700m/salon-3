import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

function cleanEnvValue(rawValue: string | undefined, variableName: string): string {
  if (!rawValue) return '';

  let value = rawValue.trim();
  const prefix = `${variableName}=`;

  if (value.startsWith(prefix)) {
    value = value.slice(prefix.length).trim();
  }

  if (
    value.length >= 2
    && ((value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'")))
  ) {
    value = value.slice(1, -1).trim();
  }

  return value;
}

function createAdminFetch(primaryKey: string, fallbackServiceRoleKey: string) {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const headers = new Headers(init?.headers);

    if (primaryKey.startsWith('sb_secret_')) {
      headers.set('apikey', primaryKey);

      // New Supabase secret keys are API keys, not JWTs. They must not be
      // sent as `Authorization: Bearer sb_secret_...`.
      if (headers.get('Authorization') === `Bearer ${primaryKey}`) {
        headers.delete('Authorization');
      }
    } else {
      headers.set('apikey', primaryKey);
      headers.set('Authorization', `Bearer ${primaryKey}`);
    }

    const response = await fetch(input, { ...init, headers });

    if (
      response.status === 401
      && fallbackServiceRoleKey
      && fallbackServiceRoleKey !== primaryKey
    ) {
      const retryHeaders = new Headers(init?.headers);
      retryHeaders.set('apikey', fallbackServiceRoleKey);
      retryHeaders.set('Authorization', `Bearer ${fallbackServiceRoleKey}`);
      return fetch(input, { ...init, headers: retryHeaders });
    }

    return response;
  };
}

export function getSupabaseConfig() {
  const url = cleanEnvValue(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_URL ? 'NEXT_PUBLIC_SUPABASE_URL' : 'SUPABASE_URL',
  ).replace(/\/$/, '');

  const secretKey = cleanEnvValue(
    process.env.SUPABASE_SECRET_KEY,
    'SUPABASE_SECRET_KEY',
  );

  const serviceRoleKey = cleanEnvValue(
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    'SUPABASE_SERVICE_ROLE_KEY',
  );

  const primaryKey = secretKey || serviceRoleKey;

  if (!url || !primaryKey) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY.',
    );
  }

  return { url, primaryKey, serviceRoleKey };
}

export function getSupabaseAdmin(): SupabaseClient {
  const { url, primaryKey, serviceRoleKey } = getSupabaseConfig();

  if (!adminClient) {
    adminClient = createClient(url, primaryKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: createAdminFetch(primaryKey, serviceRoleKey),
        headers: { 'X-Client-Info': 'salon-agent-server' },
      },
    });
  }

  return adminClient;
}
