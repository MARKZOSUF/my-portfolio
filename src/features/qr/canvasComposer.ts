import { StudioDesignState, LayerId } from '../../types/qrStudio';

export interface ComposeOptions {
  width: number;
  height: number;
  format?: 'png' | 'jpeg' | 'webp' | 'svg';
  quality?: number; // 0.1 - 1.0
  transparentBg?: boolean;
}

export interface ComposeResult {
  canvas: HTMLCanvasElement;
  dataUrl: string;
  blob: Blob | null;
  svgString?: string;
}

/**
 * Draws a rounded rectangle path on Canvas context
 */
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/**
 * Composes the complete QR artwork onto a high-resolution Canvas
 */
export async function composeQRDesign(
  qrImageSource: HTMLCanvasElement | HTMLImageElement,
  design: StudioDesignState,
  options: ComposeOptions
): Promise<ComposeResult> {
  const { width: targetWidth, height: targetHeight, format = 'png', quality = 0.95 } = options;
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable');
  }

  // Scaling factor relative to 512px base size
  const scale = targetWidth / 512;

  const { shapes, frame, logo, textLayers, layers } = design;

  // Layer visibility map
  const isLayerVisible = (id: LayerId) => {
    const found = layers.find((l) => l.id === id);
    return found ? found.visible : true;
  };

  const bgIsTransparent = shapes.transparentBg && format === 'png';

  // 1. Background Fill
  if (!bgIsTransparent) {
    ctx.fillStyle = frame.backgroundColor || shapes.bgColor || '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  } else {
    ctx.clearRect(0, 0, targetWidth, targetHeight);
  }

  // Calculate Layout & Dimensions
  const padding = (frame.padding ?? 22) * scale;
  const hasFrame = frame.style !== 'none' && isLayerVisible('frame');
  const frameBorderWidth = (frame.borderWidth ?? 3) * scale;
  const frameRadius = (frame.borderRadius ?? 24) * scale;

  // Top text layer heights are advanced incrementally while drawing (see the
  // running `currentY` below), so no pre-computed reservation is needed here.

  // CTA height
  const ctaHeight = (frame.style !== 'none' && frame.ctaText) || (textLayers.cta.enabled && isLayerVisible('cta'))
    ? Math.max(48 * scale, (frame.ctaFontSize ?? 15) * 2.4 * scale)
    : 0;

  const footerHeight = textLayers.footer.enabled && isLayerVisible('footer')
    ? textLayers.footer.size * 1.6 * scale
    : 0;

  // Frame Box Coordinates
  const frameX = padding;
  const frameY = padding;
  const frameW = targetWidth - padding * 2;
  const frameH = targetHeight - padding * 2;

  // 2. Draw Frame Border & Specialized Frame Backgrounds
  if (hasFrame) {
    ctx.save();
    ctx.globalAlpha = frame.opacity ?? 1;

    // Drop Shadow
    if (frame.shadow && !bgIsTransparent) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      ctx.shadowBlur = 18 * scale;
      ctx.shadowOffsetY = 6 * scale;
    }

    // Frame Card Background
    if (frame.backgroundColor && frame.backgroundColor !== 'transparent') {
      ctx.fillStyle = frame.backgroundColor;
      drawRoundRect(ctx, frameX, frameY, frameW, frameH, frameRadius);
      ctx.fill();
    }

    // Reset shadow for borders & accents
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Frame Specific Styling
    switch (frame.style) {
      case 'neon-frame': {
        ctx.strokeStyle = frame.primaryColor;
        ctx.lineWidth = frameBorderWidth;
        ctx.shadowColor = frame.primaryColor;
        ctx.shadowBlur = 14 * scale;
        drawRoundRect(ctx, frameX, frameY, frameW, frameH, frameRadius);
        ctx.stroke();

        ctx.strokeStyle = frame.secondaryColor || '#ec4899';
        ctx.lineWidth = Math.max(1, frameBorderWidth / 2);
        drawRoundRect(ctx, frameX + 4 * scale, frameY + 4 * scale, frameW - 8 * scale, frameH - 8 * scale, Math.max(0, frameRadius - 4 * scale));
        ctx.stroke();
        break;
      }

      case 'double-border': {
        ctx.strokeStyle = frame.primaryColor;
        ctx.lineWidth = frameBorderWidth;
        drawRoundRect(ctx, frameX, frameY, frameW, frameH, frameRadius);
        ctx.stroke();

        ctx.strokeStyle = frame.secondaryColor || frame.primaryColor;
        ctx.lineWidth = Math.max(1, frameBorderWidth * 0.6);
        drawRoundRect(ctx, frameX + 6 * scale, frameY + 6 * scale, frameW - 12 * scale, frameH - 12 * scale, Math.max(0, frameRadius - 6 * scale));
        ctx.stroke();
        break;
      }

      case 'cyber-hud': {
        ctx.strokeStyle = frame.primaryColor;
        ctx.lineWidth = frameBorderWidth;
        drawRoundRect(ctx, frameX, frameY, frameW, frameH, 6 * scale);
        ctx.stroke();

        // Corner Tech Brackets
        const bLen = 20 * scale;
        ctx.lineWidth = frameBorderWidth * 2;
        ctx.strokeStyle = frame.secondaryColor || '#06b6d4';
        // Top-left
        ctx.beginPath();
        ctx.moveTo(frameX - 2, frameY + bLen);
        ctx.lineTo(frameX - 2, frameY - 2);
        ctx.lineTo(frameX + bLen, frameY - 2);
        ctx.stroke();
        // Top-right
        ctx.beginPath();
        ctx.moveTo(frameX + frameW - bLen, frameY - 2);
        ctx.lineTo(frameX + frameW + 2, frameY - 2);
        ctx.lineTo(frameX + frameW + 2, frameY + bLen);
        ctx.stroke();
        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(frameX - 2, frameY + frameH - bLen);
        ctx.lineTo(frameX - 2, frameY + frameH + 2);
        ctx.lineTo(frameX + bLen, frameY + frameH + 2);
        ctx.stroke();
        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(frameX + frameW - bLen, frameY + frameH + 2);
        ctx.lineTo(frameX + frameW + 2, frameY + frameH + 2);
        ctx.lineTo(frameX + frameW + 2, frameY + frameH - bLen);
        ctx.stroke();
        break;
      }

      case 'ticket': {
        ctx.strokeStyle = frame.primaryColor;
        ctx.lineWidth = frameBorderWidth;
        drawRoundRect(ctx, frameX, frameY, frameW, frameH, frameRadius);
        ctx.stroke();

        // Left & right punch cutouts
        const notchY = frameY + frameH * 0.72;
        const notchR = 14 * scale;
        ctx.fillStyle = shapes.transparentBg ? '#090a1a' : (frame.backgroundColor || '#ffffff');
        ctx.beginPath();
        ctx.arc(frameX, notchY, notchR, 0, Math.PI * 2);
        ctx.arc(frameX + frameW, notchY, notchR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Dashed ticket separator line
        ctx.save();
        ctx.setLineDash([6 * scale, 6 * scale]);
        ctx.strokeStyle = frame.secondaryColor || '#818cf8';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.moveTo(frameX + notchR + 4 * scale, notchY);
        ctx.lineTo(frameX + frameW - notchR - 4 * scale, notchY);
        ctx.stroke();
        ctx.restore();
        break;
      }

      case 'phone-frame': {
        ctx.strokeStyle = frame.primaryColor;
        ctx.lineWidth = Math.max(6 * scale, frameBorderWidth);
        drawRoundRect(ctx, frameX, frameY, frameW, frameH, Math.max(32 * scale, frameRadius));
        ctx.stroke();

        // Speaker notch at top
        ctx.fillStyle = frame.secondaryColor || '#334155';
        drawRoundRect(ctx, targetWidth / 2 - 24 * scale, frameY + 8 * scale, 48 * scale, 6 * scale, 3 * scale);
        ctx.fill();
        break;
      }

      case 'coupon-voucher': {
        ctx.save();
        ctx.strokeStyle = frame.primaryColor;
        ctx.lineWidth = frameBorderWidth;
        ctx.setLineDash([8 * scale, 5 * scale]);
        drawRoundRect(ctx, frameX, frameY, frameW, frameH, frameRadius);
        ctx.stroke();
        ctx.restore();
        break;
      }

      case 'modern-arch': {
        ctx.strokeStyle = frame.primaryColor;
        ctx.lineWidth = frameBorderWidth;
        drawRoundRect(ctx, frameX, frameY, frameW, frameH, 48 * scale);
        ctx.stroke();
        break;
      }

      case 'golden-leaf':
      case 'starry-frame':
      case 'floral-corners': {
        ctx.strokeStyle = frame.primaryColor;
        ctx.lineWidth = frameBorderWidth;
        drawRoundRect(ctx, frameX, frameY, frameW, frameH, frameRadius);
        ctx.stroke();

        if (isLayerVisible('decorations')) {
          // Corner Decorative Motifs
          ctx.fillStyle = frame.secondaryColor || frame.primaryColor;
          const starSize = 10 * scale;
          // 4 corner accents
          const drawStar = (cx: number, cy: number) => {
            ctx.beginPath();
            ctx.arc(cx, cy, starSize / 2, 0, Math.PI * 2);
            ctx.fill();
          };
          drawStar(frameX + 16 * scale, frameY + 16 * scale);
          drawStar(frameX + frameW - 16 * scale, frameY + 16 * scale);
          drawStar(frameX + 16 * scale, frameY + frameH - 16 * scale);
          drawStar(frameX + frameW - 16 * scale, frameY + frameH - 16 * scale);
        }
        break;
      }

      default: {
        if (frameBorderWidth > 0) {
          ctx.strokeStyle = frame.primaryColor;
          ctx.lineWidth = frameBorderWidth;
          drawRoundRect(ctx, frameX, frameY, frameW, frameH, frameRadius);
          ctx.stroke();
        }
        break;
      }
    }
    ctx.restore();
  }

  // 3. Top Text Layers (Heading & Subtitle)
  let currentY = frameY + 18 * scale;

  if (textLayers.heading.enabled && isLayerVisible('heading') && textLayers.heading.text) {
    const h = textLayers.heading;
    ctx.save();
    ctx.font = `${h.weight} ${h.size * scale}px ${h.font || 'sans-serif'}`;
    ctx.fillStyle = h.color || '#0f172a';
    ctx.textAlign = h.align || 'center';
    ctx.textBaseline = 'middle';

    const textX = h.align === 'left' ? frameX + 20 * scale : h.align === 'right' ? frameX + frameW - 20 * scale : targetWidth / 2;
    const renderText = h.uppercase ? h.text.toUpperCase() : h.text;

    if (h.backgroundPill) {
      const metrics = ctx.measureText(renderText);
      const pillW = metrics.width + 24 * scale;
      const pillH = h.size * 1.5 * scale;
      ctx.fillStyle = h.pillColor || '#f1f5f9';
      drawRoundRect(ctx, textX - pillW / 2, currentY, pillW, pillH, pillH / 2);
      ctx.fill();
      ctx.fillStyle = h.color || '#0f172a';
      ctx.fillText(renderText, textX, currentY + pillH / 2);
      currentY += pillH + 8 * scale;
    } else {
      ctx.fillText(renderText, textX, currentY + (h.size * scale) / 2);
      currentY += h.size * 1.4 * scale;
    }
    ctx.restore();
  }

  if (textLayers.subtitle.enabled && isLayerVisible('subtitle') && textLayers.subtitle.text) {
    const s = textLayers.subtitle;
    ctx.save();
    ctx.font = `${s.weight} ${s.size * scale}px ${s.font || 'sans-serif'}`;
    ctx.fillStyle = s.color || '#64748b';
    ctx.textAlign = s.align || 'center';
    ctx.textBaseline = 'middle';

    const textX = s.align === 'left' ? frameX + 20 * scale : s.align === 'right' ? frameX + frameW - 20 * scale : targetWidth / 2;
    const renderText = s.uppercase ? s.text.toUpperCase() : s.text;
    ctx.fillText(renderText, textX, currentY + (s.size * scale) / 2);
    currentY += s.size * 1.4 * scale + 10 * scale;
    ctx.restore();
  }

  // 4. Calculate QR Matrix Drawing Box
  // Available height for QR
  const bottomReserved = (ctaHeight > 0 ? ctaHeight + 14 * scale : 0) + (footerHeight > 0 ? footerHeight + 10 * scale : 0) + 16 * scale;
  const availableH = frameY + frameH - currentY - bottomReserved;
  const availableW = frameW - 24 * scale;
  const qrBoxSize = Math.max(120 * scale, Math.min(availableW, availableH));

  const qrX = targetWidth / 2 - qrBoxSize / 2;
  // When many text layers are enabled `availableH` can go negative, which used
  // to push the matrix above the frame and clip it. Clamp inside the card.
  const qrYMax = Math.max(currentY, frameY + frameH - bottomReserved - qrBoxSize);
  const qrY = Math.min(Math.max(currentY, currentY + (availableH - qrBoxSize) / 2), qrYMax);

  // 5. Draw Quiet Zone around QR (if configured in shapes)
  if (!shapes.transparentBg) {
    ctx.fillStyle = shapes.bgColor || '#ffffff';
    drawRoundRect(ctx, qrX - 4 * scale, qrY - 4 * scale, qrBoxSize + 8 * scale, qrBoxSize + 8 * scale, 12 * scale);
    ctx.fill();
  }

  // 6. Draw QR Code Image (if QR layer visible)
  if (isLayerVisible('qr')) {
    ctx.drawImage(qrImageSource, qrX, qrY, qrBoxSize, qrBoxSize);
  }

  // 7. Draw Center Logo (if Logo layer visible and dataUrl exists)
  if (isLayerVisible('logo') && logo.dataUrl) {
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    await new Promise<void>((resolve) => {
      logoImg.onload = () => resolve();
      logoImg.onerror = () => resolve();
      logoImg.src = logo.dataUrl!;
    });

    if (logoImg.width > 0 && logoImg.height > 0) {
      const logoSize = qrBoxSize * (logo.size || 0.2);
      const logoPad = (logo.padding ?? 6) * scale;
      const logoTotal = logoSize + logoPad * 2;
      const logoCenter = targetWidth / 2;
      const logoCenterY = qrY + qrBoxSize / 2;
      const logoX = logoCenter - logoTotal / 2;
      const logoY = logoCenterY - logoTotal / 2;

      ctx.save();
      ctx.globalAlpha = logo.opacity ?? 1;

      // Draw Container Background behind logo
      if (logo.shape !== 'none') {
        ctx.fillStyle = logo.bgColor || shapes.bgColor || '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
        ctx.shadowBlur = 8 * scale;
        ctx.shadowOffsetY = 2 * scale;

        if (logo.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(logoCenter, logoCenterY, logoTotal / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (logo.shape === 'rounded') {
          drawRoundRect(ctx, logoX, logoY, logoTotal, logoTotal, 10 * scale);
          ctx.fill();
        } else if (logo.shape === 'square') {
          ctx.fillRect(logoX, logoY, logoTotal, logoTotal);
        }
      }

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Draw Logo Image in center
      ctx.drawImage(
        logoImg,
        logoCenter - logoSize / 2,
        logoCenterY - logoSize / 2,
        logoSize,
        logoSize
      );

      ctx.restore();
    }
  }

  // 8. Draw CTA Button / Banner at Bottom
  const ctaText = frame.ctaText || (textLayers.cta.enabled && textLayers.cta.text ? textLayers.cta.text : '');
  if (ctaText && isLayerVisible('cta')) {
    const ctaY = frameY + frameH - bottomReserved + 8 * scale;
    const pillH = Math.max(38 * scale, (frame.ctaFontSize ?? 15) * 2.2 * scale);
    const pillW = Math.min(frameW - 20 * scale, qrBoxSize + 12 * scale);
    const pillX = targetWidth / 2 - pillW / 2;

    ctx.save();
    // Pill background
    ctx.fillStyle = frame.primaryColor || '#7c3aed';
    drawRoundRect(ctx, pillX, ctaY, pillW, pillH, pillH / 2);
    ctx.fill();

    // CTA Text
    ctx.fillStyle = frame.ctaTextColor || '#ffffff';
    ctx.font = `bold ${Math.round((frame.ctaFontSize ?? 15) * scale)}px ${textLayers.cta.font || 'sans-serif'}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ctaText.toUpperCase(), targetWidth / 2, ctaY + pillH / 2);
    ctx.restore();
  }

  // 9. Draw Footer Text
  if (textLayers.footer.enabled && isLayerVisible('footer') && textLayers.footer.text) {
    const f = textLayers.footer;
    ctx.save();
    ctx.font = `${f.weight} ${f.size * scale}px ${f.font || 'sans-serif'}`;
    ctx.fillStyle = f.color || '#94a3b8';
    ctx.textAlign = f.align || 'center';
    ctx.textBaseline = 'middle';

    const textX = f.align === 'left' ? frameX + 20 * scale : f.align === 'right' ? frameX + frameW - 20 * scale : targetWidth / 2;
    const footerY = targetHeight - padding + 6 * scale;
    ctx.fillText(f.uppercase ? f.text.toUpperCase() : f.text, textX, footerY);
    ctx.restore();
  }

  // Output encoding
  const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
  const dataUrl = canvas.toDataURL(mimeType, quality);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), mimeType, quality);
  });

  return {
    canvas,
    dataUrl,
    blob,
  };
}
