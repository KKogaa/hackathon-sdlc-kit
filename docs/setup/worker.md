# Worker machine

Every teammate runs at least one **worker**: a long-running Copilot agent that asks the orchestrator for work, hands each unit to a specialist (`frontend`, `backend` or `reviewer`) as a subagent, and loops. You watch it and step in when needed. Do [windows-base.md](windows-base.md) first.

## 1. Get the repo

**You own the repo** (you created it, and you may run several workers on this machine): clone it.
```
gh repo clone <org>/<project>
cd <project>
code .
```

**Anyone else: work from a fork.** Your branches then live in your fork, not in the team's repo, and your PRs go from your fork to it. The issues, the board and `main` still come from the team's repo.
```
gh repo fork <org>/<project> --clone
cd <project>
gh repo set-default <org>/<project>
code .
```
- `gh repo fork --clone` sets up `origin` as your fork and `upstream` as the team's repo. That `upstream` remote is how `orchestrate.mjs` knows you're in a fork, so keep the names. Already cloned the team's repo? Run `gh repo fork --remote` in it instead: it renames the existing remote to `upstream` and adds your fork as `origin`.
- `gh repo set-default` makes the `gh` commands the agents run (`gh pr view`, `gh issue view`) talk to the team's repo, not your fork. The script always does, whatever the default.
- You still need **Write** access to the team's repo (the repo owner adds you): workers label issues, and approve and merge each other's PRs.
- Leave **Allow edits by maintainers** on (the default): a reviewer may push a small fix to your PR before merging it.

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
- **GitHub MCP:** the agents use the `github` server from `.vscode/mcp.json` for issues and PRs, and fall back to `gh` without it. The first time it starts, VS Code asks you to sign in to GitHub: use the same account as `gh auth status`.
- **If its chat gets long or slow**, start a new chat and run `/work <lane>` again. Its unfinished unit comes back to it.
- **Step in** when it goes off track: stop it, tell it what's wrong, and run `/work <lane>` again.
- **Ideas for new features:** open a *Feature request* issue on GitHub, and the conductor plans it ([changing-the-plan.md](../changing-the-plan.md)).

## Alternative: Copilot CLI instead of VS Code

Install it the way the conductor does ([conductor.md](conductor.md#1-install-copilot-cli-and-powershell-7)), then in the repo folder:
```
copilot --agent worker --allow-tool "shell(git:*)" --allow-tool "shell(gh:*)" --allow-tool "shell(node:*)" --allow-tool "shell(openspec:*)" --allow-tool "shell(npm:*)" --allow-tool "shell(npx:*)" --allow-tool "github-mcp-server" --enable-all-github-mcp-tools --allow-tool write -i "Start the worker loop. My lane is <lane>."
```
The `--allow-tool` flags pre-approve the routine commands, like the VS Code settings do, and anything else still asks. `--enable-all-github-mcp-tools` gives the built-in GitHub MCP server its write tools (comments, labels), so the agents use it first and fall back to `gh`. The worker starts each specialist with Copilot CLI's `task` tool (`agent_type` = the role), and subagents inherit these permissions. When the session gets long, quit and run the same command again.

## More than one worker on a machine

A worker is identified by `<login>/<folder>`, so each extra worker needs its own folder, a git worktree:
```
node scripts/orchestrate.mjs worktree w2
code ..\<project>-w2
```
Install the dependencies in that folder, then run `/work <lane>` in the new window. Things to know:
- Workers on the **same account never review each other's PRs**, because GitHub forbids self-approval. Reviews always cross accounts.
- Every worker on a machine shares its CPU, RAM and Copilot rate limits. One per machine is the safe default, and two is usually fine.
- Workers branch from main (`upstream/main` in a fork) and never check out `main` itself, because git allows a branch to be checked out in only one worktree at a time. Worktrees share the folder's remotes, so a fork's extra workers are in the fork too.
