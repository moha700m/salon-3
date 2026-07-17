import path from 'node:path';
import sharp from 'sharp';
import type { SalonCampaignAIContent, SalonCampaignService } from '@/types/domain';

export const SALON_AD_WIDTH = 1080;
export const SALON_AD_HEIGHT = 1350;

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

function serviceLabel(service: SalonCampaignService): string {
  return service.price ? `${service.name} — ${service.price}` : service.name;
}

export interface SalonAdRenderInput {
  salonName: string;
  phone?: string | null;
  location?: string | null;
  workingHours?: string | null;
  services: SalonCampaignService[];
  content: SalonCampaignAIContent;
}

export function buildSalonAdSvg(input: SalonAdRenderInput): string {
  const salonName = truncate(input.salonName, 50);
  const headline = truncate(input.content.marketing_headline, 78);
  const headlineLines = wrapWords(headline, 26, 2);
  const description = wrapWords(input.content.image_text.description, 42, 3);
  const location = truncate(input.location || input.content.short_location || '', 58);
  const workingHours = truncate(input.workingHours || input.content.short_working_hours || '', 68);
  const phone = truncate(input.phone || '', 28);
  const services = input.services.slice(0, 5);
  const serviceRows = services.map((service, index) => {
    const y = 690 + index * 84;
    return `
      <g>
        <rect x="80" y="${y}" width="920" height="66" rx="18" fill="#090b0e" fill-opacity="0.82" stroke="#D99A38" stroke-opacity="0.30"/>
        <circle cx="950" cy="${y + 33}" r="17" fill="#D99A38" fill-opacity="0.18" stroke="#EAB45B"/>
        <text x="950" y="${y + 40}" text-anchor="middle" fill="#F2C471" font-size="18" font-weight="700">${index + 1}</text>
        <text x="910" y="${y + 43}" text-anchor="end" fill="#F8F6F1" font-size="27" font-weight="700">${escapeXml(serviceLabel(service))}</text>
      </g>`;
  }).join('');

  const details: string[] = [];
  if (location) details.push(`<text x="940" y="1185" text-anchor="end" fill="#EFE8DB" font-size="25">${escapeXml(location)}</text>`);
  if (workingHours) details.push(`<text x="940" y="1226" text-anchor="end" fill="#BDB8AF" font-size="22">${escapeXml(workingHours)}</text>`);
  if (phone) details.push(`<text x="140" y="1228" text-anchor="start" direction="ltr" fill="#F2C471" font-size="28" font-weight="700">${escapeXml(phone)}</text>`);

  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${SALON_AD_WIDTH}" height="${SALON_AD_HEIGHT}" viewBox="0 0 ${SALON_AD_WIDTH} ${SALON_AD_HEIGHT}">
    <defs>
      <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#030506" stop-opacity="0.40"/>
        <stop offset="0.48" stop-color="#030506" stop-opacity="0.82"/>
        <stop offset="1" stop-color="#020304" stop-opacity="0.98"/>
      </linearGradient>
      <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#B96F20"/>
        <stop offset="0.5" stop-color="#F0BB5D"/>
        <stop offset="1" stop-color="#C78028"/>
      </linearGradient>
      <filter id="shadow"><feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#000" flood-opacity="0.6"/></filter>
    </defs>

    <rect width="1080" height="1350" fill="url(#shade)"/>
    <rect x="50" y="48" width="980" height="1254" rx="42" fill="#050608" fill-opacity="0.30" stroke="#E5AB50" stroke-opacity="0.20"/>

    <g font-family="Tahoma, Arial, sans-serif">
      <text x="940" y="128" text-anchor="end" fill="#FFFFFF" font-size="48" font-weight="800">${escapeXml(salonName)}</text>
      <text x="940" y="176" text-anchor="end" fill="#DEA34B" font-size="26" font-weight="700">للحلاقة الرجالية</text>
      <rect x="80" y="215" width="920" height="2" fill="url(#gold)" opacity="0.70"/>

      <text x="940" text-anchor="end" fill="#F6F4EF" font-size="50" font-weight="900" filter="url(#shadow)">
        ${tspans(headlineLines, 940, 300, 62)}
      </text>
      <text x="940" text-anchor="end" fill="#D1CCC3" font-size="29" font-weight="500">
        ${tspans(description, 940, 435, 45)}
      </text>

      ${location ? `<rect x="655" y="565" width="345" height="54" rx="27" fill="#D99A38" fill-opacity="0.16" stroke="#E9B45D" stroke-opacity="0.55"/><text x="966" y="601" text-anchor="end" fill="#F3CA83" font-size="23" font-weight="700">${escapeXml(location)}</text>` : ''}

      <text x="940" y="650" text-anchor="end" fill="#EAB45B" font-size="27" font-weight="800">الخدمات المتاحة</text>
      <line x1="80" y1="655" x2="1000" y2="655" stroke="#FFFFFF" stroke-opacity="0.10"/>
      ${serviceRows || `<text x="940" y="735" text-anchor="end" fill="#C8C3BA" font-size="26">تُضاف الخدمات بعد تأكيد بيانات الصالون</text>`}

      <g transform="translate(80 1110)">
        <rect x="0" y="0" width="220" height="62" rx="20" fill="url(#gold)"/>
        <text x="110" y="40" text-anchor="middle" fill="#11100E" font-size="24" font-weight="900">احجز الآن</text>
        <rect x="235" y="0" width="220" height="62" rx="20" fill="#0A0B0D" fill-opacity="0.88" stroke="#E5AB50" stroke-opacity="0.48"/>
        <text x="345" y="40" text-anchor="middle" fill="#F4E3C2" font-size="23" font-weight="800">تواصل واتساب</text>
        <rect x="470" y="0" width="190" height="62" rx="20" fill="#0A0B0D" fill-opacity="0.88" stroke="#FFFFFF" stroke-opacity="0.18"/>
        <text x="565" y="40" text-anchor="middle" fill="#F4F1EA" font-size="23" font-weight="800">اتصل الآن</text>
        <rect x="675" y="0" width="245" height="62" rx="20" fill="#0A0B0D" fill-opacity="0.88" stroke="#FFFFFF" stroke-opacity="0.18"/>
        <text x="797" y="40" text-anchor="middle" fill="#F4F1EA" font-size="23" font-weight="800">الاتجاهات</text>
      </g>

      ${details.join('')}
      <rect x="80" y="1260" width="920" height="1" fill="#FFFFFF" opacity="0.10"/>
      <text x="540" y="1307" text-anchor="middle" fill="#E6AE56" font-size="25" font-weight="800">شاهد موقعك الجديد</text>
    </g>
  </svg>`;
}

export async function renderSalonAdPng(input: SalonAdRenderInput): Promise<Buffer> {
  const templatePath = path.join(process.cwd(), 'public', 'templates', 'salon-ad-template.jpg');
  const background = await sharp(templatePath)
    .resize(SALON_AD_WIDTH, SALON_AD_HEIGHT, { fit: 'cover', position: 'centre' })
    .modulate({ brightness: 0.32, saturation: 0.68 })
    .blur(0.6)
    .png()
    .toBuffer();

  return sharp(background)
    .composite([{ input: Buffer.from(buildSalonAdSvg(input)) }])
    .png({ quality: 95, compressionLevel: 9 })
    .toBuffer();
}
