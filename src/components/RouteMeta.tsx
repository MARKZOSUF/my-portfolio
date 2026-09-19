import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { siteConfig } from '../config/site';

const pages: Record<string, { title: string; description: string }> = {
  '/': { title: 'ZOSUF — Privacy-First QR Studio', description: siteConfig.description },
  '/qr-generator': { title: 'QR Code Generator — ZOSUF', description: 'Create and customize QR codes locally in your browser.' },
  '/image-to-qr': { title: 'Image to QR Generator — ZOSUF', description: 'Create an image QR with a public URL, a tiny direct image, or optional Cloudflare R2.' },
  '/qr-scanner': { title: 'Private QR Scanner — ZOSUF', description: 'Scan QR codes using your camera or an image without uploading camera frames.' },
  '/image-tools': { title: 'Private Image Tools — ZOSUF', description: 'Resize, compress, rotate and convert images locally.' },
  '/prank-qr': { title: 'Safe Prank QR Studio — ZOSUF', description: 'Create harmless surprise QR experiences for friends.' },
  '/p': { title: 'A Safe Surprise — ZOSUF', description: 'Open a harmless surprise created with ZOSUF.' },
  '/poster-maker': { title: 'QR Poster Maker — ZOSUF', description: 'Create high-resolution printable QR posters.' },
  '/about': { title: 'About — ZOSUF', description: 'About ZOSUF and its privacy-first tools.' },
  '/faq': { title: 'FAQ — ZOSUF', description: 'Answers about image QR codes, privacy and scanning.' },
  '/privacy': { title: 'Privacy Policy — ZOSUF', description: 'How ZOSUF processes QR codes and images.' },
  '/terms': { title: 'Terms of Use — ZOSUF', description: 'Terms for using ZOSUF responsibly.' },
};

export function RouteMeta() {
  const { pathname } = useLocation();
  useEffect(() => {
    const page = pages[pathname] ?? { title: 'Page Not Found — ZOSUF', description: siteConfig.description };
    const url = `${siteConfig.productionUrl}${pathname === '/' ? '' : pathname}`;
    document.title = page.title;
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', page.description);
    document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', url);
    document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.setAttribute('content', page.title);
    document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.setAttribute('content', page.description);
    document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.setAttribute('content', url);
  }, [pathname]);
  return null;
}
