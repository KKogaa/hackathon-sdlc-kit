---
name: kickoff
description: Turn a hackathon idea into an OpenSpec project brief, one OpenSpec change per MVP slice (with API contracts and task groups), and a spec PR that becomes a GitHub issue backlog when it merges. Use at the very start of the hackathon, or when the user says "kickoff", "we're building X", or "set up the backlog".
---

# Kickoff: idea → OpenSpec → backlog

Goal: within ~30 minutes, the 6 teammates' worker agents can each claim `status:ready` issues without asking anyone. Only one person (the conductor) runs this.

## Steps

1. **Clarify the idea.** If the user hasn't stated them, ask in ONE message for:
   - The problem and who has it (1 sentence each)
   - The demo moment: what the judges must see working
   - Hard constraints: the stack the team knows, required APIs or sponsor tech, the deadline

2. **Check the tools**: `openspec --version`, or install it with `npm install -g @fission-ai/openspec@1.14.3`, and `gh auth status`. Run `bash scripts/setup-labels.sh` (idempotent). Create the milestone:
   ```bash
   gh api repos/{owner}/{repo}/milestones -f title="MVP" -f due_on="<ISO deadline>"
   ```

3. **Branch**: `git checkout main && git pull --ff-only && git checkout -b kickoff-spec`

4. **Fill the project brief.** Replace every `<...>` in the `context:` block of `openspec/config.yaml`: problem, demo script (3–5 steps), MVP scope in/out, tech stack with one-line reasons, architecture, lanes. Keep the `rules:` block as it is: it is what makes every agent write issue-ready tasks.

5. **Split the MVP into changes.** List 4–8 vertical slices (one user action each: UI + API + data), plus a `scaffold` change. For each one, create a full change with the `openspec-propose` skill (`/opsx-propose` in VS Code): proposal, spec deltas, design and tasks. You are authorized to create all of them in this session without stopping between changes. Requirements:
   - **`scaffold` comes first**: repo skeleton, stack installed, lint/test/build scripts wired into `scripts/check.sh`, hello-world deployed. Its groups are `priority=p0` with no `agent=auto` (the conductor drives it interactively). Every group of every other change depends on its last group, for example `depends=scaffold:2`.
   - **Contracts are the critical path.** Each `design.md` starts with a `## Contracts` section giving exact API shapes. Make contracts between changes agree, for example the frontend change uses the same response shape the backend change defines.
   - **Every task group** in `tasks.md` has the `<!-- issue: ... -->` metadata line described in the `rules:` in `openspec/config.yaml`. Aim for 10–25 groups in total, about half of them `agent=auto`, spread across the 4 lanes so all 6 workers have work in the first wave.

6. **Validate**: `openspec validate --all --strict`. Fix anything it reports.

7. **Preview the backlog**: `node scripts/orchestrate.mjs sync --dry-run`. Check that the issue titles, lanes and dependencies make sense, and that the first wave (no dependencies) gives everyone something to do.

8. **Open the spec PR** with the `open-pr` skill, titled `docs(spec): MVP spec and contracts`. This is the moment the team reviews and agrees the contracts together.

9. **After it merges**, run `node scripts/orchestrate.mjs sync` to create every issue and link the dependencies right away. (Any worker's loop would also do it on its next turn.) Then tell the team to start their workers: `/work <lane>` in VS Code.

10. **Print the plan**: a table of change, group, lane, size, owner (interactive, or `agent:auto` for any worker) and dependencies, plus who takes `scaffold`.

## Output

- `openspec/config.yaml` with the brief, and one change per MVP slice, validated, in a merged spec PR
- Labels, the MVP milestone, and the issue backlog (created by `orchestrate.mjs sync` after the merge)
- A first-wave assignment plan for the 6 lanes
