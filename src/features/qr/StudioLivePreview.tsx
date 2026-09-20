import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { LogoConfig, ShapesConfig, StudioDesignState } from '../../types/qrStudio';
import { composeQRDesign } from './canvasComposer';
import { verifyQRCode, VerificationResult } from '../../utils/qrVerifier';
import {
  enforceLogoMinimums,
  enforceShapesMinimums,
  repairLogoConfig,
  repairShapesConfig,
} from '../../utils/qrSafety';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Wand2,
  ZoomIn,
  ZoomOut,
  Sun,
  Moon,
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
    const [autoRepaired, setAutoRepaired] = useState<boolean>(false);

    // Render the user's design first; only fall back to the flattened profile
    // if that design genuinely fails to decode. Templates, frames, text layers
    // and logos are otherwise preserved exactly as configured.
    useEffect(() => {
      if (!payload) return;
      let cancelled = false;
      setVerification(null);
      setAutoRepaired(false);

      const buildOptions = (shapes: ShapesConfig, logo: LogoConfig) => {
        const dotsOptions: Record<string, unknown> = { type: shapes.dotType };

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

        return {
          width: 512,
          height: 512,
          data: payload,
          margin: shapes.margin ?? 20,
          qrOptions: {
            typeNumber: 0,
            mode: 'Byte',
            errorCorrectionLevel: shapes.errorCorrection || 'Q',
          },
          image: logo.dataUrl || undefined,
          imageOptions: {
            hideBackgroundDots: true,
            imageSize: logo.size || 0,
            margin: logo.padding || 0,
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
      };

      const paint = (shapes: ShapesConfig, logo: LogoConfig) => {
        const options = buildOptions(shapes, logo);
        if (!qrCodeInstance.current) {
          qrCodeInstance.current = new QRCodeStyling(options as never);
          if (rawQrContainerRef.current) {
            rawQrContainerRef.current.replaceChildren();
            qrCodeInstance.current.append(rawQrContainerRef.current);
          }
        } else {
          qrCodeInstance.current.update(options as never);
        }
      };

      const settle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      const composeAndVerify = async (shapes: ShapesConfig, logo: LogoConfig) => {
        const rawCanvas = rawQrContainerRef.current?.querySelector('canvas');
        if (!rawCanvas) return null;

        const composed = await composeQRDesign(rawCanvas, { ...design, shapes, logo }, {
          width: 512,
          height: 512,
          format: 'png',
        });

        if (composedCanvasRef.current) {
          const displayCtx = composedCanvasRef.current.getContext('2d');
          if (displayCtx) {
            displayCtx.clearRect(0, 0, 512, 512);
            displayCtx.drawImage(composed.canvas, 0, 0, 512, 512);
          }
        }

        const result = await verifyQRCode(
          composed.canvas,
          payload,
          shapes.fgColor,
          shapes.transparentBg ? '#ffffff' : shapes.bgColor
        );

        return { composed, result };
      };

      const run = async () => {
        const shapes = enforceShapesMinimums(design.shapes);
        const logo = enforceLogoMinimums(design.logo, shapes.errorCorrection);
        paint(shapes, logo);

        try {
          await settle(160);
          if (cancelled) return;

          setIsVerifying(true);
          let attempt = await composeAndVerify(shapes, logo);
          if (cancelled || !attempt) return;

          if (!attempt.result.verified) {
            const fixedShapes = repairShapesConfig(design.shapes);
            const fixedLogo = repairLogoConfig(design.logo);
            paint(fixedShapes, fixedLogo);
            await settle(220);
            if (cancelled) return;

            const retry = await composeAndVerify(fixedShapes, fixedLogo);
            if (cancelled) return;

            if (retry?.result.verified) {
              setAutoRepaired(true);
              attempt = {
                composed: retry.composed,
                result: {
                  ...retry.result,
                  warnings: [
                    ...retry.result.warnings,
                    'This styling could not be decoded, so ZOSUF rebuilt the matrix with high-contrast squares. Lower the logo size or raise contrast to keep your original look.',
                  ],
                },
              };
            } else {
              // Neither version decoded: show the original design back and be honest.
              paint(shapes, logo);
              await settle(180);
              if (cancelled) return;
              const restored = await composeAndVerify(shapes, logo);
              if (restored) attempt = restored;
            }
          }

          if (cancelled || !attempt) return;
          setVerification(attempt.result);
          if (onVerificationUpdate) onVerificationUpdate(attempt.result);
          if (onCanvasReady) onCanvasReady(attempt.composed.canvas, rawSvg);

          const svgBlob = await qrCodeInstance.current?.getRawData('svg').catch(() => null);
          if (!cancelled && svgBlob) {
            const svgContent = await (svgBlob as Blob).text();
            setRawSvg(svgContent);
            if (onCanvasReady) onCanvasReady(attempt.composed.canvas, svgContent);
          }
        } catch (err) {
          if (!cancelled) console.warn('Canvas composition / verification warning:', err);
        } finally {
          if (!cancelled) setIsVerifying(false);
        }
      };

      void run();
      return () => {
        cancelled = true;
      };
      // rawSvg is intentionally excluded: it is an output of this effect.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [payload, design, onVerificationUpdate, onCanvasReady]);

    useImperativeHandle(ref, () => ({
      getComposedCanvas: () => composedCanvasRef.current,
      getRawSvgString: () => rawSvg,
      getVerification: () => verification,
    }));

    return (
      <div className="flex flex-col items-center w-full space-y-4">
        {/* Preview Control Toolbar */}
        <div className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Live Stage</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
              512 × 512
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Dark/Light Stage Background Toggle */}
            <button
              type="button"
              onClick={() => setPreviewBgDark(!previewBgDark)}
              className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-400 transition"
              title="Toggle Stage Backdrop"
            >
              {previewBgDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            {/* Zoom Controls */}
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(60, z - 15))}
              className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-400 transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] text-slate-600 w-9 text-center">{zoom}%</span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(140, z + 15))}
              className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-400 transition"
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
              ? 'bg-slate-900 border-slate-800'
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
            <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-600">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-violet-400" />
              <span>Scanning with local computer vision...</span>
            </div>
          ) : verification ? (
            <div
              className={`p-3 rounded-2xl border text-xs leading-relaxed transition ${
                verification.verified
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  {verification.verified ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Optical Readability Verified</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Readability Alert</span>
                    </>
                  )}
                </div>

                <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-white/80 border border-slate-200 text-slate-600">
                  Contrast: {verification.contrastRatio.toFixed(1)}:1
                </span>
              </div>

              {autoRepaired && (
                <div className="mt-1.5 flex items-start gap-1.5 text-[11px] text-violet-700">
                  <Wand2 className="w-3.5 h-3.5 text-violet-600 shrink-0 mt-0.5" />
                  <span>Auto-repaired for scannability. Frames, text layers and colours outside the matrix are untouched.</span>
                </div>
              )}

              {verification.error && (
                <p className="mt-1 text-[11px] text-rose-700">{verification.error}</p>
              )}

              {verification.warnings && verification.warnings.length > 0 && (
                <div className="mt-1 space-y-0.5 text-[10px] text-amber-700">
                  {verification.warnings.map((w, idx) => (
                    <div key={idx} className="flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
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
