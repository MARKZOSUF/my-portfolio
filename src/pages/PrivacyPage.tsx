import React from 'react';
import { ShieldCheck, Lock, EyeOff, Camera, Cookie } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8 text-slate-300 text-xs sm:text-sm leading-relaxed">
      <div className="border-b border-slate-800 pb-6 space-y-2">
        <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          <span>Security & Sovereignty</span>
        </div>
        <h1 className="text-3xl font-display font-bold text-white tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-xs text-slate-400">
          Last updated: September 2026 • Effective immediately
        </p>
      </div>

      {/* 1. Core Principle */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Lock className="w-4 h-4 text-purple-400" />
          <span>1. 100% Client-Side Architecture</span>
        </h2>
        <p>
          ZOSUF is fundamentally designed as an offline-capable, client-side web application. All QR code synthesis, image re-encoding, format conversion (JPG, PNG, WebP), compression, and metadata (EXIF) stripping occur entirely within your browser’s local sandbox.
        </p>
        <p>
          <strong>No User Data Transmission:</strong> We do not operate a remote database, user account database, or storage bucket for user inputs. Text payloads, Wi-Fi credentials, contact details (vCards), UPI transaction VPAs, and uploaded images are never transmitted to our servers or stored remotely.
        </p>
      </section>

      {/* 2. Image Processing & Uploads */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <EyeOff className="w-4 h-4 text-cyan-400" />
          <span>2. Image Processing Notice</span>
        </h2>
        <p>
          When you upload an image in the ZOSUF Image Studio or Image QR tab:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-slate-400">
          <li>The image file is loaded strictly into your device’s local memory via standard HTML5 File and Canvas APIs.</li>
          <li>Re-encoding the image to a new canvas automatically strips camera metadata (including EXIF location data).</li>
          <li>Local images cannot be accessed by external phones. To generate a universally scannable QR code for an image, users provide a public web URL.</li>
        </ul>
      </section>

      {/* 3. Camera Permissions */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Camera className="w-4 h-4 text-pink-400" />
          <span>3. Camera Scanner Permissions</span>
        </h2>
        <p>
          The QR Scanner feature requests access to your device’s camera exclusively to scan and decode QR codes in real time. Video streams are analyzed frame-by-frame on your device using bundled JavaScript (`jsqr`) and are never recorded, saved, or uploaded to any server. You may decline camera permissions at any time and use the file upload scanner instead.
        </p>
      </section>

      {/* 4. Optional Advertising Language (AdSense Requirement) */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Cookie className="w-4 h-4 text-amber-400" />
          <span>4. Optional Advertising & Cookies</span>
        </h2>
        <p>
          By default, all advertising is disabled in ZOSUF, and no ad network scripts or tracking beacons are loaded.
        </p>
        <p>
          If the website operator activates Google AdSense or another third-party advertising provider by supplying a valid publisher ID in the site configuration, third-party vendors (including Google) may use cookies to serve ads based on a user’s prior visits to this or other websites.
        </p>
        <p>
          Users may opt out of personalized advertising by visiting Google's Ad Settings (<code>https://adssettings.google.com</code>) or via <code>www.aboutads.info</code>.
        </p>
      </section>

      {/* 5. Local Storage */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-white">5. Local Device Storage</h2>
        <p>
          ZOSUF may use browser <code>localStorage</code> solely to remember harmless interface preferences (such as your chosen theme color or recent generated QR codes for your convenience). You can wipe all locally stored data instantly at any time using the <strong>Clear Local Data</strong> button in the website footer.
        </p>
      </section>

      {/* 6. Contact */}
      <section className="space-y-3 pt-4 border-t border-slate-800">
        <h2 className="text-base font-bold text-white">6. Inquiries & Creator</h2>
        <p>
          If you have questions regarding this privacy policy or the technical architecture of ZOSUF, contact the creator on Instagram at <strong>@markzosuf</strong>.
        </p>
      </section>
    </div>
  );
};
