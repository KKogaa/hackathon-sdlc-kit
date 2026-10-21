---
name: kickoff
description: Turn a hackathon idea into a one-page spec, a tech-stack decision, and a prioritized GitHub issue backlog that the team and Copilot agents can work in parallel. Use at the very start of the hackathon, or when the user says "kickoff", "we're building X", or "set up the backlog".
---

# Kickoff: idea → spec → backlog

Goal: within ~30 minutes, every teammate (human or agent) can grab a `status:ready` issue without asking anyone.

## Steps

1. **Clarify the idea**. If the user hasn't stated them, ask in ONE message for:
   - The problem and who has it (1 sentence each)
   - The demo moment: what the judges must see working
   - Hard constraints (stack the team knows, required APIs or sponsor tech, deadline)

2. **Write `docs/SPEC.md`** using the existing template in that file. Keep it to one page:
   - Problem, users, demo script (3–5 steps)
   - MVP scope: what's **in** and what's explicitly **out**
   - Architecture: components plus a mermaid diagram
   - Tech stack, with a one-line reason for each choice
   - API contracts and data model between components. **This is what lets people work in parallel.** Define the interfaces first.

3. **Ensure labels exist**: run `bash scripts/setup-labels.sh` (it's idempotent).

4. **Create a milestone** for the MVP:
   ```bash
   gh api repos/{owner}/{repo}/milestones -f title="MVP" -f due_on="<ISO deadline>"
   ```

5. **Create the backlog** by applying the `plan-feature` skill to each MVP component. Rules:
   - Issue #1 is always **scaffold**: repo skeleton, the stack installed, CI green, a hello-world deployed. Everything else is blocked on it.
   - Prefer vertical slices (UI + API + data for one user action) over horizontal layers.
   - Each issue fits a single PR and roughly 1–2 hours of work.
   - Label issues that a Copilot coding agent can do unattended with `agent:copilot`. These are well-specified, low-ambiguity, and have clear acceptance criteria.

6. **Print a summary table**: issue #, title, size, area, suggested owner (a human or `@copilot`), dependencies.

## Output

- `docs/SPEC.md` committed on `main` with the message `docs: add hackathon spec`
- Labels, the MVP milestone, and 8–20 issues
- A suggested assignment plan, so the team can split up immediately
