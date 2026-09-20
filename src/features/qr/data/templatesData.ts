import { StudioTemplate, TemplateCategory, LayerItemState, TextLayersConfig, ShapesConfig, FrameConfig, LogoConfig } from '../../../types/qrStudio';

const DEFAULT_LAYERS: LayerItemState[] = [
  { id: 'frame', name: 'Frame & Border', visible: true },
  { id: 'decorations', name: 'Corner Ornaments', visible: true },
  { id: 'heading', name: 'Heading Text', visible: false },
  { id: 'subtitle', name: 'Subtitle Text', visible: false },
  { id: 'qr', name: 'QR Matrix Dots', visible: true },
  { id: 'logo', name: 'Center Logo', visible: true },
  { id: 'cta', name: 'CTA Badge / Bar', visible: true },
  { id: 'footer', name: 'Footer Text', visible: false },
];

const DEFAULT_TEXT_LAYERS: TextLayersConfig = {
  heading: {
    enabled: false,
    text: 'Scan To Connect',
    font: 'Plus Jakarta Sans',
    size: 20,
    weight: '700',
    color: '#0f172a',
    align: 'center',
    letterSpacing: 0,
    lineHeight: 1.2,
    uppercase: false,
    shadow: false,
    backgroundPill: false,
    pillColor: '#f1f5f9',
    position: 'top',
  },
  subtitle: {
    enabled: false,
    text: 'Point your camera at this code',
    font: 'Space Grotesk',
    size: 13,
    weight: '400',
    color: '#64748b',
    align: 'center',
    letterSpacing: 0,
    lineHeight: 1.4,
    uppercase: false,
    shadow: false,
    backgroundPill: false,
    pillColor: '#f8fafc',
    position: 'top',
  },
  cta: {
    enabled: true,
    text: 'SCAN ME',
    font: 'Plus Jakarta Sans',
    size: 15,
    weight: '700',
    color: '#ffffff',
    align: 'center',
    letterSpacing: 1.5,
    lineHeight: 1,
    uppercase: true,
    shadow: false,
    backgroundPill: true,
    pillColor: '#7c3aed',
    position: 'bottom',
  },
  footer: {
    enabled: false,
    text: 'Powered by ZOSUF Privacy Studio',
    font: 'Space Grotesk',
    size: 11,
    weight: '400',
    color: '#94a3b8',
    align: 'center',
    letterSpacing: 0.5,
    lineHeight: 1.2,
    uppercase: false,
    shadow: false,
    backgroundPill: false,
    pillColor: '#f1f5f9',
    position: 'bottom',
  },
};

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  'Minimal',
  'Professional',
  'Business',
  'Social',
  'Restaurant',
  'Wi-Fi',
  'Payment',
  'Shopping',
  'Product',
  'Events',
  'Birthday',
  'Wedding',
  'Valentine',
  'Halloween',
  'Christmas',
  'New Year',
  'Festival',
  'Technology',
  'Gaming',
  'Music',
  'Nature',
  'Luxury',
  'Neon',
];

interface TemplateDef {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  shapes: Partial<ShapesConfig>;
  frame: Partial<FrameConfig>;
  logo?: Partial<LogoConfig>;
  headingText?: string;
  ctaText?: string;
}

