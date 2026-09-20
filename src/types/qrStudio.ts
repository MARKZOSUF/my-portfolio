import { QRType, ErrorCorrectionLevel, DotType, CornerSquareType, CornerDotType, GradientType } from './qr';

export type { ErrorCorrectionLevel };

export type StudioTabId =
  | 'content'
  | 'templates'
  | 'frames'
  | 'shapes'
  | 'logo'
  | 'text-layers'
  | 'export'
  | 'my-templates';

export type ExtendedQRType =
  | QRType
  | 'facebook'
  | 'linkedin'
  | 'tiktok'
  | 'twitter'
  | 'paypal'
  | 'crypto'
  | 'product'
  | 'event'
  | 'ticket'
  | 'menu'
  | 'booking'
  | 'review'
  | 'pdf'
  | 'audio'
  | 'video'
  | 'file';

export type TemplateCategory =
  | 'Minimal'
  | 'Professional'
  | 'Business'
  | 'Social'
  | 'Restaurant'
  | 'Wi-Fi'
  | 'Payment'
  | 'Shopping'
  | 'Product'
  | 'Events'
  | 'Birthday'
  | 'Wedding'
  | 'Valentine'
  | 'Halloween'
  | 'Christmas'
  | 'New Year'
  | 'Festival'
  | 'Technology'
  | 'Gaming'
  | 'Music'
  | 'Nature'
  | 'Luxury'
  | 'Neon';

export type FrameStyle =
  | 'none'
  | 'scan-me'
  | 'open-me'
  | 'view-menu'
  | 'pay-now'
  | 'join-wifi'
  | 'ticket'
  | 'product-label'
  | 'phone-frame'
  | 'gift-box'
  | 'heart'
  | 'floral-corners'
  | 'event-pass'
  | 'neon-frame'
  | 'social-profile'
  | 'payment-badge'
  | 'restaurant-card'
  | 'wifi-card'
  | 'minimal-caption'
  | 'circular-ring'
  | 'shield'
  | 'cyber-hud'
  | 'elegant-ribbon'
  | 'tech-badge'
  | 'coupon-voucher'
  | 'vintage-border'
  | 'modern-arch'
  | 'music-cassette'
  | 'minimal-pill'
  | 'modern-polaroid'
  | 'geometric-hex'
  | 'stamp'
  | 'coffee-cup'
  | 'speech-bubble'
  | 'double-border'
  | 'corner-brackets'
  | 'glowing-orbit'
  | 'gradient-frame'
  | 'golden-leaf'
  | 'starry-frame'
  | 'vip-pass';

export interface FrameConfig {
  style: FrameStyle;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  borderWidth: number;
  borderRadius: number;
  padding: number;
  shadow: boolean;
  opacity: number;
  decorationSize: number;
  decorationPosition: 'top' | 'bottom' | 'both';
  ctaText: string;
  ctaFontSize: number;
  ctaTextColor: string;
  placement: 'top' | 'bottom' | 'card' | 'badge';
}

export interface ShapesConfig {
  dotType: DotType;
  cornerSquareType: CornerSquareType;
  cornerDotType: CornerDotType;
  fgColor: string;
  bgColor: string;
  transparentBg: boolean;
  cornerSquareColor: string;
  cornerDotColor: string;
  gradientType: GradientType;
  gradientColor2: string;
  gradientRotation: number;
  margin: number;
  errorCorrection: ErrorCorrectionLevel;
}

export interface LogoConfig {
  dataUrl?: string;
  fileType?: string;
  size: number; // 0.05 - 0.35
  padding: number;
  opacity: number;
  shape: 'circle' | 'rounded' | 'square' | 'none';
  bgColor: string;
}

export interface TextLayerItem {
  enabled: boolean;
  text: string;
  font: string;
  size: number;
  weight: '400' | '600' | '700' | '900';
  color: string;
  align: 'left' | 'center' | 'right';
  letterSpacing: number;
  lineHeight: number;
  uppercase: boolean;
  shadow: boolean;
  backgroundPill: boolean;
  pillColor: string;
  position: 'top' | 'bottom';
}

export type TextLayerConfig = TextLayerItem;

export interface TextLayersConfig {
  heading: TextLayerItem;
  subtitle: TextLayerItem;
  cta: TextLayerItem;
  footer: TextLayerItem;
}

export type LayerId = 'frame' | 'decorations' | 'qr' | 'logo' | 'heading' | 'subtitle' | 'cta' | 'footer';

export interface LayerItemState {
  id: LayerId;
  name: string;
  visible: boolean;
}

export interface StudioDesignState {
  shapes: ShapesConfig;
  frame: FrameConfig;
  logo: LogoConfig;
  textLayers: TextLayersConfig;
  layers: LayerItemState[];
}

export interface StudioTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  design: StudioDesignState;
  isFavorite?: boolean;
  createdAt?: number;
  updatedAt?: number;
}
