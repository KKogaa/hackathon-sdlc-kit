# AGENTS.md

Instructions for AI coding agents and humans working in this repo. The full project brief (problem, demo script, scope) is the `context:` in `openspec/config.yaml`.

## Project

TODO: the `kickoff` skill fills this in.

- What it is: TODO, one line
- Backend: TODO, `TypeScript + Fastify` or `Java + Quarkus`
- Frontend: TODO, e.g. `React + TypeScript (Vite)`
- Data and other services: TODO

**Coding standards** are in `.github/instructions/`, and Copilot loads them by file type. `coding-standards` applies to every file. Then, by stack:

| Stack | Standards |
|---|---|
| Frontend | `typescript`, `react` |
| Backend `TypeScript + Fastify` | `backend-architecture`, `typescript`, `fastify` |
| Backend `Java + Quarkus` | `backend-architecture`, `java`, `quarkus` |

Read the ones for your lane before writing code, if they aren't already in your context. A PR that breaks them doesn't pass review.

## Project structure

TODO: the `kickoff` skill writes the planned layout, and `scaffold` corrects it to match the real tree. One line per top-level folder, with the lane that owns it, for example:

```
web/        frontend: screens, components, design tokens
api/        backend: one folder per feature, each with domain/, application/, adapters/ (pragmatic hexagonal)
db/         backend: schema, migrations, seed
```

Stay inside your lane's folders. Edit another lane's files only when the issue says to.

## Commands

| Task    | Command |
|---------|---------|
| Spec validate | `openspec validate --all --strict` |
| Install | `TODO` |
| Dev     | `TODO` |
| Lint    | `TODO` |
| Test    | `TODO` |
| Build   | `TODO` |
| Seed    | `TODO` |

The `check` skill runs Spec validate, then Install, Lint, Test and Build: it is the CI. `scaffold` fills in the TODO rows with commands that work in any Windows shell (for example `npm run lint`).

## Rules

- **Spec first.** Planned work is in `openspec/changes/<id>/`, merged behavior in `openspec/specs/`. The `## Contracts` section of each change's `design.md` is the source of truth for API shapes. Read it before writing code, and don't change it unless the issue says to.
- **One task group = one issue = one PR.** Implement only the group your issue names, and tick only its boxes in `tasks.md`.
- **Never pick work yourself.** `node scripts/orchestrate.mjs work --lane <lane>` returns your assigned unit, and `done` reports it finished. Don't claim or reassign issues by editing labels or assignees.
- Branch `<issue#>-<slug>` from `origin/main`, and never check out `main` itself (worktrees share it). Never push to `main`.
- Small PRs, under roughly 400 changed lines: `Closes #N`, `<!-- worker:<id> -->`, label `pr:needs-review`.
- Conventional Commits: `feat|fix|chore|docs|test|refactor(<area>): summary (#N)`
- **Windows, any shell** (PowerShell, CMD or Git Bash). No bash scripts: automation is Node or a skill. One plain command per line: no `&&` chains, pipes, redirects or `$(...)`, and `"@me"` is always quoted.
- Never commit secrets. Use `.env` (gitignored) and add new env vars to `.env.example`.
- Need a human decision? Comment the question on the issue, label it `status:needs-decision`, and move on.
- New scope goes through `/plan` (an OpenSpec change and a spec PR), never through issues created by hand.

## Deploy

TODO: `scaffold` writes the steps for the hello-world deploy, and `ship-release` follows them.
