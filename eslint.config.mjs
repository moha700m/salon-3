import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const misplacedRootSources = [
  'app-url.ts', 'dashboard-shell.tsx', 'domain.ts', 'google-places.ts', 'layout (16).tsx', 'layout.tsx',
  'leads-service.ts', 'page (13).tsx', 'page (18).tsx', 'phone.test.ts', 'policy.test.ts',
  'preview-access-service.ts', 'preview-access.ts', 'preview-link.ts', 'preview-route.test.ts',
  'preview-service.ts', 'rate-limit.ts', 'request.ts', 'route (11).ts', 'route (5).ts', 'route (8).ts',
  'site-content.ts', 'status-badge.tsx', 'supabase-server.ts',
];

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  { rules: { 'react-hooks/set-state-in-effect': 'off', '@next/next/no-img-element': 'off' } },
  globalIgnores(['.next/**', 'node_modules/**', 'coverage/**', 'next-env.d.ts', ...misplacedRootSources]),
]);
