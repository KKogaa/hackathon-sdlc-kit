# Hackathon SDLC Kit 🚀

A GitHub template repo that turns **GitHub Copilot** (and any agent that supports `AGENTS.md` or Agent Skills) into a fast, parallel SDLC for a hackathon team.

You make one spec, and from it a backlog of small issues. Then humans and Copilot agents pick issues in parallel and ship small PRs that review and merge fast. The demo stays green throughout.

## What's inside

| Path | Purpose |
|------|---------|
| `.github/skills/*/SKILL.md` | **Agent Skills**: reusable SDLC workflows Copilot loads automatically when a task matches |
| `.github/copilot-instructions.md` | Always-on rules for Copilot in this repo |
| `AGENTS.md` | Workflow, commands and conventions for every agent and human |
| `docs/SPEC.md` | One-page spec and **API contracts**: the key to working in parallel without conflicts |
| `.github/ISSUE_TEMPLATE/` | Task and bug templates with acceptance criteria |
| `.github/pull_request_template.md` | PR checklist |
| `.github/workflows/ci.yml` | Stack-agnostic CI (Node and/or Python, auto-detected) |
| `.github/workflows/copilot-setup-steps.yml` | Environment for the Copilot **coding agent** |
| `scripts/setup-labels.sh` | Creates the labels the skills use |

## The skills

| Skill | SDLC phase | Example prompt |
|-------|-----------|----------------|
| `kickoff` | Plan | "Kickoff: we're building an AI study buddy for Spanish learners" |
| `plan-feature` | Plan | "Break down user auth into issues" |
| `implement-issue` | Build | "Implement #7" or "grab the next ready issue" |
| `write-tests` | Test | "Add tests for the items API" |
| `open-pr` | Ship | "Open a PR" |
| `review-pr` | Review | "Review PR #12" or "review all open PRs" |
| `fix-ci` | Ship | "CI is red, fix it" |
| `standup` | Track | "Standup" or "what should I work on next?" |
| `ship-release` | Release | "Cut the demo release" |
| `demo-prep` | Demo | "Prep the submission and demo script" |

Copilot reads the skill descriptions and loads the right skill automatically. You can also name a skill explicitly ("use the review-pr skill on #12"). Skills work in Copilot agent mode in VS Code, the Copilot CLI, and the Copilot coding agent on github.com. Claude Code and other `AGENTS.md`-aware agents can use the same files.

## Setup (once, about 5 minutes)

1. **Use this template**: click *Use this template* → *Create a new repository*, or run:
   ```bash
   gh repo create <org>/<project> --template KKogaa/hackathon-sdlc-kit --private --clone
   ```
2. Add your teammates as collaborators.
3. Create the labels: `bash scripts/setup-labels.sh`
4. **Protect `main`**: require a PR and a green CI before merging, and turn on squash merge plus auto-delete of head branches.
5. Each teammate turns on agent mode in VS Code Copilot Chat (or installs the Copilot CLI). In VS Code, also check that the `chat.useAgentSkills` setting is enabled.

## Hackathon playbook

**Hour 0: Kickoff (whole team, about 30 minutes)**
- One person runs: *"Use the kickoff skill. We're building …"*
- The team reviews `docs/SPEC.md` together, **especially the API contracts**, and agrees on them.
- Issue #1 (scaffold) goes to one person. That person fills in the `AGENTS.md` Commands section and gets CI green.

**Build loop (everyone, in parallel)**
- Humans: *"Implement the next ready issue in area:frontend"*, then *"Open a PR"*
- Copilot coding agent: assign the `agent:copilot` issues to Copilot (Assignees → Copilot on github.com) and it opens PRs on its own. Several can run at once.
- Reviewer rotation: someone runs *"Review all open PRs"* every 30–60 minutes. Merge anything approved and green.
- Someone runs *"standup"* every couple of hours and pastes the output into the team chat.

**Final 2 hours**
- *"Prep the demo"* produces the README, `docs/DEMO.md`, a seed script, and a list of demo-path risks.
- Feature freeze 1 hour before judging: only `fix:` PRs on the demo path get merged.
- *"Cut the demo release"* tags v1.0.0, deploys, and smoke-tests.

## Rules that keep it fast

1. **Contracts first.** The frontend and backend build against `docs/SPEC.md`, not against each other.
2. **Small PRs** (under 400 lines), one issue each, squash-merged.
3. **Claim before you code**, so the issue shows who is on it.
4. **Never break main.** A red main is p0 for everyone.
