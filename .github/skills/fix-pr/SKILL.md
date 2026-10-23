---
name: fix-pr
description: Address review feedback or a merge conflict on your own PR, re-run the checks, and hand it back for review. Use when the orchestrator assigns a fix, or the user says "fix PR #N" or "address the review".
---

# Fix your PR

The reviewer sent your PR back with a checklist: **Evidence**, **Blocking** (numbered, each with *Problem*, *Reproduce* and *Fix*) and **Suggestions**. **This is the only round.** The reviewer's next look merges the PR: either as you leave it, or after fixing the build and tests itself. So clear every blocking item now, and settle any disagreement in the PR conversation.

Run one command at a time.

1. **Check out the PR:** `gh pr checkout <N>`
2. **Read the latest review:** `gh pr view <N> --comments`. Copy its numbered **Blocking** list into your working notes: that's your to-do list. Do the cheap **Suggestions** too, if they're quick.
3. **If it conflicts with `main`:**
   ```
   git fetch origin
   git rebase origin/main
   ```
   Resolve the conflicts by keeping both sides' intent. The other side was already reviewed and merged, so don't drop its changes.
4. **For each blocking item, in order:**
   1. **Reproduce it first** with its *Reproduce* command, and see the same failure. If you can't reproduce it, say so in your reply rather than guessing.
   2. Make the *Fix*. Keep the PR's scope: no drive-by refactors.
   3. Run the reproduce command again and see it pass.

   **Disagree with an item?** You may, but only for **non-evidence** items: a Contract interpretation, scope, or a demo concern. Don't change it. Give your reason in your reply instead (step 7), and the reviewer will agree or move it to a follow-up issue. **Build and test items are never up for discussion:** fix them.

   **Missing or failing tests** are the most common blocker. Add real tests that assert the behaviour of the scenarios named, using the `write-tests` skill. Never delete, skip or loosen a test to get green. If the test is wrong because the spec changed, fix the test and say so.
5. **Run the `check` skill.** Build and tests must both pass. This is the evidence the reviewer re-checks.
6. **Push:** `git push --force-with-lease`
7. **Reply with one line per blocking item, using the same numbers.** Write it to `.git/fix-<N>.md` with your file tool:
   ```markdown
   ## Fixed (round <round>)
   - Evidence: build ✔, tests ✔ <n> passed
   1. <title>: <what you changed>, in `<file>`
   2. <title>: **Disagree**: <your reason, one or two sentences>
   3. …
   ```
   then `gh pr comment <N> --body-file .git/fix-<N>.md`
8. **Hand it back:** `gh pr edit <N> --add-label pr:needs-review --remove-label pr:changes`

If a blocking item is really a product decision rather than a code fix, comment the question on the PR and on its issue, label the issue `status:needs-decision`, and stop there.
