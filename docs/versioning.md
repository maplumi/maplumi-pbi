# Simplified Versioning (4-Part Numeric) for the Power BI Visual

This project uses a **minimal, explicit** versioning flow aligned with Power BI's required format: `MAJOR.MINOR.PATCH.REVISION` (all numeric). No hidden auto-bumps. A version only changes when you intentionally run a bump.

## Goals
* Single source of truth: `package.json` (synced to `pbiviz.json`)
* Safe semantic bumps (requires clean git tree)
* Deterministic builds (local build never mutates version)
* Small + clear script surface

## Scripts
| Script | What it does | Example |
|--------|--------------|---------|
| `npm run sync-version` | Copies version from `package.json` to `pbiviz.json` | After manual edit |
| `npm run version <part>` | Bumps one part (`major|minor|patch|build|revision`) | `npm run version minor` |
| `npm run build` | Produces `.pbiviz` (no bump) | `npm run build` |
| `npm run release` | Bumps (part decided by `BUMP` env) then builds | `BUMP=patch npm run release` |

`revision` is an alias for `build` (4th segment). Use it for re-packaging without semantic impact.

## Bump Semantics
| Part | Resets | Use for |
|------|--------|---------|
| major | minor, patch, revision → 0 | Breaking changes |
| minor | patch, revision → 0 | Backward‑compatible features |
| patch | revision → 0 | Bug fixes / internal improvements |
| revision (build) | — | Repackage / certification resubmission |

## Typical Release Flow
```bash
# Patch release (1.0.1.0 → 1.0.2.0)
npm run release:patch

# Minor release (1.0.1.0 → 1.1.0.0)  
npm run release:minor

# Major release (1.0.1.0 → 2.0.0.0)
npm run release:major

# Build number increment (1.0.1.0 → 1.0.1.1)
npm run version:build
```

### Automated CI/CD

Use `version:auto` in CI to ensure 4-part progression:
```bash
# Build increment (no semantic env set)
AUTO_COMMIT=1 npm run version:auto

# Semantic bump (resets build part to 0)
AUTO_COMMIT=1 SEMVER_BUMP=minor TAG_SEMVER=1 npm run version:auto
```
Tests should run before invoking the bump; abort on failures.

## Available Scripts

| Script | Purpose | Technology | Example |
|--------|---------|------------|---------|
| `sync-version` | Sync versions between files | TypeScript | `1.0.1.0` → Both files |
| `version:patch` | Increment patch version | TypeScript | `1.0.1.0` → `1.0.2.0` |
| `version:minor` | Increment minor version | TypeScript | `1.0.1.0` → `1.1.0.0` |
| `version:major` | Increment major version | TypeScript | `1.0.1.0` → `2.0.0.0` |
| `version:build` | Increment build number | TypeScript | `1.0.1.0` → `1.0.1.1` |
| `version:auto` | Auto semantic/build bump | TypeScript | Env-driven |

## TypeScript Implementation

### Type-Safe Version Management

```typescript
type VersionType = 'major' | 'minor' | 'patch' | 'build';

interface PackageJson {
    version: string;
    [key: string]: any;
}

interface PbivizJson {
    visual: {
        version: string;
        [key: string]: any;
    };
    version: string;
    [key: string]: any;
}
```

### Script Architecture


## When & What to Bump (Decision Matrix)

| Change Type | Examples | Bump | Script | Result (from 1.4.2.0) |
|-------------|----------|------|--------|------------------------|
| Breaking API / behavior requiring users to reconfigure visuals | Renamed data role, removed setting, incompatible schema | MAJOR | `npm run version:major` (or `release:major`) | 2.0.0.0 |
| Backwards‑compatible feature | New layer option, extra legend control, performance feature | MINOR | `npm run version:minor` (or `release:minor`) | 1.5.0.0 |
| Bug fix / minor enhancement | Null check, styling tweak, logging improvement | PATCH | `npm run version:patch` (or `release:patch`) | 1.4.3.0 |
| Repackage only / docs / CI rebuild | Marketplace rejection fix, icon update, README, rebuild with new tooling | BUILD | `npm run version:build` | 1.4.2.1 |

Notes:
* `release:*` scripts perform version bump + `build` packaging (full release flow).
* `version:*` scripts only bump & sync; you run `npm run build` (or `pbiviz package`) separately.
* Always tag after bumping (except for rapid local build increments you do not intend to publish).

## Standard Workflows

### 1. New Feature Release
```powershell
```
scripts/
├── tsconfig.json           # TypeScript config for scripts
├── sync-version.ts         # Type-safe version synchronization
├── increment-version.ts    # Type-safe version increments
└── ci-auto-version.ts     # Automated CI/CD versioning (semantic+build)
```

### Modern Execution

### 2. Hotfix After Release
```powershell

All scripts use **tsx** (TypeScript runner) for direct execution:

```bash
# Direct TypeScript execution (no compilation step)
tsx scripts/increment-version.ts patch
```


