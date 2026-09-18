import React, { useState } from 'react';
import { PageRoute, QRType } from '../types';
import {
  QrCode,
  Scan,
  Image as ImageIcon,
  Info,
  Instagram,
  Menu,
  X,
  Sparkles
} from 'lucide-react';

interface NavbarProps {
  activePage: PageRoute;
  setActivePage: (page: PageRoute) => void;
  activeQRType?: QRType;
  onSelectQRType?: (type: QRType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePage,
  setActivePage,
  activeQRType = 'image',
  onSelectQRType
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (page: PageRoute) => {
    setActivePage(page);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImageToQRClick = () => {
    setActivePage('generator');
    if (onSelectQRType) {
      onSelectQRType('image');
    }
    setMobileMenuOpen(false);
    const target = document.getElementById('qr-type-heading') || document.getElementById('qr-workspace');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0b0f19]/85 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div
          id="nav-brand-logo"
          onClick={() => handleNavClick('generator')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-fuchsia-600 to-cyan-500 p-0.5 shadow-lg shadow-purple-900/30 group-hover:scale-105 transition-transform duration-200">
            <div className="w-full h-full bg-[#0f172a] rounded-[10px] flex items-center justify-center">
              <QrCode className="w-5 h-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-extrabold text-xl tracking-tight text-white">
                ZOSUF
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Image & QR Studio
            </p>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 border border-slate-800 rounded-full p-1.5">
          {/* Prominent Image to QR Item */}
          <button
            id="nav-link-image-to-qr"
            onClick={handleImageToQRClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              (activePage === 'generator' || activePage === 'home') && activeQRType === 'image'
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-900/30 ring-1 ring-white/20'
                : 'text-purple-300 hover:text-white hover:bg-purple-950/40'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-purple-400" />
            <span>Image to QR</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-200 uppercase tracking-wider font-bold">
              HOT
            </span>
          </button>

          <button
            id="nav-link-generator"
            onClick={() => handleNavClick('generator')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              (activePage === 'generator' || activePage === 'home') && activeQRType !== 'image'
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-900/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>All QR Types</span>
          </button>

          <button
            id="nav-link-scanner"
            onClick={() => handleNavClick('scanner')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activePage === 'scanner'
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-900/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Scan className="w-4 h-4" />
            <span>QR Scanner</span>
          </button>

          <button
            id="nav-link-image-tools"
            onClick={() => handleNavClick('image-tools')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activePage === 'image-tools'
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-900/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Image Studio</span>
          </button>

          <button
            id="nav-link-about"
            onClick={() => handleNavClick('about')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activePage === 'about'
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-900/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>About</span>
          </button>
        </nav>

        {/* Right Actions: Instagram */}
        <div className="hidden sm:flex items-center gap-3">
          <a
            id="nav-instagram-link"
            href="https://instagram.com/markzosuf"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram creator @markzosuf"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 text-xs font-medium transition-all hover:scale-105"
          >
            <Instagram className="w-3.5 h-3.5 text-pink-400" />
            <span>@markzosuf</span>
          </a>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 md:hidden">
          <a
            href="https://instagram.com/markzosuf"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-pink-500/10 text-pink-300 border border-pink-500/30"
            aria-label="Instagram @markzosuf"
          >
            <Instagram className="w-4 h-4" />
          </a>
          <button
            id="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2.5 rounded-lg bg-slate-800 text-slate-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0f172a] border-b border-slate-800 px-4 pt-3 pb-5 space-y-2">
          {/* Prominent Image to QR in mobile */}
          <button
            onClick={handleImageToQRClick}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left text-sm font-semibold transition-colors ${
              (activePage === 'generator' || activePage === 'home') && activeQRType === 'image'
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white'
                : 'bg-purple-950/30 border border-purple-800/40 text-purple-200 hover:bg-purple-900/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <ImageIcon className="w-5 h-5 text-purple-400" />
              <span>Image to QR</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/30 text-purple-200 uppercase font-bold">
              FEATURED
            </span>
          </button>

          <button
            onClick={() => handleNavClick('generator')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium transition-colors ${
              (activePage === 'generator' || activePage === 'home') && activeQRType !== 'image'
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <QrCode className="w-5 h-5" />
            <span>All QR Types</span>
          </button>

          <button
            onClick={() => handleNavClick('scanner')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium transition-colors ${
              activePage === 'scanner'
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Scan className="w-5 h-5" />
            <span>QR Scanner</span>
          </button>

          <button
            onClick={() => handleNavClick('image-tools')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium transition-colors ${
              activePage === 'image-tools'
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <ImageIcon className="w-5 h-5" />
            <span>Image Studio</span>
          </button>

          <button
            onClick={() => handleNavClick('about')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium transition-colors ${
              activePage === 'about'
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Info className="w-5 h-5" />
            <span>About</span>
          </button>

          <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
            <a
              href="https://instagram.com/markzosuf"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-pink-500/10 border border-pink-500/30 text-pink-300 text-sm font-medium"
            >
              <div className="flex items-center gap-2">
                <Instagram className="w-4 h-4 text-pink-400" />
                <span>Follow Creator</span>
              </div>
              <span className="font-mono text-xs">@markzosuf</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
