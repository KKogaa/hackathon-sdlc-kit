# Worker machine

Every teammate runs at least one **worker**: a long-running Copilot agent that asks the orchestrator for work, hands each unit to a specialist (`frontend`, `backend` or `reviewer`) as a subagent, and loops. You watch it and step in when needed. Do [windows-base.md](windows-base.md) first.

## 1. Get the repo

```
gh repo clone <org>/<project>
cd <project>
code .
```

## 2. Pick your lane

The conductor assigns lanes: `frontend` or `backend`. Your lane is a preference: when it's empty, the orchestrator gives your worker work from another lane, and the right specialist does it.

| Lane | Specialist | Work |
|---|---|---|
| `frontend` | `frontend` (an avid designer too) | the design system (tokens, components), screens, copy, state, API wiring |
| `backend` | `backend` | API, data, LLM calls, deploy, chores |

## 3. Start the worker in VS Code (default)

Once the project has dependencies (after `scaffold` merges), install them first with the **Install** command in `AGENTS.md`. Then, in Copilot Chat (agent mode):
```
/work <lane>
```
For example `/work frontend`. Add `auto-only` (`/work frontend auto-only`) if nobody will be watching. It then takes only issues that need no human decisions.

The worker registers itself with the orchestrator and loops all day: get a unit → specialist subagent → PR or review → done → next. Until `scaffold` merges, it mostly waits.

Each unit runs in a **fresh subagent**, so the worker's own chat stays short. The `.vscode/settings.json` setting `chat.customAgentInSubagent.enabled` lets VS Code start the specialist agents as subagents. If your VS Code version doesn't support that, the worker does each unit itself, following the specialist's instructions, and tells you when to start a new chat.

**Check it's working:** the orchestrator window, or `node scripts/orchestrate.mjs status`, lists your worker as `<your login>/<folder>`.

## 4. While it runs

- **Approve** anything it asks permission for. `.vscode/settings.json` auto-approves the routine commands (`git`, `gh`, `node scripts/orchestrate.mjs`, `openspec`, `npm`). If it asks before every command, check those settings under *Settings → Chat*, because names change between VS Code releases.
- **If its chat gets long or slow**, start a new chat and run `/work <lane>` again. Its unfinished unit comes back to it.
- **Step in** when it goes off track: stop it, tell it what's wrong, and run `/work <lane>` again.
- **Ideas for new features:** open a *Feature request* issue on GitHub, and the conductor plans it ([changing-the-plan.md](../changing-the-plan.md)).

## Alternative: Copilot CLI instead of VS Code

Install it the way the conductor does ([conductor.md](conductor.md#1-install-copilot-cli-and-powershell-7)), then in the repo folder:
```
copilot --agent worker --allow-tool "shell(git:*)" --allow-tool "shell(gh:*)" --allow-tool "shell(node:*)" --allow-tool "shell(openspec:*)" --allow-tool "shell(npm:*)" --allow-tool "shell(npx:*)" --allow-tool write -i "Start the worker loop. My lane is <lane>."
```
The `--allow-tool` flags pre-approve the routine commands, like the VS Code settings do, and anything else still asks. The worker starts each specialist with Copilot CLI's `task` tool (`agent_type` = the role), and subagents inherit these permissions. When the session gets long, quit and run the same command again.

## More than one worker on a machine

A worker is identified by `<login>/<folder>`, so each extra worker needs its own folder, a git worktree:
```
node scripts/orchestrate.mjs worktree w2
code ..\<project>-w2
```
Install the dependencies in that folder, then run `/work <lane>` in the new window. Things to know:
- Workers on the **same account never review each other's PRs**, because GitHub forbids self-approval. Reviews always cross accounts.
- Every worker on a machine shares its CPU, RAM and Copilot rate limits. One per machine is the safe default, and two is usually fine.
- Workers branch from `origin/main` and never check out `main`, because git allows a branch to be checked out in only one worktree at a time.
