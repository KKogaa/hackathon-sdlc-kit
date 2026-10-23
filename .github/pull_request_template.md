Closes #

**OpenSpec:** change `<id>`, task group `<n>` (or "none")

## What
-

## Why


## Evidence
<!-- From the `check` skill, run on this branch rebased on main. The reviewer re-runs it. -->
- Build: ✔
- Tests: ✔ <n> passed. New or changed tests: `<test files>`, covering scenarios <names>

## How to test
```

```

## Screenshots or GIF
<!-- Required for UI changes -->

## Risk or notes
<!-- Contract changes (with the design.md / spec delta update), new env vars, migrations. Write "none" if none. -->

- [ ] The `check` skill passes (OpenSpec validate + lint, test, build), and it's pasted under **Evidence**
- [ ] Every changed file with logic has a unit test, and every scenario in my task group has one
- [ ] Only my task group's boxes are ticked in `openspec/changes/<id>/tasks.md`
- [ ] If a contract changed, the change's `design.md` and spec deltas are updated in this PR