const TEMPLATE_DEFS: TemplateDef[] = [
  // 1. Minimal (3)
  {
    id: 'min-clean-slate',
    name: 'Clean Slate Mono',
    category: 'Minimal',
    description: 'Crisp black and white high-contrast architecture with micro-rounded dots.',
    shapes: { fgColor: '#090a0f', bgColor: '#ffffff', dotType: 'rounded', cornerSquareType: 'extra-rounded', cornerDotType: 'dot' },
    frame: { style: 'minimal-caption', primaryColor: '#090a0f', ctaText: 'scan with phone', placement: 'bottom' },
  },
  {
    id: 'min-nordic-gray',
    name: 'Nordic Slate',
    category: 'Minimal',
    description: 'Subtle cool charcoal tones with refined double line frame.',
    shapes: { fgColor: '#1e293b', bgColor: '#f8fafc', dotType: 'square', cornerSquareType: 'square', cornerDotType: 'square' },
    frame: { style: 'double-border', primaryColor: '#475569', ctaText: 'DISCOVER', placement: 'bottom' },
  },
  {
    id: 'min-paper-ink',
    name: 'Architectural Line',
    category: 'Minimal',
    description: 'Ultra-clean frameless layout with classy corner dots for architectural branding.',
    shapes: { fgColor: '#0f172a', bgColor: '#ffffff', dotType: 'classy', cornerSquareType: 'rounded', cornerDotType: 'rounded' },
    frame: { style: 'none', ctaText: '' },
  },

  // 2. Professional (3)
  {
    id: 'prof-corporate-navy',
    name: 'Executive Navy',
    category: 'Professional',
    description: 'Deep royal navy blue with sharp corporate aesthetics and top header.',
    shapes: { fgColor: '#1e3a8a', bgColor: '#ffffff', dotType: 'rounded', cornerSquareType: 'rounded', cornerDotType: 'dot' },
    frame: { style: 'tech-badge', primaryColor: '#1e3a8a', ctaText: 'OFFICIAL DOCUMENT', placement: 'top' },
  },
  {
    id: 'prof-consulting-charcoal',
    name: 'Advisory Firm',
    category: 'Professional',
    description: 'Balanced slate gray with a subtle linear gradient and professional scan badge.',
    shapes: { fgColor: '#0f172a', bgColor: '#ffffff', gradientType: 'linear', gradientColor2: '#334155', gradientRotation: 45, dotType: 'classy-rounded' },
    frame: { style: 'scan-me', primaryColor: '#0f172a', ctaText: 'VIEW DOSSIER' },
  },
  {
    id: 'prof-trust-badge',
    name: 'Verified Enterprise',
    category: 'Professional',
    description: 'Deep cobalt blue with verified shield styling for compliance and legal teams.',
    shapes: { fgColor: '#1d4ed8', bgColor: '#ffffff', dotType: 'rounded', cornerSquareType: 'extra-rounded' },
    frame: { style: 'shield', primaryColor: '#1d4ed8', ctaText: 'VERIFIED CREDENTIAL' },
  },

  // 3. Business (3)
  {
    id: 'biz-lead-capture',
    name: 'Sales Lead Engine',
    category: 'Business',
    description: 'High-contrast vibrant violet designed for trade booths and business cards.',
    shapes: { fgColor: '#5b21b6', bgColor: '#ffffff', gradientType: 'linear', gradientColor2: '#7c3aed', gradientRotation: 90, dotType: 'rounded' },
    frame: { style: 'scan-me', primaryColor: '#7c3aed', ctaText: 'BOOK CONSULTATION' },
  },
  {
    id: 'biz-modern-card',
    name: 'Modern vCard Pro',
    category: 'Business',
    description: 'Tailored for smart networking cards with quick tap and contact save.',
    shapes: { fgColor: '#0284c7', bgColor: '#ffffff', dotType: 'classy-rounded', cornerSquareType: 'rounded' },
    frame: { style: 'minimal-pill', primaryColor: '#0284c7', ctaText: 'SAVE CONTACT' },
  },
  {
    id: 'biz-agency-gold',
    name: 'Agency Gold Seal',
    category: 'Business',
    description: 'Warm gold and dark basalt for creative agencies and pitch decks.',
    shapes: { fgColor: '#b45309', bgColor: '#fffbeb', dotType: 'rounded', cornerSquareColor: '#92400e' },
    frame: { style: 'elegant-ribbon', primaryColor: '#d97706', ctaText: 'CASE STUDIES' },
  },

  // 4. Social (3)
  {
    id: 'soc-instagram-sunset',
    name: 'Instagram Sunset',
    category: 'Social',
    description: 'Warm magenta to orange gradient with trendy social follower framing.',
    shapes: { fgColor: '#be185d', bgColor: '#ffffff', gradientType: 'linear', gradientColor2: '#ea580c', gradientRotation: 45, dotType: 'rounded' },
    frame: { style: 'social-profile', primaryColor: '#db2777', ctaText: 'FOLLOW ON INSTA' },
  },
  {
    id: 'soc-youtube-creator',
    name: 'YouTube Streamer',
    category: 'Social',
    description: 'Bright red branding with rounded dots, built for channel subscriptions.',
    shapes: { fgColor: '#dc2626', bgColor: '#ffffff', dotType: 'extra-rounded', cornerSquareColor: '#991b1b' },
    frame: { style: 'scan-me', primaryColor: '#dc2626', ctaText: 'SUBSCRIBE NOW' },
  },
  {
    id: 'soc-telegram-connect',
    name: 'Telegram Channel',
    category: 'Social',
    description: 'Vivid cyan-blue with speech bubble framing for community channels.',
    shapes: { fgColor: '#0284c7', bgColor: '#f0f9ff', dotType: 'dots', cornerSquareType: 'extra-rounded' },
    frame: { style: 'speech-bubble', primaryColor: '#0284c7', ctaText: 'JOIN COMMUNITY' },
  },

  // 5. Restaurant (3)
  {
    id: 'rest-bistro-amber',
    name: 'Artisan Bistro',
    category: 'Restaurant',
    description: 'Warm terracotta and cream background with table menu badge.',
    shapes: { fgColor: '#78350f', bgColor: '#fffbeb', dotType: 'classy', cornerSquareColor: '#92400e' },
    frame: { style: 'view-menu', primaryColor: '#d97706', ctaText: 'VIEW DIGITAL MENU' },
  },
  {
    id: 'rest-cafe-roastery',
    name: 'Specialty Roastery',
    category: 'Restaurant',
    description: 'Rich coffee brown with café cup sleeve badge.',
    shapes: { fgColor: '#451a03', bgColor: '#fef3c7', dotType: 'rounded', cornerSquareType: 'rounded' },
    frame: { style: 'coffee-cup', primaryColor: '#78350f', ctaText: 'TAP TO ORDER' },
  },
  {
    id: 'rest-table-tent',
    name: 'Contactless Table Tent',
    category: 'Restaurant',
    description: 'Designed for high-contrast restaurant table stands and quick ordering.',
    shapes: { fgColor: '#0f172a', bgColor: '#ffffff', dotType: 'square' },
    frame: { style: 'restaurant-card', primaryColor: '#b45309', ctaText: 'TABLE 14 • PAY & ORDER' },
  },

  // 6. Wi-Fi (3)
  {
    id: 'wifi-guest-sky',
    name: 'Guest Lounge Wi-Fi',
    category: 'Wi-Fi',
    description: 'Vibrant sky blue with top bar and clear Wi-Fi join instruction.',
    shapes: { fgColor: '#0284c7', bgColor: '#f0f9ff', dotType: 'rounded', cornerSquareType: 'rounded' },
    frame: { style: 'join-wifi', primaryColor: '#0284c7', ctaText: 'CONNECT TO WI-FI' },
  },
  {
    id: 'wifi-cafe-spot',
    name: 'Coffee Shop Hotspot',
    category: 'Wi-Fi',
    description: 'Warm amber tones with card framing for café customer tables.',
    shapes: { fgColor: '#b45309', bgColor: '#ffffff', dotType: 'classy-rounded' },
    frame: { style: 'wifi-card', primaryColor: '#d97706', ctaText: 'COMPLIMENTARY WI-FI' },
  },
  {
    id: 'wifi-hotel-suite',
    name: 'Boutique Hotel Wi-Fi',
    category: 'Wi-Fi',
    description: 'Refined deep navy and gold accents for hospitality suites.',
    shapes: { fgColor: '#1e293b', bgColor: '#f8fafc', dotType: 'square', cornerSquareColor: '#0f172a' },
    frame: { style: 'scan-me', primaryColor: '#334155', ctaText: 'GUEST NETWORK ACCESS' },
  },

  // 7. Payment (3)
  {
    id: 'pay-emerald-checkout',
    name: 'Emerald Checkout',
    category: 'Payment',
    description: 'Trustworthy emerald green with secure payment badge.',
    shapes: { fgColor: '#047857', bgColor: '#f0fdf4', dotType: 'rounded', cornerSquareColor: '#065f46' },
    frame: { style: 'pay-now', primaryColor: '#059669', ctaText: 'SCAN & PAY INSTANTLY' },
  },
  {
    id: 'pay-secure-shield',
    name: 'FinTech Secure Badge',
    category: 'Payment',
    description: 'Deep cobalt blue with security shield icon and zero-friction scan.',
    shapes: { fgColor: '#1d4ed8', bgColor: '#ffffff', dotType: 'extra-rounded', cornerSquareType: 'extra-rounded' },
    frame: { style: 'payment-badge', primaryColor: '#16a34a', ctaText: '100% SECURE CHECKOUT' },
  },
  {
    id: 'pay-pos-merchant',
    name: 'Countertop Merchant',
    category: 'Payment',
    description: 'Bold black and green designed for physical store billing counters.',
    shapes: { fgColor: '#090a0f', bgColor: '#ffffff', dotType: 'square' },
    frame: { style: 'pay-now', primaryColor: '#047857', ctaText: 'UPI / CARD PAYMENT' },
  },

  // 8. Shopping (3)
  {
    id: 'shop-flash-sale',
    name: 'Flash Sale Red',
    category: 'Shopping',
    description: 'Vivid red voucher style that drives promotional discounts.',
    shapes: { fgColor: '#dc2626', bgColor: '#fef2f2', dotType: 'rounded' },
    frame: { style: 'coupon-voucher', primaryColor: '#dc2626', ctaText: 'REDEEM 25% DISCOUNT' },
  },
  {
    id: 'shop-boutique-rose',
    name: 'Boutique Apparel',
    category: 'Shopping',
    description: 'Soft pastel rose and violet gradient for fashion tags.',
    shapes: { fgColor: '#be185d', bgColor: '#fdf2f8', gradientType: 'linear', gradientColor2: '#a855f7', gradientRotation: 45, dotType: 'rounded' },
    frame: { style: 'scan-me', primaryColor: '#db2777', ctaText: 'SHOP THE COLLECTION' },
  },
  {
    id: 'shop-loyalty-club',
    name: 'VIP Loyalty Perks',
    category: 'Shopping',
    description: 'Deep violet with gold touch for store loyalty program scans.',
    shapes: { fgColor: '#4c1d95', bgColor: '#faf5ff', dotType: 'classy-rounded' },
    frame: { style: 'minimal-pill', primaryColor: '#6d28d9', ctaText: 'COLLECT REWARD POINTS' },
  },

  // 9. Product (3)
  {
    id: 'prod-spec-sheet',
    name: 'Industrial Spec Label',
    category: 'Product',
    description: 'Engineered for technical machinery, hardware, and packaging labels.',
    shapes: { fgColor: '#0f172a', bgColor: '#ffffff', dotType: 'square', cornerSquareType: 'square' },
    frame: { style: 'product-label', primaryColor: '#0f172a', ctaText: 'USER MANUAL & SPECS' },
  },
  {
    id: 'prod-auth-seal',
    name: 'Authenticity Guarantee',
    category: 'Product',
    description: 'Security hologram vibe with cyan and deep navy contrast.',
    shapes: { fgColor: '#0369a1', bgColor: '#f0f9ff', dotType: 'classy' },
    frame: { style: 'shield', primaryColor: '#0284c7', ctaText: 'VERIFY GENUINE ITEM' },
  },
  {
    id: 'prod-cosmetics-luxe',
    name: 'Skincare Ingredient Scan',
    category: 'Product',
    description: 'Soft sage green with rounded dots for clean beauty packaging.',
    shapes: { fgColor: '#065f46', bgColor: '#fcfdfa', dotType: 'dots', cornerSquareType: 'rounded' },
    frame: { style: 'minimal-caption', primaryColor: '#047857', ctaText: 'learn about formula' },
  },

  // 10. Events (3)
  {
    id: 'evt-vip-pass',
    name: 'VIP Conference Pass',
    category: 'Events',
    description: 'Dark luxury lanyard design with gold typography for summits.',
    shapes: { fgColor: '#fbbf24', bgColor: '#18181b', dotType: 'rounded', cornerSquareColor: '#f59e0b' },
    frame: { style: 'vip-pass', primaryColor: '#78350f', ctaText: 'ALL-ACCESS SUMMIT PASS' },
  },
  {
    id: 'evt-concert-stub',
    name: 'Concert Admission Stub',
    category: 'Events',
    description: 'Retro ticket stubs with perforation cutouts for live tours.',
    shapes: { fgColor: '#4f46e5', bgColor: '#faf5ff', dotType: 'extra-rounded' },
    frame: { style: 'ticket', primaryColor: '#4f46e5', ctaText: 'CONCERT TICKET • GATE B' },
  },
  {
    id: 'evt-tech-summit',
    name: 'Dev Conference Badge',
    category: 'Events',
    description: 'Futuristic purple and blue gradient with event pass frame.',
    shapes: { fgColor: '#3b82f6', bgColor: '#ffffff', gradientType: 'linear', gradientColor2: '#8b5cf6', gradientRotation: 90, dotType: 'rounded' },
    frame: { style: 'event-pass', primaryColor: '#6366f1', ctaText: 'KEYNOTE SCHEDULE' },
  },

  // 11. Birthday (3)
  {
    id: 'bday-confetti-party',
    name: 'Confetti Celebration',
    category: 'Birthday',
    description: 'Bright cheerful party pink with playful rounded dot shapes.',
    shapes: { fgColor: '#e11d48', bgColor: '#fff1f2', gradientType: 'linear', gradientColor2: '#f59e0b', gradientRotation: 45, dotType: 'extra-rounded' },
    frame: { style: 'gift-box', primaryColor: '#e11d48', ctaText: 'HAPPY BIRTHDAY! OPEN' },
  },
  {
    id: 'bday-golden-jubilee',
    name: 'Golden Birthday Gala',
    category: 'Birthday',
    description: 'Regal black and shimmering gold for milestone celebrations.',
    shapes: { fgColor: '#d97706', bgColor: '#1c1917', dotType: 'classy', cornerSquareColor: '#fbbf24' },
    frame: { style: 'elegant-ribbon', primaryColor: '#b45309', ctaText: 'JOIN BIRTHDAY BASH' },
  },
  {
    id: 'bday-kids-carnival',
    name: 'Kids Magic Party',
    category: 'Birthday',
    description: 'Multi-color playful look for children invitations and treasure hunts.',
    shapes: { fgColor: '#0284c7', bgColor: '#ffffff', dotType: 'dots', cornerSquareColor: '#db2777' },
    frame: { style: 'scan-me', primaryColor: '#0284c7', ctaText: 'VIEW PARTY INVITATION' },
  },

  // 12. Wedding (3)
  {
    id: 'wed-botanical-bliss',
    name: 'Botanical Garden Wedding',
    category: 'Wedding',
    description: 'Earthy emerald green and ivory with delicate floral corners.',
    shapes: { fgColor: '#065f46', bgColor: '#fcfdfa', dotType: 'classy-rounded' },
    frame: { style: 'floral-corners', primaryColor: '#047857', ctaText: 'RSVP FOR OUR WEDDING' },
  },
  {
    id: 'wed-monogram-gold',
    name: 'Royal Monogram Vows',
    category: 'Wedding',
    description: 'Warm antique gold on dark basalt stone for evening receptions.',
    shapes: { fgColor: '#b45309', bgColor: '#fefce8', dotType: 'classy' },
    frame: { style: 'golden-leaf', primaryColor: '#d97706', ctaText: 'OUR LOVE STORY & RSVP' },
  },
  {
    id: 'wed-photo-polaroid',
    name: 'Polaroid Memory Album',
    category: 'Wedding',
    description: 'Retro Polaroid frame for wedding table photo sharing.',
    shapes: { fgColor: '#334155', bgColor: '#ffffff', dotType: 'rounded' },
    frame: { style: 'modern-polaroid', primaryColor: '#1e293b', ctaText: 'Upload Your Table Photos' },
  },

  // 13. Valentine (3)
  {
    id: 'val-crimson-love',
    name: 'Crimson Heart Romance',
    category: 'Valentine',
    description: 'Passionate crimson rose with romantic heart framing.',
    shapes: { fgColor: '#be123c', bgColor: '#fff1f2', dotType: 'rounded', cornerSquareColor: '#e11d48' },
    frame: { style: 'heart', primaryColor: '#e11d48', ctaText: 'A MESSAGE FROM MY HEART' },
  },
  {
    id: 'val-secret-crush',
    name: 'Secret Crush Surprise',
    category: 'Valentine',
    description: 'Soft baby pink and magenta for sweet surprise letters.',
    shapes: { fgColor: '#db2777', bgColor: '#ffffff', gradientType: 'linear', gradientColor2: '#f43f5e', gradientRotation: 90, dotType: 'extra-rounded' },
    frame: { style: 'open-me', primaryColor: '#ec4899', ctaText: 'OPEN SECRET VALENTINE' },
  },
  {
    id: 'val-vintage-postcard',
    name: 'Vintage Love Letter',
    category: 'Valentine',
    description: 'Warm sepia tones with nostalgic postage stamp serrations.',
    shapes: { fgColor: '#881337', bgColor: '#fffbeb', dotType: 'classy' },
    frame: { style: 'stamp', primaryColor: '#be123c', ctaText: 'LOVE POSTAGE • SPECIAL' },
  },

  // 14. Halloween (3)
  {
    id: 'hal-pumpkin-spice',
    name: 'Jack-o-Lantern Orange',
    category: 'Halloween',
    description: 'Deep eerie black with pumpkin orange neon border.',
    shapes: { fgColor: '#ea580c', bgColor: '#090a12', dotType: 'square', cornerSquareColor: '#f97316' },
    frame: { style: 'neon-frame', primaryColor: '#ea580c', ctaText: 'ENTER IF YOU DARE' },
  },
  {
    id: 'hal-phantom-purple',
    name: 'Phantom Purple Witch',
    category: 'Halloween',
    description: 'Mysterious radioactive green dots on midnight violet canvas.',
    shapes: { fgColor: '#10b981', bgColor: '#180e29', dotType: 'dots', cornerSquareColor: '#a855f7' },
    frame: { style: 'cyber-hud', primaryColor: '#10b981', ctaText: 'SPOOKY COSTUME PARTY' },
  },
  {
    id: 'hal-vampire-crypt',
    name: 'Vampire Crypt Blood',
    category: 'Halloween',
    description: 'Deep blood crimson with gothic architectural arch styling.',
    shapes: { fgColor: '#991b1b', bgColor: '#0f0709', dotType: 'classy' },
    frame: { style: 'modern-arch', primaryColor: '#b91c1c', ctaText: 'HAUNTED HOUSE PASS' },
  },

  // 15. Christmas (3)
  {
    id: 'xmas-pine-holly',
    name: 'Holly Pine & Red',
    category: 'Christmas',
    description: 'Traditional forest green and holly berry red ribbon.',
    shapes: { fgColor: '#14532d', bgColor: '#f0fdf4', dotType: 'rounded', cornerSquareColor: '#dc2626' },
    frame: { style: 'gift-box', primaryColor: '#dc2626', ctaText: 'MERRY CHRISTMAS WISH' },
  },
  {
    id: 'xmas-winter-frost',
    name: 'Winter Wonderland',
    category: 'Christmas',
    description: 'Icy cyan, snow white and silver blue for festive winter cards.',
    shapes: { fgColor: '#0284c7', bgColor: '#f0f9ff', gradientType: 'linear', gradientColor2: '#38bdf8', gradientRotation: 45, dotType: 'extra-rounded' },
    frame: { style: 'scan-me', primaryColor: '#0284c7', ctaText: 'OPEN HOLIDAY GREETING' },
  },
  {
    id: 'xmas-gold-star',
    name: 'Noel Gold Elegance',
    category: 'Christmas',
    description: 'Dark warm mahogany with glittering golden star constellation.',
    shapes: { fgColor: '#d97706', bgColor: '#1c1917', dotType: 'classy' },
    frame: { style: 'starry-frame', primaryColor: '#f59e0b', ctaText: 'HOLIDAY DINNER MENU' },
  },

  // 16. New Year (3)
  {
    id: 'ny-midnight-gold',
    name: 'Midnight Countdown 2027',
    category: 'New Year',
    description: 'Sparkling metallic gold and midnight velvet black.',
    shapes: { fgColor: '#fbbf24', bgColor: '#090a12', dotType: 'dots', cornerSquareColor: '#f59e0b' },
    frame: { style: 'starry-frame', primaryColor: '#fbbf24', ctaText: 'HAPPY NEW YEAR • PARTY' },
  },
  {
    id: 'ny-champagne-pop',
    name: 'Champagne Flute Sparkle',
    category: 'New Year',
    description: 'Bubbly round dots with luxury ribbon header for gala nights.',
    shapes: { fgColor: '#ca8a04', bgColor: '#fefce8', dotType: 'rounded' },
    frame: { style: 'elegant-ribbon', primaryColor: '#ca8a04', ctaText: 'MIDNIGHT GALA PASS' },
  },
  {
    id: 'ny-times-square',
    name: 'Times Square Neon Ball',
    category: 'New Year',
    description: 'Vibrant neon purple and cyan glow celebrating the countdown.',
    shapes: { fgColor: '#38bdf8', bgColor: '#0a0d24', gradientType: 'linear', gradientColor2: '#c084fc', gradientRotation: 90, dotType: 'extra-rounded' },
    frame: { style: 'neon-frame', primaryColor: '#38bdf8', ctaText: 'COUNTDOWN TICKETS' },
  },

  // 17. Festival (3)
  {
    id: 'fest-summer-carnival',
    name: 'Sunburst Carnival',
    category: 'Festival',
    description: 'Sun-drenched yellow and energetic orange gradient for summer fairs.',
    shapes: { fgColor: '#ea580c', bgColor: '#fffbeb', gradientType: 'linear', gradientColor2: '#f59e0b', gradientRotation: 45, dotType: 'rounded' },
    frame: { style: 'scan-me', primaryColor: '#ea580c', ctaText: 'FESTIVAL LINEUP & MAP' },
  },
  {
    id: 'fest-neon-electric',
    name: 'Electric Rave Stage',
    category: 'Festival',
    description: 'High voltage electric pink on pitch black for music festivals.',
    shapes: { fgColor: '#ec4899', bgColor: '#09090b', dotType: 'dots', cornerSquareColor: '#06b6d4' },
    frame: { style: 'cyber-hud', primaryColor: '#ec4899', ctaText: 'MAIN STAGE SCHEDULE' },
  },
  {
    id: 'fest-lantern-glow',
    name: 'Lantern Moon Festival',
    category: 'Festival',
    description: 'Warm crimson and imperial gold lantern warmth.',
    shapes: { fgColor: '#b91c1c', bgColor: '#fffbeb', dotType: 'classy' },
    frame: { style: 'circular-ring', primaryColor: '#b91c1c', ctaText: 'LANTERN CELEBRATION' },
  },

  // 18. Technology (3)
  {
    id: 'tech-cyber-matrix',
    name: 'Cyberpunk Terminal',
    category: 'Technology',
    description: 'Matrix terminal emerald green on pitch black with HUD telemetry brackets.',
    shapes: { fgColor: '#10b981', bgColor: '#020617', dotType: 'square', cornerSquareColor: '#059669' },
    frame: { style: 'cyber-hud', primaryColor: '#10b981', ctaText: 'INITIATE TERMINAL' },
  },
  {
    id: 'tech-ai-quantum',
    name: 'Quantum Violet AI',
    category: 'Technology',
    description: 'Electric violet to cyan quantum gradient for SaaS platforms.',
    shapes: { fgColor: '#7c3aed', bgColor: '#ffffff', gradientType: 'linear', gradientColor2: '#06b6d4', gradientRotation: 135, dotType: 'rounded' },
    frame: { style: 'gradient-frame', primaryColor: '#7c3aed', ctaText: 'ACCESS NEURAL APP' },
  },
  {
    id: 'tech-cloud-infra',
    name: 'Cloud Infrastructure',
    category: 'Technology',
    description: 'Precision slate and electric blue with corner focus brackets.',
    shapes: { fgColor: '#2563eb', bgColor: '#f8fafc', dotType: 'classy-rounded' },
    frame: { style: 'corner-brackets', primaryColor: '#2563eb', ctaText: 'DEVELOPER API DOCS' },
  },

  // 19. Gaming (3)
  {
    id: 'game-arcade-pixel',
    name: 'Retro 8-Bit Arcade',
    category: 'Gaming',
    description: 'Square pixels in bright magenta and deep game room navy.',
    shapes: { fgColor: '#ec4899', bgColor: '#090a1a', dotType: 'square', cornerSquareColor: '#f43f5e' },
    frame: { style: 'neon-frame', primaryColor: '#ec4899', ctaText: 'PRESS START • PLAY' },
  },
  {
    id: 'game-esports-clutch',
    name: 'Esports League Clutch',
    category: 'Gaming',
    description: 'Aggressive racing orange and charcoal with tournament ticket frame.',
    shapes: { fgColor: '#f97316', bgColor: '#18181b', dotType: 'extra-rounded' },
    frame: { style: 'event-pass', primaryColor: '#ea580c', ctaText: 'TOURNAMENT BRACKET' },
  },
  {
    id: 'game-cyber-quest',
    name: 'Cyber RPG Quest',
    category: 'Gaming',
    description: 'Vibrant neon cyan with glowing orbital ring frame.',
    shapes: { fgColor: '#06b6d4', bgColor: '#050c18', dotType: 'dots', cornerSquareColor: '#3b82f6' },
    frame: { style: 'glowing-orbit', primaryColor: '#06b6d4', ctaText: 'CLAIM IN-GAME REWARD' },
  },

  // 20. Music (3)
  {
    id: 'mus-vinyl-groove',
    name: 'Vinyl Album Groove',
    category: 'Music',
    description: 'Classic analog record vibe with sleek circular frame.',
    shapes: { fgColor: '#18181b', bgColor: '#ffffff', dotType: 'dots', cornerSquareType: 'dot', cornerDotType: 'dot' },
    frame: { style: 'circular-ring', primaryColor: '#18181b', ctaText: 'STREAM ALBUM NOW' },
  },
  {
    id: 'mus-mixtape-cassette',
    name: 'Lo-Fi Audio Cassette',
    category: 'Music',
    description: 'Nostalgic 80s tape cassette frame with fuchsia accents.',
    shapes: { fgColor: '#ec4899', bgColor: '#18181b', dotType: 'rounded' },
    frame: { style: 'music-cassette', primaryColor: '#ec4899', ctaText: 'LISTEN TO PLAYLIST' },
  },
  {
    id: 'mus-concert-tour',
    name: 'World Tour Sound',
    category: 'Music',
    description: 'Deep violet gradient for artists, concert tickets and singles.',
    shapes: { fgColor: '#6d28d9', bgColor: '#ffffff', gradientType: 'linear', gradientColor2: '#a855f7', gradientRotation: 90, dotType: 'classy-rounded' },
    frame: { style: 'scan-me', primaryColor: '#7c3aed', ctaText: 'OFFICIAL MUSIC VIDEO' },
  },

  // 21. Nature (3)
  {
    id: 'nat-emerald-forest',
    name: 'Emerald Forest Canopy',
    category: 'Nature',
    description: 'Deep moss green and organic rounded forms for eco-brands.',
    shapes: { fgColor: '#047857', bgColor: '#fcfdfa', dotType: 'rounded', cornerSquareColor: '#065f46' },
    frame: { style: 'floral-corners', primaryColor: '#047857', ctaText: 'ECO-FRIENDLY INITIATIVE' },
  },
  {
    id: 'nat-earth-sage',
    name: 'Organic Earth & Sage',
    category: 'Nature',
    description: 'Muted olive and parchment for sustainable farms and trails.',
    shapes: { fgColor: '#3f6212', bgColor: '#fefce8', dotType: 'classy-rounded' },
    frame: { style: 'minimal-caption', primaryColor: '#4d7c0f', ctaText: 'explore nature trail' },
  },
  {
    id: 'nat-ocean-reef',
    name: 'Deep Ocean Coral',
    category: 'Nature',
    description: 'Teal to cyan marine gradient with marine conservation badge.',
    shapes: { fgColor: '#0f766e', bgColor: '#f0fdfa', gradientType: 'linear', gradientColor2: '#06b6d4', gradientRotation: 45, dotType: 'dots' },
    frame: { style: 'scan-me', primaryColor: '#0d9488', ctaText: 'OCEAN SANCTUARY' },
  },

  // 22. Luxury (3)
  {
    id: 'lux-black-gold',
    name: 'Obsidian & Pure Gold',
    category: 'Luxury',
    description: 'High-end black velvet card with polished golden borders.',
    shapes: { fgColor: '#fbbf24', bgColor: '#121216', dotType: 'classy', cornerSquareColor: '#d97706' },
    frame: { style: 'golden-leaf', primaryColor: '#d97706', ctaText: 'PRIVATE CONCIERGE' },
  },
  {
    id: 'lux-marble-rose',
    name: 'Rose Gold Carrera',
    category: 'Luxury',
    description: 'Subtle metallic champagne pink with architectural arch.',
    shapes: { fgColor: '#9d174d', bgColor: '#fdf2f8', dotType: 'classy-rounded' },
    frame: { style: 'modern-arch', primaryColor: '#be185d', ctaText: 'EXQUISITE HOROLOGY' },
  },
  {
    id: 'lux-platinum-prestige',
    name: 'Platinum Reserve',
    category: 'Luxury',
    description: 'Subtle silver and deep anthracite for private wealth management.',
    shapes: { fgColor: '#334155', bgColor: '#ffffff', dotType: 'square', cornerSquareType: 'rounded' },
    frame: { style: 'double-border', primaryColor: '#1e293b', ctaText: 'EXCLUSIVE RESERVE' },
  },

  // 23. Neon (3)
  {
    id: 'neon-cyber-cyan',
    name: 'Hyperdrive Electric Cyan',
    category: 'Neon',
    description: 'Blinding electric cyan dots on nightfall blue with neon frame glow.',
    shapes: { fgColor: '#06b6d4', bgColor: '#060a1e', dotType: 'extra-rounded', cornerSquareColor: '#38bdf8' },
    frame: { style: 'neon-frame', primaryColor: '#06b6d4', ctaText: 'SCAN NEON PULSE' },
  },
  {
    id: 'neon-vaporwave-pink',
    name: 'Vaporwave Synth Glow',
    category: 'Neon',
    description: 'Fuchsia and electric violet glow with futuristic orbital ring.',
    shapes: { fgColor: '#f43f5e', bgColor: '#0e0820', gradientType: 'linear', gradientColor2: '#a855f7', gradientRotation: 90, dotType: 'rounded' },
    frame: { style: 'glowing-orbit', primaryColor: '#d946ef', ctaText: 'SYNTHWAVE RADIO' },
  },
  {
    id: 'neon-laser-lime',
    name: 'Laser Beam Lime',
    category: 'Neon',
    description: 'High-visibility acid green and pitch black cyber terminal.',
    shapes: { fgColor: '#22c55e', bgColor: '#050a06', dotType: 'dots', cornerSquareColor: '#4ade80' },
    frame: { style: 'cyber-hud', primaryColor: '#22c55e', ctaText: 'ACTIVATION CODE' },
  },
];

