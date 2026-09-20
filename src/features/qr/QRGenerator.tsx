import React, { useState, useRef, useMemo, useCallback, Suspense, lazy } from 'react';
import {
  Sparkles,
  Layers,
  Palette,
  Image as ImageIcon,
  Type,
  Download,
  Bookmark,
  FileText,
  RotateCcw,
  RotateCw,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { StudioTabId, StudioDesignState, ErrorCorrectionLevel } from '../../types/qrStudio';
import { StudioLivePreview, StudioLivePreviewHandle } from './StudioLivePreview';
import { PREMADE_STUDIO_TEMPLATES } from './data/templatesData';
import { ContentFormData } from './tabs/ContentTab';
import {
  sanitizeWebUrl,
  buildWifiPayload,
  buildVCardPayload,
  buildUpiPayload,
  buildEmailPayload,
  buildPhonePayload,
  buildSmsPayload,
  buildWhatsAppPayload,
  buildTelegramPayload,
  buildInstagramPayload,
  buildYouTubePayload,
  buildLocationPayload,
  buildCalendarPayload,
  buildAppStorePayload,
  buildPlayStorePayload,
  buildMultiLinkPayload,
} from '../../utils/qrPayloads';
import { siteConfig } from '../../config/site';

// Code-split all 8 studio tabs with React.lazy
const ContentTab = lazy(() =>
  import('./tabs/ContentTab').then((m) => ({ default: m.ContentTab }))
);
const TemplatesTab = lazy(() =>
  import('./tabs/TemplatesTab').then((m) => ({ default: m.TemplatesTab }))
);
const FramesTab = lazy(() =>
  import('./tabs/FramesTab').then((m) => ({ default: m.FramesTab }))
);
const ShapesTab = lazy(() =>
  import('./tabs/ShapesTab').then((m) => ({ default: m.ShapesTab }))
);
const LogoTab = lazy(() =>
  import('./tabs/LogoTab').then((m) => ({ default: m.LogoTab }))
);
const TextLayersTab = lazy(() =>
  import('./tabs/TextLayersTab').then((m) => ({ default: m.TextLayersTab }))
);
const ExportTab = lazy(() =>
  import('./tabs/ExportTab').then((m) => ({ default: m.ExportTab }))
);
const MyTemplatesTab = lazy(() =>
  import('./tabs/MyTemplatesTab').then((m) => ({ default: m.MyTemplatesTab }))
);

const INITIAL_DESIGN_STATE: StudioDesignState = JSON.parse(
  JSON.stringify(PREMADE_STUDIO_TEMPLATES[0].design)
);

export const QRGenerator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<StudioTabId>('content');
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  // Studio Design State with Undo / Redo History Stack
  const [designState, setDesignState] = useState<StudioDesignState>(INITIAL_DESIGN_STATE);
  const [history, setHistory] = useState<StudioDesignState[]>([INITIAL_DESIGN_STATE]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Form State for Content Tab
  const [contentForm, setContentForm] = useState<ContentFormData>({
    selectedType: 'url',
    urlInput: siteConfig.productionUrl,
    textInput: 'Secure, privacy-first QR generated with ZOSUF Studio.',
    wifiData: {
      ssid: 'ZOSUF_WiFi',
      password: '',
      encryption: 'WPA',
      hidden: false,
    },
    vcardData: {
      firstName: 'Mark',
      lastName: 'Zosuf',
      organization: 'ZOSUF Studio',
      title: 'Lead Architect',
      phone: '+1 555 0199',
      email: 'hello@markzosuf.pages.dev',
      website: siteConfig.productionUrl,
      address: 'San Francisco, CA',
    },
    upiData: {
      vpa: 'markzosuf@okhdfcbank',
      payeeName: 'Mark Zosuf',
      amount: '',
      transactionNote: 'Support ZOSUF',
    },
    emailData: {
      email: 'hello@markzosuf.pages.dev',
      subject: 'Inquiry from ZOSUF Studio',
      body: 'Hello! I scanned your ZOSUF QR code.',
    },
    phoneInput: '+15551234567',
    smsData: {
      phone: '+15551234567',
      message: 'Hello from ZOSUF QR!',
    },
    whatsappData: {
      phone: '15551234567',
      text: 'Hey! I scanned your ZOSUF QR code.',
    },
    telegramUsername: 'markzosuf',
    instagramHandle: 'markzosuf',
    youtubeInput: 'https://www.youtube.com/@markzosuf',
    facebookUrl: 'https://facebook.com/zosuf',
    linkedinUrl: 'https://linkedin.com/in/zosuf',
    tiktokHandle: 'markzosuf',
    twitterHandle: 'markzosuf',
    paypalData: { username: 'markzosuf', amount: '' },
    cryptoData: { coin: 'bitcoin', address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', amount: '' },
    locationData: { lat: 37.7749, lng: -122.4194, label: 'San Francisco, CA' },
    calendarData: {
      title: 'ZOSUF Studio Launch',
      location: 'Online',
      startDateTime: '2026-10-15T18:00',
      endDateTime: '2026-10-15T20:00',
    },
    appStoreId: '1234567890',
    playStorePackage: 'com.zosuf.app',
    multiLinks: [
      { label: 'Website', url: siteConfig.productionUrl },
      { label: 'Instagram', url: 'https://instagram.com/markzosuf' },
    ],
    productData: { name: 'ZOSUF Master Tool', sku: 'ZOSUF-001', price: '0.00', url: siteConfig.productionUrl },
    eventData: { name: 'VIP Gala Night', venue: 'Online', date: '2026-12-31', url: siteConfig.productionUrl },
    ticketData: { code: 'TK-98214', holder: 'Guest', event: 'ZOSUF Tour', url: siteConfig.productionUrl },
    menuUrl: siteConfig.productionUrl,
    bookingUrl: siteConfig.productionUrl,
    reviewUrl: siteConfig.productionUrl,
    pdfUrl: siteConfig.productionUrl,
    audioUrl: siteConfig.productionUrl,
    videoUrl: siteConfig.productionUrl,
    fileUrl: siteConfig.productionUrl,
    customUri: 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M',
  });

  const previewRef = useRef<StudioLivePreviewHandle>(null);
  const [renderedCanvas, setRenderedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [rawSvgCode, setRawSvgCode] = useState<string>('');
  const [isVerified, setIsVerified] = useState(false);
  const [verificationReport, setVerificationReport] = useState<any>(null);

  // History tracking updates
  const pushState = (nextState: StudioDesignState) => {
    setDesignState(nextState);
    const newHistory = history.slice(0, historyIndex + 1);
    if (newHistory.length >= 30) newHistory.shift();
    newHistory.push(JSON.parse(JSON.stringify(nextState)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setDesignState(JSON.parse(JSON.stringify(prev)));
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nxt = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setDesignState(JSON.parse(JSON.stringify(nxt)));
    }
  };

  // Compute active QR payload based on selected type
  const payload = useMemo(() => {
    const { selectedType } = contentForm;
    switch (selectedType) {
      case 'url':
        return sanitizeWebUrl(contentForm.urlInput).sanitized || contentForm.urlInput;
      case 'text':
        return contentForm.textInput;
      case 'wifi':
        return buildWifiPayload(contentForm.wifiData);
      case 'vcard':
        return buildVCardPayload(contentForm.vcardData);
      case 'upi':
        return buildUpiPayload(contentForm.upiData);
      case 'email':
        return buildEmailPayload(
          contentForm.emailData.email,
          contentForm.emailData.subject,
          contentForm.emailData.body
        );
      case 'phone':
        return buildPhonePayload(contentForm.phoneInput);
      case 'sms':
        return buildSmsPayload(contentForm.smsData.phone, contentForm.smsData.message);
      case 'whatsapp':
        return buildWhatsAppPayload(contentForm.whatsappData.phone, contentForm.whatsappData.text);
      case 'telegram':
        return buildTelegramPayload(contentForm.telegramUsername);
      case 'instagram':
        return buildInstagramPayload(contentForm.instagramHandle);
      case 'youtube':
        return buildYouTubePayload(contentForm.youtubeInput);
      case 'facebook':
        return sanitizeWebUrl(contentForm.facebookUrl).sanitized;
      case 'linkedin':
        return sanitizeWebUrl(contentForm.linkedinUrl).sanitized;
      case 'tiktok':
        return `https://tiktok.com/@${contentForm.tiktokHandle.replace(/^@/, '')}`;
      case 'twitter':
        return `https://x.com/${contentForm.twitterHandle.replace(/^@/, '')}`;
      case 'paypal':
        return `https://paypal.me/${contentForm.paypalData.username}`;
      case 'crypto':
        return `${contentForm.cryptoData.coin}:${contentForm.cryptoData.address}${
          contentForm.cryptoData.amount ? `?amount=${contentForm.cryptoData.amount}` : ''
        }`;
      case 'location':
        return buildLocationPayload(
          contentForm.locationData.lat,
          contentForm.locationData.lng,
          contentForm.locationData.label
        );
      case 'calendar':
        return buildCalendarPayload(contentForm.calendarData);
      case 'appstore':
        return buildAppStorePayload(contentForm.appStoreId);
      case 'playstore':
        return buildPlayStorePayload(contentForm.playStorePackage);
      case 'multi-link':
        return buildMultiLinkPayload('Links Hub', contentForm.multiLinks);
      case 'product':
        return contentForm.productData.url || `${siteConfig.productionUrl}/p/${contentForm.productData.sku}`;
      case 'event':
        return contentForm.eventData.url || `${siteConfig.productionUrl}/e/${encodeURIComponent(contentForm.eventData.name)}`;
      case 'ticket':
        return contentForm.ticketData.url || `${siteConfig.productionUrl}/t/${contentForm.ticketData.code}`;
      case 'menu':
        return sanitizeWebUrl(contentForm.menuUrl).sanitized;
      case 'booking':
        return sanitizeWebUrl(contentForm.bookingUrl).sanitized;
      case 'review':
        return sanitizeWebUrl(contentForm.reviewUrl).sanitized;
      case 'pdf':
        return sanitizeWebUrl(contentForm.pdfUrl).sanitized;
      case 'audio':
        return sanitizeWebUrl(contentForm.audioUrl).sanitized;
      case 'video':
        return sanitizeWebUrl(contentForm.videoUrl).sanitized;
      case 'file':
        return sanitizeWebUrl(contentForm.fileUrl).sanitized;
      case 'custom-url': {
        const custom = contentForm.customUri.trim();
        // App-scheme URIs (spotify:, upi:, geo:…) are fine; executable and
        // inline-data schemes are not, and no camera would open them anyway.
        return /^(data|javascript|vbscript|file):/i.test(custom) ? '' : custom;
      }
      default:
        return contentForm.urlInput;
    }
  }, [contentForm]);

  const handleVerificationUpdate = useCallback((result: any) => {
    setIsVerified(Boolean(result.verified));
    setVerificationReport(result);
  }, []);

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement | null, rawSvg?: string) => {
    setRenderedCanvas(canvas);
    if (rawSvg) setRawSvgCode(rawSvg);
  }, []);

  React.useEffect(() => {
    setIsVerified(false);
    setVerificationReport(null);
  }, [payload, designState]);

  const studioTabs: Array<{ id: StudioTabId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'content', label: 'Content', icon: FileText },
    { id: 'templates', label: 'Pre-made', icon: Sparkles },
    { id: 'frames', label: 'Frames', icon: Layers },
    { id: 'shapes', label: 'Shapes', icon: Palette },
    { id: 'logo', label: 'Logo', icon: ImageIcon },
    { id: 'text-layers', label: 'Text', icon: Type },
    { id: 'export', label: 'Export', icon: Download },
    { id: 'my-templates', label: 'My Templates', icon: Bookmark },
  ];

  return (
    <div className="qr-studio-light -mx-3 sm:-mx-5 lg:-mx-7 -my-6 min-h-screen bg-[#f4f5f7] text-slate-800 animate-in fade-in duration-300">
      <div className="px-3 sm:px-6 lg:px-8 py-5 space-y-5">
      {/* Studio Banner */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-50 text-violet-700 border border-violet-200">
              Pro Studio v2.0
            </span>
            <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" /> 100% Client-Side Privacy
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            ZOSUF Advanced QR Template Studio
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm">
            Professional multi-layer QR architecture with 65+ curated design templates, 40+ frames, vector typography, and honest scannability verification.
          </p>
        </div>

        {/* Global Undo / Redo in Header */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={undo}
            disabled={historyIndex <= 0}
            className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-white disabled:opacity-40 disabled:pointer-events-none text-xs font-semibold transition"
            title="Undo Design Change"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Undo</span>
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-white disabled:opacity-40 disabled:pointer-events-none text-xs font-semibold transition"
            title="Redo Design Change"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Redo</span>
          </button>
        </div>
      </div>

      {/* 8 Studio Navigation Tabs */}
      <div className="qr-studio-tabs grid grid-flow-col auto-cols-[132px] sm:auto-cols-[148px] gap-2 overflow-x-auto p-2 rounded-2xl bg-white border border-slate-200 shadow-sm">
        {studioTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-2 min-h-[78px] px-3 py-3 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                isActive
                  ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-200'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-violet-300 hover:bg-violet-50'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-violet-600'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Workspace Grid: Left Column Controls (Tabs) & Right Column Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Active Studio Tab */}
        <div className="lg:col-span-8 min-w-0 p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
          <Suspense
            fallback={
              <div className="p-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 text-xs font-medium">
                Loading Studio Tab...
              </div>
            }
          >
            {activeTab === 'content' && (
              <ContentTab data={contentForm} onChange={setContentForm} />
            )}

            {activeTab === 'templates' && (
              <TemplatesTab
                currentDesign={designState}
                onApplyTemplate={(tpl) => pushState(tpl.design)}
                onSaveCurrentAsTemplate={(name, category) => {
                  try {
                    const saved = localStorage.getItem('zosuf_my_custom_templates');
                    const arr = saved ? JSON.parse(saved) : [];
                    arr.unshift({
                      id: `custom-${Date.now()}`,
                      name,
                      category,
                      description: 'Saved custom template from studio',
                      design: designState,
                    });
                    localStorage.setItem('zosuf_my_custom_templates', JSON.stringify(arr));
                  } catch {}
                }}
                onResetDesign={() => pushState(INITIAL_DESIGN_STATE)}
              />
            )}

            {activeTab === 'frames' && (
              <FramesTab
                config={designState.frame}
                onChange={(frame) => pushState({ ...designState, frame })}
              />
            )}

            {activeTab === 'shapes' && (
              <ShapesTab
                config={designState.shapes}
                onChange={(shapes) => pushState({ ...designState, shapes })}
              />
            )}

            {activeTab === 'logo' && (
              <LogoTab
                config={designState.logo}
                errorCorrection={designState.shapes.errorCorrection}
                onChange={(logo) => pushState({ ...designState, logo })}
                onSetErrorCorrection={(ecc: ErrorCorrectionLevel) =>
                  pushState({
                    ...designState,
                    shapes: { ...designState.shapes, errorCorrection: ecc },
                  })
                }
              />
            )}

            {activeTab === 'text-layers' && (
              <TextLayersTab
                textLayers={designState.textLayers}
                layers={designState.layers}
                onTextLayersChange={(textLayers) => pushState({ ...designState, textLayers })}
                onLayersChange={(layers) => pushState({ ...designState, layers })}
                canUndo={historyIndex > 0}
                canRedo={historyIndex < history.length - 1}
                onUndo={undo}
                onRedo={redo}
              />
            )}

            {activeTab === 'export' && (
              <ExportTab
                currentDesign={designState}
                qrSourceCanvas={renderedCanvas}
                rawSvgString={rawSvgCode}
                isVerified={isVerified}
                verificationReport={verificationReport}
              />
            )}

            {activeTab === 'my-templates' && (
              <MyTemplatesTab
                currentDesign={designState}
                onApplyTemplate={(tpl) => pushState(tpl.design)}
              />
            )}
          </Suspense>
        </div>

        {/* Right Column: Sticky Live Preview on Desktop / Accordion on Mobile */}
        <div className="lg:col-span-4 lg:sticky lg:top-20 space-y-4">
          {/* Mobile Collapsible Header */}
          <div className="lg:hidden flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-bold text-slate-900">Live Artwork Preview</span>
            </div>
            <button
              type="button"
              onClick={() => setMobilePreviewOpen(!mobilePreviewOpen)}
              className="p-1 text-slate-400 hover:text-white"
            >
              {mobilePreviewOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>

          <div
            className={`p-5 rounded-2xl bg-white border border-slate-200 shadow-lg flex flex-col items-center transition-all ${
              mobilePreviewOpen ? 'block' : 'hidden lg:block'
            }`}
          >
            <div className="w-full flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Live Vector Stage
                </h3>
                <p className="text-[11px] text-slate-500">
                  Instant visual feedback • ZXing optical validation
                </p>
              </div>

              <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                100% Private
              </span>
            </div>

            {/* Stage Component */}
            <StudioLivePreview
              ref={previewRef}
              payload={payload}
              design={designState}
              onVerificationUpdate={handleVerificationUpdate}
              onCanvasReady={handleCanvasReady}
            />

            {/* Quick Action to Export Tab */}
            <div className="w-full mt-5 pt-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">Ready to publish?</span>
              <button
                type="button"
                onClick={() => setActiveTab('export')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-950/40 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Go to Export Studio →</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
