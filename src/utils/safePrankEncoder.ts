import { PrankPayload, PrankTemplateId, PrankTemplateMeta, PrankTheme } from '../types/prank';
import { siteConfig } from '../config/site';

export const SAFE_PRANK_TEMPLATES: PrankTemplateMeta[] = [
  {
    id: 'mystery',
    name: 'Mystery Reveal',
    badge: '🔮 Mystery',
    description: 'An intriguing mystery box that builds suspense before a heartwarming message.',
    defaultTitle: 'A Classified Dossier Awaits',
    defaultMsg: 'You survived the suspense! You are officially the most awesome person in this room today.',
    defaultEmoji: '🕵️',
  },
  {
    id: 'compliment',
    name: 'Random Compliment',
    badge: '✨ Compliment',
    description: 'Brighten their day with an unexpected, uplifting, and genuine compliment.',
    defaultTitle: 'Incoming High-Priority Good News',
    defaultMsg: 'Your energy today is phenomenal and everyone around you appreciates your humor and kindness.',
    defaultEmoji: '🌟',
  },
  {
    id: 'gentle-roast',
    name: 'Gentle Roast',
    badge: '🌶️ Gentle Roast',
    description: 'A completely harmless, playful poke among best friends (no offensive content).',
    defaultTitle: 'Scientific Friendship Audit',
    defaultMsg: 'Scientists studied your habits and determined that you spend 84% of your day thinking about snacks.',
    defaultEmoji: '🍕',
  },
  {
    id: 'friendship-test',
    name: 'Friendship Test',
    badge: '🤝 Friendship',
    description: 'A fun quiz result that declares you 100% certified best friends forever.',
    defaultTitle: 'Friendship Compatibility Index: 99.8%',
    defaultMsg: 'Test result: Certified Best Friend. Perks include free hugs and endless inside jokes.',
    defaultEmoji: '🏆',
  },
  {
    id: 'loading-joke',
    name: 'Fake Loading Joke',
    badge: '⏳ Fake Loading',
    description: 'A playful retro loading bar that humorously stalls before revealing the punchline.',
    defaultTitle: 'Downloading 4K Holographic Pizza...',
    defaultMsg: 'Download Failed: Reality buffer overflow. You will just have to settle for a real slice together!',
    defaultEmoji: '🍕',
  },
  {
    id: 'secret-message',
    name: 'Secret Message',
    badge: '🤫 Secret Note',
    description: 'An encrypted message aesthetic that decrypts character-by-character.',
    defaultTitle: 'Decrypted Transmission',
    defaultMsg: 'You are doing way better than you think you are. Keep shining, rockstar!',
    defaultEmoji: '🗝️',
  },
  {
    id: 'birthday',
    name: 'Birthday Surprise',
    badge: '🎂 Birthday',
    description: 'A vibrant celebration screen with virtual cake, candles, and confetti.',
    defaultTitle: 'HAPPY BIRTHDAY!',
    defaultMsg: 'Wishing you another year of crazy adventures, zero bad vibes, and unlimited happiness!',
    defaultEmoji: '🎉',
  },
  {
    id: 'spin-wheel',
    name: 'Spin the Wheel',
    badge: '🎡 Safe Wheel',
    description: 'Interactive spin wheel with fun, harmless dares (dance for 5s, tell a joke, share a song).',
    defaultTitle: 'The Wheel of Fun Dares',
    defaultMsg: 'Your harmless challenge: Tell your favorite joke out loud right now!',
    defaultEmoji: '🎯',
    sampleOptions: [
      'Tell a quick joke',
      'Send a goofy selfie',
      'Do a 5-second victory dance',
      'Recommend your top song',
      'Give a high five',
      'Pick the next snack',
    ],
  },
  {
    id: 'would-you-rather',
    name: 'Would You Rather',
    badge: '🤔 Dilemma',
    description: 'A funny, lighthearted dilemma question to spark conversation.',
    defaultTitle: 'The Ultimate Friendship Dilemma',
    defaultMsg: 'Would you rather: Only speak in movie quotes for 24 hours OR do a moonwalk every time you enter a room?',
    defaultEmoji: '🎬',
  },
  {
    id: 'riddle',
    name: 'Riddle Reveal',
    badge: '🧩 Riddle',
    description: 'A clever brain teaser with an interactive "Tap to Reveal Answer" button.',
    defaultTitle: 'A Brain Teaser For You',
    defaultMsg: 'Riddle: What gets wetter the more it dries?\n\nAnswer: A towel! Did you get it right?',
    defaultEmoji: '💡',
  },
  {
    id: 'emoji-decoder',
    name: 'Emoji Decoder',
    badge: '🕵️ Emoji Code',
    description: 'A puzzle of emojis that decode into a fun phrase or movie title.',
    defaultTitle: 'Decipher The Secret Emoji Cipher',
    defaultMsg: '👑 + 🦁 = The Lion King! Hakuna Matata from your best friend!',
    defaultEmoji: '🦁',
  },
  {
    id: 'certificate',
    name: 'Friendship Certificate',
    badge: '📜 Certificate',
    description: 'An official-looking diploma honoring them for outstanding friend excellence.',
    defaultTitle: 'Official Certificate of Excellence',
    defaultMsg: 'Awarded to an irreplaceable legend for extraordinary patience and legendary humor.',
    defaultEmoji: '🏅',
  },
  {
    id: 'treasure-hunt',
    name: 'Treasure Hunt Clue',
    badge: '🗺️ Clue Marker',
    description: 'A mystery clue for scavenger hunts, gifts, or classroom surprise activities.',
    defaultTitle: 'Scavenger Hunt Clue #1',
    defaultMsg: 'Where cold winds blow and treats are stored, look near the place where juice is poured! (Check the fridge!)',
    defaultEmoji: '🧭',
  },
  {
    id: 'countdown',
    name: 'Countdown Surprise',
    badge: '⏱️ Countdown',
    description: 'A 5-second dramatic countdown before exploding into good news.',
    defaultTitle: 'Critical Protocol Initiated',
    defaultMsg: 'Countdown complete! You just unlocked good luck and high vibes for the next 24 hours!',
    defaultEmoji: '🚀',
  },
  {
    id: 'confetti',
    name: 'Confetti Surprise',
    badge: '🎊 Confetti Blast',
    description: 'Full-screen festive confetti shower celebrating your friend.',
    defaultTitle: 'YOU DID IT!',
    defaultMsg: 'Whatever challenge you faced this week, you crushed it. Take a bow!',
    defaultEmoji: '🥳',
  },
  {
    id: 'meme-reveal',
    name: 'Meme Reveal',
    badge: '😹 Meme Card',
    description: 'A clean, humorous card with top-tier wholesome meme humor.',
    defaultTitle: 'Friendship Logic 101',
    defaultMsg: 'Friend: "I will be ready in 5 minutes." (Narrator: They had not even picked up their socks yet).',
    defaultEmoji: '😺',
  },
  {
    id: 'choose-box',
    name: 'Choose a Box',
    badge: '🎁 Mystery Boxes',
    description: 'Three mysterious gift boxes where the user picks one to open their surprise.',
    defaultTitle: 'Choose Your Lucky Gift Box',
    defaultMsg: 'Box #2 opened: You won an all-expenses-paid high five and infinite good karma!',
    defaultEmoji: '🎁',
  },
  {
    id: 'coupon',
    name: 'Friendship Coupon',
    badge: '🎟️ Friend Coupon',
    description: 'A redeemable friendship voucher (e.g., 1 Free Coffee, 1 Free Pizza slice).',
    defaultTitle: 'Official Friendship Voucher',
    defaultMsg: 'This golden coupon entitles you to 1 Free Coffee or Boba, redeemable anytime from the sender!',
    defaultEmoji: '☕',
  },
  {
    id: 'random-joke',
    name: 'Random Joke',
    badge: '😂 Dad Joke',
    description: 'A wholesome, groan-worthy dad joke guaranteed to get a smile.',
    defaultTitle: 'Joke of the Day',
    defaultMsg: 'Why do we tell actors to "break a leg"?\nBecause every play has a cast!',
    defaultEmoji: '🎭',
  },
  {
    id: 'custom-surprise',
    name: 'Custom Safe Surprise',
    badge: '✍️ Custom',
    description: 'Create your own respectful, creative, and memorable surprise.',
    defaultTitle: 'A Special Note For You',
    defaultMsg: 'Hope you have a fantastic day ahead filled with great music and tasty snacks!',
    defaultEmoji: '💌',
  },
];

