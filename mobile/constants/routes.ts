/** Typed route constants. Mirrors the expo-router file tree under app/. */
export const ROUTES = {
  index: '/',
  auth: {
    login: '/(auth)/login',
    signup: '/(auth)/signup',
    onboarding: '/(auth)/onboarding',
    forgotPassword: '/(auth)/forgot-password',
    resetPassword: '/(auth)/reset-password',
    verifyEmail: '/(auth)/verify-email',
  },
  main: {
    dashboard: '/(main)/dashboard',
    notes: '/(main)/notes',
    note: (id: string) => `/(main)/notes/${id}`,
    library: '/(main)/library',
    documents: '/(main)/documents',
    quiz: '/(main)/quiz',
    flashcards: '/(main)/flashcards',
    revision: '/(main)/revision',
    research: '/(main)/research',
    aiTutor: '/(main)/ai-tutor',
    voiceTutor: '/(main)/voice-tutor',
    search: '/(main)/search',
    settings: '/(main)/settings',
    progress: '/(main)/progress',
    studyPlan: '/(main)/study-plan',
    youtube: '/(main)/youtube',
    definitions: '/(main)/definitions',
    derivations: '/(main)/derivations',
    formulas: '/(main)/formulas',
    numericals: '/(main)/numericals',
    questions: '/(main)/questions',
    pyq: '/(main)/pyq',
    examAnalysis: '/(main)/exam-analysis',
    examPrediction: '/(main)/exam-prediction',
    questionPaper: '/(main)/question-paper',
    memoryTricks: '/(main)/memory-tricks',
    mindmaps: '/(main)/mindmaps',
    collaboration: '/(main)/collaboration',
    /** Primary topic-to-study-pack generation flow (the "Create" tab). */
    studypack: '/(main)/studypack',
    /** @deprecated Legacy single-shot generator. Redirects to `studypack`. */
    workspace: '/(main)/workspace',
  },
  createModal: '/create-modal',
  /** Single source of truth for "start a generation". */
  generate: '/(main)/studypack',
} as const;

/** Deep-link hosts declared in app.json and AndroidManifest.xml. */
export const DEEP_LINK_HOSTS = ['notes', 'quiz', 'research', 'reset-password', 'verify-email'] as const;
export type DeepLinkHost = (typeof DEEP_LINK_HOSTS)[number];

const DEEP_LINK_TARGETS: Record<DeepLinkHost, string> = {
  notes: ROUTES.main.notes,
  quiz: ROUTES.main.quiz,
  research: ROUTES.main.research,
  'reset-password': ROUTES.auth.resetPassword,
  'verify-email': ROUTES.auth.verifyEmail,
};

export function isDeepLinkHost(value: string): value is DeepLinkHost {
  return (DEEP_LINK_HOSTS as readonly string[]).includes(value);
}

/** Maps a deep-link host to the in-app route it should open. */
export function routeForHost(host: string): string | undefined {
  return isDeepLinkHost(host) ? DEEP_LINK_TARGETS[host] : undefined;
}
