#!/usr/bin/env tsx
/**
 * Automated CI version management for Power BI visual (strict sync, 4-part)
 * Behaviour:
 *  - If commit message already contains [build-bump] or [semver-bump] -> no-op (prevents loops)
 *  - If SEMVER_BUMP env (major|minor|patch) set -> bump that segment and reset trailing parts to 0
 *  - Else -> increment 4th (build) segment
 *  - Writes version to package.json + pbiviz.json
 *  - If AUTO_COMMIT=1 (typical in CI main builds) commits & pushes the change
 *  - Tags semantic bumps (vX.Y.Z) when TAG_SEMVER=1
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

type SemverBump = 'major' | 'minor' | 'patch';

interface PackageJson { version: string; [k: string]: any; }
interface PbivizJson { visual: { version: string; [k: string]: any }; version: string; [k: string]: any }

function getLatestCommitMessage(): string {
  try { return execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim(); } catch { return ''; }
}

function readJson<T>(p: string): T { return JSON.parse(fs.readFileSync(p, 'utf8')) as T; }
function writeJson(p: string, v: any, spaces = 2) { fs.writeFileSync(p, JSON.stringify(v, null, spaces) + '\n'); }

function bumpVersion(current: string, bump?: SemverBump): string {
  const parts = current.split('.').map(n => parseInt(n, 10));
  while (parts.length < 4) parts.push(0);
  let [maj, min, pat, build] = parts;
  if (bump) {
    if (bump === 'major') { maj += 1; min = 0; pat = 0; build = 0; }
    else if (bump === 'minor') { min += 1; pat = 0; build = 0; }
    else if (bump === 'patch') { pat += 1; build = 0; }
  } else {
    build += 1;
  }
  return [maj, min, pat, build].join('.');
}

function main() {
  const msg = getLatestCommitMessage();
  if (/\[(build-bump|semver-bump)\]/i.test(msg)) {
    console.log('Skipping: last commit is an automated version bump.');
    return;
  }

  const repoRoot = path.join(__dirname, '..');
  const pkgPath = path.join(repoRoot, 'package.json');
  const vizPath = path.join(repoRoot, 'pbiviz.json');
  const pkg = readJson<PackageJson>(pkgPath);
  const viz = readJson<PbivizJson>(vizPath);

  const semverEnv = (process.env.SEMVER_BUMP || '').toLowerCase();
  const bump: SemverBump | undefined = ['major','minor','patch'].includes(semverEnv) ? semverEnv as SemverBump : undefined;

  const newVersion = bumpVersion(pkg.version, bump);
  pkg.version = newVersion;
  viz.visual.version = newVersion;
  viz.version = newVersion;

  writeJson(pkgPath, pkg, 2);
  writeJson(vizPath, viz, 4);

  console.log(`✅ Version updated to ${newVersion}${bump ? ' (semantic '+bump+')' : ' (build increment)'}`);

  const autoCommit = process.env.AUTO_COMMIT === '1';
  if (autoCommit) {
    try {
      const tagSemantic = process.env.TAG_SEMVER === '1' && !!bump;
      const semantic = newVersion.split('.').slice(0,3).join('.');
      const targetBranch = process.env.TARGET_BRANCH || '';
      
      // Validate branch name to prevent command injection
      // Only allow alphanumeric, hyphens, underscores, and forward slashes
      if (targetBranch && !/^[a-zA-Z0-9_\-\/]+$/.test(targetBranch)) {
        throw new Error(`Invalid branch name format: ${targetBranch}`);
      }
      
      execSync('git config user.name "github-actions[bot]"');
      execSync('git config user.email "41898282+github-actions[bot]@users.noreply.github.com"');
      execSync('git add package.json pbiviz.json');
      execSync(`git commit -m "chore(${bump? 'semver':'build'}-bump): version ${newVersion} [${bump? 'semver-bump':'build-bump'}]"`, { stdio: 'inherit' });
      if (tagSemantic) {
        try { execSync(`git tag v${semantic}`); } catch {}
      }
      
      // Push to target branch to handle detached HEAD state
      if (targetBranch) {
        execSync(`git push origin HEAD:${targetBranch}`, { stdio: 'inherit' });
      } else {
        execSync('git push', { stdio: 'inherit' });
      }
      
      if (tagSemantic) {
        try { execSync('git push --tags', { stdio: 'inherit' }); } catch {}
      }
    } catch (e) {
      console.error('❌ Failed to auto-commit version bump:', (e as Error).message);
      process.exit(1);
    }
  } else {
    console.log('ℹ️ AUTO_COMMIT not set; changes not committed.');
  }
}

if (require.main === module) {
  main();
}

export {};
