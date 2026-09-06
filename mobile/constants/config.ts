/**
 * Central, typed runtime configuration for the mobile app.
 * Values resolve from app.config.ts `extra` first, then EXPO_PUBLIC_* env vars.
 *
 * SECURITY CONTRACT (see CONFIGURATION-SETUP.md):
 * - There is NO baked-in fallback API URL. A missing URL is a configuration error.
 * - Plain HTTP, localhost, 127.0.0.1, 10.0.2.2 and private LAN addresses are
 *   permitted ONLY in an explicit development/debug build.
 * - Production requires a public HTTPS URL.
 * - EXPO_PUBLIC_* values ship inside the APK/AAB, so no secret may ever live here.
 */
import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;

function str(key: string, envValue: string | undefined, fallback: string): string {
  const fromExtra = extra[key];
  if (typeof fromExtra === 'string' && fromExtra.length > 0) return fromExtra;
  if (typeof envValue === 'string' && envValue.length > 0) return envValue;
  return fallback;
}

/** True only for development/debug builds. `__DEV__` is false in a release bundle. */
export const isDevelopmentBuild: boolean =
  typeof __DEV__ !== 'undefined' && __DEV__ === true
    ? true
    : str('appEnv', process.env.EXPO_PUBLIC_APP_ENV, 'production') === 'development';

export class ApiConfigurationError extends Error {
  constructor(message: string) {
    super(`API configuration error: ${message}`);
    this.name = 'ApiConfigurationError';
  }
}

const PRIVATE_HOST_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^169\.254\./,
  /^\[?::1\]?$/,
  /\.local$/i,
];

/**
 * Validate the configured API base URL.
 * Throws a clear, actionable error instead of silently falling back to an
 * emulator address that can never work for a real user.
 */
export function resolveApiUrl(
  rawUrl: string | undefined,
  { development = isDevelopmentBuild }: { development?: boolean } = {},
): string {
  const value = (rawUrl ?? '').trim();
  if (!value) {
    throw new ApiConfigurationError(
      'EXPO_PUBLIC_API_URL is not set. Copy mobile/.env.example to mobile/.env (development) ' +
        'or set EXPO_PUBLIC_API_URL to your public HTTPS API for a production build.',
    );
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ApiConfigurationError(`"${value}" is not a valid absolute URL.`);
  }
  const isHttps = parsed.protocol === 'https:';
  const isPrivate = PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(parsed.hostname));

  if (development) {
    if (parsed.protocol !== 'http:' && !isHttps) {
      throw new ApiConfigurationError(`Unsupported protocol "${parsed.protocol}".`);
    }
    return value.replace(/\/$/, '');
  }
  if (!isHttps) {
    throw new ApiConfigurationError(
      `Production builds require HTTPS. Received "${value}". Cleartext HTTP is disabled in release builds.`,
    );
  }
  if (isPrivate) {
    throw new ApiConfigurationError(
      `Production builds cannot target the local/private host "${parsed.hostname}". ` +
        'Use your public API hostname.',
    );
  }
  return value.replace(/\/$/, '');
}

const rawApiUrl = str('apiUrl', process.env.EXPO_PUBLIC_API_URL, '');

/**
 * Google OAuth client IDs.
 *
 * These are PUBLIC by design - an OAuth client ID is not a secret. The app only
 * ever obtains a Google ID token and posts it to POST /auth/google, where the
 * backend verifies the signature, issuer, audience, expiry and nonce against
 * Google's JWKS. The client secret stays on the server and is never bundled.
 *
 * When no usable client ID is configured, `googleAuth.enabled` is false and the
 * UI hides the Google button instead of showing a control that cannot work.
 */
const googleAndroidClientId = str('googleAndroidClientId', process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID, '');
const googleIosClientId = str('googleIosClientId', process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, '');
const googleWebClientId = str('googleWebClientId', process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, '');

export const googleAuth = {
  androidClientId: googleAndroidClientId,
  iosClientId: googleIosClientId,
  webClientId: googleWebClientId,
  /** A native build needs a platform client ID; the web client ID carries the ID-token audience. */
  get enabled(): boolean {
    return Boolean(googleWebClientId || googleAndroidClientId || googleIosClientId);
  },
} as const;

export const config = {
  /** Throws ApiConfigurationError when misconfigured - never silently wrong. */
  get apiUrl(): string {
    return resolveApiUrl(rawApiUrl);
  },
  rawApiUrl,
  appEnv: isDevelopmentBuild ? 'development' : 'production',
  requestTimeoutMs: 30_000,
  uploadTimeoutMs: 180_000,
  maxUploadBytes: 25 * 1024 * 1024,
  pageSize: 30,
} as const;

