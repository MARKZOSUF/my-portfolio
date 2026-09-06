#!/usr/bin/env sh
set -eu
python3 scripts/validate_project.py
python3 -m unittest discover -s tests -p 'test_*.py'
python3 -m compileall -q backend/app
printf 'Core validation complete. Run Docker and Expo test suites after installing pinned dependencies.\n'
