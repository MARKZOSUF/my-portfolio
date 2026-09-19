export type QRType =
  | 'image-to-qr'
  | 'url'
  | 'text'
  | 'wifi'
  | 'vcard'
  | 'upi'
  | 'email'
  | 'phone'
  | 'sms'
  | 'whatsapp'
  | 'telegram'
  | 'instagram'
  | 'youtube'
  | 'location'
  | 'calendar'
  | 'appstore'
  | 'playstore'
  | 'multi-link'
  | 'custom-url'
  | 'prank';

export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export type DotType =
  | 'square'
  | 'rounded'
  | 'dots'
  | 'extra-rounded'
  | 'classy'
  | 'classy-rounded';

export type CornerSquareType = 'square' | 'rounded' | 'dot' | 'extra-rounded';
export type CornerDotType = 'square' | 'rounded' | 'dot';

export type GradientType = 'none' | 'linear' | 'radial';

export interface QRDesignConfig {
  presetName: string;
  fgColor: string;
  bgColor: string;
  transparentBg: boolean;
  gradientType: GradientType;
  gradientColor2: string;
  gradientRotation: number;
  dotType: DotType;
  cornerSquareType: CornerSquareType;
  cornerDotType: CornerDotType;
  cornerSquareColor: string;
  cornerDotColor: string;
  errorCorrection: ErrorCorrectionLevel;
  margin: number;
  size: number;
  logoDataUrl?: string;
  logoSize: number;
  logoMargin: number;
  frameLabel?: string;
  frameStyle?: 'none' | 'bottom-bar' | 'top-bar' | 'card' | 'neon-border';
  frameColor?: string;
  frameTextColor?: string;
}

export interface QRTypeDefinition {
  id: QRType;
  label: string;
  description: string;
  icon: string;
  category: 'media' | 'web' | 'contact' | 'social' | 'tools';
}
