#!/usr/bin/env node
// The team's coordinator. There is no server and no GitHub Actions: every worker agent
// (one per teammate, in VS Code or Copilot CLI) runs this, and GitHub issues, PRs and labels
// are the shared state. Every step is idempotent and safe when 6 workers run it at once.
//
//   node scripts/orchestrate.mjs next [--lane <area>] [--auto-only] [--wait <minutes>]
//       Housekeeping, then decide and claim this worker's next unit of work. Prints one JSON line:
//       {"action":"fix","pr":N} | {"action":"resume","issue":N} | {"action":"review","pr":N}
//       | {"action":"implement","issue":N} | {"action":"idle"}
//   node scripts/orchestrate.mjs reviewed <pr> --merge|--changes
//       After a review: squash-merge (then housekeeping), or hand the PR back to its author.
//   node scripts/orchestrate.mjs sync|unblock|archive|housekeeping [--dry-run]
//   node scripts/orchestrate.mjs status
//
//   sync      Create one issue per "## N. <group>" in openspec/changes/*/tasks.md (closes duplicates)
//   unblock   Move status:blocked issues to status:ready once every "Depends on" issue is closed
//   archive   Open an "archive" issue when every issue of a change is closed

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : dflt;
};
const DRY = flag("dry-run");
const cmd = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.match(/^--(lane|wait)$/)) ?? "status";
const CHANGES_DIR = "openspec/changes";
const PRIORITY = { "priority:p0": 0, "priority:p1": 1, "priority:p2": 2 };
const prio = (i) => PRIORITY[i.labels.find((l) => l in PRIORITY)] ?? 3;

const gh = (ghArgs, input) =>
  execFileSync("gh", ghArgs, { encoding: "utf8", input, stdio: ["pipe", "pipe", "pipe"] }).trim();
const ghJson = (ghArgs) => JSON.parse(gh(ghArgs) || "null");
// Progress goes to stderr so `next` can print exactly one JSON line on stdout.
const log = (...m) => console.error(...m);
function write(desc, ghArgs, input) {
  log(`${DRY ? "[dry-run] " : ""}${desc}`);
  if (!DRY) return gh(ghArgs, input);
}

let repoCache, meCache;
const repo = () => (repoCache ??= gh(["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"]));
const me = () => (meCache ??= gh(["api", "user", "-q", ".login"]));

// ---------- OpenSpec parsing ----------