/** Every REST path the app talks to, grouped by backend router. */
export const API = {
  auth: {
    login: '/auth/login',
    signup: '/auth/signup',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    verifyEmail: '/auth/verify-email',
    google: '/auth/google',
    providers: '/auth/providers',
  },
  users: { me: '/users/me', profile: '/users/me/profile' },
  notes: {
    list: '/notes',
    detail: (id: string) => `/notes/${id}`,
    generate: '/notes/generate',
    generateStream: '/notes/generate/stream',
  },
  documents: { list: '/documents', upload: '/documents/upload', detail: (id: string) => `/documents/${id}` },
  youtube: { process: '/youtube/process' },
  research: {
    createJob: '/research/jobs',
    job: (taskId: string) => `/research/jobs/${taskId}`,
    cancel: (taskId: string) => `/research/jobs/${taskId}/cancel`,
    events: (taskId: string) => `/research/jobs/${taskId}/events`,
  },
  studypack: {
    stages: '/studypack/stages',
    classify: '/studypack/classify',
    createJob: '/studypack/jobs',
    job: (taskId: string) => `/studypack/jobs/${taskId}`,
    cancel: (taskId: string) => `/studypack/jobs/${taskId}/cancel`,
    retry: (taskId: string) => `/studypack/jobs/${taskId}/retry`,
    events: (taskId: string) => `/studypack/jobs/${taskId}/events`,
    note: (noteId: string) => `/studypack/notes/${noteId}`,
  },
  quiz: { generate: '/quiz/generate', attempt: '/quiz/attempts' },
  flashcards: { generate: '/flashcards/generate', review: (id: string) => `/flashcards/${id}/review` },
  tutor: { ask: '/tutor/ask' },
  voice: { ask: '/voice/ask' },
  search: { query: '/search' },
  analytics: { dashboard: '/analytics/dashboard' },
  tasks: { detail: (id: string) => `/tasks/${id}` },
  collaboration: { share: '/collaboration/share' },
  export: {
    note: (id: string) => `/export/notes/${id}`,
    notePdf: (id: string) => `/export/notes/${id}?format=pdf`,
    noteJson: (id: string) => `/export/notes/${id}?format=json`,
  },
  exams: { list: '/exams', analyze: '/exams/analyze', predict: '/exams/predict' },
  learning: { plans: '/learning/plans', tasks: '/learning/tasks', revision: '/learning/revision', progress: '/learning/progress' },
  privacy: { export: '/privacy/export', delete: '/privacy/delete' },
  // Routers added by this fix pass
  definitions: { generate: '/definitions/generate', list: '/definitions' },
  derivations: { generate: '/derivations/generate', list: '/derivations' },
  formulas: { generate: '/formulas/generate', list: '/formulas' },
  numericals: { generate: '/numericals/generate', list: '/numericals' },
  pyq: { analyze: '/pyq/analyze', list: '/pyq' },
  questions: { generate: '/questions/generate', list: '/questions' },
  revision: { due: '/revision/due', recommendations: '/revision/recommendations' },
  studyPlan: { create: '/study-plan', list: '/study-plan', adapt: '/study-plan/adapt' },
} as const;

/** AsyncStorage / SecureStore / SQLite key names. Keep in one place to avoid collisions. */
export const STORAGE_KEYS = {
  accessToken: 'sf.auth.access',
  refreshToken: 'sf.auth.refresh',
  onboardingComplete: 'sf.onboarding.complete',
  preferences: 'sf.preferences.v1',
  offlineQueue: 'sf.offline.queue',
  cachePrefix: 'sf.cache.',
  lastSyncAt: 'sf.sync.lastAt',
} as const;

export interface FeatureDescriptor {
  key: string;
  title: string;
  description: string;
  route: string;
}

/** The feature catalogue shown on the dashboard / create sheet. */
export const FEATURES: readonly FeatureDescriptor[] = [
  { key: 'notes', title: 'Smart Notes', description: 'Generate structured study notes on any topic.', route: '/notes' },
  { key: 'questions', title: 'Practice Questions', description: 'Exam-style questions with worked answers.', route: '/questions' },
  { key: 'numericals', title: 'Numericals', description: 'Step-by-step numerical problem solving.', route: '/numericals' },
  { key: 'derivations', title: 'Derivations', description: 'Rigorous stepwise derivations.', route: '/derivations' },
  { key: 'definitions', title: 'Definitions', description: 'Precise, exam-ready definitions.', route: '/definitions' },
  { key: 'formulas', title: 'Formula Sheet', description: 'Verified formulas with variable meanings.', route: '/formulas' },
  { key: 'pyq', title: 'Previous Year Qs', description: 'Analyse repeat patterns in past papers.', route: '/pyq' },
  { key: 'quiz', title: 'Quiz', description: 'Adaptive quizzes that target weak areas.', route: '/quiz' },
  { key: 'flashcards', title: 'Flashcards', description: 'Spaced repetition card decks.', route: '/flashcards' },
  { key: 'revision', title: 'Revision', description: 'What to revise today, ranked.', route: '/revision' },
  { key: 'study-plan', title: 'Study Plan', description: 'A day-by-day plan up to your exam.', route: '/study-plan' },
  { key: 'research', title: 'Deep Research', description: 'Cited multi-source research reports.', route: '/research' },
  { key: 'tutor', title: 'AI Tutor', description: 'Ask follow-up questions in context.', route: '/ai-tutor' },
  { key: 'youtube', title: 'YouTube to Notes', description: 'Turn a lecture video into notes.', route: '/youtube' },
  { key: 'documents', title: 'Documents', description: 'Upload PDFs and index them.', route: '/documents' },
  { key: 'progress', title: 'Progress', description: 'Mastery, streaks and weak topics.', route: '/progress' },
] as const;
