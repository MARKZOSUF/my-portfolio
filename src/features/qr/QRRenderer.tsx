import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { QRDesignConfig } from '../../types/qr';
import { verifyQRCode, VerificationResult } from '../../utils/qrVerifier';
import { makeSafeQRConfig } from '../../utils/qrSafety';
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, ShieldCheck } from 'lucide-react';

export interface QRRendererHandle {
  download: (format: 'png' | 'svg', filename?: string) => Promise<void>;
  getDataUrl: () => Promise<string>;
  triggerVerification: () => Promise<VerificationResult | null>;
}

interface QRRendererProps {
  data: string;
  config: QRDesignConfig;
  className?: string;
  onVerificationChange?: (result: VerificationResult) => void;
}

export const QRRenderer = forwardRef<QRRendererHandle, QRRendererProps>(
  ({ data, config, className = '', onVerificationChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const qrCodeInstance = useRef<QRCodeStyling | null>(null);
    const [verification, setVerification] = useState<VerificationResult | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const safeConfig = makeSafeQRConfig(config);

    // Initialize or update QRCodeStyling instance
    useEffect(() => {
      if (!data) return;
      const dotsOptions: any = {
        type: safeConfig.dotType,
      };

      if (safeConfig.gradientType !== 'none' && safeConfig.gradientColor2) {
        dotsOptions.gradient = {
          type: safeConfig.gradientType,
          rotation: (safeConfig.gradientRotation * Math.PI) / 180,
          colorStops: [
            { offset: 0, color: safeConfig.fgColor },
            { offset: 1, color: safeConfig.gradientColor2 },
          ],
        };
      } else {
        dotsOptions.color = safeConfig.fgColor;
      }

      const options: any = {
        width: safeConfig.size || 512,
        height: safeConfig.size || 512,
        data: data,
        margin: safeConfig.margin ?? 20,
        qrOptions: {
          typeNumber: 0,
          mode: 'Byte',
          errorCorrectionLevel: safeConfig.errorCorrection || 'H',
        },
        image: safeConfig.logoDataUrl || undefined,
        imageOptions: {
          hideBackgroundDots: true,
          imageSize: safeConfig.logoSize || 0,
          margin: safeConfig.logoMargin || 6,
          crossOrigin: 'anonymous',
        },
        dotsOptions,
        backgroundOptions: {
          color: safeConfig.transparentBg ? 'transparent' : safeConfig.bgColor,
        },
        cornersSquareOptions: {
          type: safeConfig.cornerSquareType,
          color: safeConfig.cornerSquareColor || safeConfig.fgColor,
        },
        cornersDotOptions: {
          type: safeConfig.cornerDotType,
          color: safeConfig.cornerDotColor || safeConfig.fgColor,
        },
      };

      if (!qrCodeInstance.current) {
        qrCodeInstance.current = new QRCodeStyling(options);
        if (containerRef.current) {
          containerRef.current.replaceChildren();
          qrCodeInstance.current.append(containerRef.current);
        }
      } else {
        qrCodeInstance.current.update(options);
      }

      // Automatically verify readability after update
      const verifyTimer = setTimeout(async () => {
        if (!containerRef.current) return;
        setIsVerifying(true);
        try {
          const canvas = containerRef.current.querySelector('canvas');
          if (canvas) {
            const result = await verifyQRCode(
              canvas,
              data,
              safeConfig.fgColor,
              safeConfig.transparentBg ? '#ffffff' : safeConfig.bgColor
            );
            setVerification(result);
            if (onVerificationChange) onVerificationChange(result);
          }
        } catch (err) {
          console.warn('Auto verification check error:', err);
        } finally {
          setIsVerifying(false);
        }
      }, 350);

      return () => clearTimeout(verifyTimer);
    }, [data, config, onVerificationChange]);

    // Draw frame label around QR if configured
    const renderFramedCanvas = async (): Promise<HTMLCanvasElement | null> => {
      if (!qrCodeInstance.current) return null;
      const rawBlob = await qrCodeInstance.current.getRawData('png');
      if (!rawBlob) return null;

      const img = new Image();
      const url = URL.createObjectURL(rawBlob as Blob);
      await new Promise((resolve) => {
        img.onload = resolve;
        img.src = url;
      });

      const qrSize = config.size || 512;
      const hasFrame = config.frameStyle && config.frameStyle !== 'none' && config.frameLabel;

      if (!hasFrame) {
        const directCanvas = document.createElement('canvas');
        directCanvas.width = qrSize;
        directCanvas.height = qrSize;
        const ctx = directCanvas.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0, qrSize, qrSize);
        URL.revokeObjectURL(url);
        return directCanvas;
      }

      // Compute frame dimensions
      const frameHeight = Math.round(qrSize * 0.16);
      const padding = 20;
      const totalWidth = qrSize + padding * 2;
      const totalHeight = qrSize + frameHeight + padding * 2;

      const canvas = document.createElement('canvas');
      canvas.width = totalWidth;
      canvas.height = totalHeight;
      const ctx = canvas.getContext('2d')!;

      // Background
      ctx.fillStyle = config.transparentBg ? '#0c0e24' : config.bgColor;
      ctx.fillRect(0, 0, totalWidth, totalHeight);

      // Frame background pill / bar
      ctx.fillStyle = config.frameColor || '#7c3aed';
      const pillHeight = Math.round(frameHeight * 0.7);
      const pillY = qrSize + padding + (frameHeight - pillHeight) / 2;
      ctx.beginPath();
      ctx.roundRect(padding + 10, pillY, qrSize - 20, pillHeight, 14);
      ctx.fill();

      // Frame text
      ctx.fillStyle = config.frameTextColor || '#ffffff';
      ctx.font = `bold ${Math.round(pillHeight * 0.5)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(config.frameLabel || 'SCAN ME', totalWidth / 2, pillY + pillHeight / 2);

      // Draw QR in center
      ctx.drawImage(img, padding, padding, qrSize, qrSize);
      URL.revokeObjectURL(url);

      return canvas;
    };

    useImperativeHandle(ref, () => ({
      download: async (format: 'png' | 'svg', filename = 'zosuf-qr') => {
        if (!qrCodeInstance.current) return;

        // If SVG or no frame, use default export
        if (format === 'svg' || !config.frameLabel || config.frameStyle === 'none') {
          await qrCodeInstance.current.download({
            name: filename,
            extension: format,
          });
          return;
        }

        // For framed PNG
        const framedCanvas = await renderFramedCanvas();
        if (!framedCanvas) return;

        framedCanvas.toBlob((blob) => {
          if (!blob) return;
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `${filename}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(a.href);
        }, 'image/png');
      },

      getDataUrl: async () => {
        const framedCanvas = await renderFramedCanvas();
        if (framedCanvas) {
          return framedCanvas.toDataURL('image/png');
        }
        return '';
      },

      triggerVerification: async () => {
        if (!containerRef.current) return null;
        const canvas = containerRef.current.querySelector('canvas');
        if (!canvas) return null;
        return verifyQRCode(
          canvas,
          data,
          safeConfig.fgColor,
          safeConfig.transparentBg ? '#ffffff' : safeConfig.bgColor
        );
      },
    }));

    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        {/* Visual Frame Wrapper */}
        <div
          className={`p-4 rounded-3xl transition-all duration-300 relative shadow-2xl ${
            config.transparentBg ? 'bg-slate-900/60' : ''
          }`}
          style={{
            backgroundColor: config.transparentBg ? undefined : config.bgColor,
            border:
              config.frameStyle === 'neon-border'
                ? `3px solid ${config.frameColor || '#7c3aed'}`
                : '1px solid rgba(139, 92, 246, 0.15)',
          }}
        >
          {/* QR Render Target */}
          <div
            ref={containerRef}
            className="flex items-center justify-center overflow-hidden max-w-full"
            style={{ width: '100%', maxWidth: '320px', aspectRatio: '1/1' }}
          />

          {/* Optional Interactive Frame Label */}
          {config.frameLabel && config.frameStyle !== 'none' && (
            <div
              className="mt-3 py-2 px-4 rounded-xl text-center font-bold tracking-wider text-xs uppercase shadow-md transition"
              style={{
                backgroundColor: config.frameColor || '#7c3aed',
                color: config.frameTextColor || '#ffffff',
              }}
            >
              {config.frameLabel}
            </div>
          )}
        </div>

        {/* Verification Status Card (Never Fake) */}
        <div className="w-full max-w-xs mt-4">
          {isVerifying ? (
            <div className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-violet-400" />
              <span>Verifying scannability locally...</span>
            </div>
          ) : verification ? (
            <div
              className={`py-2 px-3 rounded-xl border text-xs leading-relaxed transition ${
                verification.verified
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {verification.verified ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Scannability Verified (Decoded OK)</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Scannability Warning</span>
                  </>
                )}
              </div>

              {verification.error && (
                <p className="mt-1 text-[11px] text-rose-200">{verification.error}</p>
              )}

              {verification.warnings.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-[11px] text-amber-200">
                  {verification.warnings.map((w, idx) => (
                    <li key={idx} className="flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      </div>
    );
  }
);

QRRenderer.displayName = 'QRRenderer';