### 3. Rebuild / Marketplace Metadata Only
```powershell
## Versioning Strategies

### 1. Manual Development

For local development and manual releases:

```bash
# Feature development

### 4. All‑in‑One Release Shortcut
If you prefer one command (bump + build) use `release:*`:
```powershell
npm run version:minor    # 1.0.1.0 → 1.1.0.0
npm run build

# Bug fixes  
npm run version:patch    # 1.0.1.0 → 1.0.2.0
npm run build


### 5. CI Pipeline (Tag Driven)
```yaml
# Breaking changes
npm run build
If you push a tag `v1.6.0.0`, you typically already bumped locally; CI just packages.

## Practical Examples

| Scenario | Current | Command | New Version | Rationale |
|----------|---------|---------|-------------|-----------|
| Add new map control toggle | 1.2.3.0 | `npm run version:minor` | 1.3.0.0 | Feature, backward compatible |
| Fix null dereference crash | 1.3.0.0 | `npm run version:patch` | 1.3.1.0 | Bug fix |
| Rebuild with updated icon | 1.3.1.0 | `npm run version:build` | 1.3.1.1 | Cosmetic only |
| Remove deprecated data role | 1.3.1.1 | `npm run version:major` | 2.0.0.0 | Breaking change |

## Command Cheat Sheet (npm + git)

```powershell
```

### 2. Git Tag-Based

Use git tags for version management:

```bash
# Create a new version tag
git tag v1.2.0
git push origin v1.2.0

# CI will automatically build 1.2.0.{BUILD_NUMBER}
```

### 3. CI/CD Integration

The automated `ci-auto-version.ts` script (triggered via `npm run version:auto`) will:
- Detect the previous commit's semantic version
- Increment semantic part when `SEMVER_BUMP` env var is set (major|minor|patch)
- Otherwise increment only the build segment
- Optionally tag the semantic version when `TAG_SEMVER=1`

**Examples:**
- Git tag `v1.2.0` + Build #45 → `1.2.0.45`

## Do / Don't Summary

| Do | Why |
|----|-----|
| Bump only one semantic segment at a time | Keeps history clear |
| Tag every public release | Traceability & CI release triggers |
| Use build number for non-semantic repacks | Avoids changelog noise |
| Run tests before creating a tag | Prevents publishing broken version |
| Use `sync-version` after manual edits | Maintain alignment |
| Document breaking changes in commit & release notes | User clarity |

| Don’t | Why Not |
|-------|---------|
| Manually edit `pbiviz.json` version only | Will be overwritten / drift |
| Reuse tags (force-push) | Breaks consumers / audit trail |
| Bump multiple segments simultaneously (e.g. major+minor) | Semantically ambiguous |
| Auto-bump major/minor in CI | Loss of explicit review |

## FAQ Addendum

**Q: I forgot to bump before merging—what now?**  
Create a new commit on main with the correct bump, tag it, push.

**Q: I tagged wrong version already published?**  
Publish a new corrective patch or build; avoid deleting the tag unless absolutely necessary.

**Q: Can I skip the build number and stay 3-part?**  
No—Power BI requires 4 parts; scripts enforce this for consistency.

**Q: How do I reset build number after many iterations?**  
Perform next semantic bump (patch/minor/major) which resets build to 0.

- No tags + 5 commits → `1.0.0.5`
- Local development → `1.0.0.{commits}`

## Unified Version Format

### Power BI Native Approach

Both files now use **identical 4-digit versioning**:

```json
// package.json (4-digit native)
{
  "version": "1.2.3.4"  // ✅ Power BI format throughout
}

// pbiviz.json (4-digit native)
{
  "visual": {
    "version": "1.2.3.4"  // ✅ Same format
  },
  "version": "1.2.3.4"     // ✅ Consistent everywhere
}
```

### No Format Conversion Needed

Our TypeScript scripts maintain consistency:

```typescript
// Same version everywhere - no conversion logic needed
packageJson.version = newVersion;           // 1.2.3.4
pbivizJson.visual.version = newVersion;     // 1.2.3.4  
pbivizJson.version = newVersion;            // 1.2.3.4
```

## CI/CD Environment Variables

The `ci-auto-version.ts` script recognizes these environment variables:

| Variable | Source | Purpose |
|----------|--------|---------|
| `CI` | Most CI systems | Detects CI environment |
| `BUILD_NUMBER` | Jenkins | Build number |
| `GITHUB_RUN_NUMBER` | GitHub Actions | Run number |
| `BUILD_ID` | Various | Build identifier |

## GitHub Actions Integration

### Modern Workflow (Updated & Test-Gated)

```yaml
# .github/workflows/build.yml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '18'
    cache: 'npm'

- name: Install dependencies (includes tsx)
  run: npm ci

- name: Auto version
  run: npm run version:auto
  env:
    AUTO_COMMIT: 1

- name: Create Release (Modern Action)
  uses: softprops/action-gh-release@v1
  with:
    files: dist/*.pbiviz
```

### Dependencies

