import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { StudioDesignState } from '../../types/qrStudio';
import { composeQRDesign, ComposeResult } from './canvasComposer';
import { verifyQRCode, VerificationResult } from '../../utils/qrVerifier';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sun,
  Moon,
  Eye,
} from 'lucide-react';

export interface StudioLivePreviewHandle {
  getComposedCanvas: () => HTMLCanvasElement | null;
  getRawSvgString: () => string;
  getVerification: () => VerificationResult | null;
}

interface StudioLivePreviewProps {
  payload: string;
  design: StudioDesignState;
  onVerificationUpdate?: (result: VerificationResult) => void;
  onCanvasReady?: (canvas: HTMLCanvasElement | null, rawSvg?: string) => void;
}

export const StudioLivePreview = forwardRef<StudioLivePreviewHandle, StudioLivePreviewProps>(
  ({ payload, design, onVerificationUpdate, onCanvasReady }, ref) => {
    const rawQrContainerRef = useRef<HTMLDivElement>(null);
    const composedCanvasRef = useRef<HTMLCanvasElement>(null);
    const qrCodeInstance = useRef<QRCodeStyling | null>(null);

    const [zoom, setZoom] = useState<number>(100);
    const [previewBgDark, setPreviewBgDark] = useState<boolean>(true);
    const [verification, setVerification] = useState<VerificationResult | null>(null);
    const [isVerifying, setIsVerifying] = useState<boolean>(false);
    const [rawSvg, setRawSvg] = useState<string>('');

    // Update QRCodeStyling instance with current shapes & logo
    useEffect(() => {
      if (!payload) return;
      setVerification(null);

      const { shapes, logo } = design;

      const dotsOptions: any = {
        type: shapes.dotType,
      };

      if (shapes.gradientType !== 'none' && shapes.gradientColor2) {
        dotsOptions.gradient = {
          type: shapes.gradientType,
          rotation: (shapes.gradientRotation * Math.PI) / 180,
          colorStops: [
            { offset: 0, color: shapes.fgColor },
            { offset: 1, color: shapes.gradientColor2 },
          ],
        };
      } else {
        dotsOptions.color = shapes.fgColor;
      }

      const options: any = {
        width: 512,
        height: 512,
        data: payload,
        margin: shapes.margin ?? 15,
        qrOptions: {
          typeNumber: 0,
          mode: 'Byte',
          errorCorrectionLevel: shapes.errorCorrection || 'Q',
        },
        image: logo.dataUrl || undefined,
        imageOptions: {
          hideBackgroundDots: true,
          imageSize: logo.size || 0.2,
          margin: logo.padding || 4,
          crossOrigin: 'anonymous',
        },
        dotsOptions,
        backgroundOptions: {
          color: shapes.transparentBg ? 'transparent' : shapes.bgColor,
        },
        cornersSquareOptions: {
          type: shapes.cornerSquareType,
          color: shapes.cornerSquareColor || shapes.fgColor,
        },
        cornersDotOptions: {
          type: shapes.cornerDotType,
          color: shapes.cornerDotColor || shapes.fgColor,
        },
      };

      if (!qrCodeInstance.current) {
        qrCodeInstance.current = new QRCodeStyling(options);
        if (rawQrContainerRef.current) {
          rawQrContainerRef.current.replaceChildren();
          qrCodeInstance.current.append(rawQrContainerRef.current);
        }
      } else {
        qrCodeInstance.current.update(options);
      }

      // Re-compose design on the interactive canvas
      const renderTimer = setTimeout(async () => {
        if (!qrCodeInstance.current) return;
        try {
          const rawCanvas = rawQrContainerRef.current?.querySelector('canvas');
          if (!rawCanvas) return;

          // Render high-res composed artwork
          const composed = await composeQRDesign(rawCanvas, design, {
            width: 512,
            height: 512,
            format: 'png',
          });

          // Draw onto the display preview canvas
          if (composedCanvasRef.current) {
            const displayCtx = composedCanvasRef.current.getContext('2d');
            if (displayCtx) {
              displayCtx.clearRect(0, 0, 512, 512);
              displayCtx.drawImage(composed.canvas, 0, 0, 512, 512);
            }
          }

          if (onCanvasReady) {
            onCanvasReady(composed.canvas, rawSvg);
          }

          // Trigger local optical scannability verification
          setIsVerifying(true);
          const verifyResult = await verifyQRCode(
            composed.canvas,
            payload,
            shapes.fgColor,
            shapes.transparentBg ? '#ffffff' : shapes.bgColor
          );
          setVerification(verifyResult);
          if (onVerificationUpdate) {
            onVerificationUpdate(verifyResult);
          }
        } catch (err) {
          console.warn('Canvas composition / verification warning:', err);
        } finally {
          setIsVerifying(false);
        }
      }, 150);

      // Extract raw SVG if possible
      qrCodeInstance.current.getRawData('svg').then((blob) => {
        if (blob) {
          const reader = new FileReader();
          reader.onload = () => {
            const svgContent = reader.result as string;
            setRawSvg(svgContent);
            if (onCanvasReady && composedCanvasRef.current) {
              onCanvasReady(composedCanvasRef.current, svgContent);
            }
          };
          reader.readAsText(blob as Blob);
        }
      }).catch(() => {});

      return () => clearTimeout(renderTimer);
    }, [payload, design, onVerificationUpdate, onCanvasReady]);

    useImperativeHandle(ref, () => ({
      getComposedCanvas: () => composedCanvasRef.current,
      getRawSvgString: () => rawSvg,
      getVerification: () => verification,
    }));

    return (
      <div className="flex flex-col items-center w-full space-y-4">
        {/* Preview Control Toolbar */}
        <div className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">Live Stage</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-950 text-violet-300 border border-violet-800">
              512 × 512
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Dark/Light Stage Background Toggle */}
            <button
              type="button"
              onClick={() => setPreviewBgDark(!previewBgDark)}
              className="p-1.5 rounded-lg border border-slate-800 hover:text-white text-slate-400 transition"
              title="Toggle Stage Backdrop"
            >
              {previewBgDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            {/* Zoom Controls */}
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(60, z - 15))}
              className="p-1.5 rounded-lg border border-slate-800 hover:text-white text-slate-400 transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] text-slate-400 w-9 text-center">{zoom}%</span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(140, z + 15))}
              className="p-1.5 rounded-lg border border-slate-800 hover:text-white text-slate-400 transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Interactive Artwork Stage */}
        <div
          className={`w-full aspect-square rounded-3xl p-4 flex items-center justify-center overflow-hidden border transition-colors shadow-2xl relative ${
            previewBgDark
              ? 'bg-slate-100 border-slate-200'
              : 'bg-white border-slate-200 shadow-inner'
          }`}
        >
          {/* Subtle Stage Grid */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          />

          {/* Hidden Container for QRCodeStyling raw generation */}
          <div ref={rawQrContainerRef} className="hidden" />

          {/* Composed Visual Canvas */}
          <div
            className="relative transition-transform duration-200"
            style={{ transform: `scale(${zoom / 100})` }}
          >
            <canvas
              ref={composedCanvasRef}
              width={512}
              height={512}
              className="max-w-full max-h-full rounded-2xl shadow-xl object-contain"
              style={{ width: 'min(320px, 72vw)', height: 'auto', aspectRatio: '1 / 1' }}
            />
          </div>
        </div>

        {/* Verification Status Feedback (Strict, Honest, No Fake Status) */}
        <div className="w-full">
          {isVerifying ? (
            <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-violet-400" />
              <span>Scanning with local computer vision...</span>
            </div>
          ) : verification ? (
            <div
              className={`p-3 rounded-2xl border text-xs leading-relaxed transition ${
                verification.verified
                  ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
                  : 'bg-rose-950/30 border-rose-800/50 text-rose-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-bold text-white">
                  {verification.verified ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Optical Readability Verified</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Readability Alert</span>
                    </>
                  )}
                </div>

                <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-black/40 text-slate-300">
                  Contrast: {verification.contrastRatio.toFixed(1)}:1
                </span>
              </div>

              {verification.error && (
                <p className="mt-1 text-[11px] text-rose-200">{verification.error}</p>
              )}

              {verification.warnings && verification.warnings.length > 0 && (
                <div className="mt-1 space-y-0.5 text-[10px] text-amber-200">
                  {verification.warnings.map((w, idx) => (
                    <div key={idx} className="flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    );
  }
);

StudioLivePreview.displayName = 'StudioLivePreview';
