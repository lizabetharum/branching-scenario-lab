#!/usr/bin/env bash
# Pre-deploy gate. Nothing reaches production unless every check passes.
#   npm run release
# Needs ANTHROPIC_API_KEY in .env.local (vercel env pull .env.local).
set -euo pipefail
cd "$(dirname "$0")/.."
PORT=3199
LIVE=https://branching-scenario-lab.vercel.app
MODEL_LABEL="claude-sonnet-5 (tagger, tree, leak check), claude-haiku-4-5 (characters)"

grep -q '^ANTHROPIC_API_KEY=' .env.local || { echo "No ANTHROPIC_API_KEY in .env.local. Run: vercel env pull .env.local"; exit 1; }

echo "1/5 Lint"
npm run lint

echo "2/5 Build (runs map, engine and review-link checks first)"
npm run build

echo "3/5 Mobile layout checks, then AI and guardrail tests, against the production build locally"
npx next start -p $PORT > /tmp/bsl-release.log 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT
for i in $(seq 1 30); do curl -s -o /dev/null "http://localhost:$PORT" && break; sleep 1; done
node scripts/mobile-check.mjs "http://localhost:$PORT"
MODEL_LABEL="$MODEL_LABEL" TARGET_LABEL="production build, run locally before deploy" \
  node scripts/guardrail-tests.mjs "http://localhost:$PORT" --write
kill $SERVER 2>/dev/null || true

echo "4/5 Deploy (rebuilds with the fresh test results)"
npx vercel deploy --prod --yes

echo "5/5 Same tests against the live site"
if ! node scripts/guardrail-tests.mjs "$LIVE"; then
  echo "Live tests failed after deploy. Roll back with: npx vercel rollback"
  exit 1
fi
echo "Release passed."
