---
name: kickoff
description: Turn a hackathon idea into an OpenSpec project brief, one OpenSpec change per MVP slice (with API contracts and task groups), and a spec PR that becomes a GitHub issue backlog when it merges. Use at the very start of the hackathon, or when the user says "kickoff", "we're building X", or "set up the backlog".
---

# Kickoff: idea → OpenSpec → backlog

Goal: within ~30 minutes, the orchestrator can keep every worker agent busy without anyone asking what to do next. Only one person (the conductor) runs this.

## Steps

1. **Clarify the idea.** If the user hasn't stated them, ask in ONE message for:
   - The problem and who has it (1 sentence each)
   - The demo moment: what the judges must see working
   - Hard constraints: the stack the team knows, required APIs or sponsor tech, the deadline

2. **Check the tools**: `openspec --version`, or install it with `npm install -g @fission-ai/openspec@1.14.3`, and `gh auth status`. Create the labels with `node scripts/orchestrate.mjs setup` (safe to re-run). Create the milestone:
   ```
   gh api "repos/{owner}/{repo}/milestones" -f title="MVP" -f due_on="<ISO deadline>"
   ```

3. **Branch**, one command at a time:
   ```
   git checkout main
   git pull --ff-only
   git checkout -b kickoff-spec
   ```

4. **Fill the project brief.** Replace every `<...>` in the `context:` block of `openspec/config.yaml`: problem, demo script (3–5 steps), MVP scope in/out, tech stack with one-line reasons, architecture, lanes. Keep the `rules:` block as it is: it is what makes every agent write issue-ready tasks.

4b. **Respect what the project already has.** The kit is often added to a repo the team created by hand, sometimes already with a framework (for example from `create-next-app`, `vite` or `fastapi`). Look at the repo first (`package.json`, `pyproject.toml`, existing folders). If a stack is already there:
   - take it as decided, and put it in the brief's tech stack
   - fill the **Commands** table in `AGENTS.md` from it right away (Install, Dev, Lint, Test, Build), using commands that work in PowerShell
   - shrink `scaffold` to what's missing (for example tests, lint, or a deploy), instead of creating a new skeleton

5. **Split the MVP into changes.** List 4–8 vertical slices (one user action each: UI + API + data), plus a `scaffold` change. For each one, create a full change with the `openspec-propose` skill (`/opsx-propose` in VS Code): proposal, spec deltas, design and tasks. You are authorized to create all of them in this session without stopping between changes. Requirements:
   - **`scaffold` comes first**: repo skeleton, stack installed, the Install/Lint/Test/Build rows of the **Commands** table in `AGENTS.md` filled in (the `check` skill runs them), hello-world deployed. Its groups are `priority=p0`, with no `agent=auto` and with `assignee=<conductor's GitHub login>` (get it from `gh api user --jq .login`), because the conductor drives it interactively. Every group of every other change depends on its last group, for example `depends=scaffold:2`.
   - **Contracts are the critical path.** Each `design.md` starts with a `## Contracts` section giving exact API shapes. Make contracts between changes agree, for example the frontend change uses the same response shape the backend change defines.
   - **Every task group** in `tasks.md` has the `<!-- issue: ... -->` metadata line described in the `rules:` in `openspec/config.yaml`. Aim for 10–25 groups in total, about half of them `agent=auto`, spread across the 2 lanes (`frontend`, which owns design too, and `backend`), so every worker has work in the first wave. The first frontend group builds the design system (tokens, components, page shell), and the screens depend on it.

6. **Validate**: `openspec validate --all --strict`. Fix anything it reports.

7. **Preview the backlog**: `node scripts/orchestrate.mjs sync --dry-run`. Check that the issue titles, lanes and dependencies make sense, and that the first wave (no dependencies) gives everyone something to do.

8. **Open the spec PR** with the `open-pr` skill, titled `docs(spec): MVP spec and contracts`. This is the moment the team reviews and agrees the contracts together.

9. **After it merges**, start the orchestrator: one Copilot CLI session, with `copilot --agent orchestrator` (see README). Its first tick creates every issue and links the dependencies. The `scaffold` groups carry `assignee=<conductor login>`, so they're created already assigned to the conductor and no worker gets them. Then tell the team to start their workers: `/work <lane>` in VS Code. They review scaffold PRs and otherwise wait until scaffold merges and the board unblocks.

10. **Print the plan**: a table of change, group, lane, size, owner (interactive, or `agent:auto` for any worker) and dependencies, plus who takes `scaffold`.

## Output

- `openspec/config.yaml` with the brief, and one change per MVP slice, validated, in a merged spec PR
- Labels, the MVP milestone, and the issue backlog (created by `orchestrate.mjs sync` after the merge)
- A first-wave assignment plan for the 6 lanes
