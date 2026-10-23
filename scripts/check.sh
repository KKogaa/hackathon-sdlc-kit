#!/usr/bin/env bash
# The team's CI, run locally (there are no GitHub Actions). Workers run it before opening a PR,
# and reviewers run it on the PR merged with main before merging. Exits non-zero on any failure.
# Stack-agnostic: runs whichever toolchains it detects. Tighten it once the stack is chosen.
set -euo pipefail

step() { echo "▶ $*"; "$@"; }

if [ -d openspec ]; then
  if command -v openspec >/dev/null; then step openspec validate --all --strict
  else step npx -y @fission-ai/openspec@1.14.3 validate --all --strict; fi
fi

if [ -f package.json ]; then
  [ -d node_modules ] || step npm ci
  step npm run lint --if-present
  step npm test --if-present
  step npm run build --if-present
fi

if [ -f pyproject.toml ] || [ -f requirements.txt ]; then
  if [ -f pyproject.toml ]; then step uv sync; else [ -d .venv ] || step uv venv; step uv pip install -r requirements.txt; fi
  step uvx ruff check .
  step uv run pytest -q
fi

echo "✔ all checks passed"
