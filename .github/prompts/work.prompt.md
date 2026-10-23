---
description: Start this teammate's long-running worker loop for a lane (frontend or backend)
agent: worker
argument-hint: <frontend|backend> [auto-only]
---

Start the worker loop. My lane is the argument after `/work`: `frontend` or `backend`. If none was given, use `any`, which means no lane preference. If I also wrote `auto-only`, add `--auto-only` to every `orchestrate.mjs work` call, so you take only `agent:auto` issues.

Follow your agent instructions exactly, and keep looping: after each unit, run `orchestrate.mjs done`, report one line, and immediately ask `orchestrate.mjs work` for the next one. Don't stop to ask me anything.