export const SAFE_PRANK_THEMES: Array<{ id: PrankTheme; label: string; bgClass: string; textClass: string; borderClass: string }> = [
  { id: 'neon-mystery', label: 'Neon Mystery', bgClass: 'bg-slate-950', textClass: 'text-violet-300', borderClass: 'border-violet-500/50' },
  { id: 'zosuf-signature', label: 'ZOSUF Signature', bgClass: 'bg-[#0a0b1e]', textClass: 'text-cyan-300', borderClass: 'border-cyan-500/40' },
  { id: 'midnight-secret', label: 'Midnight Secret', bgClass: 'bg-indigo-950', textClass: 'text-fuchsia-300', borderClass: 'border-fuchsia-500/40' },
  { id: 'detective-file', label: 'Detective File', bgClass: 'bg-neutral-900', textClass: 'text-amber-300', borderClass: 'border-amber-500/40' },
  { id: 'retro-arcade', label: 'Retro Arcade', bgClass: 'bg-zinc-950', textClass: 'text-emerald-300', borderClass: 'border-emerald-500/40' },
  { id: 'comic-pop', label: 'Comic Pop', bgClass: 'bg-blue-950', textClass: 'text-yellow-300', borderClass: 'border-yellow-400/50' },
  { id: 'birthday-blast', label: 'Birthday Blast', bgClass: 'bg-rose-950', textClass: 'text-pink-300', borderClass: 'border-pink-500/50' },
  { id: 'friendship-club', label: 'Friendship Club', bgClass: 'bg-teal-950', textClass: 'text-teal-200', borderClass: 'border-teal-500/40' },
  { id: 'pixel-quest', label: 'Pixel Quest', bgClass: 'bg-purple-950', textClass: 'text-lime-300', borderClass: 'border-lime-500/40' },
  { id: 'magic-envelope', label: 'Magic Envelope', bgClass: 'bg-violet-950', textClass: 'text-purple-200', borderClass: 'border-purple-400/50' },
  { id: 'treasure-map', label: 'Treasure Map', bgClass: 'bg-stone-900', textClass: 'text-amber-200', borderClass: 'border-amber-600/50' },
  { id: 'soft-pastel', label: 'Soft Pastel', bgClass: 'bg-slate-900', textClass: 'text-sky-200', borderClass: 'border-sky-400/40' },
  { id: 'black-and-gold', label: 'Black & Gold', bgClass: 'bg-black', textClass: 'text-yellow-400', borderClass: 'border-yellow-500/60' },
];

