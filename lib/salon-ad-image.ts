import path from 'node:path';
import sharp from 'sharp';
import type { SalonCampaignAIContent, SalonCampaignService } from '@/types/domain';
import { CAIRO_400_B64, CAIRO_700_B64, CAIRO_900_B64 } from '@/lib/salon-ad-fonts';

export const SALON_AD_WIDTH = 1080;
export const SALON_AD_HEIGHT = 1350;

// RTL content guides.
const RIGHT = 992;
const LEFT = 88;

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function truncate(value: string, max: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length <= max ? normalized : `${normalized.slice(0, max - 1).trim()}…`;
}

function wrapWords(value: string, maxChars: number, maxLines: number): string[] {
  const words = value.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxChars || !line) {
      line = candidate;
      continue;
    }
    lines.push(line);
    line = word;
    if (lines.length === maxLines - 1) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  const consumed = lines.join(' ').length;
  if (consumed < value.replace(/\s+/g, ' ').trim().length && lines.length) {
    lines[lines.length - 1] = truncate(lines[lines.length - 1], Math.max(4, maxChars - 1));
  }
  return lines;
}

function tspans(lines: string[], x: number, startY: number, lineHeight: number): string {
  return lines.map((line, index) => (
    `<tspan x="${x}" y="${startY + index * lineHeight}">${escapeXml(line)}</tspan>`
  )).join('');
}

export interface SalonAdRenderInput {
  salonName: string;
  phone?: string | null;
  location?: string | null;
  workingHours?: string | null;
  services: SalonCampaignService[];
  content: SalonCampaignAIContent;
}

function fontStyle(): string {
  return `<style>
@font-face{font-family:'Cairo';font-style:normal;font-weight:400;src:url(data:font/ttf;base64,${CAIRO_400_B64}) format('truetype');}
@font-face{font-family:'Cairo';font-style:normal;font-weight:700;src:url(data:font/ttf;base64,${CAIRO_700_B64}) format('truetype');}
@font-face{font-family:'Cairo';font-style:normal;font-weight:900;src:url(data:font/ttf;base64,${CAIRO_900_B64}) format('truetype');}
text{font-family:'Cairo',sans-serif;}
</style>`;
}

