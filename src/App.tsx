/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PageRoute, QRHistoryItem, QRType } from './types';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { QRGenerator } from './components/QRGenerator';
import { QRScanner } from './components/QRScanner';
import { ImageTools } from './components/ImageTools';
import { HomeSections } from './components/HomeSections';
import { AdSlot } from './components/AdSlot';
import { AboutPage } from './pages/AboutPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ToastContainer, ToastMessage } from './components/Toast';

export default function App() {
  const [activePage, setActivePage] = useState<PageRoute>('generator');
  const [activeQRType, setActiveQRType] = useState<QRType>('image');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [qrHistory, setQrHistory] = useState<QRHistoryItem[]>([]);

  // Show toast notification helper
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = String(Date.now() + Math.random());
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync route with URL query param for Cloudflare Pages SPA direct navigation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as PageRoute | null;
    if (tabParam && ['generator', 'scanner', 'image-tools', 'about', 'privacy', 'terms'].includes(tabParam)) {
      setActivePage(tabParam);
    }
  }, []);

  const handlePageChange = (page: PageRoute) => {
    setActivePage(page);
    const url = new URL(window.location.href);
    if (page === 'generator' || page === 'home') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', page);
    }
    window.history.pushState({}, '', url.toString());
  };

  // Load history from localStorage on startup
  useEffect(() => {
    try {
      const saved = localStorage.getItem('zosuf_qr_history');
      if (saved) {
        setQrHistory(JSON.parse(saved));
      }
    } catch (err) {
      console.warn('Could not load localStorage history:', err);
    }
  }, []);

  const saveHistoryItem = (item: QRHistoryItem) => {
    try {
      const updated = [item, ...qrHistory.slice(0, 19)];
      setQrHistory(updated);
      localStorage.setItem('zosuf_qr_history', JSON.stringify(updated));
    } catch (err) {
      console.warn('Could not save to localStorage:', err);
    }
  };

  const handleClearLocalData = () => {
    try {
      localStorage.clear();
      setQrHistory([]);
      showToast('All local history and cached data cleared successfully.', 'success');
    } catch (err) {
      showToast('Error clearing local storage.', 'error');
    }
  };

  const handleSelectImageToQR = () => {
    handlePageChange('generator');
    setActiveQRType('image');
    const target = document.getElementById('qr-type-heading') || document.getElementById('qr-workspace');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19] text-slate-100 selection:bg-purple-500 selection:text-white">
      {/* Sticky Navigation Header */}
      <Navbar
        activePage={activePage}
        setActivePage={handlePageChange}
        activeQRType={activeQRType}
        onSelectQRType={setActiveQRType}
      />

      {/* Main Content View Controller */}
      <main className="flex-1">
        {(activePage === 'home' || activePage === 'generator') && (
          <div>
            {/* Hero Section */}
            <Hero
              setActivePage={handlePageChange}
              onSelectImageToQR={handleSelectImageToQR}
            />

            {/* Ad Slot 1: Below Hero */}
            <AdSlot position="top" />

            {/* Main Generator Workspace */}
            <QRGenerator
              onShowToast={showToast}
              onSaveHistory={saveHistoryItem}
              controlledType={activeQRType}
              onChangeType={setActiveQRType}
            />

            {/* Content Sections: How It Works & Feature Grid */}
            <HomeSections />

            {/* Ad Slot 2: Between Content Sections */}
            <AdSlot position="middle" />
          </div>
        )}

        {activePage === 'scanner' && (
          <QRScanner onShowToast={showToast} />
        )}

        {activePage === 'image-tools' && (
          <ImageTools
            onShowToast={showToast}
            onNavigateToGeneratorWithUrl={(url) => {
              handlePageChange('generator');
              showToast(`Pre-filled image URL: ${url}`, 'success');
            }}
          />
        )}

        {activePage === 'about' && (
          <AboutPage setActivePage={handlePageChange} />
        )}

        {activePage === 'privacy' && (
          <PrivacyPage />
        )}

        {activePage === 'terms' && (
          <TermsPage />
        )}

        {activePage === '404' && (
          <NotFoundPage setActivePage={handlePageChange} />
        )}
      </main>

      {/* Global Footer */}
      <Footer
        setActivePage={handlePageChange}
        onClearLocalData={handleClearLocalData}
      />

      {/* Toast Manager */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
