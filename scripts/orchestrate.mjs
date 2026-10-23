#!/usr/bin/env node
// Coordinates one orchestrator and any number of workers through GitHub, with no server and no
// GitHub Actions. Pure Node plus `gh` and `git`, so it runs the same in PowerShell, CMD or Git Bash.
//
// Who writes what (every piece of state has exactly one writer, so nothing can race):
//   - The ORCHESTRATOR (exactly one, normally a Copilot CLI session running the `orchestrator`
//     agent) creates issues from OpenSpec, unblocks, archives, and assigns work.
//   - Each WORKER (any number, several per machine via git worktrees) keeps one heartbeat comment
//     on the "worker registry" issue and reads its assignment from the orchestrator's comment there.
//
// Orchestrator:
//   node scripts/orchestrate.mjs setup                     Labels + the worker registry issue (once per repo)
//   node scripts/orchestrate.mjs tick [--watch <minutes>]  Housekeeping + assign work. --watch repeats every 30s
//   node scripts/orchestrate.mjs take <change-id>          Assign a change's open issues to me (e.g. scaffold)
// Worker:
//   node scripts/orchestrate.mjs work [--lane <area>] [--auto-only] [--wait <minutes>] [--worker <id>]
//       Heartbeat, then print my assignment as one JSON line, including the specialist role to hand it to:
//       {"action":"implement","issue":N,"role":"frontend"} | {"action":"fix","pr":N,"role":"backend"}
//       | {"action":"review","pr":N,"role":"reviewer"} | {"action":"idle"}
//   node scripts/orchestrate.mjs done [--worker <id>]      I finished my assignment
//   node scripts/orchestrate.mjs reviewed <pr> --merge|--changes --body-file <file>
//       Posts the review (approve / request changes) and merges or hands back. A PR can be sent back only ONCE.
//   node scripts/orchestrate.mjs worktree <name>           Make ../<repo>-<name> for another worker on this machine
// Anyone:
//   node scripts/orchestrate.mjs status
//   node scripts/orchestrate.mjs sync|unblock|archive|housekeeping [--dry-run] [--local]
//       Issues are made from the OpenSpec changes merged on origin/main. `sync --dry-run --local` previews
//       the changes in this folder instead (e.g. a feature you're planning, before its spec PR merges).
//
// A worker's id defaults to "<gh login>/<folder name>", so each worktree is its own worker.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const args = process.argv.slice(2);
const VALUE_OPTS = new Set(["--lane", "--wait", "--watch", "--worker", "--body-file"]);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : dflt;
};
const positional = args.filter((a, i) => !a.startsWith("--") && !VALUE_OPTS.has(args[i - 1]));
const cmd = positional[0] ?? "status";
const DRY = flag("dry-run");

const CHANGES_DIR = "openspec/changes";
const REGISTRY_LABEL = "orchestrator";
const POLL_S = 30;
const LIVE_MS = 5 * 60_000; // an idle worker polls every 30s; silent for 5 min = not running
const QUIET_MS = 150 * 60_000; // a unit running this long (sizes are 1-2h) gets flagged to the orchestrator agent
const RELEASE_MS = 4 * 60 * 60_000; // a unit this old whose worker is also silent this long is handed to someone else
const PRIORITY = { "priority:p0": 0, "priority:p1": 1, "priority:p2": 2 };
// Lanes are the `area:` labels. Each maps to the specialist agent (.github/agents/<role>.agent.md) that does the work.
// Anything without an area (bugs, chores, archive issues) goes to the backend specialist.
const ROLES = { "area:frontend": "frontend", "area:backend": "backend" };
const LANES = ["frontend", "backend", "any"];
const roleOf = (labels) => ROLES[labels.find((l) => l in ROLES)] ?? "backend";
const prio = (i) => PRIORITY[i.labels.find((l) => l in PRIORITY)] ?? 3;

const gh = (ghArgs, input) =>
  execFileSync("gh", ghArgs, { encoding: "utf8", input, stdio: ["pipe", "pipe", "pipe"] }).trim();