export const PREMADE_STUDIO_TEMPLATES: StudioTemplate[] = TEMPLATE_DEFS.map((def) => {
  const shapes: ShapesConfig = {
    dotType: def.shapes.dotType || 'rounded',
    cornerSquareType: def.shapes.cornerSquareType || 'rounded',
    cornerDotType: def.shapes.cornerDotType || 'dot',
    fgColor: def.shapes.fgColor || '#7c3aed',
    bgColor: def.shapes.bgColor || '#ffffff',
    transparentBg: false,
    cornerSquareColor: def.shapes.cornerSquareColor || def.shapes.fgColor || '#7c3aed',
    cornerDotColor: def.shapes.cornerDotColor || def.shapes.fgColor || '#7c3aed',
    gradientType: def.shapes.gradientType || 'none',
    gradientColor2: def.shapes.gradientColor2 || '#ec4899',
    gradientRotation: def.shapes.gradientRotation ?? 45,
    margin: 15,
    errorCorrection: 'Q',
  };

  const frame: FrameConfig = {
    style: def.frame.style || 'scan-me',
    primaryColor: def.frame.primaryColor || shapes.fgColor,
    secondaryColor: def.frame.secondaryColor || '#ec4899',
    backgroundColor: def.frame.backgroundColor || shapes.bgColor,
    borderWidth: def.frame.borderWidth ?? 3,
    borderRadius: def.frame.borderRadius ?? 24,
    padding: def.frame.padding ?? 22,
    shadow: def.frame.shadow ?? true,
    opacity: 1,
    decorationSize: 24,
    decorationPosition: 'bottom',
    ctaText: def.ctaText || def.frame.ctaText || 'SCAN ME',
    ctaFontSize: 15,
    ctaTextColor: def.frame.ctaTextColor || '#ffffff',
    placement: def.frame.placement || 'bottom',
  };

  const textLayers: TextLayersConfig = {
    ...DEFAULT_TEXT_LAYERS,
    heading: {
      ...DEFAULT_TEXT_LAYERS.heading,
      text: def.headingText || 'Scan To Connect',
      color: shapes.bgColor === '#ffffff' || shapes.bgColor.startsWith('#f') ? '#0f172a' : '#ffffff',
    },
    cta: {
      ...DEFAULT_TEXT_LAYERS.cta,
      text: frame.ctaText,
      pillColor: frame.primaryColor,
    },
  };

  return {
    id: def.id,
    name: def.name,
    category: def.category,
    description: def.description,
    design: {
      shapes,
      frame,
      logo: {
        size: 0.2,
        padding: 6,
        opacity: 1,
        shape: 'rounded',
        bgColor: shapes.bgColor,
      },
      textLayers,
      layers: DEFAULT_LAYERS,
    },
  };
});
