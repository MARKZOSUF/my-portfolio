export type QRType =
  | 'url'
  | 'image'
  | 'text'
  | 'wifi'
  | 'vcard'
  | 'upi'
  | 'email'
  | 'phone'
  | 'sms'
  | 'location'
  | 'calendar'
  | 'whatsapp'
  | 'telegram'
  | 'youtube'
  | 'instagram'
  | 'custom';

export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export type DotStyle = 'square' | 'rounded' | 'dots';

export type FrameStyle = 'none' | 'bottom-banner' | 'top-banner' | 'polaroid' | 'boxed';

export interface QRCustomization {
  fgColor: string;
  bgColor: string;
  transparentBg: boolean;
  size: 256 | 512 | 1024;
  errorCorrection: ErrorCorrectionLevel;
  margin: number;
  dotStyle: DotStyle;
  centerLogo: string | null;
  logoPreset: 'none' | 'whatsapp' | 'instagram' | 'youtube' | 'wifi' | 'custom';
  logoSize: number; // percentage 15 - 30
  frameStyle: FrameStyle;
  frameText: string;
  frameColor: string;
  textColor: string;
}

export interface QRHistoryItem {
  id: string;
  title: string;
  type: QRType;
  content: string;
  timestamp: number;
  dataUrl?: string;
}

export type PageRoute = 'home' | 'generator' | 'scanner' | 'image-tools' | 'about' | 'privacy' | 'terms' | '404';

export interface AdsConfig {
  enabled: boolean;
  publisherId: string;
  slots: {
    top: string;
    middle: string;
  };
}

declare global {
  interface Window {
    ZOSUF_ADS_CONFIG?: AdsConfig;
  }
}
