---
name: standup
description: Generate a quick team status report from GitHub: what's merged, in progress, blocked, and at risk for the demo, plus suggested next assignments. Use when the user asks for status, standup, progress, "where are we", or "what should I do next".
---

# Team standup report

## Gather the data

```bash
gh pr list --state merged --search "merged:>=$(date -u -v-3H +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '3 hours ago' +%Y-%m-%dT%H:%M:%SZ)" --json number,title,author
gh pr list --state open --json number,title,author,reviewDecision,statusCheckRollup,isDraft
gh issue list --label "status:in-progress" --json number,title,assignees,updatedAt
gh issue list --label "status:blocked" --json number,title,assignees
gh issue list --label "status:ready" --json number,title,labels
gh api repos/{owner}/{repo}/milestones --jq '.[] | {title, open_issues, closed_issues, due_on}'
```

## Report format

```
## Standup: <time>   MVP: <closed>/<total> issues (<pct>%), <hours> h to deadline

✅ Shipped (last 3h)
⏳ In progress: issue, owner, minutes since last update (flag anything stale >60 min)
👀 PRs needing review: oldest first, plus CI status
🚧 Blocked: issue, reason, what unblocks it
⚠️ Demo risks: p0 issues not started, red CI on main, contract conflicts
👉 Next up: top 3 ready issues, with a suggested owner for each (human or @copilot)
```

Keep it scannable and short enough to paste into the team chat.

If unblocking something is a quick win (for example a PR that only needs one approval), say so explicitly.
