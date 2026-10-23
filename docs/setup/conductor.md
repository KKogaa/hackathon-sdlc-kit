# Conductor machine

The conductor plans, runs the **orchestrator**, answers the questions workers park, and builds `scaffold`. One person, on machine 1. Do [windows-base.md](windows-base.md) first, and [repo.md](repo.md) if you're also the repo owner.

## 1. Install Copilot CLI and PowerShell 7

The orchestrator runs best as a long Copilot CLI session. On Windows, Copilot CLI runs commands in PowerShell 7.
```
winget install --id Microsoft.PowerShell -e
npm install -g @github/copilot
```
Close and reopen the terminal, run `copilot`, and sign in when it asks (or type `/login`). Then `/exit`.

## 2. Get the repo

If you didn't create it yourself:
```
gh repo clone <org>/<project>
cd <project>
```
This folder is **the orchestrator's folder**. It also plans features there on short-lived branches. Your own worker will get a separate folder later (step 6).

## 3. Kickoff (with the team, ~30 min)

Open the folder in VS Code, and in Copilot Chat run:
```
/kickoff <what we're building>
```
It writes the OpenSpec brief and changes, including a `scaffold` change reserved for you (`assignee=<your login>`), and opens the spec PR. **Review the Contracts together.** A teammate approves the PR on GitHub, then you merge it.

## 4. Start the orchestrator

In PowerShell, in the repo folder:
```
copilot --agent orchestrator --allow-tool "shell(node:*)" --allow-tool "shell(gh:*)" --allow-tool "shell(git:*)" --allow-tool "shell(openspec:*)" --allow-tool "github-mcp-server" --enable-all-github-mcp-tools --allow-tool write -i "Start orchestrating."
```
It runs `setup` (safe to repeat), then loops on `node scripts/orchestrate.mjs tick --watch 10`. Every 30 seconds that creates issues from merged specs, unblocks, archives, assigns work and moves the cards on the project board, and after each 10-minute round it reports what needs a human. Your account needs the `project` scope for the board (`gh auth refresh -s project`, see [repo.md](repo.md#3-labels-the-worker-registry-and-the-project-board)). Its first tick creates every issue, and the `scaffold` issues come out already assigned to you.

- **Leave this window open all day.** When the session gets long, quit and run the same command again: all state lives in GitHub, so nothing is lost.
- **Exactly one per team.** If a second orchestrator is started by mistake, it refuses to run.
- **If it stops,** workers finish their current unit and then wait. Their `work` command says the orchestrator isn't running.
- **No Copilot CLI?** In VS Code, `/orchestrate` starts the same agent. The CLI is preferred for a loop that runs all day.

**Talking to it:** press **Esc**, then type, for example *"add feature: …"*, *"bug: …"*, *"make #23 p0"*, *"drop #31"*, *"pause"* or *"what's happening?"*. See [changing-the-plan.md](../changing-the-plan.md).

## 5. Build `scaffold`

In VS Code (Copilot Chat, agent mode): *"implement #<scaffold issue>"*. That covers the repo skeleton, the stack installed, the Install/Lint/Test/Build rows of the **Commands** table in `AGENTS.md` (the `check` skill runs them), and hello world deployed. Every other issue depends on it, so it's the team's critical path. Open its PR. The orchestrator gives the review to a worker.

## 6. Add your own worker (after scaffold merges)

So that the orchestrator's folder stays free, your worker gets its own folder:
```
node scripts/orchestrate.mjs worktree w1
code ..\<project>-w1
```
Install the project's dependencies there (the Install command in `AGENTS.md`), then in that VS Code window's Copilot Chat:
```
/work backend
```

## During the day

- Keep an eye on the orchestrator window. It surfaces parked decisions, stuck workers, feature requests and an empty or blocked backlog, and posts a short status every ~30 minutes.
- Answer decisions right in that window, or with `/decide` in VS Code.
- Final 2 hours: `/demo` in VS Code, then a feature freeze, then *"cut the demo release"*. Stop the workers, then the orchestrator.
- The whole day, hour by hour: [playbook.md](../playbook.md).