The workflow automatically installs:
- **tsx** - TypeScript runner
- **@types/node** - Node.js type definitions
- **powerbi-visuals-tools** - Power BI visual CLI tools
- All project dependencies

## Manual Override

You can manually set versions in `package.json`:

```bash
# Set specific version (4-digit format)
# Edit package.json: "version": "2.1.0.0"
npm run sync-version    # Sync to pbiviz.json
npm run build
```

Or programmatically:

```bash
# Using TypeScript increment script
npm run version:major   # 1.0.1.0 → 2.0.0.0
```

## Development Tools Integration

### IDE Support

TypeScript scripts provide:
- **IntelliSense** - Auto-completion for version operations
- **Type Checking** - Compile-time error detection
- **Refactoring** - Safe renaming and restructuring
- **Debugging** - Step-through debugging support

### VS Code Configuration

```json
// .vscode/tasks.json (auto-generated)
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Increment Build Version",
      "type": "shell", 
      "command": "npm run version:build",
      "group": "build"
    }
  ]
}
```

## Troubleshooting

### Version Sync Issues

If versions get out of sync:

```bash
npm run sync-version    # TypeScript version sync
```

### TypeScript Compilation Issues

Scripts use **tsx** (no compilation needed):

```bash
# Direct execution - no build step required
tsx scripts/increment-version.ts build
```

### Git Tag Issues

If git commands fail:

```bash
# Initialize git repository
git init
git add .
git commit -m "Initial commit"

# Or use manual versioning (TypeScript)
npm run version:patch
```

### Build Number Reset

To reset build numbers:

```bash
# Edit package.json to desired base version (4-digit)
# "version": "1.2.3.0"
npm run sync-version    # TypeScript sync
```

### tsx Execution Issues

If you encounter tsx issues:

```bash
# Ensure tsx is installed
npm install --save-dev tsx

# Or run directly
npx tsx scripts/increment-version.ts build
```

## Best Practices

### 1. **Use TypeScript-aware semantic versioning:**
   - `MAJOR`: Breaking changes (2.0.0.0)
   - `MINOR`: New features (1.1.0.0) 
   - `PATCH`: Bug fixes (1.0.1.0)
   - `BUILD`: Quick iterations (1.0.0.1)

### 2. **Git tag strategy with 4-digit awareness:**
   ```bash
   git tag v1.0.0    # Will become 1.0.0.0
   git tag v1.1.0    # Will become 1.1.0.0  
   git tag v1.1.1    # Will become 1.1.1.0
   ```

### 3. **TypeScript development workflow:**
   ```bash
   # Use type-safe version commands
   npm run version:minor    # TypeScript execution
   npm run build           # Uses TypeScript sync
   
   # IDE integration
   # - IntelliSense support
   # - Error checking
   # - Refactoring tools
   ```

### 4. **CI/CD basic sequence:**
  ```bash
  npm ci
  npm test              # fail-fast
  npm run version:auto  # build increment OR semantic when env SEMVER_BUMP is set
  npm run build         # packages visual (.pbiviz)
  ```

### 5. **Power BI specific practices:**
   - Always test thoroughly before version increment
   - Verify cross-filtering functionality  
   - Test with realistic data sizes
   - Validate visual interactions
   - Ensure 4-digit version consistency

## Advanced Usage

### Custom Version Types

The TypeScript system supports extension:

```typescript
// In scripts/increment-version.ts
type VersionType = 'major' | 'minor' | 'patch' | 'build' | 'hotfix';

// Custom logic for hotfix
case 'hotfix':
    newVersion = `${major}.${minor}.${patch}.${build + 10}`;
    break;
```

### Programmatic Version Management

```typescript
import { incrementVersion } from './scripts/increment-version';

// Use in other TypeScript code
incrementVersion('minor');
```

### Environment-Specific Versioning

```typescript
// Environment detection (example)
const isProd = process.env.NODE_ENV === 'production';
const versionSuffix = isProd ? '' : '-dev';
```

## File Structure

### Modern TypeScript Architecture

```
scripts/
├── tsconfig.json           # TypeScript config for scripts
├── sync-version.ts         # Type-safe version synchronization
├── increment-version.ts    # Type-safe version increments
└── ci-auto-version.ts     # Automated CI/CD versioning

.github/workflows/
└── build.yml              # Modern GitHub Actions (no deprecated warnings)

package.json                # 4-digit versioning throughout
pbiviz.json                 # 4-digit versioning throughout
```

### Dependencies

```json
// package.json devDependencies
{
  "tsx": "^4.0.0",                    // TypeScript runner
  "@types/node": "^20.0.0",           // Node.js type definitions
  "powerbi-visuals-tools": "^6.1.3"   // Power BI visual CLI tools
}
```

## Examples

### TypeScript Development Workflow

```bash
echo Current: $(node -p "require('./package.json').version")
BUMP=patch npm run release   # -> 1.1.1.0
npm run build                # same version
```

---
Need more automation later? Add a new script (e.g. `ci-version.ts`) without changing this explicit core.
