import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { OfflineIndicator } from './components/OfflineIndicator';
import { RouteMeta } from './components/RouteMeta';

const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const ImageToQR = lazy(() => import('./features/images/ImageToQR').then(m => ({ default: m.ImageToQR })));
const QRGenerator = lazy(() => import('./features/qr/QRGenerator').then(m => ({ default: m.QRGenerator })));
const QRScanner = lazy(() => import('./features/scanner/QRScanner').then(m => ({ default: m.QRScanner })));
const ImageTools = lazy(() => import('./features/images/ImageTools').then(m => ({ default: m.ImageTools })));
const PrankCreator = lazy(() => import('./features/pranks/PrankCreator').then(m => ({ default: m.PrankCreator })));
const PrankRecipient = lazy(() => import('./features/pranks/PrankRecipient').then(m => ({ default: m.PrankRecipient })));
const PosterMaker = lazy(() => import('./features/poster/PosterMaker').then(m => ({ default: m.PosterMaker })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const FAQPage = lazy(() => import('./pages/FAQPage').then(m => ({ default: m.FAQPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('./pages/TermsPage').then(m => ({ default: m.TermsPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

const LoadingScreen = () => <div className="min-h-[45vh] grid place-items-center"><div className="flex items-center gap-3 text-sm text-violet-300"><span className="w-5 h-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />Loading ZOSUF…</div></div>;

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isRecipientPage = location.pathname === '/p';
  if (isRecipientPage) return <div className="min-h-screen bg-[#070818] text-slate-100"><OfflineIndicator /><main>{children}</main></div>;
  return <div className="min-h-screen bg-[#090a1a] text-slate-100 flex flex-col selection:bg-violet-600 selection:text-white"><OfflineIndicator /><Header /><main className="flex-1 max-w-[1500px] w-full mx-auto px-3 sm:px-5 lg:px-7 py-6">{children}</main><Footer /></div>;
};

export default function App() {
  return <BrowserRouter><ScrollToTop /><RouteMeta /><Layout><Suspense fallback={<LoadingScreen />}><Routes>
    <Route path="/" element={<HomePage />} /><Route path="/image-to-qr" element={<ImageToQR />} /><Route path="/qr-generator" element={<QRGenerator />} /><Route path="/qr-scanner" element={<QRScanner />} /><Route path="/image-tools" element={<ImageTools />} /><Route path="/prank-qr" element={<PrankCreator />} /><Route path="/p" element={<PrankRecipient />} /><Route path="/poster-maker" element={<PosterMaker />} /><Route path="/about" element={<AboutPage />} /><Route path="/faq" element={<FAQPage />} /><Route path="/privacy" element={<PrivacyPage />} /><Route path="/terms" element={<TermsPage />} /><Route path="*" element={<NotFoundPage />} />
  </Routes></Suspense></Layout></BrowserRouter>;
}
