#!/usr/bin/env node
// Installs the hackathon SDLC kit into a new or existing directory.
//   npx github:KKogaa/hackathon-sdlc-kit [dir] [--force] [--dry-run]
// Existing files are kept unless --force; an existing .gitignore gets the kit's missing lines appended.
import { existsSync, mkdirSync, readdirSync, readFileSync, copyFileSync, appendFileSync, chmodSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const KIT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// The installer itself is not part of the kit, and README.md is the kit's own: the project gets its own from kickoff.
const SKIP = new Set(['bin', 'node_modules', '.git', 'package.json', 'package-lock.json', 'README.md']);

const args = process.argv.slice(2);
if (args.includes('-h') || args.includes('--help')) {
  console.log(`Usage: npx github:KKogaa/hackathon-sdlc-kit [dir] [--force] [--dry-run]

  dir        where to install (default: current directory; created if missing)
  --force    overwrite files that already exist
  --dry-run  show what would happen, write nothing`);
  process.exit(0);
}
const force = args.includes('--force');
const dryRun = args.includes('--dry-run');
const target = resolve(args.find((a) => !a.startsWith('-')) ?? '.');

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (dir === KIT_ROOT && SKIP.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

const counts = { created: 0, overwritten: 0, skipped: 0, merged: 0 };
const skipped = [];
for (const src of walk(KIT_ROOT)) {
  // npm renames .gitignore to .npmignore when it installs a package.
  const rel = relative(KIT_ROOT, src) === '.npmignore' ? '.gitignore' : relative(KIT_ROOT, src);
  const dest = join(target, rel);
  const exists = existsSync(dest);

  if (exists && rel === '.gitignore' && !force) {
    const have = new Set(readFileSync(dest, 'utf8').split(/\r?\n/));
    const missing = readFileSync(src, 'utf8').split(/\r?\n/).filter((l) => l && !have.has(l));
    if (!missing.length) { counts.skipped++; continue; }
    console.log(`  merge  ${rel} (+${missing.length} lines)`);
    if (!dryRun) appendFileSync(dest, `\n# hackathon-sdlc-kit\n${missing.join('\n')}\n`);
    counts.merged++;
    continue;
  }
  if (exists && !force) {
    console.log(`  skip   ${rel} (exists)`);
    counts.skipped++;
    skipped.push(rel.replaceAll('\\', '/'));
    continue;
  }

  console.log(`  ${exists ? 'write ' : 'create'} ${rel}`);
  if (!dryRun) {
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
    if (statSync(src).mode & 0o111) chmodSync(dest, 0o755);
  }
  counts[exists ? 'overwritten' : 'created']++;
}

const summary = Object.entries(counts).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(', ');
console.log(`\n${dryRun ? 'Dry run: ' : ''}${summary || 'nothing to do'} in ${target}`);
if (counts.skipped && !force) console.log('Re-run with --force to overwrite the skipped files.');
if (dryRun) process.exit(0);

// Files the kit can't work without. If the project already had its own, say so: the owner must merge them by hand.
const CORE = ['AGENTS.md', '.github/copilot-instructions.md', '.vscode/settings.json', 'openspec/config.yaml', 'scripts/orchestrate.mjs'];
const clashes = skipped.filter((f) => CORE.includes(f) || f.startsWith('.github/agents/') || f.startsWith('.github/skills/'));
if (clashes.length) {
  console.log(`\nThese existed already and were kept, but the kit relies on its own version. Merge them by hand, or re-run with --force:\n${clashes.map((f) => `  ${f}`).join('\n')}`);
}

const hasGit = existsSync(join(target, '.git'));
let remote = '';
if (hasGit) {
  try {
    remote = execFileSync('git', ['-C', target, 'remote', 'get-url', 'origin'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {}
}
const cd = relative(process.cwd(), target);
const steps = [
  cd && `cd ${cd}`,
  !hasGit && 'git init -b main',
  'git add -A',
  'git commit -m "chore: add hackathon SDLC kit"',
  remote ? 'git push          # before protecting main; teammates get the kit by cloning this repo' : 'gh repo create <org>/<project> --private --source . --push',
  'node scripts/orchestrate.mjs setup',
].filter(Boolean);
console.log(`
Next steps (one command at a time):
${steps.map((x) => `  ${x}`).join('\n')}
Then follow docs/setup/repo.md (collaborators, protect main), and share docs/setup/README.md with the team.`);
