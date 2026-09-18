import QRCode from 'qrcode';
import { QRCustomization } from '../types';

// Preset Brand Icons as clean client-side vector SVGs
export const PRESET_LOGOS: Record<string, string> = {
  whatsapp: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2325D366"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>`,
  instagram: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23E1306C"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`,
  youtube: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23FF0000"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
  wifi: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2306B6D4"><path d="M12 4C7.31 4 3.07 5.9 0 8.98L12 21 24 8.98A17.93 17.93 0 0 0 12 4zm0 2.92c3.96 0 7.55 1.59 10.18 4.16L12 19.35 1.82 11.08C4.45 8.51 8.04 6.92 12 6.92zm0 4.16a7.92 7.92 0 0 1 5.66 2.34L12 17.7 6.34 13.42A7.92 7.92 0 0 1 12 11.08z"/></svg>`,
};

/**
 * Draws the QR code and custom frames onto an HTML Canvas element.
 */
export async function renderQRToCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  custom: QRCustomization
): Promise<void> {
  const targetQrSize = custom.size;
  const qrRawCanvas = document.createElement('canvas');

  // Generate base QR code
  await QRCode.toCanvas(qrRawCanvas, text, {
    errorCorrectionLevel: custom.errorCorrection,
    margin: custom.margin,
    width: targetQrSize,
    color: {
      dark: custom.fgColor || '#000000',
      light: custom.transparentBg ? '#00000000' : (custom.bgColor || '#FFFFFF'),
    },
  });

  // If dot style is rounded or dots, apply stylization
  let processedQrCanvas = qrRawCanvas;
  if (custom.dotStyle === 'rounded' || custom.dotStyle === 'dots') {
    processedQrCanvas = stylizeQrCanvas(qrRawCanvas, custom);
  }

  // Calculate Frame dimensions
  let totalWidth = targetQrSize;
  let totalHeight = targetQrSize;
  let qrOffsetX = 0;
  let qrOffsetY = 0;

  const bannerHeight = Math.round(targetQrSize * 0.18);
  const borderPadding = Math.round(targetQrSize * 0.08);

  switch (custom.frameStyle) {
    case 'bottom-banner':
      totalWidth = targetQrSize + borderPadding * 2;
      totalHeight = targetQrSize + borderPadding * 2 + bannerHeight;
      qrOffsetX = borderPadding;
      qrOffsetY = borderPadding;
      break;

    case 'top-banner':
      totalWidth = targetQrSize + borderPadding * 2;
      totalHeight = targetQrSize + borderPadding * 2 + bannerHeight;
      qrOffsetX = borderPadding;
      qrOffsetY = borderPadding + bannerHeight;
      break;

    case 'polaroid':
      totalWidth = targetQrSize + borderPadding * 2;
      totalHeight = targetQrSize + borderPadding * 2 + bannerHeight * 1.2;
      qrOffsetX = borderPadding;
      qrOffsetY = borderPadding;
      break;

    case 'boxed':
      totalWidth = targetQrSize + borderPadding * 2;
      totalHeight = targetQrSize + borderPadding * 2;
      qrOffsetX = borderPadding;
      qrOffsetY = borderPadding;
      break;

    case 'none':
    default:
      totalWidth = targetQrSize;
      totalHeight = targetQrSize;
      qrOffsetX = 0;
      qrOffsetY = 0;
      break;
  }

  canvas.width = totalWidth;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Clear canvas
  ctx.clearRect(0, 0, totalWidth, totalHeight);

  // Draw Frame background if applicable
  if (custom.frameStyle !== 'none') {
    ctx.fillStyle = custom.frameColor || '#1e293b';
    const borderRadius = Math.round(targetQrSize * 0.04);
    drawRoundedRect(ctx, 0, 0, totalWidth, totalHeight, borderRadius);
    ctx.fill();

    // Inner QR frame backing (clean white or background)
    if (!custom.transparentBg) {
      ctx.fillStyle = custom.bgColor || '#FFFFFF';
      drawRoundedRect(ctx, qrOffsetX - 4, qrOffsetY - 4, targetQrSize + 8, targetQrSize + 8, borderRadius / 1.5);
      ctx.fill();
    }

    // Render Banner Text
    const labelText = (custom.frameText || 'SCAN ME').toUpperCase();
    ctx.font = `700 ${Math.round(bannerHeight * 0.42)}px 'Outfit', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = custom.textColor || '#FFFFFF';

    if (custom.frameStyle === 'bottom-banner' || custom.frameStyle === 'polaroid') {
      const textY = totalHeight - (bannerHeight / 2) - (borderPadding / 4);
      ctx.fillText(labelText, totalWidth / 2, textY);
    } else if (custom.frameStyle === 'top-banner') {
      const textY = (borderPadding + bannerHeight) / 2;
      ctx.fillText(labelText, totalWidth / 2, textY);
    }
  }

  // Draw Processed QR
  ctx.drawImage(processedQrCanvas, qrOffsetX, qrOffsetY, targetQrSize, targetQrSize);

  // Draw Center Logo if enabled
  const logoSrc = custom.centerLogo || (custom.logoPreset !== 'none' && PRESET_LOGOS[custom.logoPreset]);
  if (logoSrc) {
    await drawCenterLogo(ctx, logoSrc, qrOffsetX + targetQrSize / 2, qrOffsetY + targetQrSize / 2, targetQrSize, custom.logoSize);
  }
}

/**
 * Custom QR styler for rounded or dot matrix effect
 */
function stylizeQrCanvas(sourceCanvas: HTMLCanvasElement, custom: QRCustomization): HTMLCanvasElement {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const srcCtx = sourceCanvas.getContext('2d');
  if (!srcCtx) return sourceCanvas;

  const destCanvas = document.createElement('canvas');
  destCanvas.width = width;
  destCanvas.height = height;
  const destCtx = destCanvas.getContext('2d');
  if (!destCtx) return sourceCanvas;

  if (!custom.transparentBg) {
    destCtx.fillStyle = custom.bgColor || '#FFFFFF';
    destCtx.fillRect(0, 0, width, height);
  }

  const imgData = srcCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Detect module size
  let moduleSize = 8;
  for (let x = 0; x < width; x++) {
    const alpha = data[(x * 4) + 3];
    const r = data[(x * 4)];
    const isDark = alpha > 128 && r < 128;
    if (isDark) {
      let count = 0;
      while (x + count < width) {
        const a2 = data[((x + count) * 4) + 3];
        const r2 = data[((x + count) * 4)];
        if (a2 > 128 && r2 < 128) count++;
        else break;
      }
      if (count > 0 && count < width / 4) {
        moduleSize = count;
        break;
      }
    }
  }

  destCtx.fillStyle = custom.fgColor || '#000000';

  const rows = Math.round(height / moduleSize);
  const cols = Math.round(width / moduleSize);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = Math.floor(c * moduleSize + moduleSize / 2);
      const cy = Math.floor(r * moduleSize + moduleSize / 2);
      if (cx >= width || cy >= height) continue;

      const idx = (cy * width + cx) * 4;
      const alpha = data[idx + 3];
      const red = data[idx];
      const isDark = alpha > 128 && red < 128;

      if (isDark) {
        const x = c * moduleSize;
        const y = r * moduleSize;

        // Keep corners as standard square locator targets for scan reliability
        const isCornerTarget =
          (c < 9 && r < 9) ||
          (c >= cols - 9 && r < 9) ||
          (c < 9 && r >= rows - 9);

        if (isCornerTarget || custom.dotStyle === 'square') {
          destCtx.fillRect(x, y, moduleSize, moduleSize);
        } else if (custom.dotStyle === 'dots') {
          destCtx.beginPath();
          destCtx.arc(x + moduleSize / 2, y + moduleSize / 2, (moduleSize / 2) * 0.9, 0, Math.PI * 2);
          destCtx.fill();
        } else if (custom.dotStyle === 'rounded') {
          drawRoundedRect(destCtx, x + 0.5, y + 0.5, moduleSize - 1, moduleSize - 1, moduleSize * 0.35);
          destCtx.fill();
        }
      }
    }
  }

  return destCanvas;
}

/**
 * Overlay center brand logo with protective circular backing
 */
async function drawCenterLogo(
  ctx: CanvasRenderingContext2D,
  src: string,
  centerX: number,
  centerY: number,
  qrSize: number,
  logoPercent: number = 22
): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const logoBoxSize = Math.round(qrSize * (logoPercent / 100));
      const badgeRadius = Math.round(logoBoxSize * 0.62);

      // Draw solid white circular background badge behind logo to ensure contrast
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, badgeRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.lineWidth = Math.max(2, Math.round(qrSize * 0.008));
      ctx.strokeStyle = '#e2e8f0';
      ctx.stroke();

      // Draw logo inside badge with padding
      const drawSize = Math.round(logoBoxSize * 0.88);
      ctx.drawImage(
        img,
        centerX - drawSize / 2,
        centerY - drawSize / 2,
        drawSize,
        drawSize
      );
      ctx.restore();
      resolve();
    };
    img.onerror = () => {
      resolve();
    };
    img.src = src;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Generates an SVG string representation of the QR code
 */
export async function generateQRSvgString(text: string, custom: QRCustomization): Promise<string> {
  return QRCode.toString(text, {
    type: 'svg',
    errorCorrectionLevel: custom.errorCorrection,
    margin: custom.margin,
    width: custom.size,
    color: {
      dark: custom.fgColor,
      light: custom.transparentBg ? '#00000000' : custom.bgColor,
    },
  });
}
