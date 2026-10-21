# AGENTS.md

Instructions for AI coding agents (GitHub Copilot, Claude Code, Codex, etc.) and humans working in this repo.

## Workflow

GitHub issue → branch `<issue#>-<slug>` → small PR (`Closes #N`) → review → squash-merge to `main`.

- Read `docs/SPEC.md` before writing code. Its **API contracts are the source of truth**.
- One issue per PR. Keep PRs under roughly 400 changed lines.
- Use Conventional Commits: `feat|fix|chore|docs|test|refactor(<area>): summary (#N)`
- Never push directly to `main`. Never commit secrets. Use `.env` (gitignored) and keep `.env.example` up to date.
- Claim an issue before starting it, so nobody duplicates the work (see the `implement-issue` skill).

## Skills

Reusable workflows live in `.github/skills/`: `kickoff`, `plan-feature`, `implement-issue`, `write-tests`, `open-pr`, `review-pr`, `fix-ci`, `standup`, `ship-release`, `demo-prep`.

## Commands

<!-- Fill these in during the scaffold issue. Agents rely on them. -->
| Task    | Command |
|---------|---------|
| Install | `TODO`  |
| Dev     | `TODO`  |
| Lint    | `TODO`  |
| Test    | `TODO`  |
| Build   | `TODO`  |
| Seed    | `TODO`  |

## Deploy

<!-- Fill in during scaffold: where it's hosted, how to deploy, required env vars. -->
TODO

## Project structure

<!-- Fill in during scaffold. -->
TODO
