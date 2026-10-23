---
name: implement-issue
description: Pick up a GitHub issue end-to-end: claim it, branch, implement its OpenSpec task group, test, and open a PR. Use when the user says "work on #N", "implement issue N", "next", "pick the next issue", or "grab a task", optionally for a lane such as frontend or backend.
---

# Implement an issue

## 1. Pick and claim

Skip this step if the worker loop handed you the issue: `orchestrate.mjs next` already claimed it.

Otherwise let the orchestrator pick and claim, because it is race-safe against the other 5 workers. Use the user's lane if they named one (`frontend`, `backend`, `ai`, `infra`):
```bash
node scripts/orchestrate.mjs next --lane <lane>
```
It can return a `fix` or `review` instead of an `implement`, because those come first. Handle it as the worker agent's table describes.
For a specific issue `#N`, claim it yourself, then check that you are its only assignee:
```bash
gh issue edit <N> --add-assignee @me --add-label "status:in-progress" --remove-label "status:ready"
gh issue view <N> --json assignees
```

## 2. Branch

```bash
git checkout main && git pull --ff-only
git checkout -b <N>-<short-slug>
```

## 3. Understand

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

Run `bash scripts/check.sh`: OpenSpec validation plus lint, test and build. It is the team's CI, since there are no GitHub Actions. Don't open the PR until it passes.

## 6. Ship

Use the `open-pr` skill.

## If blocked

Comment on the issue explaining the blocker, then swap the labels and release it. Add the blocking issue as `#M` under the issue's `## Depends on` heading (`gh issue edit <N> --body-file …`), so the orchestrator moves it back to ready automatically when `#M` closes. If the blocker is a decision rather than an issue, use `status:needs-decision` instead, as the worker agent's rules describe.
```bash
gh issue comment <N> --body "Blocked: <reason>. Needs #<M>."
gh issue edit <N> --add-label "status:blocked" --remove-label "status:in-progress" --remove-assignee @me
```
