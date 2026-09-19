import React, { useEffect, useState, useRef } from 'react';
import {
  Download,
  AlertTriangle,
  Info,
  ShieldCheck,
  Plus,
  Trash2,
} from 'lucide-react';
import { QRType, QRDesignConfig } from '../../types/qr';
import { QRTypeSelector } from './QRTypeSelector';
import { QRDesignStudio } from './QRDesignStudio';
import { QRRenderer, QRRendererHandle } from './QRRenderer';
import { QR_PRESET_STYLES } from './presets';
import {
  sanitizeWebUrl,
  buildWifiPayload,
  buildVCardPayload,
  buildUpiPayload,
  buildEmailPayload,
  buildPhonePayload,
  buildSmsPayload,
  buildWhatsAppPayload,
  buildTelegramPayload,
  buildInstagramPayload,
  buildYouTubePayload,
  buildLocationPayload,
  buildCalendarPayload,
  buildAppStorePayload,
  buildPlayStorePayload,
  buildMultiLinkPayload,
} from '../../utils/qrPayloads';
import { ImageToQR } from '../images/ImageToQR';
import { Link } from 'react-router-dom';

export const QRGenerator: React.FC = () => {
  const [selectedType, setSelectedType] = useState<QRType>('url');
  const [designConfig, setDesignConfig] = useState<QRDesignConfig>(QR_PRESET_STYLES[0]);
  const [isVerified, setIsVerified] = useState(false);
  const qrRef = useRef<QRRendererHandle>(null);

  // Form State for the various QR Types
  const [urlInput, setUrlInput] = useState('https://zosuf.pages.dev');
  const [textInput, setTextInput] = useState('Hello from ZOSUF! Secure, privacy-first QR studio.');
  const [wifiData, setWifiData] = useState({
    ssid: 'ZOSUF_WiFi',
    password: '',
    encryption: 'WPA' as 'WPA' | 'WEP' | 'nopass',
    hidden: false,
  });
  const [vcardData, setVcardData] = useState({
    firstName: 'Mark',
    lastName: 'Zosuf',
    organization: 'ZOSUF Studio',
    title: 'Lead Designer & Engineer',
    phone: '+1 555 0199',
    mobile: '',
    email: 'hello@zosuf.pages.dev',
    website: 'https://zosuf.pages.dev',
    address: '',
    note: 'Created with ZOSUF Privacy QR Studio',
  });
  const [upiData, setUpiData] = useState({
    vpa: 'markzosuf@okhdfcbank',
    payeeName: 'Mark Zosuf',
    amount: '',
    transactionNote: 'Support ZOSUF',
  });
  const [emailData, setEmailData] = useState({
    email: 'contact@example.com',
    subject: 'Inquiry from ZOSUF QR',
    body: 'Hello, I scanned your QR code!',
  });
  const [phoneInput, setPhoneInput] = useState('+15551234567');
  const [smsData, setSmsData] = useState({
    phone: '+15551234567',
    message: 'Hello from ZOSUF QR!',
  });
  const [whatsappData, setWhatsappData] = useState({
    phone: '15551234567',
    text: 'Hey! I scanned your ZOSUF QR code.',
  });
  const [telegramUsername, setTelegramUsername] = useState('markzosuf');
  const [instagramHandle, setInstagramHandle] = useState('markzosuf');
  const [youtubeInput, setYoutubeInput] = useState('https://www.youtube.com/@markzosuf');
  const [locationData, setLocationData] = useState({
    lat: 37.7749,
    lng: -122.4194,
    label: 'San Francisco, CA',
  });
  const [calendarData, setCalendarData] = useState({
    title: 'ZOSUF Launch Event',
    description: 'Celebrating privacy-first QR and image tools.',
    location: 'Online',
    startDateTime: '2026-10-15T18:00',
    endDateTime: '2026-10-15T20:00',
    allDay: false,
  });
  const [appStoreId, setAppStoreId] = useState('1234567890');
  const [playStorePackage, setPlayStorePackage] = useState('com.zosuf.app');
  const [multiLinks, setMultiLinks] = useState([
    { label: 'Official Website', url: 'https://zosuf.pages.dev' },
    { label: 'Instagram', url: 'https://instagram.com/markzosuf' },
  ]);
  const [customUri, setCustomUri] = useState('spotify:playlist:37i9dQZF1DXcBWIGoYBM5M');

  // If selected type is 'image-to-qr', delegate to the full ImageToQR feature component!
  if (selectedType === 'image-to-qr') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <QRTypeSelector
            selectedType={selectedType}
            onSelectType={setSelectedType}
            compact
          />
        </div>
        <ImageToQR />
      </div>
    );
  }

  // Compute active payload based on active QR type
  let payload = '';
  switch (selectedType) {
    case 'url':
      payload = sanitizeWebUrl(urlInput).sanitized;
      break;
    case 'text':
      payload = textInput;
      break;
    case 'wifi':
      payload = buildWifiPayload(wifiData);
      break;
    case 'vcard':
      payload = buildVCardPayload(vcardData);
      break;
    case 'upi':
      payload = buildUpiPayload(upiData);
      break;
    case 'email':
      payload = buildEmailPayload(emailData.email, emailData.subject, emailData.body);
      break;
    case 'phone':
      payload = buildPhonePayload(phoneInput);
      break;
    case 'sms':
      payload = buildSmsPayload(smsData.phone, smsData.message);
      break;
    case 'whatsapp':
      payload = buildWhatsAppPayload(whatsappData.phone, whatsappData.text);
      break;
    case 'telegram':
      payload = buildTelegramPayload(telegramUsername);
      break;
    case 'instagram':
      payload = buildInstagramPayload(instagramHandle);
      break;
    case 'youtube':
      payload = buildYouTubePayload(youtubeInput);
      break;
    case 'location':
      payload = buildLocationPayload(locationData.lat, locationData.lng, locationData.label);
      break;
    case 'calendar':
      payload = buildCalendarPayload(calendarData);
      break;
    case 'appstore':
      payload = buildAppStorePayload(appStoreId);
      break;
    case 'playstore':
      payload = buildPlayStorePayload(playStorePackage);
      break;
    case 'multi-link':
      payload = buildMultiLinkPayload('My Links', multiLinks);
      break;
    case 'custom-url':
      payload = customUri.trim();
      break;
    case 'prank':
      payload = 'https://zosuf.pages.dev/p?d=e30';
      break;
    default:
      payload = urlInput;
  }

  const payloadByteLength = new TextEncoder().encode(payload).length;

  useEffect(() => { setIsVerified(false); }, [payload, designConfig]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-xl space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Advanced QR Code Generator
        </h1>
        <p className="text-slate-300 text-sm">
          20 specialized formats, client-side vector precision, custom branding, and real-time optical verification.
        </p>
      </div>

      {/* 20 QR Type Selector */}
      <QRTypeSelector
        selectedType={selectedType}
        onSelectType={setSelectedType}
      />

      {/* Workspace: Form & Live QR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Specific Type Form Input & Design Studio */}
        <div className="lg:col-span-7 space-y-6">
          {/* Dynamic Inputs Form Card */}
          <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-md space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Content & Configuration
            </h2>

            {/* Type 2: Website URL */}
            {selectedType === 'url' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Website Address</label>
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white text-xs font-mono focus:border-violet-500 focus:outline-none"
                />
              </div>
            )}

            {/* Type 3: Plain Text */}
            {selectedType === 'text' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Raw Text Message</label>
                <textarea
                  rows={4}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Type any message, note or instructions..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white text-xs focus:border-violet-500 focus:outline-none"
                />
              </div>
            )}

            {/* Type 4: Wi-Fi */}
            {selectedType === 'wifi' && (
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Network Name (SSID)</label>
                  <input
                    type="text"
                    value={wifiData.ssid}
                    onChange={(e) => setWifiData({ ...wifiData, ssid: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Encryption</label>
                    <select
                      value={wifiData.encryption}
                      onChange={(e) => setWifiData({ ...wifiData, encryption: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white"
                    >
                      <option value="WPA">WPA / WPA2 / WPA3</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">None (Open Network)</option>
                    </select>
                  </div>
                  {wifiData.encryption !== 'nopass' && (
                    <div className="space-y-1">
                      <label className="text-slate-300 font-semibold">Password</label>
                      <input
                        type="text"
                        value={wifiData.password}
                        onChange={(e) => setWifiData({ ...wifiData, password: e.target.value })}
                        placeholder="Network password"
                        className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white font-mono"
                      />
                    </div>
                  )}
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-slate-400">
                  <input
                    type="checkbox"
                    checked={wifiData.hidden}
                    onChange={(e) => setWifiData({ ...wifiData, hidden: e.target.checked })}
                    className="rounded border-slate-700 text-violet-600 focus:ring-violet-500"
                  />
                  <span>Hidden Network</span>
                </label>
              </div>
            )}

            {/* Type 5: vCard */}
            {selectedType === 'vcard' && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-300">First Name</label>
                    <input
                      type="text"
                      value={vcardData.firstName}
                      onChange={(e) => setVcardData({ ...vcardData, firstName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300">Last Name</label>
                    <input
                      type="text"
                      value={vcardData.lastName}
                      onChange={(e) => setVcardData({ ...vcardData, lastName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-300">Company</label>
                    <input
                      type="text"
                      value={vcardData.organization}
                      onChange={(e) => setVcardData({ ...vcardData, organization: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300">Job Title</label>
                    <input
                      type="text"
                      value={vcardData.title}
                      onChange={(e) => setVcardData({ ...vcardData, title: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-300">Work Phone</label>
                    <input
                      type="tel"
                      value={vcardData.phone}
                      onChange={(e) => setVcardData({ ...vcardData, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300">Email</label>
                    <input
                      type="email"
                      value={vcardData.email}
                      onChange={(e) => setVcardData({ ...vcardData, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Type 6: UPI Payment */}
            {selectedType === 'upi' && (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-violet-950/40 border border-violet-800/40 text-violet-300 space-y-1">
                  <span className="font-bold flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" />
                    <span>UPI Standard Protocol Notice</span>
                  </span>
                  <p className="text-[11px] text-slate-300">
                    ZOSUF formats standard <code className="bg-black/40 px-1 rounded">upi://pay</code> URIs. This app never verifies payments, accesses banking credentials, or processes transactions directly.
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Virtual Payment Address (VPA / UPI ID)</label>
                  <input
                    type="text"
                    value={upiData.vpa}
                    onChange={(e) => setUpiData({ ...upiData, vpa: e.target.value })}
                    placeholder="merchant@okhdfcbank"
                    className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Payee Name</label>
                    <input
                      type="text"
                      value={upiData.payeeName}
                      onChange={(e) => setUpiData({ ...upiData, payeeName: e.target.value })}
                      placeholder="e.g. Mark Zosuf"
                      className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Amount (INR, Optional)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={upiData.amount}
                      onChange={(e) => setUpiData({ ...upiData, amount: e.target.value })}
                      placeholder="e.g. 250.00"
                      className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Type 7: Email */}
            {selectedType === 'email' && (
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Recipient Email</label>
                  <input
                    type="email"
                    value={emailData.email}
                    onChange={(e) => setEmailData({ ...emailData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Subject</label>
                  <input
                    type="text"
                    value={emailData.subject}
                    onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Message Body</label>
                  <textarea
                    rows={3}
                    value={emailData.body}
                    onChange={(e) => setEmailData({ ...emailData, body: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white"
                  />
                </div>
              </div>
            )}

            {/* Type 8: Phone */}
            {selectedType === 'phone' && (
              <div className="space-y-2 text-xs">
                <label className="text-slate-300 font-semibold">Phone Number</label>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+1 (555) 019-2834"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white font-mono"
                />
              </div>
            )}

            {/* Type 9: SMS */}
            {selectedType === 'sms' && (
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Recipient Phone</label>
                  <input
                    type="tel"
                    value={smsData.phone}
                    onChange={(e) => setSmsData({ ...smsData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Pre-filled SMS</label>
                  <textarea
                    rows={3}
                    value={smsData.message}
                    onChange={(e) => setSmsData({ ...smsData, message: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white"
                  />
                </div>
              </div>
            )}

            {/* Type 10: WhatsApp */}
            {selectedType === 'whatsapp' && (
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">WhatsApp Number (with country code, no +)</label>
                  <input
                    type="text"
                    value={whatsappData.phone}
                    onChange={(e) => setWhatsappData({ ...whatsappData, phone: e.target.value })}
                    placeholder="15551234567"
                    className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Optional Default Message</label>
                  <input
                    type="text"
                    value={whatsappData.text}
                    onChange={(e) => setWhatsappData({ ...whatsappData, text: e.target.value })}
                    placeholder="Hello!"
                    className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white"
                  />
                </div>
              </div>
            )}

            {/* Type 11: Telegram */}
            {selectedType === 'telegram' && (
              <div className="space-y-2 text-xs">
                <label className="text-slate-300 font-semibold">Telegram Username or Channel</label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-mono">t.me/</span>
                  <input
                    type="text"
                    value={telegramUsername}
                    onChange={(e) => setTelegramUsername(e.target.value)}
                    placeholder="username"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white font-mono"
                  />
                </div>
              </div>
            )}

            {/* Type 12: Instagram */}
            {selectedType === 'instagram' && (
              <div className="space-y-2 text-xs">
                <label className="text-slate-300 font-semibold">Instagram Handle</label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-mono">instagram.com/</span>
                  <input
                    type="text"
                    value={instagramHandle}
                    onChange={(e) => setInstagramHandle(e.target.value)}
                    placeholder="markzosuf"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white font-mono"
                  />
                </div>
              </div>
            )}

            {/* Type 13: YouTube */}
            {selectedType === 'youtube' && (
              <div className="space-y-2 text-xs">
                <label className="text-slate-300 font-semibold">YouTube Video or Channel Link</label>
                <input
                  type="url"
                  value={youtubeInput}
                  onChange={(e) => setYoutubeInput(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white font-mono"
                />
              </div>
            )}

            {/* Type 14: Map Location */}
            {selectedType === 'location' && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={locationData.lat}
                      onChange={(e) => setLocationData({ ...locationData, lat: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={locationData.lng}
                      onChange={(e) => setLocationData({ ...locationData, lng: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Place Label</label>
                  <input
                    type="text"
                    value={locationData.label}
                    onChange={(e) => setLocationData({ ...locationData, label: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white"
                  />
                </div>
              </div>
            )}

            {/* Type 15: Calendar Event */}
            {selectedType === 'calendar' && (
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Event Title</label>
                  <input
                    type="text"
                    value={calendarData.title}
                    onChange={(e) => setCalendarData({ ...calendarData, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Starts</label>
                    <input
                      type="datetime-local"
                      value={calendarData.startDateTime}
                      onChange={(e) => setCalendarData({ ...calendarData, startDateTime: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Ends</label>
                    <input
                      type="datetime-local"
                      value={calendarData.endDateTime}
                      onChange={(e) => setCalendarData({ ...calendarData, endDateTime: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Type 16: App Store */}
            {selectedType === 'appstore' && (
              <div className="space-y-2 text-xs">
                <label className="text-slate-300 font-semibold">Apple App Store ID</label>
                <input
                  type="text"
                  value={appStoreId}
                  onChange={(e) => setAppStoreId(e.target.value)}
                  placeholder="e.g. 1234567890"
                  className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white font-mono"
                />
              </div>
            )}

            {/* Type 17: Play Store */}
            {selectedType === 'playstore' && (
              <div className="space-y-2 text-xs">
                <label className="text-slate-300 font-semibold">Android Package ID</label>
                <input
                  type="text"
                  value={playStorePackage}
                  onChange={(e) => setPlayStorePackage(e.target.value)}
                  placeholder="e.g. com.example.app"
                  className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white font-mono"
                />
              </div>
            )}

            {/* Type 18: Multi Link */}
            {selectedType === 'multi-link' && (
              <div className="space-y-3 text-xs">
                {multiLinks.map((link, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={link.label}
                      onChange={(e) => {
                        const next = [...multiLinks];
                        next[idx].label = e.target.value;
                        setMultiLinks(next);
                      }}
                      placeholder="Title"
                      className="w-1/3 px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white"
                    />
                    <input
                      type="url"
                      value={link.url}
                      onChange={(e) => {
                        const next = [...multiLinks];
                        next[idx].url = e.target.value;
                        setMultiLinks(next);
                      }}
                      placeholder="https://..."
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white font-mono"
                    />
                    {multiLinks.length > 1 && (
                      <button
                        onClick={() => setMultiLinks(multiLinks.filter((_, i) => i !== idx))}
                        className="p-2 text-rose-400 hover:text-rose-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setMultiLinks([...multiLinks, { label: '', url: '' }])}
                  className="flex items-center gap-1.5 text-xs text-violet-400 font-semibold hover:text-violet-300"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Link</span>
                </button>
              </div>
            )}

            {/* Type 19: Custom URI */}
            {selectedType === 'custom-url' && (
              <div className="space-y-2 text-xs">
                <label className="text-slate-300 font-semibold">Custom Protocol URI Scheme</label>
                <input
                  type="text"
                  value={customUri}
                  onChange={(e) => setCustomUri(e.target.value)}
                  placeholder="spotify:album:..., slack://..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white font-mono"
                />
              </div>
            )}

            {/* Type 20: Safe Prank QR shortcut */}
            {selectedType === 'prank' && (
              <div className="p-4 rounded-2xl bg-fuchsia-950/40 border border-fuchsia-800/40 text-xs text-fuchsia-200 space-y-3">
                <p>
                  To design a custom surprise with interactive animations, choose your template in our dedicated Safe Prank QR Studio.
                </p>
                <Link
                  to="/prank-qr"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white font-bold"
                >
                  <span>Open Safe Prank Studio</span>
                </Link>
              </div>
            )}
          </div>

          {/* Design Studio Controls */}
          <QRDesignStudio
            config={designConfig}
            onChangeConfig={setDesignConfig}
            payloadLength={payloadByteLength}
          />
        </div>

        {/* Right Column: Live QR Preview & Download Station */}
        <div className="lg:col-span-5 sticky top-20 space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-violet-950/80 backdrop-blur-xl shadow-2xl flex flex-col items-center">
            <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-wider text-center">
              Live QR Preview
            </h3>
            <p className="text-xs text-slate-400 mb-6 text-center">
              Real-time vector rendering • Client-side verification
            </p>

            {payload ? (
              <QRRenderer
                ref={qrRef}
                data={payload}
                config={designConfig}
                onVerificationChange={(result) => setIsVerified(result.verified)}
              />
            ) : (
              <div className="w-72 h-72 rounded-3xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center p-6 text-center space-y-2 text-slate-500">
                <AlertTriangle className="w-10 h-10 text-slate-700" />
                <p className="text-xs text-slate-400">Please provide valid input above</p>
              </div>
            )}

            {/* Export & Action Buttons */}
            <div className="w-full mt-6 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => qrRef.current?.download('png', `zosuf-${selectedType}-qr`)}
                  disabled={!payload || !isVerified}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-lg shadow-violet-950 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title={!isVerified ? 'Verification required before downloading' : 'Download PNG'}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PNG</span>
                </button>

                <button
                  onClick={() => qrRef.current?.download('svg', `zosuf-${selectedType}-qr`)}
                  disabled={!payload || !isVerified}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title={!isVerified ? 'Verification required before downloading' : 'Download SVG'}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download SVG</span>
                </button>
              </div>

              {!isVerified && payload && (
                <p className="text-[11px] text-amber-400 text-center font-medium">
                  Downloads unlock once optical scannability is verified.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
