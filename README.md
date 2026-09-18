# ZOSUF — Premium Image & QR Code Studio

ZOSUF is a high-precision, client-side QR code generator, scanner, and browser image processing suite. Engineered with modern React, Vite, and Tailwind CSS, ZOSUF operates 100% in the browser with zero remote database dependencies, zero API keys, and complete privacy.

---

## ⚡ Quick Start & Local Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:3000` to start creating custom QR codes.

### 3. Production Build
```bash
npm run build
```
This builds the fully optimized static assets into the `dist` folder.

### 4. Preview Production Build
```bash
npm run preview
```

---

## 🚀 Cloudflare Pages Deployment Configuration

Deploying ZOSUF to Cloudflare Pages is seamless because the application is a pure static single-page application (SPA).

Configure your Cloudflare Pages project with these exact settings:

| Setting | Value |
| :--- | :--- |
| **Framework preset** | `Vite` |
| **Build command** | `npm run build` |
| **Output directory** | `dist` |
| **Root directory** | `/` |
| **Environment variables** | None required (Zero API keys) |

> **Note:** The `public/_redirects` file (`/* /index.html 200`) and `public/_headers` are automatically included in your build output to ensure direct page refreshes and strict security headers work out of the box on Cloudflare Pages.

---

## 🐙 Push to GitHub

To push your ZOSUF repository to GitHub:

```bash
git init
git add .
git commit -m "Initial ZOSUF QR generator"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

---

## 🎨 Supported QR Code Formats (16 Types)

1. **Website URLs** — Instant browser redirect for any domain.
2. **Image URLs** — Direct links to public photos, assets, or artwork.
3. **Plain Text** — Text messages, notes, keys, or instructions.
4. **Wi-Fi Networks** — Connect devices automatically without typing passwords (WPA/WPA2/WPA3, WEP, Open, Hidden SSID).
5. **vCard Contacts** — Full contact book imports (name, phone, email, organization, job title).
6. **UPI Payments** — Interoperable payment links for Google Pay, PhonePe, Paytm, and BHIM (`upi://pay?pa=...`).
7. **Email Drafts** — Pre-fills recipient, subject line, and body (`mailto:`).
8. **Phone Calls** — Dials phone numbers instantly (`tel:`).
9. **SMS Messages** — Pre-fills phone number and text message (`smsto:`).
10. **Map Locations** — Lat/long coordinates or geographic place queries (`geo:` and Google Maps).
11. **Calendar Events** — Direct iCalendar VEVENT imports for conferences and meetings.
12. **WhatsApp** — Direct chat initiates with pre-filled text (`wa.me`).
13. **Telegram** — Direct user profiles or public channel links (`t.me`).
14. **YouTube** — Direct video or channel links.
15. **Instagram** — Direct profile links (including `@markzosuf`).
16. **Custom URLs** — Custom mobile app deep links and raw URI schemes.

---

## 🖼️ Image Functionality & Architecture Explanation

### How Image QR URLs Work
- When an image is uploaded locally in the browser, it is stored only in browser memory or local cache on that specific machine.
- Smartphones scanning a QR code from another device cannot access the local file system of your computer.
- **To create a QR code that opens an image on another phone:**
  1. Upload your image to any public hosting provider, website, cloud drive, or CDN.
  2. Copy the public URL (e.g., `https://example.com/photo.jpg`).
  3. Paste it into the **Public Image URL** field in ZOSUF.
  4. The generated QR code will now seamlessly display the image on any scanning phone.

### In-Browser Image Studio
ZOSUF also includes a standalone local image tool:
- **Format Conversion:** Convert between JPG, PNG, and WebP.
- **Client-Side Compression:** High-performance canvas compression with quality slider.
- **Dimension Resizing:** Custom width/height with aspect ratio locking.
- **Aspect Ratio Cropping:** 1:1 square, 16:9, and 4:3 presets.
- **Privacy EXIF Removal:** Re-drawing pixel buffers into HTML Canvas automatically removes camera location and hardware metadata.

---

## 📣 How to Add Approved Google AdSense Details

By default, advertising is **completely disabled** in ZOSUF, and no external tracking scripts will load.

To enable approved Google AdSense ads:
1. Open `/index.html`.
2. Locate `window.ZOSUF_ADS_CONFIG`:
   ```javascript
   window.ZOSUF_ADS_CONFIG = {
     enabled: true, // Change to true
     publisherId: "ca-pub-XXXXXXXXXXXXXXXX", // Your approved AdSense Publisher ID
     slots: {
       top: "1234567890",    // Your Top Banner Ad Slot ID
       middle: "0987654321"  // Your Middle Content Ad Slot ID
     }
   };
   ```
3. Open `public/ads.txt` and replace the placeholder with your authorized seller record:
   ```
   google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
   ```

---

## 👤 How to Update Instagram Creator Link

The creator link is featured across the header, hero, about section, and footer as `@markzosuf` (`https://instagram.com/markzosuf`).

To update this link:
- Search for `https://instagram.com/markzosuf` or `@markzosuf` across `src/components/Navbar.tsx`, `src/components/Footer.tsx`, `src/components/Hero.tsx`, and `src/pages/AboutPage.tsx`.

---

## 🌐 Updating Domain in Sitemap and Canonical Metadata

The project is pre-configured with placeholder domain `https://zosuf.pages.dev`.

When deploying to a custom domain:
1. Update `<link rel="canonical" ...>` and `<meta property="og:url" ...>` in `/index.html`.
2. Update the `<loc>` tags and domain in `/public/sitemap.xml`.
3. Update the `Sitemap:` URL in `/public/robots.txt`.

---

## 🛡️ Privacy & Security Highlights

- **Zero Remote Storage:** No databases, no login screens, no tracking beacons.
- **Client-Side Processing:** All QR matrix creation and image compression happen in the browser.
- **Offline First:** Fully functional without an active network connection once cached.
- **Safe Ads Mode:** No advertising script executes without explicit publisher credentials.

Created by **@markzosuf**.
