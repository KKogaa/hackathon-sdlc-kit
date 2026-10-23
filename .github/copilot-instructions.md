# Copilot instructions

This is a time-boxed hackathon project. 6 teammates each run a Copilot worker agent locally, all in parallel. Optimize for **shipping a working demo** and **avoiding merge conflicts**.

- Follow `AGENTS.md` (workflow, commands, conventions). The spec lives in **OpenSpec**: the project brief in the `context:` of `openspec/config.yaml`, planned work in `openspec/changes/<id>/`, and merged behavior in `openspec/specs/`.
- Use the skills in `.github/skills/` whenever a task matches one of them, for example implementing an issue, opening a PR or reviewing.
- One orchestrator assigns all work through `node scripts/orchestrate.mjs`. Workers run `work` to get their unit, `done` when they finish it, and `reviewed` after a review. Never pick, claim or reassign work by editing labels or assignees by hand: single-writer assignment is what stops workers from colliding.
- An issue made from OpenSpec starts with `<!-- openspec: change=<id> group=<n> -->`. Implement only that task group, and tick only its boxes in `tasks.md`.
- Make the smallest change that meets the acceptance criteria. Don't refactor unrelated code or rename shared things without being asked.
- Don't change API contracts, the DB schema, or shared config unless the issue says to. Contracts live in the `## Contracts` section of the change's `design.md`. If you must change one, update `design.md` and the spec deltas in the same PR and flag it in the PR description.
- Add tests for new behavior, one per spec scenario. Mock external services. The `check` skill must pass before you open a PR: there is no CI, so it is the CI.
- Never commit secrets. Add new env vars to `.env.example`.
- The team is on Windows, and the shell may be PowerShell, CMD or Git Bash. Run one plain command at a time: no `&&` chains, pipes, redirects or `$(...)`. Write files with the file tool, and quote `"@me"`.
- If you need a human decision, ask it as an issue comment and label the issue `status:needs-decision`. Don't stall the loop waiting.
