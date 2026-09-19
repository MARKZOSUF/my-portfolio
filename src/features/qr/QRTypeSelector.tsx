import React from 'react';
import {
  Image as ImageIcon,
  Globe,
  FileText,
  Wifi,
  Contact,
  CreditCard,
  Mail,
  Phone,
  MessageSquare,
  Share2,
  Send,
  Instagram,
  Youtube,
  MapPin,
  Calendar,
  Apple,
  Play,
  ListPlus,
  Link2,
  Sparkles,
} from 'lucide-react';
import { QRType, QRTypeDefinition } from '../../types/qr';

export const QR_TYPES: QRTypeDefinition[] = [
  {
    id: 'image-to-qr',
    label: 'Image to QR',
    description: 'Direct photo & graphic QR with canvas compression & URL modes',
    icon: 'ImageIcon',
    category: 'media',
  },
  {
    id: 'url',
    label: 'Website URL',
    description: 'Any HTTPS website link, landing page or portfolio',
    icon: 'Globe',
    category: 'web',
  },
  {
    id: 'text',
    label: 'Plain Text',
    description: 'Raw text message, secret note, instructions, or passwords',
    icon: 'FileText',
    category: 'tools',
  },
  {
    id: 'wifi',
    label: 'Wi-Fi Network',
    description: 'Connect to WPA/WPA2/WEP or open networks instantly',
    icon: 'Wifi',
    category: 'tools',
  },
  {
    id: 'vcard',
    label: 'vCard Contact',
    description: 'Full digital business card with phone, email & address',
    icon: 'Contact',
    category: 'contact',
  },
  {
    id: 'upi',
    label: 'UPI Payment',
    description: 'Quick Bharat / Indian UPI payment URI (never claims verification)',
    icon: 'CreditCard',
    category: 'web',
  },
  {
    id: 'email',
    label: 'Email Message',
    description: 'Pre-filled mailto with recipient, subject & body',
    icon: 'Mail',
    category: 'contact',
  },
  {
    id: 'phone',
    label: 'Phone Call',
    description: 'Direct one-tap telephone dialer scheme',
    icon: 'Phone',
    category: 'contact',
  },
  {
    id: 'sms',
    label: 'SMS Text',
    description: 'Pre-filled SMS text message to any phone number',
    icon: 'MessageSquare',
    category: 'contact',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp Chat',
    description: 'Direct wa.me chat link with optional pre-filled message',
    icon: 'Share2',
    category: 'social',
  },
  {
    id: 'telegram',
    label: 'Telegram Channel',
    description: 'Telegram user or channel link (t.me)',
    icon: 'Send',
    category: 'social',
  },
  {
    id: 'instagram',
    label: 'Instagram Profile',
    description: 'Link directly to any Instagram handle',
    icon: 'Instagram',
    category: 'social',
  },
  {
    id: 'youtube',
    label: 'YouTube Video',
    description: 'Video watch link or channel showcase',
    icon: 'Youtube',
    category: 'social',
  },
  {
    id: 'location',
    label: 'Map Location',
    description: 'Exact latitude & longitude pin on Google Maps',
    icon: 'MapPin',
    category: 'tools',
  },
  {
    id: 'calendar',
    label: 'Calendar Event',
    description: 'iCalendar vEvent with start, end, location & reminders',
    icon: 'Calendar',
    category: 'tools',
  },
  {
    id: 'appstore',
    label: 'App Store',
    description: 'Direct Apple iOS App Store download link',
    icon: 'Apple',
    category: 'web',
  },
  {
    id: 'playstore',
    label: 'Google Play Store',
    description: 'Direct Android app package download link',
    icon: 'Play',
    category: 'web',
  },
  {
    id: 'multi-link',
    label: 'Multiple Links',
    description: 'Clean list of multiple websites or social profiles',
    icon: 'ListPlus',
    category: 'web',
  },
  {
    id: 'custom-url',
    label: 'Custom URI Scheme',
    description: 'Deep links like spotify:, slack:, zoommtg:, or custom protocols',
    icon: 'Link2',
    category: 'web',
  },
  {
    id: 'prank',
    label: 'Safe Prank QR',
    description: 'Create harmless friendly surprise cards & mystery reveals',
    icon: 'Sparkles',
    category: 'social',
  },
];

const ICONS_MAP: Record<string, React.FC<{ className?: string }>> = {
  ImageIcon,
  Globe,
  FileText,
  Wifi,
  Contact,
  CreditCard,
  Mail,
  Phone,
  MessageSquare,
  Share2,
  Send,
  Instagram,
  Youtube,
  MapPin,
  Calendar,
  Apple,
  Play,
  ListPlus,
  Link2,
  Sparkles,
};

interface QRTypeSelectorProps {
  selectedType: QRType;
  onSelectType: (type: QRType) => void;
  compact?: boolean;
}

export const QRTypeSelector: React.FC<QRTypeSelectorProps> = ({
  selectedType,
  onSelectType,
  compact = false,
}) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Select QR Type (20 Working Types)
        </span>
        <span className="text-[11px] text-violet-400 font-medium">
          Client-Side Generated
        </span>
      </div>

      <div
        className={`grid gap-2 ${
          compact
            ? 'grid-cols-2 sm:grid-cols-4 md:grid-cols-5'
            : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
        }`}
      >
        {QR_TYPES.map((typeDef) => {
          const IconComponent = ICONS_MAP[typeDef.icon] || Globe;
          const isSelected = selectedType === typeDef.id;
          const isImageToQR = typeDef.id === 'image-to-qr';

          return (
            <button
              key={typeDef.id}
              onClick={() => onSelectType(typeDef.id)}
              className={`flex items-center gap-2.5 p-3 rounded-xl text-left transition-all relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                isSelected
                  ? 'bg-violet-600/30 border-2 border-violet-500 text-white shadow-lg shadow-violet-900/30'
                  : 'bg-slate-900/60 border border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
              }`}
            >
              {isImageToQR && (
                <span className="absolute top-1 right-1 px-1 py-0.2 rounded text-[8px] font-black uppercase bg-gradient-to-r from-pink-500 to-violet-500 text-white leading-none">
                  Top
                </span>
              )}
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isSelected
                    ? 'bg-violet-500 text-white'
                    : isImageToQR
                    ? 'bg-pink-950/60 text-pink-400 border border-pink-700/40'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <IconComponent className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-xs truncate leading-tight">
                  {typeDef.label}
                </div>
                {!compact && (
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    {typeDef.category}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
