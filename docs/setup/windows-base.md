# Every machine: Windows base setup

Every teammate does this first, in parallel (~10 min). The kit has **no bash scripts**: automation is either a skill, which the agent runs, or `scripts/orchestrate.mjs`, which is plain Node. So any terminal works: PowerShell (the default), CMD or Git Bash. You don't need WSL.

## 1. Install the tools

In PowerShell:
```
winget install --id Git.Git -e
winget install --id OpenJS.NodeJS.LTS -e
winget install --id GitHub.cli -e
winget install --id Microsoft.VisualStudioCode -e
```
Optional: `winget install --id astral-sh.uv -e`, if the team picks a Python stack.

## 2. Allow npm's command shims to run

Without this, PowerShell blocks `npm`, `npx` and `openspec` with *running scripts is disabled on this system*. Do it once:
```
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

## 3. Sign in and install OpenSpec

**Close and reopen PowerShell** so it picks up the new `PATH`, then:
```
gh auth login
npm install -g @fission-ai/openspec@1.14.3
```
Choose *GitHub.com → HTTPS → Login with a web browser*. Your agents will act as this GitHub account.

## 4. Install the design skill

The frontend agent designs the UI itself (there are no design tools), guided by Anthropic's [`frontend-design`](https://github.com/anthropics/skills/tree/main/skills/frontend-design) skill. The kit doesn't ship it, so install it once for your user:
```
npx -y skills@1.7.4 add anthropics/skills --skill frontend-design --agent github-copilot --global --copy --yes
```
It goes into `%USERPROFILE%\.agents\skills\frontend-design`, which both VS Code Copilot and Copilot CLI load in every repo and worktree. `--copy` avoids symlinks, which Windows restricts.

## 5. VS Code and Copilot

Open VS Code, install the **GitHub Copilot** extension (Copilot Chat comes with it), and sign in with the same GitHub account.

## 6. Check

Each of these should print a version, or *Logged in*:
```
git --version
node --version
gh auth status
openspec --version
npx -y skills@1.7.4 ls -g
```
The last one should list `frontend-design`. In VS Code you can also type `/skills` in Copilot Chat to see the loaded skills.

Now continue with your profile: [repo.md](repo.md), [conductor.md](conductor.md) or [worker.md](worker.md).

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| *running scripts is disabled on this system* | Step 2 |
| The frontend agent says `frontend-design` isn't available | Run step 4, then start a new chat (or restart `copilot`) so it reloads skills |
| `node`, `npm`, `gh` or `openspec`: *not recognized* | Close and reopen the terminal, and VS Code, after installing |
| `npx` stops at *Ok to proceed?* | Add `-y` |
| An agent's command fails on `&&`, `2>/dev/null` or `$(...)` | That's bash syntax, and the shell is PowerShell. The skills avoid it, so tell the agent: *"one plain command at a time, no chaining"* |
| `--add-assignee @me` assigns nobody | PowerShell swallows a bare `@me`. Quote it: `"@me"` |
| `gh auth login` can't open a browser | Choose *Paste an authentication token*, or run `gh auth login --web` |
