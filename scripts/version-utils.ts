import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface VersionInfo {
  major: number; minor: number; patch: number; build: number; raw: string; sanitized: string;
}

export function sanitizeAndValidate(raw: string): string {
  const base = raw.split('-')[0].split('+')[0];
  const parts = base.split('.');
  if (parts.length > 4) throw new Error(`Version has more than 4 parts: ${raw}`);
  while (parts.length < 4) parts.push('0');
  if (!parts.every(p => /^\d+$/.test(p))) throw new Error(`Version parts must be numeric (got: ${raw})`);
  return parts.slice(0, 4).join('.');
}

export function parseVersion(raw: string): VersionInfo {
  const sanitized = sanitizeAndValidate(raw);
  const [major, minor, patch, build] = sanitized.split('.').map(Number);
  return { major, minor, patch, build, raw, sanitized };
}

export function formatVersion(parts: {major:number; minor:number; patch:number; build:number;}): string {
  return `${parts.major}.${parts.minor}.${parts.patch}.${parts.build}`;
}

export function readProjectVersions() {
  const root = path.join(__dirname, '..');
  const packagePath = path.join(root, 'package.json');
  const pbivizPath = path.join(root, 'pbiviz.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const pbivizJson = JSON.parse(fs.readFileSync(pbivizPath, 'utf8'));
  return { packagePath, pbivizPath, packageJson, pbivizJson };
}

export function writeProjectVersions(version: string, files?: {packagePath?: string; pbivizPath?: string; packageJson?: any; pbivizJson?: any;}) {
  const { packagePath, pbivizPath, packageJson, pbivizJson } = files || readProjectVersions();
  packageJson.version = version;
  if (pbivizJson.visual) pbivizJson.visual.version = version;
  pbivizJson.version = version;
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
  fs.writeFileSync(pbivizPath, JSON.stringify(pbivizJson, null, 4));
}

export function isGitClean(): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
  } catch {
    return true; // Not a git repo — treat as clean
  }
  try {
    execSync('git diff --quiet', { stdio: 'ignore' });
    execSync('git diff --cached --quiet', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function ensureGitClean(orSkipEnv = 'SKIP_GIT_CLEAN_CHECK') {
  if (process.env[orSkipEnv] === '1') return;
  if (!isGitClean()) {
    console.error('❌ Working tree not clean. Commit or stash changes before semantic version bump. (Set SKIP_GIT_CLEAN_CHECK=1 to override)');
    process.exit(1);
  }
}
