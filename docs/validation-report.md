# Validation report

Generated: 2026-08-29 (Asia/Calcutta task context)

## Executed and passed

1. `bash scripts/check.sh` — **PASS**. Project structure, Python syntax, JSON, prohibited-marker scan, and mobile local imports passed; 3 standard-library tests passed.
2. `python3 -m compileall -q backend/app database/migrations` — **PASS** (exit 0).
3. Direct execution of `backend/tests/test_ultra_core.py` — **PASS**, 8/8 checks: citation graph, dedicated research mobile route, no fake fallback, exact offline message, production guards, seven research intents, SSRF policy, upload security hooks.
4. Babel parse of all mobile `.ts`/`.tsx` with TypeScript + JSX plugins — **PASS**, 71 files, 0 syntax errors.
5. JSON/YAML parsing — **PASS**, 11 files at validation time, 0 parse errors.
6. High-confidence secret scan — **PASS**, no API keys, access keys, or private-key blocks detected.
7. Provider URL sanity scan — **PASS**, no malformed compressed/double-braced URL literals.
8. Input ZIP integrity — **PASS**, `unzip -t` reported no errors.

## Executed but unavailable/failed because of environment

- `python3 -m pip install --target /data/pydeps -r backend/requirements.txt` — **NOT TESTED (dependency install unavailable)**. Network/DNS was disabled; pip could not resolve `fastapi==0.116.1`.
- `python3 -m pytest -q` — **NOT TESTED**. `pytest` was not installed and could not be downloaded.
- `npm --prefix mobile run typecheck` — **NOT TESTED with project dependencies**. The extracted archive intentionally had no `node_modules`; Expo/Jest type packages were unavailable. Global TypeScript also reports the project’s legacy `baseUrl` incompatibility. Babel syntax validation passed.
- `npm --prefix mobile run lint` and Jest — **NOT TESTED**. ESLint/Jest binaries were absent and dependencies could not be installed.
- `docker compose config -q` / container builds — **NOT TESTED**. Docker CLI/daemon was unavailable.

## External/system tests not executed

PostgreSQL/pgvector migration upgrade → downgrade → upgrade; Redis/Celery integration; real Tavily/Brave/Serper; production LLM/embedding; SMTP; S3; ClamAV; scanned-PDF quality; cloud OCR; APNs/FCM; Apple/Google signing; Android/iOS device tests; TalkBack/VoiceOver; slow/offline device flows; penetration tests; dependency audits; and load/latency/throughput benchmarks. These require credentials, services, installed dependencies, or devices not present in this environment.

## Honest conclusion

Static structure and core policy checks pass. The project is a staging candidate, **not** certified for public production until the `NOT TESTED` and `FAIL/PARTIAL` items in `PRODUCTION_READINESS.md` are resolved.
