---
description: Start this teammate's long-running worker loop for a lane (frontend, backend, ai or infra)
agent: worker
argument-hint: <frontend|backend|ai|infra>
---

Start the worker loop. My lane is the argument after `/work`: one of `frontend`, `backend`, `ai`, `infra`. If none was given, use `any`, which means no lane preference.

Follow your agent instructions exactly, and keep looping: after each unit, report one line and immediately ask `orchestrate.mjs` for the next one. Don't stop to ask me anything.
