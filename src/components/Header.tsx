import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  QrCode,
  Image as ImageIcon,
  ScanLine,
  Wand2,
  Sparkles,
  Printer,
  HelpCircle,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';
import { ZosufLogo, ZosufWordmark } from '../assets/Logos';
import { PWAInstallButton } from './PWAInstallButton';
import { siteConfig } from '../config/site';

export const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { to: '/image-to-qr', label: 'Image to QR', icon: ImageIcon, badge: 'Key' },
    { to: '/qr-generator', label: 'Create QR', icon: QrCode },
    { to: '/qr-scanner', label: 'QR Scanner', icon: ScanLine },
    { to: '/image-tools', label: 'Image Tools', icon: Wand2 },
    { to: '/prank-qr', label: 'Prank QR', icon: Sparkles },
    { to: '/poster-maker', label: 'Poster Maker', icon: Printer },
    { to: '/faq', label: 'FAQ', icon: HelpCircle },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-violet-950/60 bg-[#090a1a]/85 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Brand Logo & Wordmark */}
        <Link to="/" className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-violet-500 rounded-xl p-1">
          <ZosufLogo className="w-9 h-9 transition-transform group-hover:scale-105" />
          <ZosufWordmark showTagline={false} />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="Main Navigation">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-violet-600/20 text-violet-300 border border-violet-500/40 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-violet-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-gradient-to-r from-pink-500 to-violet-500 text-white leading-tight">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Area */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Instagram Link */}
          <a
            href={siteConfig.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-slate-300 hover:text-fuchsia-400 px-2.5 py-1.5 rounded-xl border border-slate-800/80 bg-slate-900/40 transition hover:border-fuchsia-700/50"
            title="Follow Creator @markzosuf on Instagram"
          >
            <span>{siteConfig.creator}</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>

          {/* In-app PWA install */}
          <PWAInstallButton compact />

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/70 focus:outline-none focus:ring-2 focus:ring-violet-500"
            aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-violet-950/80 bg-[#0d0e26]/95 backdrop-blur-2xl px-4 pt-3 pb-6 space-y-1 shadow-2xl animate-in slide-in-from-top duration-200">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
            Studio Tools
          </div>
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-violet-600/30 text-white border border-violet-500/50 font-semibold'
                    : 'text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-violet-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gradient-to-r from-pink-500 to-violet-500 text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between px-3 text-xs">
            <span className="text-slate-400">Created by</span>
            <a
              href={siteConfig.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-fuchsia-400 hover:underline flex items-center gap-1"
            >
              {siteConfig.creator}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
