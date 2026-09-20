/**
 * ZOSUF - QR Payload Builders & Validators
 * Client-side only, strict validation, RFC compliant
 */

export function escapeWifiString(str: string): string {
  // Backslash-escape special characters: \ ; , : "
  return str.replace(/([\\;,:\"])/g, '\\$1');
}

export function sanitizeWebUrl(inputUrl: string): { isValid: boolean; sanitized: string; error?: string } {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return { isValid: false, sanitized: '', error: 'URL is required' };
  }

  const trimmed = inputUrl.trim();
  const lower = trimmed.toLowerCase();

  // Block dangerous schemes
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return { isValid: false, sanitized: '', error: 'Dangerous URL scheme is prohibited for security' };
  }

  let finalUrl = trimmed;
  if (!/^https?:\/\//i.test(trimmed)) {
    // Default to https
    finalUrl = 'https://' + trimmed;
  }

  try {
    const parsed = new URL(finalUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { isValid: false, sanitized: '', error: 'Only HTTP and HTTPS URLs are permitted' };
    }
    return { isValid: true, sanitized: parsed.href };
  } catch {
    return { isValid: false, sanitized: '', error: 'Invalid URL format' };
  }
}

export interface WifiPayloadOptions {
  ssid: string;
  password?: string;
  encryption: 'WPA' | 'WEP' | 'nopass';
  hidden?: boolean;
}

export function buildWifiPayload(opts: WifiPayloadOptions): string {
  const ssid = escapeWifiString(opts.ssid || '');
  const enc = opts.encryption;
  const hidden = opts.hidden ? 'true' : 'false';

  if (enc === 'nopass' || !opts.password) {
    return `WIFI:T:nopass;S:${ssid};;H:${hidden};;`;
  }
  const pass = escapeWifiString(opts.password);
  return `WIFI:T:${enc};S:${ssid};P:${pass};H:${hidden};;`;
}

export interface VCardPayloadOptions {
  firstName: string;
  lastName?: string;
  organization?: string;
  title?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  website?: string;
  address?: string;
  note?: string;
}

export function buildVCardPayload(opts: VCardPayloadOptions): string {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${opts.lastName || ''};${opts.firstName || ''};;;`,
    `FN:${[opts.firstName, opts.lastName].filter(Boolean).join(' ')}`,
  ];

  if (opts.organization) lines.push(`ORG:${opts.organization}`);
  if (opts.title) lines.push(`TITLE:${opts.title}`);
  if (opts.phone) lines.push(`TEL;TYPE=WORK,VOICE:${opts.phone}`);
  if (opts.mobile) lines.push(`TEL;TYPE=CELL,VOICE:${opts.mobile}`);
  if (opts.email) lines.push(`EMAIL;TYPE=PREF,INTERNET:${opts.email}`);
  if (opts.website) lines.push(`URL:${opts.website}`);
  if (opts.address) lines.push(`ADR;TYPE=WORK:;;${opts.address};;;;`);
  if (opts.note) lines.push(`NOTE:${opts.note}`);

  lines.push('END:VCARD');
  return lines.join('\r\n');
}

export interface UpiPayloadOptions {
  vpa: string; // e.g. user@okhdfcbank
  payeeName: string;
  amount?: string;
  transactionNote?: string;
}

export function buildUpiPayload(opts: UpiPayloadOptions): string {
  const params = new URLSearchParams();
  params.set('pa', opts.vpa.trim());
  params.set('pn', opts.payeeName.trim());
  params.set('cu', 'INR');
  if (opts.amount && parseFloat(opts.amount) > 0) {
    params.set('am', parseFloat(opts.amount).toFixed(2));
  }
  if (opts.transactionNote) {
    params.set('tn', opts.transactionNote.trim());
  }
  return `upi://pay?${params.toString()}`;
}

export interface CalendarEventPayloadOptions {
  title: string;
  description?: string;
  location?: string;
  startDateTime: string; // ISO string e.g. 2026-10-25T14:30
  endDateTime: string;
  allDay?: boolean;
}

function formatIcsDateTime(isoStr: string, allDay = false): string {
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  if (allDay) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  }
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export function buildCalendarPayload(opts: CalendarEventPayloadOptions): string {
  const dtStart = formatIcsDateTime(opts.startDateTime, opts.allDay);
  const dtEnd = formatIcsDateTime(opts.endDateTime, opts.allDay);
  const now = formatIcsDateTime(new Date().toISOString());

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ZOSUF//EN',
    'BEGIN:VEVENT',
    `UID:zosuf-${Date.now()}@markzosuf.pages.dev`,
    `DTSTAMP:${now}`,
    opts.allDay ? `DTSTART;VALUE=DATE:${dtStart}` : `DTSTART:${dtStart}`,
    opts.allDay ? `DTEND;VALUE=DATE:${dtEnd}` : `DTEND:${dtEnd}`,
    `SUMMARY:${opts.title}`,
  ];

  if (opts.description) lines.push(`DESCRIPTION:${opts.description.replace(/\n/g, '\\n')}`);
  if (opts.location) lines.push(`LOCATION:${opts.location}`);
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

export function buildEmailPayload(email: string, subject = '', body = ''): string {
  const params = new URLSearchParams();
  if (subject) params.set('subject', subject);
  if (body) params.set('body', body);
  const q = params.toString();
  return `mailto:${email.trim()}${q ? `?${q}` : ''}`;
}

export function buildPhonePayload(phone: string): string {
  const clean = phone.replace(/[^0-9+]/g, '');
  return `tel:${clean}`;
}

export function buildSmsPayload(phone: string, message = ''): string {
  const clean = phone.replace(/[^0-9+]/g, '');
  const encoded = encodeURIComponent(message);
  return `sms:${clean}${message ? `?body=${encoded}` : ''}`;
}

export function buildWhatsAppPayload(phone: string, text = ''): string {
  const clean = phone.replace(/[^0-9]/g, '');
  const encoded = encodeURIComponent(text);
  return `https://wa.me/${clean}${text ? `?text=${encoded}` : ''}`;
}

export function buildTelegramPayload(username: string): string {
  const clean = username.replace(/^@/, '').trim();
  return `https://t.me/${clean}`;
}

export function buildInstagramPayload(handle: string): string {
  const clean = handle.replace(/^@/, '').trim();
  return `https://instagram.com/${clean}`;
}

export function buildYouTubePayload(urlOrId: string): string {
  const trimmed = urlOrId.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://www.youtube.com/watch?v=${trimmed}`;
}

export function buildLocationPayload(lat: number, lng: number, label = ''): string {
  if (label) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}+(${encodeURIComponent(label)})`;
  }
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function buildAppStorePayload(appId: string): string {
  const clean = appId.trim().replace(/^id/i, '');
  return `https://apps.apple.com/app/id${clean}`;
}

