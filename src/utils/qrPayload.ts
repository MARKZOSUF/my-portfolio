import { QRType } from '../types';

export interface QRFormData {
  // URL
  url: string;
  
  // Image
  publicImageUrl: string;
  imageDataUrl?: string;
  imageSourceMode?: 'upload' | 'url';
  
  // Text & Custom
  text: string;
  customText: string;

  // Wi-Fi
  wifiSsid: string;
  wifiPassword: string;
  wifiEncryption: 'WPA' | 'WEP' | 'nopass';
  wifiHidden: boolean;

  // vCard
  vcardFirstName: string;
  vcardLastName: string;
  vcardPhone: string;
  vcardMobile: string;
  vcardEmail: string;
  vcardOrg: string;
  vcardTitle: string;
  vcardWebsite: string;
  vcardStreet: string;
  vcardCity: string;
  vcardCountry: string;

  // UPI Payment
  upiVpa: string; // e.g. merchant@okhdfcbank
  upiPayeeName: string;
  upiAmount: string;
  upiNote: string;
  upiCurrency: string;
  upiTr: string;

  // Email
  emailRecipient: string;
  emailSubject: string;
  emailBody: string;

  // Phone
  phoneNumber: string;

  // SMS
  smsNumber: string;
  smsMessage: string;

  // Location / Maps
  locationLat: string;
  locationLng: string;
  locationQuery: string;

  // Calendar
  calTitle: string;
  calStart: string;
  calEnd: string;
  calLocation: string;
  calDescription: string;

  // Social
  whatsappPhone: string;
  whatsappMessage: string;
  telegramUsername: string;
  isTelegramChannel: boolean;
  youtubeUrl: string;
  instagramUsername: string;
}

export const initialQRFormData: QRFormData = {
  url: 'https://',
  publicImageUrl: '',
  text: '',
  customText: '',
  wifiSsid: '',
  wifiPassword: '',
  wifiEncryption: 'WPA',
  wifiHidden: false,
  vcardFirstName: '',
  vcardLastName: '',
  vcardPhone: '',
  vcardMobile: '',
  vcardEmail: '',
  vcardOrg: '',
  vcardTitle: '',
  vcardWebsite: '',
  vcardStreet: '',
  vcardCity: '',
  vcardCountry: '',
  upiVpa: '',
  upiPayeeName: '',
  upiAmount: '',
  upiNote: '',
  upiCurrency: 'INR',
  upiTr: '',
  emailRecipient: '',
  emailSubject: '',
  emailBody: '',
  phoneNumber: '',
  smsNumber: '',
  smsMessage: '',
  locationLat: '',
  locationLng: '',
  locationQuery: '',
  calTitle: '',
  calStart: '',
  calEnd: '',
  calLocation: '',
  calDescription: '',
  whatsappPhone: '',
  whatsappMessage: '',
  telegramUsername: '',
  isTelegramChannel: false,
  youtubeUrl: '',
  instagramUsername: '',
};

