---
name: check
description: Run the team's checks (OpenSpec validation, lint, test, build) and report pass or fail. This is the CI, since there are no GitHub Actions. Use before opening a PR, before merging one in review, when the user says "run the checks", "is it green", or "does main pass".
---

# Run the checks

There is no CI server, so this skill **is** the CI. The author runs it before opening a PR, and the reviewer runs it again on the PR merged with `main`. Both must run the exact same commands, so always take them from `AGENTS.md`. Never improvise them.

## Steps

1. Read the **Commands** table in `AGENTS.md`.
2. Run these in order, one command at a time, from the repo root. Stop at the first failure.
   1. `openspec validate --all --strict`. If the `openspec` command isn't found, run `npx -y @fission-ai/openspec@1.14.3 validate --all --strict` instead.
   2. **Install**, but only if the dependencies aren't installed yet (for example, no `node_modules` folder or no `.venv`)
   3. **Lint**
   4. **Test**
   5. **Build**

   A row that still says `TODO` is skipped **only while `scaffold` itself is being built**, and you say that you skipped it. Once `scaffold` has merged, a `TODO` **Test** or **Build** row is a fail: there's no evidence without them.
3. Report one line per step, either `✔ <step>` or `✘ <step>`. For **Test**, include the numbers from the runner's output, for example `✔ Test: 42 passed`. For a failure, add the relevant 5–15 lines of error output, and the exact command, so someone else can reproduce it.

## Rules

- **Pass** means every step exited with code 0, **and the Test step actually ran tests** (0 tests found counts as a fail). Anything else is a fail. Don't open or merge a PR on a fail.
- **The project builds and its unit tests pass:** that's the evidence every PR is judged on. Lint matters less, but a lint failure is still a fail, and usually the quickest one to fix.
- Never weaken a check to get green: no skipped or deleted tests, no lint rules turned off, no `|| true`. Fix the code. If a test is really wrong because the spec changed, fix the test and say so in the PR.
- The commands have to work in any shell on Windows (PowerShell, CMD or Git Bash). When `scaffold` fills in the table, use plain cross-platform commands such as `npm run lint` or `uv run pytest -q`, never bash-only syntax.
