---
name: plan-feature
description: Plan a new feature or scope change mid-hackathon as an OpenSpec change whose task groups become GitHub issues when the spec PR merges. Use when the user asks to plan, break down, scope, add a feature, or create issues or tasks for a feature.
---

# Plan a feature

Every feature goes through OpenSpec, so specs and contracts stay the single source of truth. Never create feature issues by hand: `scripts/orchestrate.mjs` creates them from `tasks.md`.

## Steps

1. Get context:
   - `openspec list --json` and `openspec list --specs`: what's planned and what already exists
   - The `context:` block in `openspec/config.yaml`: scope, stack, lanes
   - Skim the codebase structure so the tasks match reality
2. Branch: `git checkout main && git pull --ff-only && git checkout -b spec-<change-name>`
3. Create the change with the `openspec-propose` skill (`/opsx-propose <idea>` in VS Code). If the feature modifies an existing capability, write `MODIFIED` requirements against `openspec/specs/<capability>/spec.md` instead of a new capability.
4. Check `tasks.md` against the `rules:` in `openspec/config.yaml`:
   - **Small**: each `## N.` group is one PR, 1–2 hours
   - **Independent**: groups that can run in parallel don't touch the same files. Otherwise make the dependency explicit with `depends=`.
   - **Testable**: the spec scenarios give concrete acceptance criteria
   - **Routed**: every group has its `<!-- issue: area=... size=... priority=... -->` line, with `agent=auto` when an unattended worker could finish it
5. `openspec validate --all --strict`, then preview with `node scripts/orchestrate.mjs sync --dry-run`.
6. Open the spec PR with the `open-pr` skill: `docs(spec): plan <change-name>`. Workers don't review spec PRs: ask the affected lane owners to look at the Contracts, then the conductor merges it. Once it merges, the next worker loop (or `node scripts/orchestrate.mjs sync`) creates the issues, and free workers claim them.
7. Report a table of the groups: lane, size, agent or human, dependencies.

## Small fixes don't need a change

A bug or a tweak that doesn't change any requirement uses the **Bug** or **Task** issue template directly. Add `status:ready` (and `agent:auto` if it is unambiguous), and the next free worker claims it.
