---
name: plan-feature
description: Break a feature or user story into small, independently shippable GitHub issues with acceptance criteria, labels, and dependencies. Use when the user asks to plan, break down, scope, or create issues or tasks for a feature.
---

# Plan a feature into issues

## Steps

1. Read `docs/SPEC.md` and skim the codebase structure so the issues match reality.
2. Split the feature into issues. Each issue must be:
   - **Small**: one PR, roughly 1–2 hours, touching a limited set of files
   - **Independent**: avoid two issues editing the same file at the same time. If they must, make the dependency explicit.
   - **Testable**: it has concrete acceptance criteria
3. Create each issue with the `Task` template format:

   ```bash
   gh issue create \
     --title "<type>: <imperative summary>" \
     --label "type:feature,size:S,area:backend,status:ready" \
     --milestone "MVP" \
     --body-file /tmp/issue.md
   ```

   Body format:
   ```markdown
   ## Context
   Why this exists. Link the spec section.

   ## Task
   - [ ] Concrete step
   - [ ] Concrete step

   ## Acceptance criteria
   - [ ] Observable behavior (e.g. `POST /api/x` returns 201 with `{id}`)
   - [ ] Tests cover the happy path and one error case

   ## Files likely touched
   `src/...`

   ## Depends on
   #<n> (or "none")
   ```

4. Label issues with dependencies that haven't merged yet as `status:blocked` instead of `status:ready`.
5. Add `agent:copilot` when the issue is unambiguous enough for the Copilot coding agent to do alone.
6. Report back with a table of the created issues and their dependency order.

## Label reference

- type: `type:feature` `type:bug` `type:chore` `type:docs`
- size: `size:S` (<1h) `size:M` (1–2h) `size:L` (split it!)
- area: `area:frontend` `area:backend` `area:infra` `area:ai`
- priority: `priority:p0` (demo-critical) `priority:p1` `priority:p2`