function parseTasks(md) {
  const groups = [];
  let cur = null;
  for (const line of md.split("\n")) {
    const h = line.match(/^##\s+(\d+)\.\s+(.+?)\s*$/);
    if (h) {
      cur = { n: Number(h[1]), title: h[2], meta: {}, tasks: [] };
      groups.push(cur);
      continue;
    }
    if (!cur) continue;
    const m = line.match(/<!--\s*issue:(.*?)-->/);
    if (m) for (const [, k, v] of m[1].matchAll(/(\w+)=(\S*)/g)) cur.meta[k] = v;
    const t = line.match(/^\s*- \[( |x|X)\]\s+(.*)$/);
    if (t) cur.tasks.push({ done: t[1] !== " ", text: t[2] });
  }
  return groups.filter((g) => g.tasks.length);
}

function activeChanges() {
  if (!existsSync(CHANGES_DIR)) return [];
  return readdirSync(CHANGES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "archive")
    .map((d) => {
      const tasksPath = join(CHANGES_DIR, d.name, "tasks.md");
      return { id: d.name, groups: existsSync(tasksPath) ? parseTasks(readFileSync(tasksPath, "utf8")) : [] };
    });
}

// ---------- GitHub state ----------

const markerRe = /<!--\s*openspec:\s*change=(\S+)\s+(group=(\d+)|archive)\s*-->/;

function loadIssues() {
  const issues = ghJson(["issue", "list", "--state", "all", "--limit", "1000",
    "--json", "number,title,state,labels,assignees,body"]);
  return issues.map((i) => {
    const m = i.body?.match(markerRe);
    return {
      ...i,
      labels: i.labels.map((l) => l.name),
      assignees: i.assignees.map((a) => a.login),
      key: m && `${m[1]}:${m[3] ?? "archive"}`,
      change: m?.[1],
      group: m?.[3] ? Number(m[3]) : undefined,
    };
  });
}

function loadPRs() {
  return ghJson(["pr", "list", "--state", "open", "--limit", "200",
    "--json", "number,title,author,labels,assignees,isDraft,mergeable,headRefName,body"])
    .map((p) => ({ ...p, author: p.author.login, labels: p.labels.map((l) => l.name), assignees: p.assignees.map((a) => a.login) }));
}

// ---------- sync ----------

function issueBody(change, g, depLine) {
  const url = `https://github.com/${repo()}/blob/main/${CHANGES_DIR}/${change}`;
  const files = g.meta.files ? g.meta.files.split(",").map((f) => `\`${f}\``).join(", ") : "see design.md";
  return `<!-- openspec: change=${change} group=${g.n} -->
## Context
OpenSpec change [\`${change}\`](${url}), task group **${g.n}. ${g.title}**.
Before coding, read [proposal.md](${url}/proposal.md), the **Contracts** section of [design.md](${url}/design.md), and the spec deltas in [specs/](${url}/specs).

## Task
${g.tasks.map((t) => `- [ ] ${t.text}`).join("\n")}

## Acceptance criteria
- [ ] Every task in group ${g.n} of \`${CHANGES_DIR}/${change}/tasks.md\` is done and ticked (\`- [x]\`) in the PR
- [ ] The spec scenarios this group implements have passing tests
- [ ] Code matches the Contracts in design.md, or the PR updates design.md and the spec deltas and says so
- [ ] \`bash scripts/check.sh\` passes

## Files likely touched
${files}

## Depends on
${depLine}
`;
}

// Two workers can sync at the same moment and both create an issue. Keep the oldest, close the rest.
function dedupe(issues) {
  const byKey = new Map();
  for (const i of [...issues].sort((a, b) => a.number - b.number)) {
    if (!i.key || i.state !== "OPEN") continue;
    if (!byKey.has(i.key)) byKey.set(i.key, i);
    else if (!i.assignees.length) {
      write(`close duplicate #${i.number} of #${byKey.get(i.key).number}`,
        ["issue", "close", String(i.number), "--reason", "not planned", "--comment", `Duplicate of #${byKey.get(i.key).number}`]);
      i.state = "CLOSED";
      i.key = undefined;
    }
  }
}

function sync(issues) {
  dedupe(issues);
  const changes = activeChanges();
  const byKey = new Map(issues.filter((i) => i.key).map((i) => [i.key, i]));
  const todo = changes.flatMap((c) => c.groups.filter((g) => !byKey.has(`${c.id}:${g.n}`)).map((g) => ({ c, g })));
  if (!todo.length) return log("sync: no new task groups");
  const milestone = ghJson(["api", `repos/${repo()}/milestones`, "--jq", "[.[].title]"]).includes("MVP") ? "MVP" : null;

  const created = [];
  for (const { c, g } of todo) {
    const m = g.meta;
    const deps = (m.depends || "").split(",").filter(Boolean).map((d) => (d.includes(":") ? d : `${c.id}:${d}`));
    const labels = [`type:${m.type || "feature"}`, `status:${deps.length ? "blocked" : "ready"}`];
    if (m.area) labels.push(`area:${m.area}`);
    if (m.size) labels.push(`size:${m.size}`);
    if (m.priority) labels.push(`priority:${m.priority}`);
    if (m.agent === "auto") labels.push("agent:auto");
    const title = `[${c.id}] ${g.n}. ${g.title}`;
    const ghArgs = ["issue", "create", "--title", title, "--label", labels.join(","), "--body-file", "-"];
    if (milestone) ghArgs.push("--milestone", milestone);
    const body = issueBody(c.id, g, deps.length ? "_resolving…_" : "none");
    const url = write(`create issue: ${title}`, ghArgs, body);
    const issue = { number: url ? Number(url.split("/").pop()) : 0, title, state: "OPEN", labels, assignees: [],
      key: `${c.id}:${g.n}`, change: c.id, group: g.n, body };
    byKey.set(issue.key, issue);
    created.push({ issue, g, deps });
  }

  // Second pass: dependencies can point at issues created in this same run.
  for (const { issue, g, deps } of created) {
    if (!deps.length) continue;
    const missing = deps.filter((d) => !byKey.has(d));
    if (missing.length) log(`  ! ${issue.title}: unknown dependency ${missing.join(", ")}`);
    const depLine = deps.map((d) => byKey.get(d)?.number).filter(Boolean).map((n) => `#${n}`).join(", ") || "none";
    issue.body = issueBody(issue.change, g, depLine);
    if (issue.number) write(`  link #${issue.number} -> ${depLine}`, ["issue", "edit", String(issue.number), "--body-file", "-"], issue.body);
  }
  issues.push(...created.map((c) => c.issue));
  if (!DRY) {
    // Catch a concurrent sync by another worker.
    const fresh = loadIssues();
    issues.splice(0, issues.length, ...fresh);
    dedupe(issues);
  }
}

// ---------- unblock ----------

function depsOf(body = "") {
  const section = body.split(/^## Depends on\s*$/m)[1]?.split(/^## /m)[0] ?? "";
  return [...section.matchAll(/#(\d+)/g)].map((m) => Number(m[1]));
}

function unblock(issues) {
  const state = new Map(issues.map((i) => [i.number, i.state]));
  let n = 0;
  for (const i of issues) {
    if (i.state !== "OPEN" || !i.labels.includes("status:blocked")) continue;
    const deps = depsOf(i.body);
    // No issue references means a human blocked it for another reason: leave it alone.
    if (!deps.length || deps.some((d) => state.get(d) !== "CLOSED")) continue;
    write(`unblock #${i.number} (${deps.map((d) => `#${d}`).join(", ")} closed)`,
      ["issue", "edit", String(i.number), "--remove-label", "status:blocked", "--add-label", "status:ready"]);
    i.labels = i.labels.filter((l) => l !== "status:blocked").concat("status:ready");
    n++;
  }
  if (!n) log("unblock: nothing to unblock");
}

// ---------- archive ----------

function archive(issues) {
  let n = 0;
  for (const c of activeChanges()) {
    const mine = issues.filter((i) => i.change === c.id && i.group && i.key);
    const done = c.groups.length > 0 && mine.length >= c.groups.length && mine.every((i) => i.state === "CLOSED");
    if (!done || issues.some((i) => i.key === `${c.id}:archive` && i.state === "OPEN")) continue;
    const body = `<!-- openspec: change=${c.id} archive -->
## Context
Every issue of OpenSpec change \`${c.id}\` is closed. Archiving merges its spec deltas into \`openspec/specs/\`, so later changes build on an up-to-date spec.

## Task
- [ ] Check \`${CHANGES_DIR}/${c.id}/tasks.md\`: tick any box whose work is merged. If something is really missing, open a bug instead of ticking it.
- [ ] \`openspec archive ${c.id} --yes\`
- [ ] \`openspec validate --all --strict\`

## Acceptance criteria
- [ ] \`${CHANGES_DIR}/${c.id}\` is moved to \`${CHANGES_DIR}/archive/\` and \`openspec/specs/\` is updated

## Depends on
none
`;
    const labels = ["type:chore", "size:S", "priority:p1", "area:infra", "status:ready", "agent:auto"];
    const title = `[${c.id}] archive the change`;
    const url = write(`create archive issue for ${c.id}`, ["issue", "create", "--title", title,
      "--label", labels.join(","), "--body-file", "-"], body);
    if (url) issues.push({ number: Number(url.split("/").pop()), title, state: "OPEN", labels, assignees: [], key: `${c.id}:archive`, change: c.id, body });
    n++;
  }
  if (!n) log("archive: no change is ready to archive");
}

// ---------- claiming ----------

// Assign myself, then check who got there first. Of the current assignees (author excluded),
// the one whose latest "assigned" event is oldest wins; the others back off.
// Uses the issues API, so it works for PRs too.
function claim(number, { author } = {}) {
  const path = `repos/${repo()}/issues/${number}/assignees`;
  write(`claim #${number}`, ["api", "-X", "POST", path, "-f", `assignees[]=${me()}`]);
  if (DRY) return true;
  const events = ghJson(["api", "--paginate", "--slurp", `repos/${repo()}/issues/${number}/events?per_page=100`]).flat();
  const current = new Set(ghJson(["api", `repos/${repo()}/issues/${number}`, "--jq", "[.assignees[].login]"]));
  current.delete(author);
  const latest = new Map();
  for (const e of events) if (e.event === "assigned" && current.has(e.assignee?.login)) latest.set(e.assignee.login, e.created_at);
  const winner = [...latest].sort((a, b) => a[1].localeCompare(b[1]))[0]?.[0];
  if (winner === me()) return true;
  write(`  lost #${number} to ${winner}, backing off`, ["api", "-X", "DELETE", path, "-f", `assignees[]=${me()}`]);
  return false;
}

// Bookkeeping after a review: `reviewed <pr> --merge` or `reviewed <pr> --changes`.
function reviewed() {
  const pr = args.find((a) => /^\d+$/.test(a));
  if (!pr || flag("merge") === flag("changes")) throw new Error("usage: reviewed <pr> --merge|--changes");
  if (flag("merge")) {
    write(`merge #${pr}`, ["pr", "merge", pr, "--squash", "--delete-branch"]);
  } else {
    write(`changes requested on #${pr}`, ["pr", "edit", pr, "--add-label", "pr:changes", "--remove-label", "pr:reviewing,pr:needs-review"]);
  }
  // Release the review claim so the next round can go to any reviewer.
  write(`  release #${pr}`, ["api", "-X", "DELETE", `repos/${repo()}/issues/${pr}/assignees`, "-f", `assignees[]=${me()}`]);
  housekeeping(loadIssues());
}

function next() {
  const lane = opt("lane");
  const autoOnly = flag("auto-only");
  const issues = loadIssues();
  sync(issues);
  unblock(issues);
  archive(issues);
  const prs = loadPRs();
  const mine = prs.filter((p) => p.author === me());

  // 1. My PRs that need me: review feedback or a merge conflict.
  const fix = mine.find((p) => p.labels.includes("pr:changes") || p.mergeable === "CONFLICTING");
  if (fix) return { action: "fix", pr: fix.number };

  // 2. Work I claimed but never shipped (e.g. the previous session died).
  const shipped = new Set(mine.flatMap((p) => [...(p.body ?? "").matchAll(/(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?) #(\d+)/gi)].map((m) => Number(m[1]))));
  const resume = issues.find((i) => i.state === "OPEN" && i.assignees.includes(me()) && i.labels.includes("status:in-progress") && !shipped.has(i.number));
  if (resume) return { action: "resume", issue: resume.number };

  // 3. Review a teammate's PR, oldest first. Reviews come before new work so PRs never pile up.
  for (const p of prs.filter((p) => p.author !== me() && !p.isDraft && p.labels.includes("pr:needs-review")).sort((a, b) => a.number - b.number)) {
    if (!claim(p.number, { author: p.author })) continue;
    write(`  review #${p.number}`, ["pr", "edit", String(p.number), "--add-label", "pr:reviewing", "--remove-label", "pr:needs-review"]);
    return { action: "review", pr: p.number };
  }

  // 4. New work: my lane first, then any lane (nobody idles), by priority, oldest first.
  const ready = issues
    .filter((i) => i.state === "OPEN" && !i.assignees.length && i.labels.includes("status:ready") && (!autoOnly || i.labels.includes("agent:auto")))
    .sort((a, b) => (lane ? Number(!a.labels.includes(`area:${lane}`)) - Number(!b.labels.includes(`area:${lane}`)) : 0) || prio(a) - prio(b) || a.number - b.number);
  for (const i of ready) {
    if (!claim(i.number)) continue;
    write(`  start #${i.number}`, ["issue", "edit", String(i.number), "--add-label", "status:in-progress", "--remove-label", "status:ready"]);
    return { action: "implement", issue: i.number };
  }
  return { action: "idle" };
}

// ---------- status ----------

function status() {
  const issues = loadIssues();
  const open = issues.filter((i) => i.state === "OPEN");
  const row = (i) => `  #${i.number} ${i.title}${i.assignees.length ? `  (${i.assignees.join(", ")})` : ""}`;
  for (const s of ["in-progress", "ready", "blocked"]) {
    const list = open.filter((i) => i.labels.includes(`status:${s}`));
    console.log(`\n${s.toUpperCase()} (${list.length})`);
    list.forEach((i) => console.log(row(i)));
  }
  console.log("\nPULL REQUESTS");
  for (const p of loadPRs()) console.log(`  #${p.number} ${p.title} by ${p.author} [${p.labels.filter((l) => l.startsWith("pr:")).join(", ") || "no pr: label"}]`);
  console.log("\nCHANGES");
  for (const c of activeChanges()) {
    const mine = issues.filter((i) => i.change === c.id && i.group && i.key);
    console.log(`  ${c.id}: ${mine.filter((i) => i.state === "CLOSED").length}/${c.groups.length} groups closed`);
  }
}

// ---------- main ----------

const sleep = (s) => execFileSync("sleep", [String(s)]);
const housekeeping = (issues) => [sync, unblock, archive].forEach((step) => step(issues));
const steps = { sync, unblock, archive, housekeeping };

if (cmd === "status") status();
else if (cmd === "next") {
  const deadline = Date.now() + Number(opt("wait", 0)) * 60_000;
  let result = next();
  while (result.action === "idle" && Date.now() < deadline) {
    log("idle: nothing to do yet, checking again in 60s");
    sleep(60);
    result = next();
  }
  console.log(JSON.stringify(result));
} else if (cmd === "reviewed") reviewed();
else if (steps[cmd]) steps[cmd](loadIssues());
else {
  console.error(`unknown command: ${cmd}`);
  process.exit(2);
}