const ghJson = (ghArgs, input) => JSON.parse(gh(ghArgs, input) || "null");
function usage(text) {
  console.error(`usage: node scripts/orchestrate.mjs ${text}`);
  process.exit(2);
}
// Progress goes to stderr so `work` can print exactly one JSON line on stdout.
const log = (...m) => console.error(...m);
function write(desc, ghArgs, input) {
  log(`${DRY ? "[dry-run] " : ""}${desc}`);
  if (!DRY) return gh(ghArgs, input);
}
// Blocks without spawning `sleep`, which doesn't exist when node runs from PowerShell on Windows.
const sleep = (s) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, s * 1000);
const minutes = (ms) => Math.round(ms / 60_000);

let repoCache, meCache;
const repo = () => (repoCache ??= gh(["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"]));
const me = () => (meCache ??= gh(["api", "user", "-q", ".login"]));
const myId = () => opt("worker") ?? `${me()}/${basename(process.cwd())}`;

// ---------- OpenSpec parsing ----------

function parseTasks(md) {
  const groups = [];
  let cur = null;
  for (const line of md.split(/\r?\n/)) {
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

// Issues are only ever made from what is merged: the changes on origin/main, read straight from git, so
// whatever is checked out or half-written in this folder (a feature being planned) can't leak onto the board.
// `--local` reads this folder instead, to preview an unmerged change with `sync --dry-run --local`.
let lastFetch = 0;
function activeChanges() {
  if (flag("local")) {
    if (!existsSync(CHANGES_DIR)) return [];
    return readdirSync(CHANGES_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== "archive")
      .map((d) => {
        const tasksPath = join(CHANGES_DIR, d.name, "tasks.md");
        return { id: d.name, groups: existsSync(tasksPath) ? parseTasks(readFileSync(tasksPath, "utf8")) : [] };
      });
  }
  const git = (a) => execFileSync("git", a, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (Date.now() - lastFetch > 20_000) {
    git(["fetch", "--quiet", "origin", "main"]);
    lastFetch = Date.now();
  }
  let dirs;
  try {
    dirs = git(["ls-tree", "-d", "--name-only", `origin/main:${CHANGES_DIR}`]).split(/\r?\n/).filter((d) => d && d !== "archive");
  } catch {
    return []; // no openspec/changes on main yet
  }
  return dirs.map((id) => {
    let md = "";
    try {
      md = git(["show", `origin/main:${CHANGES_DIR}/${id}/tasks.md`]);
    } catch {}
    return { id, groups: parseTasks(md) };
  });
}

// ---------- GitHub state ----------

const markerRe = /<!--\s*openspec:\s*change=(\S+)\s+(group=(\d+)|archive)\s*-->/;
const prWorkerRe = /<!--\s*worker:(\S+)\s*-->/;

function loadIssues() {
  const issues = ghJson(["issue", "list", "--state", "all", "--limit", "1000",
    "--json", "number,title,state,labels,assignees,body"]);
  return issues
    .map((i) => {
      const m = i.body?.match(markerRe);
      return {
        ...i,
        labels: i.labels.map((l) => l.name),
        assignees: i.assignees.map((a) => a.login),
        key: m && `${m[1]}:${m[3] ?? "archive"}`,
        change: m?.[1],
        group: m?.[3] ? Number(m[3]) : undefined,
      };
    })
    .filter((i) => !i.labels.includes(REGISTRY_LABEL));
}

function loadPRs() {
  return ghJson(["pr", "list", "--state", "open", "--limit", "200",
    "--json", "number,title,author,labels,isDraft,mergeable,body,reviews"])
    .map((p) => ({
      ...p,
      author: p.author.login,
      labels: p.labels.map((l) => l.name),
      worker: p.body?.match(prWorkerRe)?.[1],
      // How many times reviewers sent it back: 0 = first review, 1+ = second look (no more send-backs).
      rounds: (p.reviews ?? []).filter((r) => r.state === "CHANGES_REQUESTED").length,
    }));
}

// ---------- worker registry ----------
// One issue labelled `orchestrator`. Each worker owns one comment (its heartbeat); the orchestrator
// owns one comment (every worker's current assignment). GitHub's updated_at is the heartbeat clock.

const commentRe = /<!--\s*(worker|assignments)\s+(\{[\s\S]*?\})\s*-->/;

function registryIssue() {
  const found = ghJson(["issue", "list", "--label", REGISTRY_LABEL, "--state", "open", "--json", "number", "--limit", "5"]);
  if (found.length) return found[0].number;
  console.error("No worker registry yet. The orchestrator runs: node scripts/orchestrate.mjs setup");
  process.exit(1);
}

function loadComments(reg) {
  return ghJson(["api", "--paginate", "--slurp", `repos/${repo()}/issues/${reg}/comments?per_page=100`])
    .flat()
    .map((c) => {
      const m = c.body?.match(commentRe);
      return m && { id: c.id, kind: m[1], data: JSON.parse(m[2]), login: c.user.login, updated: Date.parse(c.updated_at) };
    })
    .filter(Boolean);
}

function upsertComment(reg, existing, body) {
  const input = JSON.stringify({ body });
  if (existing) gh(["api", "-X", "PATCH", `repos/${repo()}/issues/comments/${existing.id}`, "--input", "-"], input);
  else gh(["api", "-X", "POST", `repos/${repo()}/issues/${reg}/comments`, "--input", "-"], input);
}

function heartbeat(reg, comments, patch) {
  const id = myId();
  const mine = comments.find((c) => c.kind === "worker" && c.data.id === id && c.login === me());
  const data = { lane: "any", autoOnly: false, ...mine?.data, ...patch, id };
  const body = `<!-- worker ${JSON.stringify(data)} -->\n**${id}** · lane \`${data.lane}\`${data.autoOnly ? " · auto-only" : ""} · last finished: ${data.done ?? "nothing yet"}`;
  if (!DRY) upsertComment(reg, mine, body);
  return data;
}

function loadAssignments(comments) {
  const latest = comments.filter((c) => c.kind === "assignments").sort((a, b) => b.updated - a.updated)[0];
  return { units: {}, ...latest?.data, comment: latest };
}

function saveAssignments(reg, comments, orchestrator, units) {
  const mine = comments.find((c) => c.kind === "assignments" && c.login === me());
  const rows = Object.entries(units).map(([w, u]) => `| ${w} | ${u.action} | #${u.issue ?? u.pr} | ${u.at.slice(11, 16)} |`);
  const body = `<!-- assignments ${JSON.stringify({ orchestrator, units })} -->
**Assignments** · orchestrator \`${orchestrator}\` · updated ${new Date().toISOString().slice(11, 16)} UTC

| Worker | Action | Item | Since (UTC) |
|---|---|---|---|
${rows.join("\n") || "| — | | | |"}`;
  if (!DRY) upsertComment(reg, mine, body);
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
- [ ] The \`check\` skill passes (OpenSpec validate + lint, test, build)

## Files likely touched
${files}

## Depends on
${depLine}
`;
}

// Only the orchestrator syncs, but a sync run by hand at the same time could still double up.
// Keep the oldest issue per task group and close the rest.
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
  const byKey = new Map(issues.filter((i) => i.key).map((i) => [i.key, i]));
  const todo = activeChanges().flatMap((c) => c.groups.filter((g) => !byKey.has(`${c.id}:${g.n}`)).map((g) => ({ c, g })));
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
    // `assignee=<login>` reserves a group for a human (e.g. the conductor's scaffold), so no worker gets it.
    if (m.assignee) ghArgs.push("--assignee", m.assignee);
    const body = issueBody(c.id, g, deps.length ? "_resolving…_" : "none");
    const url = write(`create issue: ${title}`, ghArgs, body);
    const issue = { number: url ? Number(url.split("/").pop()) : 0, title, state: "OPEN", labels, assignees: m.assignee ? [m.assignee] : [],
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
    const labels = ["type:chore", "size:S", "priority:p1", "area:backend", "status:ready", "agent:auto"];
    const title = `[${c.id}] archive the change`;
    const url = write(`create archive issue for ${c.id}`, ["issue", "create", "--title", title,
      "--label", labels.join(","), "--body-file", "-"], body);
    if (url) issues.push({ number: Number(url.split("/").pop()), title, state: "OPEN", labels, assignees: [], key: `${c.id}:archive`, change: c.id, body });
    n++;
  }
  if (!n) log("archive: no change is ready to archive");
}

const housekeeping = (issues) => [sync, unblock, archive].forEach((step) => step(issues));

// ---------- orchestrator: tick ----------

// The next unit for one idle worker: finish your own PRs first, then review (PRs never pile up),
// then new work in your lane, then any lane. GitHub forbids approving your own PR, so a worker
// never reviews a PR opened by its own login (which covers two workers on one machine).
function pick(w, issues, prs, busy, ownLaneOnly) {
  const free = (kind, n) => !busy.has(`${kind}#${n}`);
  const fix = prs.find((p) => free("pr", p.number) && !isSpecPR(p) && (p.worker ? p.worker === w.id : p.author === w.login) &&
    (p.labels.includes("pr:changes") || p.mergeable === "CONFLICTING"));
  if (fix) return { action: "fix", pr: fix.number, role: roleOf(fix.labels), round: fix.rounds };

  const review = prs
    .filter((p) => free("pr", p.number) && !p.isDraft && p.labels.includes("pr:needs-review") && p.author !== w.login)
    .sort((a, b) => a.number - b.number)[0];
  if (review) return { action: "review", pr: review.number, role: "reviewer", round: review.rounds };

  const lane = w.lane && w.lane !== "any" ? `area:${w.lane}` : null;
  const issue = issues
    .filter((i) => i.state === "OPEN" && !i.assignees.length && free("issue", i.number) &&
      i.labels.includes("status:ready") && (!w.autoOnly || i.labels.includes("agent:auto")) &&
      (!ownLaneOnly || !lane || i.labels.includes(lane)))
    .sort((a, b) => (lane ? Number(!a.labels.includes(lane)) - Number(!b.labels.includes(lane)) : 0) || prio(a) - prio(b) || a.number - b.number)[0];
  if (issue) return { action: "implement", issue: issue.number, role: roleOf(issue.labels) };
}

// Spec PRs carry decisions a human approved: workers may review and merge them, but never rewrite them.
function isSpecPR(p) {
  return /^docs\(spec\)/.test(p.title);
}

const unitKey = (u) => (u.issue ? `issue#${u.issue}` : `pr#${u.pr}`);

// Hand a unit back to the pool when its worker vanished.
function release(id, u) {
  if (u.action === "implement") {
    write(`release #${u.issue} from ${id}`, ["issue", "edit", String(u.issue), "--remove-assignee", u.login,
      "--remove-label", "status:in-progress", "--add-label", "status:ready"]);
    write(`  comment #${u.issue}`, ["issue", "comment", String(u.issue), "--body",
      `Released from worker \`${id}\`, which stopped responding. If a branch \`${u.issue}-*\` exists, the next worker continues it.`]);
  } else if (u.action === "review") {
    write(`release review of #${u.pr} from ${id}`, ["pr", "edit", String(u.pr), "--remove-label", "pr:reviewing", "--add-label", "pr:needs-review"]);
  }
}

function tick() {
  const reg = registryIssue();
  const self = myId();
  const issues = loadIssues();
  const comments = loadComments(reg);
  const asg = loadAssignments(comments);
  const now = Date.now();
  if (asg.orchestrator && asg.orchestrator !== self && now - asg.comment.updated < 2 * 60_000 && !flag("force")) {
    console.error(`Another orchestrator (${asg.orchestrator}) ran less than 2 minutes ago. Only one may run. Pass --force to take over.`);
    process.exit(1);
  }

  housekeeping(issues);
  const prs = loadPRs();
  const openIssue = new Map(issues.filter((i) => i.state === "OPEN").map((i) => [i.number, i]));
  const openPR = new Map(prs.map((p) => [p.number, p]));
  const workers = new Map(comments.filter((c) => c.kind === "worker").map((c) => [c.data.id, { ...c.data, login: c.login, seen: c.updated }]));
  const units = { ...asg.units };
  const notes = [];
  const assigned = [];

  // 1. Retire finished units, and release the ones whose worker has been silent far too long.
  for (const [id, u] of Object.entries(units)) {
    const w = workers.get(id);
    const target = u.issue ? openIssue.get(u.issue) : openPR.get(u.pr);
    if (w?.done === u.key || !target) {
      delete units[id];
      continue;
    }
    const quiet = now - (w?.seen ?? 0);
    const age = now - Date.parse(u.at);
    if (!w || (quiet > RELEASE_MS && age > RELEASE_MS)) {
      release(id, u);
      const i = u.issue && openIssue.get(u.issue);
      if (i) {
        i.assignees = i.assignees.filter((l) => l !== u.login);
        i.labels = i.labels.filter((l) => l !== "status:in-progress").concat("status:ready");
      }
      notes.push(`released ${u.action} #${u.issue ?? u.pr} from ${id} (silent ${w ? `${minutes(quiet)} min` : "and unregistered"})`);
      delete units[id];
    } else if (age > QUIET_MS) {
      notes.push(`${id} has been on ${u.action} #${u.issue ?? u.pr} for ${minutes(age)} min (last seen ${minutes(quiet)} min ago)`);
    }
  }

  // 2. Give every live, idle worker its next unit. Two passes, so every worker gets work from its own
  // lane before anyone helps out in another lane. Within a pass, longest-idle workers choose first.
  const busy = new Set(Object.values(units).map(unitKey));
  const idle = [...workers.values()]
    .filter((w) => !units[w.id] && now - w.seen < LIVE_MS)
    .sort((a, b) => a.seen - b.seen || a.id.localeCompare(b.id));
  for (const [w, ownLaneOnly] of [...idle.map((w) => [w, true]), ...idle.map((w) => [w, false])]) {
    if (units[w.id]) continue;
    const u = pick(w, issues, prs, busy, ownLaneOnly);
    if (!u) continue;
    if (u.action === "implement") {
      write(`${w.id}: implement #${u.issue}`, ["issue", "edit", String(u.issue), "--add-assignee", w.login,
        "--add-label", "status:in-progress", "--remove-label", "status:ready"]);
      const i = openIssue.get(u.issue);
      i.assignees.push(w.login);
      i.labels = i.labels.filter((l) => l !== "status:ready").concat("status:in-progress");
    } else if (u.action === "review") {
      write(`${w.id}: review #${u.pr}`, ["pr", "edit", String(u.pr), "--add-label", "pr:reviewing", "--remove-label", "pr:needs-review"]);
    } else {
      log(`${w.id}: fix #${u.pr}`);
    }
    u.key = `${u.action}#${u.issue ?? u.pr}@${new Date(now).toISOString()}`;
    u.at = new Date(now).toISOString();
    u.login = w.login;
    units[w.id] = u;
    busy.add(unitKey(u));
    assigned.push(`${w.id} → ${u.action} #${u.issue ?? u.pr} (${u.role})`);
  }
  saveAssignments(reg, comments, self, units);

  // 3. What the orchestrator agent should look at.
  const live = [...workers.values()].filter((w) => now - w.seen < LIVE_MS || units[w.id]);
  const stillIdle = live.filter((w) => !units[w.id]);
  const ready = issues.filter((i) => i.state === "OPEN" && i.labels.includes("status:ready") && !i.assignees.length);
  const decisions = issues.filter((i) => i.state === "OPEN" && i.labels.includes("status:needs-decision"));
  if (decisions.length) notes.push(`${decisions.length} issue(s) need a human decision: ${decisions.map((i) => `#${i.number}`).join(", ")}`);
  const requests = issues.filter((i) => i.state === "OPEN" && i.labels.includes("type:feature-request"));
  if (requests.length) notes.push(`${requests.length} feature request(s) waiting to be planned: ${requests.map((i) => `#${i.number}`).join(", ")}`);
  const specPRs = prs.filter((p) => isSpecPR(p) && !p.labels.some((l) => l.startsWith("pr:")));
  if (specPRs.length) notes.push(`spec PR(s) waiting for the conductor's approval: ${specPRs.map((p) => `#${p.number}`).join(", ")}`);
  const specBack = prs.filter((p) => isSpecPR(p) && (p.labels.includes("pr:changes") || p.mergeable === "CONFLICTING"));
  const needsHuman = prs.filter((p) => p.labels.includes("pr:needs-human"));
  if (needsHuman.length) notes.push(`PR(s) a reviewer couldn't make green, need a human: ${needsHuman.map((p) => `#${p.number}`).join(", ")}`);
  if (specBack.length) notes.push(`spec PR(s) sent back or conflicting, fix with plan-feature: ${specBack.map((p) => `#${p.number}`).join(", ")}`);
  if (stillIdle.length && !ready.length) notes.push(`${stillIdle.length} worker(s) idle and nothing is ready (backlog empty, or everything blocked)`);
  if (!workers.size) notes.push("no workers registered yet (each worker registers on its first `work` call)");
  return {
    summary: `${live.length} worker(s) live, ${Object.keys(units).length} busy · ${ready.length} ready · ` +
      `${issues.filter((i) => i.state === "OPEN" && i.labels.includes("status:blocked")).length} blocked · ${prs.length} open PR(s)`,
    assigned,
    notes,
  };
}

function tickCommand() {
  const deadline = Date.now() + Number(opt("watch", 0)) * 60_000;
  const assigned = [];
  const notes = new Set();
  let last;
  for (;;) {
    last = tick();
    assigned.push(...last.assigned);
    last.notes.forEach((n) => notes.add(n));
    if (Date.now() + POLL_S * 1000 > deadline) break;
    sleep(POLL_S);
  }
  console.log(`${new Date().toISOString().slice(11, 16)} UTC · ${last.summary}`);
  console.log(assigned.length ? `assigned:\n${assigned.map((a) => `  ${a}`).join("\n")}` : "assigned: nothing new");
  console.log(notes.size ? `attention:\n${[...notes].map((n) => `  - ${n}`).join("\n")}` : "attention: none");
}

// ---------- worker: work / done / reviewed / worktree ----------

function work() {
  const patch = { lane: opt("lane", "any"), autoOnly: flag("auto-only") };
  if (!LANES.includes(patch.lane)) usage(`work --lane <${LANES.join("|")}>  (unknown lane: ${patch.lane})`);
  const reg = registryIssue();
  const id = myId();
  const deadline = Date.now() + Number(opt("wait", 0)) * 60_000;
  for (;;) {
    const comments = loadComments(reg);
    const hb = heartbeat(reg, comments, patch);
    const asg = loadAssignments(comments);
    const u = asg.units[id];
    if (u && u.key !== hb.done) return { worker: id, action: u.action, ...(u.issue ? { issue: u.issue } : { pr: u.pr, round: u.round ?? 0 }), role: u.role ?? "backend" };
    if (Date.now() >= deadline) return { worker: id, action: "idle" };
    const age = asg.comment ? Date.now() - asg.comment.updated : Infinity;
    log(age > 3 * 60_000
      ? `waiting: the orchestrator hasn't run for ${Number.isFinite(age) ? `${minutes(age)} min` : "ever"}. Is it running?`
      : "waiting for the orchestrator to assign work…");
    sleep(Math.min(POLL_S, Math.max(1, (deadline - Date.now()) / 1000)));
  }
}

function done() {
  const reg = registryIssue();
  const comments = loadComments(reg);
  const u = loadAssignments(comments).units[myId()];
  if (!u) return log(`done: ${myId()} has no assignment`);
  heartbeat(reg, comments, { done: u.key });
  log(`done: ${myId()} finished ${u.action} #${u.issue ?? u.pr}`);
}

function reviewed() {
  const pr = positional.find((a) => /^\d+$/.test(a));
  const bodyFile = opt("body-file");
  if (!pr || flag("merge") === flag("changes") || !bodyFile) usage("reviewed <pr> --merge|--changes --body-file <file>");
  if (flag("changes")) {
    // One send-back per PR. After that, open items are settled in the PR conversation, or fixed by the
    // reviewer. Build and tests are never waived: a PR the reviewer can't make green goes to pr:needs-human.
    const rounds = ghJson(["pr", "view", pr, "--json", "reviews"]).reviews.filter((r) => r.state === "CHANGES_REQUESTED").length;
    if (rounds >= 1) {
      console.error(`#${pr} was already sent back once, and it can't be sent back again. Settle open items in the PR conversation, ` +
        "make the build and tests green yourself and merge, or add the pr:needs-human label (see the review-pr skill, 4b).");
      process.exit(2);
    }
    write(`request changes on #${pr}`, ["pr", "review", pr, "--request-changes", "--body-file", bodyFile]);
    write(`  hand #${pr} back to its author`, ["pr", "edit", pr, "--add-label", "pr:changes", "--remove-label", "pr:reviewing,pr:needs-review"]);
  } else {
    write(`approve #${pr}`, ["pr", "review", pr, "--approve", "--body-file", bodyFile]);
    write(`merge #${pr}`, ["pr", "merge", pr, "--squash", "--delete-branch"]);
  }
}

function worktree() {
  const name = positional[1];
  if (!name) usage("worktree <name>");
  const dir = resolve("..", `${basename(process.cwd())}-${name}`);
  const git = (a) => execFileSync("git", a, { stdio: "inherit" });
  git(["fetch", "origin"]);
  git(["worktree", "add", "--detach", dir, "origin/main"]);
  log(`\nWorker folder ready: ${dir}
Next:
  1. Copy your .env into it, if you have one.
  2. Open it as its own window: code "${dir}"   (or start Copilot CLI in it)
  3. Install the project's dependencies there (the Install command in AGENTS.md).
  4. Start the worker: /work <lane>   Its id will be ${me()}/${basename(dir)}`);
}

// ---------- status / setup / take ----------

function status() {
  const issues = loadIssues();
  const open = issues.filter((i) => i.state === "OPEN");
  const row = (i) => `  #${i.number} ${i.title}${i.assignees.length ? `  (${i.assignees.join(", ")})` : ""}`;
  for (const s of ["in-progress", "ready", "blocked", "needs-decision"]) {
    const list = open.filter((i) => i.labels.includes(`status:${s}`));
    console.log(`\n${s.toUpperCase()} (${list.length})`);
    list.forEach((i) => console.log(row(i)));
  }
  console.log("\nPULL REQUESTS");
  for (const p of loadPRs()) console.log(`  #${p.number} ${p.title} by ${p.worker ?? p.author} [${p.labels.filter((l) => l.startsWith("pr:")).join(", ") || "no pr: label"}]`);
  console.log("\nCHANGES");
  for (const c of activeChanges()) {
    const mine = issues.filter((i) => i.change === c.id && i.group && i.key);
    console.log(`  ${c.id}: ${mine.filter((i) => i.state === "CLOSED").length}/${c.groups.length} groups closed`);
  }
  const found = ghJson(["issue", "list", "--label", REGISTRY_LABEL, "--state", "open", "--json", "number", "--limit", "5"]);
  if (!found.length) return console.log("\nWORKERS\n  no registry yet (node scripts/orchestrate.mjs setup)");
  const comments = loadComments(found[0].number);
  const asg = loadAssignments(comments);
  console.log(`\nWORKERS (orchestrator: ${asg.orchestrator ?? "not running yet"})`);
  for (const c of comments.filter((c) => c.kind === "worker")) {
    const u = asg.units[c.data.id];
    const state = u && u.key !== c.data.done ? `${u.action} #${u.issue ?? u.pr}` : "idle";
    console.log(`  ${c.data.id}  lane ${c.data.lane}  ${state}  (seen ${minutes(Date.now() - c.updated)} min ago)`);
  }
}

const LABELS = [
  ["type:feature", "1f883d", "New functionality"],
  ["type:bug", "d73a4a", "Something is broken"],
  ["type:chore", "c5def5", "Tooling, config, deps"],
  ["type:docs", "0075ca", "Documentation"],
  ["type:feature-request", "a2eeef", "Asked for mid-hackathon: waiting for the conductor to plan it"],
  ["size:S", "bfdadc", "< 1 hour"],
  ["size:M", "7fc8c4", "1-2 hours"],
  ["size:L", "e99695", "Too big: split it"],
  ["status:ready", "0e8a16", "Ready to pick up"],
  ["status:in-progress", "fbca04", "A worker is on it"],
  ["status:blocked", "b60205", "Waiting on the issues under Depends on"],
  ["status:needs-decision", "d876e3", "A worker parked it: needs a human decision"],
  ["pr:needs-review", "0e8a16", "Waiting for a worker to review and merge"],
  ["pr:reviewing", "fbca04", "A worker is reviewing it"],
  ["pr:changes", "d93f0b", "Sent back (once): the author's worker fixes it next"],
  ["pr:needs-human", "b60205", "A reviewer couldn't make build and tests green: a human takes it from here"],
  ["priority:p0", "b60205", "Demo-critical"],
  ["priority:p1", "d93f0b", "Important"],
  ["priority:p2", "fef2c0", "Nice to have"],
  ["area:frontend", "5319e7", "Design and UI: tokens, components, screens, copy, state, API wiring"],
  ["area:backend", "1d76db", "API, services, DB, LLM calls, deploy"],
  ["agent:auto", "000000", "Well specified: an unattended worker can finish it"],
  [REGISTRY_LABEL, "ededed", "The worker registry issue: managed by scripts/orchestrate.mjs"],
];

function setup() {
  for (const [name, color, description] of LABELS)
    write(`label ${name}`, ["label", "create", name, "--color", color, "--description", description, "--force"]);
  const found = ghJson(["issue", "list", "--label", REGISTRY_LABEL, "--state", "open", "--json", "number", "--limit", "5"]);
  if (found.length) return log(`registry: #${found[0].number} already exists`);
  write("create the worker registry issue", ["issue", "create", "--title", "Worker registry", "--label", REGISTRY_LABEL, "--body-file", "-"],
    `Managed by \`scripts/orchestrate.mjs\`. **Don't close, edit or comment here.**

Each worker keeps one comment below as its heartbeat. The orchestrator keeps one comment listing every worker's current assignment.
`);
}

function take() {
  const change = positional[1];
  if (!change) usage("take <change-id>");
  const mine = loadIssues().filter((i) => i.change === change && i.state === "OPEN" && !i.assignees.length);
  for (const i of mine) write(`assign #${i.number} to ${me()}: ${i.title}`, ["issue", "edit", String(i.number), "--add-assignee", me()]);
  if (!mine.length) log(`take: no open unassigned issues for change ${change} (has the orchestrator synced it yet?)`);
}

// ---------- main ----------

const commands = {
  setup, take, status, reviewed, worktree, done,
  tick: tickCommand,
  work: () => console.log(JSON.stringify(work())),
  ...Object.fromEntries(Object.entries({ sync, unblock, archive, housekeeping }).map(([k, f]) => [k, () => f(loadIssues())])),
};
if (!commands[cmd]) usage(`<${Object.keys(commands).join("|")}>  (unknown command: ${cmd})`);
try {
  commands[cmd]();
} catch (e) {
  // A failed gh/git call (merge blocked, conflict, network): one readable line for the agent, not a stack trace.
  const detail = e.stderr?.toString().trim().split(/\r?\n/).filter(Boolean).slice(0, 2).join(" | ") || e.message;
  console.error(`${cmd} failed: ${detail}`);
  process.exit(1);
}