export function generateQRPayload(type: QRType, data: QRFormData): string {
  switch (type) {
    case 'url': {
      let u = data.url.trim();
      if (!u) return 'https://zosuf.pages.dev';
      if (!/^https?:\/\//i.test(u)) {
        u = 'https://' + u;
      }
      return u;
    }

    case 'image': {
      if (data.imageSourceMode === 'upload' && data.imageDataUrl) {
        return data.imageDataUrl;
      }
      const u = data.publicImageUrl.trim();
      if (u) {
        if (!/^https?:\/\//i.test(u)) {
          return 'https://' + u;
        }
        return u;
      }
      if (data.imageDataUrl) {
        return data.imageDataUrl;
      }
      return '';
    }

    case 'text':
      return data.text.trim() || 'Welcome to ZOSUF QR Studio';

    case 'wifi': {
      const ssid = (data.wifiSsid || 'MyWiFi').replace(/([\\;,:"])/g, '\\$1');
      const pass = (data.wifiPassword || '').replace(/([\\;,:"])/g, '\\$1');
      const type = data.wifiEncryption;
      const hidden = data.wifiHidden ? 'true' : 'false';
      return `WIFI:S:${ssid};T:${type};P:${pass};H:${hidden};;`;
    }

    case 'vcard': {
      const lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `N:${data.vcardLastName || ''};${data.vcardFirstName || ''};;;`,
        `FN:${[data.vcardFirstName, data.vcardLastName].filter(Boolean).join(' ') || 'Contact'}`,
      ];
      if (data.vcardOrg) lines.push(`ORG:${data.vcardOrg}`);
      if (data.vcardTitle) lines.push(`TITLE:${data.vcardTitle}`);
      if (data.vcardPhone) lines.push(`TEL;TYPE=WORK,VOICE:${data.vcardPhone}`);
      if (data.vcardMobile) lines.push(`TEL;TYPE=CELL,VOICE:${data.vcardMobile}`);
      if (data.vcardEmail) lines.push(`EMAIL;TYPE=INTERNET:${data.vcardEmail}`);
      if (data.vcardWebsite) lines.push(`URL:${data.vcardWebsite}`);
      if (data.vcardStreet || data.vcardCity || data.vcardCountry) {
        lines.push(`ADR;TYPE=WORK:;;${data.vcardStreet || ''};${data.vcardCity || ''};;;${data.vcardCountry || ''}`);
      }
      lines.push('END:VCARD');
      return lines.join('\n');
    }

    case 'upi': {
      const vpa = data.upiVpa.trim() || 'merchant@upi';
      const pn = encodeURIComponent(data.upiPayeeName.trim() || 'Payee');
      const cu = data.upiCurrency || 'INR';
      let payload = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${pn}&cu=${cu}`;
      if (data.upiAmount) {
        payload += `&am=${encodeURIComponent(data.upiAmount.trim())}`;
      }
      if (data.upiNote) {
        payload += `&tn=${encodeURIComponent(data.upiNote.trim())}`;
      }
      if (data.upiTr) {
        payload += `&tr=${encodeURIComponent(data.upiTr.trim())}`;
      }
      return payload;
    }

    case 'email': {
      const recipient = data.emailRecipient.trim() || 'info@example.com';
      const params = new URLSearchParams();
      if (data.emailSubject) params.set('subject', data.emailSubject);
      if (data.emailBody) params.set('body', data.emailBody);
      const query = params.toString();
      return `mailto:${recipient}${query ? `?${query}` : ''}`;
    }

    case 'phone': {
      const p = data.phoneNumber.trim().replace(/\s+/g, '') || '+1234567890';
      return `tel:${p}`;
    }

    case 'sms': {
      const p = data.smsNumber.trim().replace(/\s+/g, '') || '+1234567890';
      const msg = data.smsMessage ? `:${encodeURIComponent(data.smsMessage)}` : '';
      return `smsto:${p}${msg}`;
    }

    case 'location': {
      if (data.locationLat && data.locationLng) {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.locationLat.trim())},${encodeURIComponent(data.locationLng.trim())}`;
      }
      if (data.locationQuery) {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.locationQuery.trim())}`;
      }
      return 'https://maps.google.com';
    }

    case 'calendar': {
      const formatCalDate = (dtStr: string) => {
        if (!dtStr) return '';
        const d = new Date(dtStr);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };
      const dtStart = formatCalDate(data.calStart) || formatCalDate(new Date().toISOString());
      const dtEnd = formatCalDate(data.calEnd) || dtStart;

      const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//ZOSUF//Calendar Event//EN',
        'BEGIN:VEVENT',
        `SUMMARY:${data.calTitle || 'Event'}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
      ];
      if (data.calLocation) lines.push(`LOCATION:${data.calLocation}`);
      if (data.calDescription) lines.push(`DESCRIPTION:${data.calDescription}`);
      lines.push('END:VEVENT');
      lines.push('END:VCALENDAR');
      return lines.join('\n');
    }

    case 'whatsapp': {
      const cleanPhone = data.whatsappPhone.replace(/[^0-9]/g, '');
      const encodedMsg = data.whatsappMessage ? encodeURIComponent(data.whatsappMessage) : '';
      return `https://wa.me/${cleanPhone || '15551234567'}${encodedMsg ? `?text=${encodedMsg}` : ''}`;
    }

    case 'telegram': {
      const u = data.telegramUsername.replace(/^@/, '').trim();
      return `https://t.me/${u || 'zosuf'}`;
    }

    case 'youtube': {
      let y = data.youtubeUrl.trim();
      if (!y) return 'https://youtube.com';
      if (!/^https?:\/\//i.test(y)) y = 'https://' + y;
      return y;
    }

    case 'instagram': {
      const u = data.instagramUsername.replace(/^@/, '').trim();
      if (u.startsWith('http')) return u;
      return `https://instagram.com/${u || 'markzosuf'}`;
    }

    case 'custom':
      return data.customText.trim() || 'ZOSUF QR Studio';

    default:
      return 'https://zosuf.pages.dev';
  }
}
