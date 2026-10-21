---
name: review-pr
description: Review a pull request for correctness, contract adherence, security, and demo risk, then leave actionable comments or approve. Use when the user asks to review PR #N, review open PRs, or check a teammate's changes.
---

# Review a pull request

The goal is a **fast, useful** review. Unblock merges and catch real bugs. Skip style nitpicks.

## Steps

1. Load the context:
   ```bash
   gh pr view <N> --comments
   gh pr diff <N>
   gh pr checks <N>
   ```
   Also read the linked issue's acceptance criteria and the relevant `docs/SPEC.md` contracts.

2. Check these, in priority order:
   1. **Does it do what the issue asks?** Go through the acceptance criteria one by one.
   2. **Correctness**: edge cases, null or empty states, async/race issues, error handling.
   3. **Contracts**: API shapes, env vars and DB schema match the spec. If a contract changed, is it documented?
   4. **Security**: no secrets committed, no injection, and auth is checked on new endpoints.
   5. **Merge risk**: does it touch shared files (routes, schema, config) that other open PRs also touch? Check with `gh pr list --state open --json number,files`.
   6. **Tests** exist for the new behavior and CI passes.

3. Leave the feedback:
   - Point inline comments at specific lines, each with a concrete fix.
   - Prefix each comment with **blocking:**, **suggestion:**, or **question:**.
   - Submit the review:
     ```bash
     gh pr review <N> --approve --body "LGTM: <one-line summary>"
     # or
     gh pr review <N> --request-changes --body "<summary of blocking items>"
     ```

4. Only blocking items justify requesting changes. If there are no blocking items, **approve**. Speed matters.

## Batch mode

"Review all open PRs": list them with `gh pr list --state open`, review each one, then print a table of PR, verdict and blocking count.
