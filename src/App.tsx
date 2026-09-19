import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { OfflineIndicator } from './components/OfflineIndicator';
import { RouteMeta } from './components/RouteMeta';

import { HomePage } from './pages/HomePage';
import { ImageToQR } from './features/images/ImageToQR';
import { QRGenerator } from './features/qr/QRGenerator';
import { QRScanner } from './features/scanner/QRScanner';
import { ImageTools } from './features/images/ImageTools';
import { PrankCreator } from './features/pranks/PrankCreator';
import { PrankRecipient } from './features/pranks/PrankRecipient';
import { PosterMaker } from './features/poster/PosterMaker';

import { AboutPage } from './pages/AboutPage';
import { FAQPage } from './pages/FAQPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Layout wrapper that hides default header/footer on recipient page `/p`
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isRecipientPage = location.pathname === '/p';

  if (isRecipientPage) {
    return (
      <div className="min-h-screen bg-[#070818] text-slate-100 flex flex-col justify-between">
        <OfflineIndicator />
        <main>{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090a1a] text-slate-100 flex flex-col justify-between selection:bg-[#7c3aed] selection:text-white">
      <OfflineIndicator />
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <RouteMeta />
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/image-to-qr" element={<ImageToQR />} />
          <Route path="/qr-generator" element={<QRGenerator />} />
          <Route path="/qr-scanner" element={<QRScanner />} />
          <Route path="/image-tools" element={<ImageTools />} />
          <Route path="/prank-qr" element={<PrankCreator />} />
          <Route path="/p" element={<PrankRecipient />} />
          <Route path="/poster-maker" element={<PosterMaker />} />

          <Route path="/about" element={<AboutPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
