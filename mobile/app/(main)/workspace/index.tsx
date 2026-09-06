/**
 * DEPRECATED legacy generation screen.
 *
 * The advanced Study Pack screen (`/(main)/studypack`) is now the single primary
 * generation flow and owns the "Create" tab. This route is kept only so old deep
 * links, saved shortcuts and back-stack entries do not dead-end: it forwards to
 * Study Pack, preserving any `?topic=` parameter.
 *
 * The previous implementation is retained, unrendered, at
 * `mobile/features/workspace/LegacyWorkspaceScreen.tsx` for reference.
 * Do not add new entry points to this route.
 */
import { Redirect, useLocalSearchParams } from 'expo-router';
import { ROUTES } from '@/constants/routes';

export default function DeprecatedWorkspaceRoute() {
  const params = useLocalSearchParams<{ topic?: string }>();
  return <Redirect href={{ pathname: ROUTES.main.studypack, params: params.topic ? { topic: params.topic } : {} }} />;
}
