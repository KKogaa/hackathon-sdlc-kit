# AGENTS.md

Instructions for AI coding agents (GitHub Copilot in VS Code or the CLI, Claude Code, Codex, etc.) and humans working in this repo.

## How this team works

6 teammates each run **one worker agent** locally: `/work <lane>` in VS Code Copilot Chat, or `bash scripts/worker.sh <lane>` with Copilot CLI. There are no cloud agents and no GitHub Actions. GitHub issues, PRs and labels are the shared state, and `scripts/orchestrate.mjs` is the coordinator every worker calls.

```
OpenSpec change (tasks.md) ──sync──▶ issue ──next (claim)──▶ branch <N>-slug ──▶ PR (pr:needs-review)
      ▲                                                                              │
      └── archive issue ◀── all issues closed ◀── unblock dependents ◀── reviewed --merge (another worker)
```

## Workflow

- **Spec first, in OpenSpec.** The project brief lives in the `context:` of `openspec/config.yaml`, planned work in `openspec/changes/<id>/`, and merged behavior in `openspec/specs/`. The **`## Contracts` section of each change's `design.md` is the source of truth** for API shapes. Read them before writing code.
- **One task group = one issue = one PR.** Each `## N.` group in a change's `tasks.md` becomes an issue. Implement only that group and tick only its boxes.
- **Get work from the orchestrator**: `node scripts/orchestrate.mjs next --lane <lane>`. It claims race-safely, so 6 workers never take the same issue or PR.
- Branch `<issue#>-<slug>`, then a small PR (`Closes #N`, label `pr:needs-review`). Another worker reviews it, runs the checks and squash-merges it to `main`.
- Keep PRs under roughly 400 changed lines.
- Use Conventional Commits: `feat|fix|chore|docs|test|refactor(<area>): summary (#N)`
- Never push directly to `main`. Never commit secrets. Use `.env` (gitignored) and keep `.env.example` up to date.
- Need a human decision? Comment the question on the issue, label it `status:needs-decision`, and move on.

## Skills and agents

- Skills in `.github/skills/`: `kickoff`, `plan-feature`, `implement-issue`, `write-tests`, `open-pr`, `review-pr`, `standup`, `ship-release`, `demo-prep`, plus OpenSpec's `openspec-*` skills.
- Custom agents in `.github/agents/`: `worker` (the loop every teammate runs) and `conductor` (planning, decisions, status).
- VS Code prompts in `.github/prompts/`: `/work`, `/kickoff`, `/plan`, `/decide`, `/standup`, `/demo`, plus OpenSpec's `/opsx-*`.

## Commands

| Task    | Command |
|---------|---------|
| Next unit of work | `node scripts/orchestrate.mjs next --lane <lane>` |
| Board   | `node scripts/orchestrate.mjs status` |
| All checks (the CI) | `bash scripts/check.sh` |
| Spec validate | `openspec validate --all --strict` |
| Install | `TODO` |
| Dev     | `TODO` |
| Lint    | `TODO` |
| Test    | `TODO` |
| Build   | `TODO` |
| Seed    | `TODO` |

The `scaffold` issue fills in the TODO rows and makes sure `scripts/check.sh` runs them.

## Deploy

TODO

## Project structure

TODO