/**
 * Base64 URL-safe encode
 */
function base64UrlEncode(str: string): string {
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Base64 URL-safe decode
 */
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Encode a safe prank into a URL string
 */
export function encodePrankPayload(payload: PrankPayload): { url: string; encodedData: string; isTooLong: boolean } {
  // Strict field size truncation to prevent URL bloat
  const sanitized: PrankPayload = {
    v: 1,
    t: payload.t,
    th: payload.th || 'zosuf-signature',
    to: (payload.to || '').slice(0, 40).trim(),
    from: (payload.from || '').slice(0, 40).trim(),
    title: (payload.title || '').slice(0, 90).trim(),
    msg: (payload.msg || '').slice(0, 400).trim(),
    emoji: (payload.emoji || '🎉').slice(0, 10),
    confetti: payload.confetti !== false,
  };

  if (payload.extra && typeof payload.extra === 'object') {
    sanitized.extra = payload.extra;
  }

  const jsonStr = JSON.stringify(sanitized);
  const encodedData = base64UrlEncode(jsonStr);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : siteConfig.productionUrl;
  const url = `${baseUrl}/p?d=${encodedData}`;

  // QR reliable size check (keep URL under ~1200 chars for reliable scanning)
  const isTooLong = url.length > 1200;

  return { url, encodedData, isTooLong };
}

/**
 * Decode and strictly validate a prank payload from query string
 */
export function decodePrankPayload(encodedData: string): { success: boolean; data?: PrankPayload; error?: string } {
  if (!encodedData || typeof encodedData !== 'string') {
    return { success: false, error: 'Missing surprise data' };
  }

  if (encodedData.length > 4000) {
    return { success: false, error: 'Surprise data payload is unusually large' };
  }

  try {
    const jsonStr = base64UrlDecode(encodedData);
    const parsed = JSON.parse(jsonStr);

    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Malformed surprise structure' };
    }

    if (parsed.v !== 1) {
      return { success: false, error: 'Unsupported surprise payload version' };
    }

    // Validate template id exists
    const validTemplate = SAFE_PRANK_TEMPLATES.some((t) => t.id === parsed.t);
    const templateId: PrankTemplateId = validTemplate ? parsed.t : 'custom-surprise';

    // Strictly stringify/sanitize fields to prevent XSS / script injection
    const payload: PrankPayload = {
      v: 1,
      t: templateId,
      th: typeof parsed.th === 'string' ? parsed.th : 'zosuf-signature',
      to: typeof parsed.to === 'string' ? parsed.to.slice(0, 40) : '',
      from: typeof parsed.from === 'string' ? parsed.from.slice(0, 40) : '',
      title: typeof parsed.title === 'string' ? parsed.title.slice(0, 90) : 'A Surprise For You',
      msg: typeof parsed.msg === 'string' ? parsed.msg.slice(0, 400) : 'Hope you have an awesome day!',
      emoji: typeof parsed.emoji === 'string' ? parsed.emoji.slice(0, 10) : '🎉',
      confetti: Boolean(parsed.confetti),
      extra: typeof parsed.extra === 'object' && parsed.extra !== null ? parsed.extra : undefined,
    };

    return { success: true, data: payload };
  } catch {
    return { success: false, error: 'Unable to decode this surprise link. It may be broken or corrupted.' };
  }
}
