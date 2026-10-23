# Repo owner: add the kit to your project (once)

One person does this, usually the conductor, after [windows-base.md](windows-base.md). It takes about 5 minutes. **Nobody clones the kit's repository.** The kit is installed into your own project with one `npx` command, and teammates get it by cloning your project.

## 1. Add the kit to your project

**Typical case: you already created the project repo yourself** (empty, or from any template or stack), on GitHub. In PowerShell:
```
gh repo clone <org>/<project>
cd <project>
npx -y github:KKogaa/hackathon-sdlc-kit
```
`npx` downloads the kit straight from GitHub and copies it into the current folder:
- **It never overwrites your files.** Anything that already exists is kept and listed as `skip`, and the kit's lines are appended to your `.gitignore`. Your `README.md` and `package.json` stay yours, because the kit's are never copied.
- If one of the files the kit relies on already existed (for example `AGENTS.md` or `.vscode/settings.json`), it tells you so. Merge it by hand, or re-run with `--force`.
- Add `--dry-run` to preview without writing anything.

Then commit and push the kit **before protecting `main`**. The installer prints these exact commands; run them one at a time:
```
git add -A
git commit -m "chore: add hackathon SDLC kit"
git push
```

**No repo yet?** Either create one from the kit's template, `gh repo create <org>/<project> --template KKogaa/hackathon-sdlc-kit --private --clone`, or make an empty folder and run the same `npx` command in it. The installer then prints the `git init` and `gh repo create` steps.

**Pin the kit version** so the whole event uses one: `npx -y github:KKogaa/hackathon-sdlc-kit#<tag or commit>`.

## 2. Add the team

*Settings → Collaborators* → add every teammate with **Write** access. Each worker acts as its teammate's account, so every account needs write access: workers label issues, and approve and merge each other's PRs.

Teammates other than you work from **forks** of the repo ([worker.md](worker.md#1-get-the-repo)), so their branches don't pile up in it. For a private repo, turn on *Settings → General → Allow forking* (in an organization, the organization must allow forking private repositories too). You don't need a fork: your own sessions, however many, work in the repo itself.

## 3. Labels, the worker registry and the project board

Do this on the account that will run the orchestrator (normally the conductor's). The board is a GitHub Project, so that account needs the `project` scope once:
```
gh auth refresh -s project
```
Then, in the repo folder:
```
node scripts/orchestrate.mjs setup
```
It's safe to re-run. It creates:
- the labels
- the **Worker registry** issue, where workers register and the orchestrator posts assignments. Don't close or edit it.
- the **project board** `<repo> board`, linked to the repo, with a **Stage** field: Requested, Blocked, Ready, In progress, In review, Needs a human, Done. To use a project you already have, run `setup --project <number>` instead. Open the board (the link is in the registry issue and in `orchestrate.mjs status`), and in its board view set **Group by: Stage**, once.

Every issue lands on the board, whoever created it, and its card moves on its own as the work goes. **The board is a view:** dragging a card changes nothing, and the orchestrator moves it back on the next change. To change work, tell the orchestrator, or change labels. Only the orchestrator's account needs the `project` scope; workers never touch the board.

## 4. Protect `main`

*Settings → Branches → Add rule* for `main`:
- **Require a pull request before merging**, with **1 approval**
- **No** required status checks. There is no CI server: the `check` skill runs the checks locally.
- Leave **"Dismiss stale approvals"** and **"Require approval of the most recent reviewable push"** **off**. A reviewer may push a small fix to a PR and then approve it, and those settings would block that.

Then *Settings → General*:
- **Allow squash merging** on, the other merge types off
- **Automatically delete head branches** on

Workers approve each other's PRs under their own accounts, and the orchestrator never gives a worker a PR opened by its own account. So the 1-approval rule never needs a human click.

## 5. Share the link

Post the repo URL in the team chat. Teammates continue with [worker.md](worker.md), and the conductor with [conductor.md](conductor.md).
