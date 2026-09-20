import React from 'react';
import {
  Globe,
  FileText,
  Wifi,
  Mail,
  Phone,
  MessageSquare,
  Send,
  Camera,
  Video,
  Share2,
  Calendar,
  MapPin,
  CreditCard,
  Layers,
  Link as LinkIcon,
  Tag,
  Ticket,
  Utensils,
  CalendarCheck,
  Star,
  FileDown,
  Music,
  Tv,
  Coins,
  AppWindow,
  ExternalLink,
  Plus,
  Trash2,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { ExtendedQRType } from '../../../types/qrStudio';

export interface ContentFormData {
  selectedType: ExtendedQRType;
  urlInput: string;
  textInput: string;
  wifiData: { ssid: string; password: string; encryption: 'WPA' | 'WEP' | 'nopass'; hidden: boolean };
  vcardData: {
    firstName: string;
    lastName: string;
    organization: string;
    title: string;
    phone: string;
    email: string;
    website: string;
    address: string;
  };
  upiData: { vpa: string; payeeName: string; amount: string; transactionNote: string };
  emailData: { email: string; subject: string; body: string };
  phoneInput: string;
  smsData: { phone: string; message: string };
  whatsappData: { phone: string; text: string };
  telegramUsername: string;
  instagramHandle: string;
  youtubeInput: string;
  facebookUrl: string;
  linkedinUrl: string;
  tiktokHandle: string;
  twitterHandle: string;
  paypalData: { username: string; amount: string };
  cryptoData: { coin: 'bitcoin' | 'ethereum' | 'solana'; address: string; amount: string };
  locationData: { lat: number; lng: number; label: string };
  calendarData: { title: string; location: string; startDateTime: string; endDateTime: string };
  appStoreId: string;
  playStorePackage: string;
  multiLinks: Array<{ label: string; url: string }>;
  productData: { name: string; sku: string; price: string; url: string };
  eventData: { name: string; venue: string; date: string; url: string };
  ticketData: { code: string; holder: string; event: string; url: string };
  menuUrl: string;
  bookingUrl: string;
  reviewUrl: string;
  pdfUrl: string;
  audioUrl: string;
  videoUrl: string;
  fileUrl: string;
  customUri: string;
}

interface ContentTabProps {
  data: ContentFormData;
  onChange: (data: ContentFormData) => void;
}

interface TypeItem {
  id: ExtendedQRType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'web' | 'contact' | 'social' | 'payment' | 'media' | 'business';
}

const ALL_TYPES: TypeItem[] = [
  { id: 'url', label: 'Website URL', icon: Globe, category: 'web' },
  { id: 'text', label: 'Plain Text', icon: FileText, category: 'web' },
  { id: 'wifi', label: 'Wi-Fi Network', icon: Wifi, category: 'web' },
  { id: 'vcard', label: 'Contact Card', icon: CreditCard, category: 'contact' },
  { id: 'email', label: 'Send Email', icon: Mail, category: 'contact' },
  { id: 'phone', label: 'Phone Call', icon: Phone, category: 'contact' },
  { id: 'sms', label: 'SMS Message', icon: MessageSquare, category: 'contact' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, category: 'social' },
  { id: 'telegram', label: 'Telegram', icon: Send, category: 'social' },
  { id: 'instagram', label: 'Instagram', icon: Camera, category: 'social' },
  { id: 'youtube', label: 'YouTube', icon: Video, category: 'social' },
  { id: 'facebook', label: 'Facebook', icon: Share2, category: 'social' },
  { id: 'linkedin', label: 'LinkedIn', icon: Share2, category: 'social' },
  { id: 'tiktok', label: 'TikTok', icon: Video, category: 'social' },
  { id: 'twitter', label: 'X / Twitter', icon: Share2, category: 'social' },
  { id: 'multi-link', label: 'Multi-Link Hub', icon: Layers, category: 'social' },
  { id: 'upi', label: 'UPI Payment', icon: CreditCard, category: 'payment' },
  { id: 'paypal', label: 'PayPal', icon: CreditCard, category: 'payment' },
  { id: 'crypto', label: 'Crypto Coin', icon: Coins, category: 'payment' },
  { id: 'location', label: 'Map Location', icon: MapPin, category: 'business' },
  { id: 'calendar', label: 'Calendar Event', icon: Calendar, category: 'business' },
  { id: 'product', label: 'Product Specs', icon: Tag, category: 'business' },
  { id: 'event', label: 'Event Details', icon: Calendar, category: 'business' },
  { id: 'ticket', label: 'Ticket / Pass', icon: Ticket, category: 'business' },
  { id: 'menu', label: 'Restaurant Menu', icon: Utensils, category: 'business' },
  { id: 'booking', label: 'Online Booking', icon: CalendarCheck, category: 'business' },
  { id: 'review', label: 'Customer Review', icon: Star, category: 'business' },
  { id: 'pdf', label: 'PDF Document', icon: FileDown, category: 'media' },
  { id: 'audio', label: 'Audio / MP3', icon: Music, category: 'media' },
  { id: 'video', label: 'Video Stream', icon: Tv, category: 'media' },
  { id: 'file', label: 'Direct File', icon: FileDown, category: 'media' },
  { id: 'appstore', label: 'App Store', icon: AppWindow, category: 'web' },
  { id: 'playstore', label: 'Google Play', icon: AppWindow, category: 'web' },
  { id: 'custom-url', label: 'Custom URI', icon: LinkIcon, category: 'web' },
];

export const ContentTab: React.FC<ContentTabProps> = ({ data, onChange }) => {
  const updateField = <K extends keyof ContentFormData>(field: K, value: ContentFormData[K]) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Type Selector Grid */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Choose QR Data Format
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-52 overflow-y-auto pr-1">
          {ALL_TYPES.map((t) => {
            const Icon = t.icon;
            const isSelected = data.selectedType === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => updateField('selectedType', t.id)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold text-left transition ${
                  isSelected
                    ? 'bg-violet-600/20 border-violet-500 text-white shadow-sm'
                    : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-violet-400' : 'text-slate-400'}`} />
                <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Type Form Input Box */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-4">
        {/* URL */}
        {data.selectedType === 'url' && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200">Destination Website URL</label>
            <input
              type="url"
              value={data.urlInput}
              onChange={(e) => updateField('urlInput', e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white text-xs font-mono focus:border-violet-500 focus:outline-none"
            />
            <p className="text-[11px] text-slate-400">
              Scanners will immediately prompt to open this link in the browser.
            </p>
          </div>
        )}

        {/* Plain Text */}
        {data.selectedType === 'text' && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200">Raw Text Note</label>
            <textarea
              rows={4}
              value={data.textInput}
              onChange={(e) => updateField('textInput', e.target.value)}
              placeholder="Enter instructions, notes, or raw message..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white text-xs focus:border-violet-500 focus:outline-none"
            />
          </div>
        )}

        {/* Wi-Fi */}
        {data.selectedType === 'wifi' && (
          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">Network SSID</label>
              <input
                type="text"
                value={data.wifiData.ssid}
                onChange={(e) => updateField('wifiData', { ...data.wifiData, ssid: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Encryption</label>
                <select
                  value={data.wifiData.encryption}
                  onChange={(e) => updateField('wifiData', { ...data.wifiData, encryption: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white"
                >
                  <option value="WPA">WPA / WPA2 / WPA3</option>
                  <option value="WEP">WEP</option>
                  <option value="nopass">Open Network</option>
                </select>
              </div>
              {data.wifiData.encryption !== 'nopass' && (
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Password</label>
                  <input
                    type="text"
                    value={data.wifiData.password}
                    onChange={(e) => updateField('wifiData', { ...data.wifiData, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white font-mono"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* vCard */}
        {data.selectedType === 'vcard' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-slate-300">First Name</label>
              <input
                type="text"
                value={data.vcardData.firstName}
                onChange={(e) => updateField('vcardData', { ...data.vcardData, firstName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-300">Last Name</label>
              <input
                type="text"
                value={data.vcardData.lastName}
                onChange={(e) => updateField('vcardData', { ...data.vcardData, lastName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-300">Company</label>
              <input
                type="text"
                value={data.vcardData.organization}
                onChange={(e) => updateField('vcardData', { ...data.vcardData, organization: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-300">Phone</label>
              <input
                type="tel"
                value={data.vcardData.phone}
                onChange={(e) => updateField('vcardData', { ...data.vcardData, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white"
              />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label className="text-slate-300">Email</label>
              <input
                type="email"
                value={data.vcardData.email}
                onChange={(e) => updateField('vcardData', { ...data.vcardData, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white"
              />
            </div>
          </div>
        )}

        {/* UPI */}
        {data.selectedType === 'upi' && (
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-violet-950/40 border border-violet-800/40 text-violet-300 space-y-1">
              <span className="font-bold flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                <span>UPI Protocol Disclaimer</span>
              </span>
              <p className="text-[11px] text-slate-300">
                Formats standard <code className="bg-black/40 px-1 rounded">upi://pay</code> URIs for UPI-compatible mobile apps.
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">UPI ID (VPA)</label>
              <input
                type="text"
                value={data.upiData.vpa}
                onChange={(e) => updateField('upiData', { ...data.upiData, vpa: e.target.value })}
                placeholder="merchant@bank"
                className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Payee Name</label>
                <input
                  type="text"
                  value={data.upiData.payeeName}
                  onChange={(e) => updateField('upiData', { ...data.upiData, payeeName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Amount (Optional)</label>
                <input
                  type="number"
                  value={data.upiData.amount}
                  onChange={(e) => updateField('upiData', { ...data.upiData, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* PayPal */}
        {data.selectedType === 'paypal' && (
          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">PayPal.me Username</label>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-mono">paypal.me/</span>
                <input
                  type="text"
                  value={data.paypalData.username}
                  onChange={(e) => updateField('paypalData', { ...data.paypalData, username: e.target.value })}
                  placeholder="username"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* Crypto */}
        {data.selectedType === 'crypto' && (
          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">Cryptocurrency</label>
              <select
                value={data.cryptoData.coin}
                onChange={(e) => updateField('cryptoData', { ...data.cryptoData, coin: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white"
              >
                <option value="bitcoin">Bitcoin (BTC)</option>
                <option value="ethereum">Ethereum (ETH)</option>
                <option value="solana">Solana (SOL)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">Wallet Address</label>
              <input
                type="text"
                value={data.cryptoData.address}
                onChange={(e) => updateField('cryptoData', { ...data.cryptoData, address: e.target.value })}
                placeholder="Address"
                className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white font-mono"
              />
            </div>
          </div>
        )}

        {/* Social Handlers */}
        {['instagram', 'telegram', 'tiktok', 'twitter'].includes(data.selectedType) && (
          <div className="space-y-2 text-xs">
            <label className="text-slate-300 font-semibold capitalize">{data.selectedType} Username / Handle</label>
            <input
              type="text"
              value={
                data.selectedType === 'instagram'
                  ? data.instagramHandle
                  : data.selectedType === 'telegram'
                  ? data.telegramUsername
                  : data.selectedType === 'tiktok'
                  ? data.tiktokHandle
                  : data.twitterHandle
              }
              onChange={(e) => {
                const val = e.target.value.replace(/^@/, '');
                if (data.selectedType === 'instagram') updateField('instagramHandle', val);
                else if (data.selectedType === 'telegram') updateField('telegramUsername', val);
                else if (data.selectedType === 'tiktok') updateField('tiktokHandle', val);
                else updateField('twitterHandle', val);
              }}
              placeholder="handle"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white font-mono"
            />
          </div>
        )}

        {/* Media & URL Links (PDF, Audio, Video, File, Menu, Booking, Review) */}
        {['pdf', 'audio', 'video', 'file', 'menu', 'booking', 'review'].includes(data.selectedType) && (
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/40 text-blue-300 flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                <strong>URL-Based Mode:</strong> This format links directly to your online hosted asset. For offline in-QR micro-images, use our Image-to-QR studio.
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold uppercase">
                {data.selectedType} Direct Link URL
              </label>
              <input
                type="url"
                value={
                  data.selectedType === 'pdf'
                    ? data.pdfUrl
                    : data.selectedType === 'audio'
                    ? data.audioUrl
                    : data.selectedType === 'video'
                    ? data.videoUrl
                    : data.selectedType === 'file'
                    ? data.fileUrl
                    : data.selectedType === 'menu'
                    ? data.menuUrl
                    : data.selectedType === 'booking'
                    ? data.bookingUrl
                    : data.reviewUrl
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (data.selectedType === 'pdf') updateField('pdfUrl', val);
                  else if (data.selectedType === 'audio') updateField('audioUrl', val);
                  else if (data.selectedType === 'video') updateField('videoUrl', val);
                  else if (data.selectedType === 'file') updateField('fileUrl', val);
                  else if (data.selectedType === 'menu') updateField('menuUrl', val);
                  else if (data.selectedType === 'booking') updateField('bookingUrl', val);
                  else updateField('reviewUrl', val);
                }}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white font-mono"
              />
            </div>
          </div>
        )}

        {/* Multi-Link */}
        {data.selectedType === 'multi-link' && (
          <div className="space-y-3 text-xs">
            <label className="text-slate-300 font-semibold">Links Hub</label>
            {data.multiLinks.map((link, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={link.label}
                  onChange={(e) => {
                    const next = [...data.multiLinks];
                    next[idx].label = e.target.value;
                    updateField('multiLinks', next);
                  }}
                  placeholder="Title"
                  className="w-1/3 px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white"
                />
                <input
                  type="url"
                  value={link.url}
                  onChange={(e) => {
                    const next = [...data.multiLinks];
                    next[idx].url = e.target.value;
                    updateField('multiLinks', next);
                  }}
                  placeholder="https://..."
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white font-mono"
                />
                {data.multiLinks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => updateField('multiLinks', data.multiLinks.filter((_, i) => i !== idx))}
                    className="p-2 text-rose-400 hover:text-rose-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => updateField('multiLinks', [...data.multiLinks, { label: '', url: '' }])}
              className="flex items-center gap-1.5 text-xs text-violet-400 font-semibold hover:text-violet-300"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Link</span>
            </button>
          </div>
        )}

        {/* Custom URI */}
        {data.selectedType === 'custom-url' && (
          <div className="space-y-2 text-xs">
            <label className="text-slate-300 font-semibold">Custom URI Protocol</label>
            <input
              type="text"
              value={data.customUri}
              onChange={(e) => updateField('customUri', e.target.value)}
              placeholder="spotify:track:..., slack://..."
              className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-white font-mono"
            />
          </div>
        )}
      </div>
    </div>
  );
};
