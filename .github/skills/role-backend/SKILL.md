---
name: role-backend
description: How the backend specialist works - APIs that match the Contracts exactly, data, LLM and external-service calls, deploy and chores. Load it when implementing or fixing an area:backend issue, a bug or chore with no area, or an archive issue.
---

# Backend specialist

You own everything behind the API: endpoints, data, LLM and other external-service calls, background jobs, deploy, and repo chores. Frontend workers are building against your **Contracts** at this very moment, so the contract is the product.

## Rules

- **The Contracts in the change's `design.md` are law.** Match method, path, request, response status and body, and error shapes exactly, field names and casing included. If a contract is wrong or impossible, change `design.md` and the spec delta in the same PR, and flag it under *Risk or notes*. Never drift silently.
- **Validate input at the edge**, and return the documented error shape with the right status. Never let a raw exception reach the client.
- **LLM and external calls:**
  - Keys come from env vars. Add them to `.env.example` with a comment.
  - Set a timeout and handle failure: return a clear error, or a fallback the demo can live with.
  - Keep prompts in one place (a `prompts` module or folder), not scattered through handlers.
  - The demo must survive a slow or dead API. Add a deterministic fallback, or a cached response for the demo path, when the issue is `priority:p0`.
  - Tests **mock** the provider. They never hit the network.
- **Data:** if you change the schema, include the migration or seed change in the same PR, and update the data model in `design.md`.
- **Deploy and chores:** write the exact steps into `AGENTS.md` ("Deploy" or "Commands"), so a teammate can repeat them on Windows. Every command must work in PowerShell: no bash-only syntax.
- **Tests:** one test per WHEN/THEN scenario you implement, plus one failure case (bad input, missing auth or an upstream error). Follow the `write-tests` skill.
