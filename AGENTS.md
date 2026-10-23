# AGENTS.md

Instructions for AI coding agents (GitHub Copilot in VS Code or the CLI, Claude Code, Codex, etc.) and humans working in this repo.

## How this team works

**One orchestrator** (the `orchestrator` agent, normally a Copilot CLI session on the conductor's machine) assigns all work. **Any number of workers** do it: `/work <lane>` in VS Code, or `copilot --agent worker` in Copilot CLI. A machine can run several workers, each in its own git worktree. The demo team is 6 machines. There are no cloud agents, no GitHub Actions and no server. GitHub issues, PRs, labels and the **Worker registry** issue are the shared state, and `scripts/orchestrate.mjs` reads and writes it.

```
orchestrator (tick, every 30s)                          worker (loop)
  OpenSpec tasks.md ──sync──▶ issues                      work ──▶ {"action": implement | fix | review}
  unblock · archive                                       do it ──▶ PR with <!-- worker:<id> --> (pr:needs-review)
  assign idle workers ──▶ registry comment ◀── poll ──     done ──▶ next unit
```

## Workflow

- **Spec first, in OpenSpec.** The project brief lives in the `context:` of `openspec/config.yaml`, planned work in `openspec/changes/<id>/`, and merged behavior in `openspec/specs/`. The **`## Contracts` section of each change's `design.md` is the source of truth** for API shapes. Read them before writing code.
- **One task group = one issue = one PR.** Each `## N.` group in a change's `tasks.md` becomes an issue. Implement only that group and tick only its boxes.
- **Workers never pick work.** `node scripts/orchestrate.mjs work --lane <lane>` returns the unit the orchestrator assigned, and `done` reports it finished. Only the orchestrator assigns work, so two workers can never take the same item.
- **Exactly one orchestrator runs at a time.** `tick` refuses to start while another orchestrator is active.
- Branch `<issue#>-<slug>` from `origin/main` (never check out `main` itself: worktrees share it), then a small PR (`Closes #N`, `<!-- worker:<id> -->`, label `pr:needs-review`). A worker on another GitHub account reviews it, runs the checks and squash-merges it to `main`.
- Keep PRs under roughly 400 changed lines.
- Use Conventional Commits: `feat|fix|chore|docs|test|refactor(<area>): summary (#N)`
- Every teammate is on **Windows**, in VS Code Copilot (default) or Copilot CLI. The shell can be PowerShell, CMD or Git Bash, so there are **no bash scripts**: automation is Node (`scripts/orchestrate.mjs`, no dependencies) or a skill. Commands in skills are one plain command per line: no `&&` chains, pipes, redirects or `$(...)`, and `"@me"` is always quoted.
- Never push directly to `main`. Never commit secrets. Use `.env` (gitignored) and keep `.env.example` up to date.
- Need a human decision? Comment the question on the issue, label it `status:needs-decision`, and move on.
- **Changing scope mid-event** goes through the orchestrator session (or `/plan`): an OpenSpec change, approved by the conductor in chat, then a spec PR that a worker validates and merges. Issues are only created from specs merged on `origin/main`. Teammates file ideas with the **Feature request** issue template, which workers never pick up.

## Setup

How to set up each machine, by profile: [docs/setup/README.md](docs/setup/README.md). The kit was added to this repo with `npx -y github:KKogaa/hackathon-sdlc-kit`.

## Skills and agents

- Skills in `.github/skills/`: `kickoff`, `plan-feature`, `implement-issue`, `role-backend`, `role-frontend` (frontend owns design), `write-tests`, `check`, `open-pr`, `fix-pr`, `review-pr`, `standup`, `ship-release`, `demo-prep`, plus OpenSpec's `openspec-*` skills. Anthropic's `frontend-design` is **not shipped**: each teammate installs it (`docs/setup/windows-base.md`, step 4).
- Custom agents in `.github/agents/`: `orchestrator` (exactly one: assigns work), `worker` (any number: dispatches each unit), the specialists `frontend` (design included), `backend` and `reviewer` (they do the unit, as a subagent with a fresh context), and `conductor` (planning, decisions, status).
- VS Code prompts in `.github/prompts/`: `/work`, `/orchestrate`, `/kickoff`, `/plan`, `/decide`, `/standup`, `/demo`, plus OpenSpec's `/opsx-*`.

## Commands

| Task    | Command |
|---------|---------|
| Worker: get / finish a unit | `node scripts/orchestrate.mjs work --lane <lane>` / `node scripts/orchestrate.mjs done` |
| Orchestrator: run the board | `node scripts/orchestrate.mjs tick --watch 10` |
| Another worker on this machine | `node scripts/orchestrate.mjs worktree <name>` |
| Board   | `node scripts/orchestrate.mjs status` |
| All checks (the CI) | the `check` skill: Spec validate, then Install/Lint/Test/Build below |
| Labels + worker registry (once) | `node scripts/orchestrate.mjs setup` |
| Spec validate | `openspec validate --all --strict` |
| Install | `TODO` |
| Dev     | `TODO` |
| Lint    | `TODO` |
| Test    | `TODO` |
| Build   | `TODO` |
| Seed    | `TODO` |

The `scaffold` issue fills in the TODO rows, using commands that work in any Windows shell (for example `npm run lint`).

## Deploy

TODO

## Project structure

TODO
