"""Static project validation.

Checks required files exist, all Python parses, key JSON parses, no unfinished-work
placeholder markers remain, and every local `@/` mobile import resolves.

Placeholder policy
------------------
Code must not contain unfinished-work markers at all.

Prose (`.md`) is held to a narrower rule. Markers that mean "I stopped working
here" (TODO, FIXME, Coming Soon, Dummy API, Fake Data) are still prohibited. The
phrase "not implemented" is NOT prohibited in prose, because the project is
required to state plainly which features are absent - Apple Sign-In, live OAuth
verification, unexecuted build gates. Deleting those sentences to satisfy a regex
would replace an honest disclosure with a silent omission, which is a worse
defect than the one this check exists to catch. In prose the phrase is only
prohibited when it is used as a status placeholder inside a table cell, e.g.
`| NOT IMPLEMENTED |`.
"""

from pathlib import Path
import ast
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
errors = []

SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".expo", ".gradle", ".cxx",
    "build", "dist", ".venv", "venv",
}


def skipped(path: Path) -> bool:
    return any(part in SKIP_DIRS for part in path.parts)


required = [
    'mobile/app/_layout.tsx',
    'mobile/app/(main)/dashboard/index.tsx',
    'mobile/app/(main)/workspace/index.tsx',
    'mobile/app/(main)/studypack/index.tsx',
    'mobile/android/app/debug.keystore',
    'mobile/services/auth/googleSignIn.ts',
    'backend/app/main.py',
    'backend/app/api/v1/router.py',
    'backend/app/services/google_identity.py',
    'backend/app/pdf/fonts/NotoSans-Regular.ttf',
    'backend/app/pdf/fonts/DroidSansDevanagari-Regular.ttf',
    'backend/app/pdf/fonts/LICENSES/Apache-2.0.txt',
    'database/migrations/versions/0001_initial_initial_users_auth.py',
    'docker-compose.yml',
    '.env.example',
    'backend/.env.example',
    'README.md',
]
for x in required:
    if not (ROOT / x).exists():
        errors.append(f'missing {x}')

# The obsolete billing doc must stay deleted.
if (ROOT / 'docs/BILLING.md').exists():
    errors.append('docs/BILLING.md documents a removed feature and must not exist')

for p in ROOT.rglob('*.py'):
    if skipped(p):
        continue
    try:
        ast.parse(p.read_text(errors='ignore'), filename=str(p))
    except SyntaxError as e:
        errors.append(f'python syntax {p.relative_to(ROOT)}:{e.lineno}: {e.msg}')

for p in [ROOT / 'mobile/package.json', ROOT / 'mobile/app.json',
          ROOT / 'mobile/eas.json', ROOT / 'PROJECT_MANIFEST.json']:
    try:
        json.loads(p.read_text())
    except Exception as e:
        errors.append(f'json {p.name}: {e}')

CODE_MARKERS = re.compile(
    r'\b(TODO|FIXME|Coming Soon|Not Implemented|Dummy API|Fake Data)\b', re.I)
PROSE_MARKERS = re.compile(
    r'\b(TODO|FIXME|Coming Soon|Dummy API|Fake Data)\b', re.I)
# "| NOT IMPLEMENTED |" used as a status placeholder in a table cell.
PROSE_STATUS_PLACEHOLDER = re.compile(r'\|\s*NOT IMPLEMENTED\s*\|', re.I)

for p in ROOT.rglob('*'):
    if not p.is_file() or p.suffix not in {'.py', '.ts', '.tsx', '.md', '.yml', '.yaml'}:
        continue
    if skipped(p) or p.resolve() == Path(__file__).resolve():
        continue
    text = p.read_text(errors='ignore')
    if p.suffix == '.md':
        if PROSE_MARKERS.search(text) or PROSE_STATUS_PLACEHOLDER.search(text):
            errors.append(f'prohibited placeholder marker in {p.relative_to(ROOT)}')
    elif CODE_MARKERS.search(text):
        errors.append(f'prohibited placeholder marker in {p.relative_to(ROOT)}')

# Validate local @/ imports resolve to a .ts/.tsx/index target.
for p in (ROOT / 'mobile').rglob('*.ts*'):
    if skipped(p):
        continue
    for imp in re.findall(r"from ['\"]@/([^'\"]+)['\"]", p.read_text(errors='ignore')):
        base = ROOT / 'mobile' / imp
        if not any(x.exists() for x in [base.with_suffix('.ts'), base.with_suffix('.tsx'),
                                        base / 'index.ts', base / 'index.tsx']):
            errors.append(f'unresolved mobile import {imp} in {p.relative_to(ROOT)}')

if errors:
    print('\n'.join('ERROR ' + x for x in errors))
    sys.exit(1)
print('Project structure, Python syntax, JSON, placeholders, and mobile local imports validated.')