export function buildSalonAdSvg(input: SalonAdRenderInput): string {
  const salonName = truncate(input.salonName, 32);
  const headlineLines = wrapWords(truncate(input.content.marketing_headline, 64), 22, 2);
  const description = wrapWords(input.content.image_text.description, 46, 2);
  const location = truncate(input.location || input.content.short_location || '', 38);
  const workingHours = truncate(input.workingHours || input.content.short_working_hours || '', 34);
  const phone = truncate(input.phone || '', 22);
  const services = input.services.slice(0, 5);

  // ---- Services list ----
  const rowH = 72;
  const panelTop = 548;
  const titleY = 606;
  const rowsTop = 648;
  const panelH = 118 + Math.max(services.length, 1) * rowH;

  const serviceRows = services.map((service, index) => {
    const y = rowsTop + index * rowH;
    const pricePill = service.price
      ? `<rect x="${LEFT + 4}" y="${y}" width="152" height="50" rx="25" fill="#EBB24C"/>
         <text x="${LEFT + 80}" y="${y + 34}" text-anchor="middle" fill="#141007" font-size="25" font-weight="900">${escapeXml(truncate(service.price, 12))}</text>`
      : '';
    const divider = index < services.length - 1
      ? `<line x1="${LEFT + 4}" y1="${y + rowH - 8}" x2="${RIGHT}" y2="${y + rowH - 8}" stroke="#FFFFFF" stroke-opacity="0.08"/>`
      : '';
    return `
      <g>
        <circle cx="${RIGHT}" cy="${y + 25}" r="6" fill="#EBB24C"/>
        <text x="${RIGHT - 26}" y="${y + 35}" text-anchor="end" fill="#F6F2EA" font-size="31" font-weight="700">${escapeXml(service.name)}</text>
        ${pricePill}
        ${divider}
      </g>`;
  }).join('');

  // ---- Footer: meta + WhatsApp CTA ----
  const ctaY = 1176;
  const meta: string[] = [];
  if (location) {
    meta.push(`
      <path d="M ${RIGHT} 1074 c -12 0 -22 10 -22 22 c 0 16 22 32 22 32 c 0 0 22 -16 22 -32 c 0 -12 -10 -22 -22 -22 z" fill="none" stroke="#EBB24C" stroke-width="2.5"/>
      <circle cx="${RIGHT}" cy="1096" r="6.5" fill="#EBB24C"/>
      <text x="${RIGHT - 38}" y="1106" text-anchor="end" fill="#EFE8DB" font-size="26" font-weight="700">${escapeXml(location)}</text>`);
  }
  if (workingHours) {
    meta.push(`
      <circle cx="${RIGHT}" cy="1148" r="19" fill="none" stroke="#EBB24C" stroke-width="2.5"/>
      <path d="M ${RIGHT} 1137 v 12 h 10" fill="none" stroke="#EBB24C" stroke-width="2.5" stroke-linecap="round"/>
      <text x="${RIGHT - 38}" y="1157" text-anchor="end" fill="#CDC6BA" font-size="24" font-weight="500">${escapeXml(workingHours)}</text>`);
  }

  const cta = `
    <g filter="url(#soft)">
      <rect x="${LEFT}" y="${ctaY}" width="${RIGHT - LEFT}" height="92" rx="26" fill="url(#gold)"/>
      <g transform="translate(288 ${ctaY + 46})">
        <circle cx="0" cy="0" r="23" fill="#141007"/>
        <path d="M -8 -9 c 2 -2 5 -2 6 0 l 3 5 c 1 2 1 3 -1 5 l -2 2 c 1 3 3 5 6 6 l 2 -2 c 2 -2 3 -2 5 -1 l 5 3 c 2 1 2 4 0 6 c -3 3 -7 3 -12 1 c -6 -3 -12 -9 -15 -15 c -2 -5 -2 -9 0 -12 z" fill="#EBB24C"/>
      </g>
      <text x="${(LEFT + RIGHT) / 2 + 30}" y="${ctaY + 58}" text-anchor="middle" fill="#141007" font-size="34" font-weight="900">احجز الآن عبر واتساب</text>
    </g>`;

  const phoneLine = phone
    ? `<text x="${(LEFT + RIGHT) / 2}" y="1296" text-anchor="middle" direction="ltr" fill="#F0E9DC" font-size="26" font-weight="700">${escapeXml(phone)}</text>`
    : '';

  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${SALON_AD_WIDTH}" height="${SALON_AD_HEIGHT}" viewBox="0 0 ${SALON_AD_WIDTH} ${SALON_AD_HEIGHT}">
    <defs>
      ${fontStyle()}
      <linearGradient id="veil" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#05060A" stop-opacity="0.58"/>
        <stop offset="0.28" stop-color="#05060A" stop-opacity="0.28"/>
        <stop offset="0.52" stop-color="#05060A" stop-opacity="0.72"/>
        <stop offset="1" stop-color="#010204" stop-opacity="0.98"/>
      </linearGradient>
      <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#C6852B"/>
        <stop offset="0.5" stop-color="#F6D488"/>
        <stop offset="1" stop-color="#C6852B"/>
      </linearGradient>
      <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0B0D12" stop-opacity="0.70"/>
        <stop offset="1" stop-color="#0B0D12" stop-opacity="0.90"/>
      </linearGradient>
      <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="6" stdDeviation="14" flood-color="#000" flood-opacity="0.55"/>
      </filter>
    </defs>

    <rect width="${SALON_AD_WIDTH}" height="${SALON_AD_HEIGHT}" fill="url(#veil)"/>
    <rect x="40" y="40" width="1000" height="1270" rx="34" fill="none" stroke="url(#gold)" stroke-opacity="0.45" stroke-width="2"/>

    <!-- Header -->
    <text x="${RIGHT}" y="130" text-anchor="end" fill="#EBB24C" font-size="25" font-weight="700" letter-spacing="4">صالون حلاقة رجالي</text>
    <text x="${RIGHT}" y="198" text-anchor="end" fill="#FFFFFF" font-size="56" font-weight="900" filter="url(#soft)">${escapeXml(salonName)}</text>
    <rect x="${RIGHT - 128}" y="220" width="128" height="5" rx="2.5" fill="url(#gold)"/>

    <!-- Scissors mark -->
    <g transform="translate(126 150)" stroke="#EBB24C" stroke-width="3.5" fill="none">
      <circle cx="-16" cy="18" r="12"/>
      <circle cx="16" cy="18" r="12"/>
      <line x1="-8" y1="10" x2="34" y2="-28"/>
      <line x1="8" y1="10" x2="-34" y2="-28"/>
    </g>

    <!-- Headline + description -->
    <text x="${RIGHT}" text-anchor="end" fill="#F7F3EC" font-size="54" font-weight="900" filter="url(#soft)">
      ${tspans(headlineLines, RIGHT, 330, 66)}
    </text>
    <text x="${RIGHT}" text-anchor="end" fill="#D6CFC3" font-size="29" font-weight="400">
      ${tspans(description, RIGHT, headlineLines.length > 1 ? 452 : 410, 44)}
    </text>

    <!-- Services -->
    <rect x="${LEFT - 24}" y="${panelTop}" width="${RIGHT - LEFT + 48}" height="${panelH}" rx="28" fill="url(#panel)" stroke="#EBB24C" stroke-opacity="0.28"/>
    <text x="${RIGHT}" y="${titleY}" text-anchor="end" fill="#F6D488" font-size="30" font-weight="900">الخدمات والأسعار</text>
    <rect x="${LEFT + 4}" y="${titleY + 16}" width="70" height="4" rx="2" fill="url(#gold)"/>
    ${serviceRows || `<text x="${RIGHT}" y="${rowsTop + 30}" text-anchor="end" fill="#C8C3BA" font-size="26">تُضاف الخدمات بعد تأكيد بيانات الصالون</text>`}

    <!-- Footer -->
    ${meta.join('')}
    ${cta}
    ${phoneLine}
  </svg>`;
}

export async function renderSalonAdPng(input: SalonAdRenderInput): Promise<Buffer> {
  const templatePath = path.join(process.cwd(), 'public', 'templates', 'salon-ad-template.jpg');
  const background = await sharp(templatePath)
    .resize(SALON_AD_WIDTH, SALON_AD_HEIGHT, { fit: 'cover', position: 'centre' })
    .modulate({ brightness: 0.52, saturation: 0.82 })
    .blur(0.4)
    .png()
    .toBuffer();

  return sharp(background)
    .composite([{ input: Buffer.from(buildSalonAdSvg(input)) }])
    .png({ quality: 95, compressionLevel: 9 })
    .toBuffer();
}
