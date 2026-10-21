---
name: implement-issue
description: Pick up a GitHub issue end-to-end: claim it, branch, implement, test, and open a PR. Use when the user says "work on #N", "implement issue N", "pick the next issue", or "grab a task".
---

# Implement an issue

## 1. Pick and claim

If no issue number is given, pick the highest-priority unassigned ready issue:
```bash
gh issue list --label "status:ready" --search "no:assignee sort:created-asc" --limit 10
```
Prefer `priority:p0`. Then claim it so no teammate duplicates the work:
```bash
gh issue edit <N> --add-assignee @me --add-label "status:in-progress" --remove-label "status:ready"
```

## 2. Branch

```bash
git checkout main && git pull --ff-only
git checkout -b <N>-<short-slug>
```

## 3. Understand

- Read the issue: `gh issue view <N> --comments`
- Read the relevant parts of `docs/SPEC.md`, especially the API contracts
- Find the existing code you'll touch, and follow its patterns

## 4. Implement

- Make the smallest change that satisfies the acceptance criteria. No drive-by refactors.
- Respect the contracts in `docs/SPEC.md`. If a contract must change, update the spec in the same PR and call it out.
- Write or update tests using the `write-tests` skill.
- Commit in small steps with Conventional Commits that reference the issue:
  `feat(api): add create-item endpoint (#<N>)`

## 5. Verify locally

Run the project's lint, test and build commands. They're listed in `AGENTS.md` under "Commands". Don't open the PR until they pass.

## 6. Ship

Use the `open-pr` skill.

## If blocked

Comment on the issue explaining the blocker, then swap the labels:
```bash
gh issue comment <N> --body "Blocked: <reason>. Needs #<M>."
gh issue edit <N> --add-label "status:blocked" --remove-label "status:in-progress"
```
