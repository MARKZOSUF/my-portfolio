import { QRDesignConfig } from '../types/qr';
import { LogoConfig, ShapesConfig } from '../types/qrStudio';

/**
 * ZOSUF - QR scannability safeguards.
 *
 * Design intent (important):
 *   The user's chosen template, frame, dot shape, palette, gradient and logo
 *   are PRESERVED. We only enforce the small set of physical minimums a QR
 *   matrix needs (quiet zone, logo area vs. error correction, non-degenerate
 *   contrast) and leave everything else exactly as designed.
 *
 *   A hard "repair" profile also exists, but it is only ever applied as an
 *   automatic second attempt *after* optical verification of the original
 *   design has actually failed. It is never applied pre-emptively.
 */

const SAFE_FOREGROUND = '#111827';
const SAFE_BACKGROUND = '#ffffff';

/** Largest logo area (as a fraction of the QR) that each EC level tolerates. */
const MAX_LOGO_SIZE_BY_EC: Record<'L' | 'M' | 'Q' | 'H', number> = {
  L: 0.1,
  M: 0.14,
  Q: 0.2,
  H: 0.28,
};

/** Absolute floor for the quiet zone, in px, at the 512px render size. */
const MIN_MARGIN = 12;

function hexLuminance(value: string): number | null {
  const raw = String(value || '').replace('#', '').trim();
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

type PaletteLike = {
  fgColor: string;
  bgColor: string;
  transparentBg: boolean;
  errorCorrection: 'L' | 'M' | 'Q' | 'H';
};

/**
 * Only a *degenerate* palette is corrected up-front: one where the modules and
 * the background are so close that no camera could ever separate them. Stylish
 * but still-readable palettes (e.g. deep violet on cream) are left untouched.
 */
function isDegenerateContrast(config: PaletteLike): boolean {
  // A transparent background is composited over the frame/backdrop later, so
  // it is only judged against the foreground once, loosely.
  const background = config.transparentBg ? SAFE_BACKGROUND : config.bgColor;
  return qrContrastRatio(config.fgColor, background) < 2.2;
}

/**
 * Light-touch pass applied to every render. Keeps the design, fixes physics.
 */
export function enforceQRMinimums(config: QRDesignConfig): QRDesignConfig {
  const ec = config.errorCorrection || 'Q';
  const degenerate = isDegenerateContrast(config);

  return {
    ...config,
    ...(degenerate ? { fgColor: SAFE_FOREGROUND, bgColor: SAFE_BACKGROUND, transparentBg: false } : {}),
    margin: Math.max(MIN_MARGIN, config.margin || 0),
    logoSize: config.logoDataUrl ? Math.min(config.logoSize || 0, MAX_LOGO_SIZE_BY_EC[ec]) : 0,
    logoMargin: config.logoDataUrl ? Math.max(4, config.logoMargin || 0) : (config.logoMargin || 0),
  };
}

export function enforceShapesMinimums(config: ShapesConfig): ShapesConfig {
  const degenerate = isDegenerateContrast(config);
  return {
    ...config,
    ...(degenerate ? { fgColor: SAFE_FOREGROUND, bgColor: SAFE_BACKGROUND, transparentBg: false } : {}),
    margin: Math.max(MIN_MARGIN, config.margin || 0),
  };
}

export function enforceLogoMinimums(config: LogoConfig, errorCorrection: 'L' | 'M' | 'Q' | 'H' = 'Q'): LogoConfig {
  return {
    ...config,
    size: config.dataUrl ? Math.min(config.size || 0, MAX_LOGO_SIZE_BY_EC[errorCorrection]) : 0,
    padding: config.dataUrl ? Math.max(4, config.padding || 0) : (config.padding || 0),
  };
}

/**
 * Hard fallback profile. ONLY used after an optical decode of the styled
 * design has already failed, so a colourful template is never flattened
 * unless it genuinely could not be read back.
 */
export function repairQRConfig(config: QRDesignConfig): QRDesignConfig {
  return {
    ...config,
    fgColor: SAFE_FOREGROUND,
    bgColor: SAFE_BACKGROUND,
    transparentBg: false,
    gradientType: 'none',
    gradientColor2: SAFE_FOREGROUND,
    dotType: 'square',
    cornerSquareType: 'square',
    cornerDotType: 'square',
    cornerSquareColor: SAFE_FOREGROUND,
    cornerDotColor: SAFE_FOREGROUND,
    errorCorrection: 'H',
    margin: Math.max(20, config.margin || 0),
    logoSize: config.logoDataUrl ? Math.min(config.logoSize || 0, 0.12) : 0,
    logoMargin: Math.max(6, config.logoMargin || 0),
  };
}

export function repairShapesConfig(config: ShapesConfig): ShapesConfig {
  return {
    ...config,
    fgColor: SAFE_FOREGROUND,
    bgColor: SAFE_BACKGROUND,
    transparentBg: false,
    gradientType: 'none',
    gradientColor2: SAFE_FOREGROUND,
    dotType: 'square',
    cornerSquareType: 'square',
    cornerDotType: 'square',
    cornerSquareColor: SAFE_FOREGROUND,
    cornerDotColor: SAFE_FOREGROUND,
    errorCorrection: 'H',
    margin: Math.max(20, config.margin || 0),
  };
}

export function repairLogoConfig(config: LogoConfig): LogoConfig {
  return {
    ...config,
    size: config.dataUrl ? Math.min(config.size || 0, 0.12) : 0,
    padding: config.dataUrl ? Math.max(6, config.padding || 0) : (config.padding || 0),
  };
}
