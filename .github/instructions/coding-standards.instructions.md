---
applyTo: "**"
description: Good practices for every file in this repo, whatever the language. The stack-specific standards are in the other files in this folder.
---

# Coding standards: all code

Stack-specific standards load next to this file: `typescript`, `react` and `fastify`, or `java` and `quarkus`. Which backend the team chose is in `## Project` in `AGENTS.md`.

## Write code a teammate can take over

- Match the surrounding code: its naming, structure, comment density and idioms. Consistency beats your preference.
- Names say what a thing is or does: `unpaidInvoices`, not `data2`. Booleans read as questions: `isActive`, `hasAccess`.
- Small functions that do one thing. Return early instead of nesting. If a function needs a comment to explain *what* it does, split or rename it.
- Comments explain *why* (a constraint, a workaround, a decision), never *what* the next line does.
- No dead code, commented-out code, `console.log` / `System.out` debugging or TODOs without an issue number.
- No magic numbers or strings: name them as constants, or put them in config.

## Keep the change small

- Change only what the issue needs. No drive-by refactors, renames or reformatting of code you didn't touch: they cause merge conflicts with the other workers.
- No new dependency without a reason in the PR body. Prefer the standard library and what's already installed.
- No speculative abstractions: no interface with one implementation, no generic helper for one caller, no config for a value that never changes.

## Errors

- Fail loudly at the boundary, with a clear message. Never swallow an exception or return a silent default that hides a bug.
- Validate every input that crosses a boundary (HTTP request, env var, file, external API response) once, at the edge. Inside, trust the validated types.
- Errors returned to clients use the shape in the Contracts, never a stack trace or a raw exception message.

## Security

- No secrets in code, tests, fixtures, logs or PR bodies. Config comes from env vars, listed in `.env.example`.
- Never build SQL, shell commands or HTML by concatenating input. Use parameters, argument arrays and the framework's escaping.
- Don't log personal data, tokens or full request bodies.

## Tests

- Each WHEN/THEN scenario you implement gets a test named after it. Add one failure case.
- Tests are deterministic: no network, no real time or randomness without control, no order dependence.
- Test behavior through the public surface (the route, the component), not private helpers.
