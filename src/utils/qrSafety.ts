import { QRDesignConfig } from '../types/qr';
import { LogoConfig, ShapesConfig } from '../types/qrStudio';

/**
 * QR styling is decorative, but the matrix itself must remain conservative
 * enough for phone cameras. These helpers keep the exported code readable
 * even when a colorful preset, gradient, transparent background, or logo is
 * selected.
 */

function hexLuminance(value: string): number | null {
  const raw = value.replace('#', '').trim();
  const normalized =
    raw.length === 3
      ? raw
          .split('')
          .map((part) => `${part}${part}`)
          .join('')
      : raw;

  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;

  const channels = [0, 2, 4].map((offset) => parseInt(normalized.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)
  );

  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

export function qrContrastRatio(foreground: string, background: string): number {
  const fg = hexLuminance(foreground);
  const bg = hexLuminance(background);
  if (fg === null || bg === null) return 1;
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

const SAFE_FOREGROUND = '#111827';
const SAFE_BACKGROUND = '#ffffff';

export function makeSafeQRConfig(config: QRDesignConfig): QRDesignConfig {
  const contrast = qrContrastRatio(config.fgColor, config.bgColor);
  const needsSafePalette =
    config.transparentBg ||
    config.gradientType !== 'none' ||
    contrast < 4.5;

  return {
    ...config,
    ...(needsSafePalette
      ? {
          fgColor: SAFE_FOREGROUND,
          bgColor: SAFE_BACKGROUND,
          transparentBg: false,
          gradientType: 'none' as const,
          gradientColor2: SAFE_FOREGROUND,
        }
      : {}),
    // Square modules and finder patterns are the most tolerant across
    // cameras, print sizes, and low-light conditions.
    dotType: 'square',
    cornerSquareType: 'square',
    cornerDotType: 'square',
    cornerSquareColor: needsSafePalette ? SAFE_FOREGROUND : config.fgColor,
    cornerDotColor: needsSafePalette ? SAFE_FOREGROUND : config.fgColor,
    errorCorrection: 'H',
    margin: Math.max(20, config.margin || 0),
    logoSize: config.logoDataUrl ? Math.min(config.logoSize || 0, 0.1) : 0,
    logoMargin: Math.max(6, config.logoMargin || 0),
  };
}

export function makeSafeShapesConfig(config: ShapesConfig): ShapesConfig {
  const contrast = qrContrastRatio(config.fgColor, config.bgColor);
  const needsSafePalette =
    config.transparentBg ||
    config.gradientType !== 'none' ||
    contrast < 4.5;

  return {
    ...config,
    ...(needsSafePalette
      ? {
          fgColor: SAFE_FOREGROUND,
          bgColor: SAFE_BACKGROUND,
          transparentBg: false,
          gradientType: 'none' as const,
          gradientColor2: SAFE_FOREGROUND,
        }
      : {}),
    dotType: 'square',
    cornerSquareType: 'square',
    cornerDotType: 'square',
    cornerSquareColor: needsSafePalette ? SAFE_FOREGROUND : config.fgColor,
    cornerDotColor: needsSafePalette ? SAFE_FOREGROUND : config.fgColor,
    errorCorrection: 'H',
    margin: Math.max(20, config.margin || 0),
  };
}

export function makeSafeLogoConfig(config: LogoConfig): LogoConfig {
  return {
    ...config,
    size: config.dataUrl ? Math.min(config.size || 0, 0.1) : 0,
    padding: Math.max(6, config.padding || 0),
  };
}