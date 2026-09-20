import { BrowserMultiFormatReader } from '@zxing/browser';

/**
 * Calculates luminance of a hex color
 */
function getLuminance(hex: string): number {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map((char) => char + char).join('');
  }
  if (c.length !== 6) return 0.5;

  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;

  const a = [r, g, b].map((v) => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

/**
 * Calculates WCAG contrast ratio between two hex colors
 */
export function calculateContrastRatio(hex1: string, hex2: string): number {
  try {
    const l1 = getLuminance(hex1);
    const l2 = getLuminance(hex2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  } catch {
    return 21;
  }
}

export interface VerificationResult {
  verified: boolean;
  decodedText?: string;
  matchesPayload: boolean;
  contrastRatio: number;
  warnings: string[];
  error?: string;
}

function makeDecodeRetryCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const retry = document.createElement('canvas');
  const scale = 2;
  retry.width = source.width * scale;
  retry.height = source.height * scale;
  const context = retry.getContext('2d');
  if (!context) return source;

  // Nearest-neighbour scaling preserves the hard module edges that QR
  // decoders expect after a styled preview has been resized by CSS.
  context.imageSmoothingEnabled = false;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, retry.width, retry.height);
  context.drawImage(source, 0, 0, retry.width, retry.height);
  return retry;
}

function decodeCanvasWithRetry(reader: BrowserMultiFormatReader, source: HTMLCanvasElement) {
  try {
    return reader.decodeFromCanvas(source);
  } catch {
    return reader.decodeFromCanvas(makeDecodeRetryCanvas(source));
  }
}

/**
 * Verifies a QR code from a canvas or image source
 */
export async function verifyQRCode(
  source: HTMLCanvasElement | HTMLImageElement,
  expectedPayload: string,
  fgColor = '#000000',
  bgColor = '#ffffff'
): Promise<VerificationResult> {
  const warnings: string[] = [];
  const contrast = calculateContrastRatio(fgColor, bgColor);

  if (contrast < 3.0) {
    warnings.push(
      `Color contrast between foreground (${fgColor}) and background (${bgColor}) is low (${contrast.toFixed(1)}:1). Cameras may struggle to detect dots.`
    );
  }

  try {
    const reader = new BrowserMultiFormatReader();
    let result;

    if (source instanceof HTMLCanvasElement) {
      result = decodeCanvasWithRetry(reader, source);
    } else {
      result = await reader.decodeFromImageElement(source);
    }

    if (!result) {
      return {
        verified: false,
        matchesPayload: false,
        contrastRatio: contrast,
        warnings,
        error: 'QR could not be recognized by the scanner. Try increasing contrast, reducing logo size, or adding margin.',
      };
    }

    const decoded = result.getText();
    const matches = decoded === expectedPayload;

    if (!matches) {
      return {
        verified: false,
        decodedText: decoded,
        matchesPayload: false,
        contrastRatio: contrast,
        warnings,
        error: 'Scanned payload does not match expected content. Error correction may have been overloaded by a large logo.',
      };
    }

    return {
      verified: true,
      decodedText: decoded,
      matchesPayload: true,
      contrastRatio: contrast,
      warnings,
    };
  } catch (err: any) {
    return {
      verified: false,
      matchesPayload: false,
      contrastRatio: contrast,
      warnings,
      error:
        'Optical verification failed. The QR pattern is unreadable. Recommendation: Check contrast, increase error correction level (Q or H), or lower logo dimensions.',
    };
  }
}
