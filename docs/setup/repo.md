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

*Settings → Collaborators* → add every teammate with **Write** access. Each worker acts as its teammate's account, so every account needs write access.

## 3. Labels and the worker registry

In the repo folder:
```
node scripts/orchestrate.mjs setup
```
This creates the labels and the **Worker registry** issue, where workers register and the orchestrator posts assignments. It's safe to re-run. Don't close or edit that issue.

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
