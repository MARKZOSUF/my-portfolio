export type PrankTemplateId =
  | 'mystery'
  | 'compliment'
  | 'gentle-roast'
  | 'friendship-test'
  | 'loading-joke'
  | 'secret-message'
  | 'birthday'
  | 'spin-wheel'
  | 'would-you-rather'
  | 'riddle'
  | 'emoji-decoder'
  | 'certificate'
  | 'treasure-hunt'
  | 'countdown'
  | 'confetti'
  | 'meme-reveal'
  | 'choose-box'
  | 'coupon'
  | 'random-joke'
  | 'custom-surprise';

export type PrankTheme =
  | 'neon-mystery'
  | 'detective-file'
  | 'retro-arcade'
  | 'comic-pop'
  | 'midnight-secret'
  | 'birthday-blast'
  | 'friendship-club'
  | 'pixel-quest'
  | 'magic-envelope'
  | 'treasure-map'
  | 'soft-pastel'
  | 'black-and-gold'
  | 'zosuf-signature';

export interface PrankPayload {
  v: 1; // version
  t: PrankTemplateId; // template
  th: PrankTheme; // theme
  to?: string; // recipient name
  from?: string; // sender name
  title: string;
  msg: string;
  emoji?: string;
  extra?: Record<string, any>;
  confetti?: boolean;
}

export interface PrankTemplateMeta {
  id: PrankTemplateId;
  name: string;
  badge: string;
  description: string;
  defaultTitle: string;
  defaultMsg: string;
  defaultEmoji: string;
  sampleOptions?: string[];
}