export function buildPlayStorePayload(packageId: string): string {
  const clean = packageId.trim();
  return `https://play.google.com/store/apps/details?id=${clean}`;
}

export function buildMultiLinkPayload(title: string, links: Array<{ label: string; url: string }>): string {
  const validLinks = links.filter((l) => l.label && l.url);
  const items = validLinks.map((l) => `• ${l.label}: ${l.url}`).join('\n');
  return `${title ? `${title}\n\n` : ''}${items}`;
}

/**
 * Payloads that phone cameras cannot act on.
 *
 * `data:` URIs (e.g. data:image/jpeg;base64,...) encode fine into a QR matrix
 * but virtually no stock camera app will open them, and they blow past the
 * byte capacity long before an image is recognisable. ZOSUF therefore never
 * encodes one — image tools keep the picture on-device and encode a real
 * HTTPS link instead.
 */
export function isUnscannablePayload(value: string): boolean {
  return /^\s*data:/i.test(value || '');
}

/** True only for an absolute http(s) URL that a phone scanner will open. */
export function isPhoneScannableLink(value: string): boolean {
  try {
    const parsed = new URL(String(value || '').trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Canonical deployed ZOSUF link, optionally with a path and query.
 * Always returns an absolute HTTPS URL, never a relative or preview-origin one,
 * so a downloaded QR keeps working after the page that made it is closed.
 */
export function buildSiteLinkPayload(productionUrl: string, pathAndQuery = ''): string {
  const base = String(productionUrl || '').replace(/\/+$/, '');
  if (!pathAndQuery) return base;
  const suffix = pathAndQuery.startsWith('/') ? pathAndQuery : `/${pathAndQuery}`;
  return `${base}${suffix}`;
}
