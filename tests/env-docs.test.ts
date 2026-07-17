import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const documentedVariables = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SECRET_KEY',
  'GOOGLE_PLACES_API_KEY',
  'DASHBOARD_USERNAME',
  'DASHBOARD_PASSWORD',
  'CRON_SECRET',
  'PREVIEW_TOKEN_SECRET',
  'NEXT_PUBLIC_APP_URL',
  'OPENAI_API_KEY',
  'OPENAI_MODEL',
  'VERCEL_URL',
  'VERCEL_PROJECT_PRODUCTION_URL',
  'NODE_ENV',
];

test('README documents every environment variable used by the application', () => {
  const readme = fs.readFileSync('README.md', 'utf8');
  for (const variable of documentedVariables) assert.ok(readme.includes(variable), `${variable} is missing from README.md`);
});

test('the local environment template exists and contains the configurable secrets', () => {
  const template = fs.readFileSync('.env.example', 'utf8');
  for (const variable of documentedVariables.filter(variable => !variable.startsWith('VERCEL_') && variable !== 'NODE_ENV')) {
    assert.ok(template.includes(variable), `${variable} is missing from .env.example`);
  }
});
