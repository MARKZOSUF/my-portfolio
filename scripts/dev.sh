#!/usr/bin/env sh
set -eu
[ -f .env ] || cp .env.example .env
printf 'Set secure values in .env, then run: docker compose up --build\n'
