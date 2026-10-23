<!-- Agents open PRs with `node scripts/orchestrate.mjs pr`, which adds `Closes #N`, the worker marker and the check results.
     Opening one by hand? Add `Closes #<N>` on the first line, and paste the output of `node scripts/orchestrate.mjs check`. -->

**OpenSpec:** change `<id>`, task group `<n>` (or "none")

## What
-

## Why


## Tests
<!-- New or changed test files, and the spec scenarios they cover -->

## How to test
```

```

## Screenshots or GIF
<!-- Required for UI changes -->

## Risk or notes
<!-- Contract changes (with the design.md / spec delta update), new env vars, migrations. Write "none" if none. -->

- [ ] `orchestrate.mjs check` passes on this commit (OpenSpec validate + lint, test, build)
- [ ] Every changed file with logic has a unit test, and every scenario in my task group has one
- [ ] Only my task group's boxes are ticked in `openspec/changes/<id>/tasks.md`
- [ ] If a contract changed, the change's `design.md` and spec deltas are updated in this PR
