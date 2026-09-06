/**
 * Navigation contract tests.
 *
 * The rescan found the advanced Study Pack screen was unreachable: it was not
 * declared in the tab layout at all, and the "Create" tab plus the dashboard
 * recommendations both pointed at the legacy workspace screen. These tests read
 * the actual route files so the wiring cannot silently regress.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const MOBILE = join(__dirname, '..');
const read = (p: string) => readFileSync(join(MOBILE, p), 'utf8');

const layout = read('app/(main)/_layout.tsx');
const dashboard = read('app/(main)/dashboard/index.tsx');
const routes = read('constants/routes.ts');
const workspace = read('app/(main)/workspace/index.tsx');

describe('Study Pack is the primary generation flow', () => {
  it('declares studypack/index as the Create tab', () => {
    expect(layout).toContain('name="studypack/index"');
    expect(layout).toMatch(/name="studypack\/index"[\s\S]{0,120}title:'Create'/);
  });

  it('no longer exposes the legacy workspace screen as a tab', () => {
    expect(layout).not.toMatch(/name="workspace\/index"[\s\S]{0,120}title:'Create'/);
    expect(layout).toContain("'workspace'");
  });

  it('keeps the Create tab icon', () => {
    expect(layout).toContain("icon('add-circle-outline')");
  });

  it('routes dashboard weak-topic recommendations to Study Pack', () => {
    expect(dashboard).toContain("pathname:'/(main)/studypack'");
    expect(dashboard).not.toContain("pathname:'/(main)/workspace'");
  });

  it('exposes studypack and a single generate route constant', () => {
    expect(routes).toContain("studypack: '/(main)/studypack'");
    expect(routes).toContain("generate: '/(main)/studypack'");
  });

  it('marks the legacy workspace route deprecated', () => {
    expect(routes).toContain('@deprecated');
  });
});

describe('legacy workspace route', () => {
  it('redirects instead of rendering a second generation flow', () => {
    expect(workspace).toContain('Redirect');
    expect(workspace).toContain('ROUTES.main.studypack');
  });

  it('preserves the topic parameter through the redirect', () => {
    expect(workspace).toContain('params.topic');
  });

  it('is still resolvable so old deep links do not 404', () => {
    expect(workspace).toContain('export default');
  });
});

describe('Study Pack screen', () => {
  const screen = read('app/(main)/studypack/index.tsx');

  it('accepts a prefilled topic parameter', () => {
    expect(screen).toContain('useLocalSearchParams');
    expect(screen).toContain('params.topic');
  });

  it('still exports a default screen component', () => {
    expect(screen).toContain('export default function StudyPackScreen');
  });
});
