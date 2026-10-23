# Machine setup

Every machine on the team runs **Windows**. Pick your profile, follow its page top to bottom, and you're done.

| Profile | Who | How many | Guide | Time |
|---|---|---|---|---|
| **Every machine** | everyone, first | 6 | [windows-base.md](windows-base.md) | ~10 min |
| **Repo owner** | whoever owns the project repo (usually the conductor). Adds the kit to it with one `npx` command, with no cloning of the kit | 1, once per team | [repo.md](repo.md) | ~5 min |
| **Conductor** | the team lead: plans, runs the orchestrator, builds `scaffold` | 1 | [conductor.md](conductor.md) | ~10 min |
| **Worker** | everyone else (the conductor can add one too) | 5+ | [worker.md](worker.md) | ~5 min |

## The 6-machine demo layout

| Machine | Profile | Runs | Lane |
|---|---|---|---|
| 1 | Conductor | the **orchestrator** (Copilot CLI) in the repo folder, plus, once `scaffold` merges, a worker in a second folder (`worktree`) | `backend` |
| 2 | Worker | 1 worker | `frontend` |
| 3 | Worker | 1 worker | `frontend` |
| 4 | Worker | 1 worker | `frontend` |
| 5 | Worker | 1 worker | `backend` |
| 6 | Worker | 1 worker | `backend` |

Lanes are only preferences: an idle worker helps any lane. To add workers later, run a second one on any machine that can take it ([worker.md → More than one worker on a machine](worker.md#more-than-one-worker-on-a-machine)). **Exactly one orchestrator** runs, on machine 1.

## Order on the day

1. Everyone: [windows-base.md](windows-base.md), in parallel.
2. Repo owner: [repo.md](repo.md). It adds the kit to your project and pushes it. Everyone else waits for the repo link, then just clones the project.
3. Conductor: [conductor.md](conductor.md), which covers kickoff, starting the orchestrator, and building `scaffold`.
4. Workers: [worker.md](worker.md). Start as soon as the orchestrator is running. Workers sit idle until `scaffold` merges.

After setup: [playbook.md](../playbook.md) for the day itself, and [changing-the-plan.md](../changing-the-plan.md) for adding features, bugs and priority changes mid-project.
