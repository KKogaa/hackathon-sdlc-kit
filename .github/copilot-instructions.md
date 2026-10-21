# Copilot instructions

This is a time-boxed hackathon project built by several people and Copilot agents working in parallel. Optimize for **shipping a working demo** and **avoiding merge conflicts**.

- Follow `AGENTS.md` (workflow, commands, conventions) and `docs/SPEC.md` (scope, architecture, API contracts).
- Use the skills in `.github/skills/` whenever a task matches one of them. Examples: implementing an issue, opening a PR, reviewing, fixing CI.
- Make the smallest change that meets the issue's acceptance criteria. Don't refactor unrelated code or rename shared things without being asked.
- Don't change API contracts, the DB schema, or shared config unless the issue says to. If you must, update `docs/SPEC.md` in the same PR and flag it in the PR description.
- Add tests for new behavior. Mock external services. Lint, test and build must pass before you open a PR.
- Never commit secrets. Add new env vars to `.env.example`.
- When the work is done, open a PR whose body contains `Closes #<issue>` and follows the PR template.
