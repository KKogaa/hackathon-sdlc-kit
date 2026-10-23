---
name: implement-issue
description: Build an assigned GitHub issue end-to-end: branch, implement its OpenSpec task group, test, and open a PR. Use when the user says "work on #N", "implement issue N", "next", "pick the next issue", or "grab a task", optionally for a lane such as frontend or backend.
---

# Implement an issue

## 1. Get the issue

The orchestrator assigns issues, so normally you already have one. The worker loop starts here at step 2.

A human asking for a specific issue outside the loop (*"implement #N"*) is fine **only if it's unassigned**: `gh issue view <N> --json assignees`. Take it with `gh issue edit <N> --add-assignee "@me" --add-label "status:in-progress" --remove-label "status:ready"`. The orchestrator skips assigned issues, so no worker will collide with you.

## 2. Branch

Several workers can share a machine (git worktrees), and only one of them can have `main` checked out, so always branch from `origin/main`. Run one command at a time:
```
git fetch origin
git checkout -b <N>-<short-slug> origin/main
```
If a branch for this issue already exists on `origin` (`git branch -r --list "origin/<N>-*"`), a previous worker started it: check that branch out instead, and continue from where it stopped.

## 3. Understand

- Load your role skill for the issue's `area:` label, if you haven't already: `role-frontend` or `role-backend` (backend also covers issues with no area).
- Read the issue: `gh issue view <N> --comments`. Its first line names the OpenSpec change and task group: `<!-- openspec: change=<id> group=<n> -->`.
- Read the change: `openspec show <id>` or the files in `openspec/changes/<id>/`. Pay attention to the **Contracts** section of `design.md` and the WHEN/THEN scenarios in `specs/`.
- For issues without an OpenSpec marker (bugs, small tasks), read the related spec in `openspec/specs/`.
- Find the existing code you'll touch, and follow its patterns.

## 4. Implement

- Follow the `openspec-apply-change` skill for change `<id>`, **but only for task group `<n>`**. Other groups belong to other people or agents.
- Make the smallest change that satisfies the tasks and scenarios. No drive-by refactors.
- Respect the Contracts. If a contract must change, update the change's `design.md` and spec deltas in the same PR, and call it out.
- Write or update tests using the `write-tests` skill.
- Tick the group's boxes in `openspec/changes/<id>/tasks.md` (`- [x]`) as you finish them.
- Commit in small steps with Conventional Commits that reference the issue:
  `feat(api): add create-item endpoint (#<N>)`

## 5. Verify locally

Run the `check` skill: OpenSpec validation plus lint, test and build. It is the team's CI, since there are no GitHub Actions. Don't open the PR until it passes.

## 6. Ship

Use the `open-pr` skill.

## If blocked

Comment on the issue explaining the blocker, then swap the labels and release it. Add the blocking issue as `#M` under the issue's `## Depends on` heading (`gh issue edit <N> --body-file …`), so the orchestrator moves it back to ready automatically when `#M` closes. If the blocker is a decision rather than an issue, use `status:needs-decision` instead, as the worker agent's rules describe.
```
gh issue comment <N> --body "Blocked: <reason>. Needs #<M>."
gh issue edit <N> --add-label "status:blocked" --remove-label "status:in-progress" --remove-assignee "@me"
```
