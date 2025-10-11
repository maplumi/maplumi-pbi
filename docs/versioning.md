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
git status                      # ensure clean
BUMP=minor npm run release       # bump + build
git add package.json pbiviz.json
git commit -m "chore(release): v1.2.0.0"
git tag v1.2.0                  # semantic tag (drops 4th digit)
git push origin main --tags
```
If you tag first, bump after tagging. Tag `v1.2.0` corresponds to file version `1.2.0.0`.

## Manual Edit Option
Edit `package.json` version (1–4 numeric parts). Then:
```bash
npm run sync-version
npm run build
```
Missing parts are padded with zeros by scripts (e.g. `1.2` → `1.2.0.0`).

## Environment Variables
| Variable | Meaning | Default |
|----------|---------|---------|
| `BUMP` | Part to increment for `npm run release` | `revision` |
| `SKIP_GIT_CLEAN_CHECK` | Set `1` to allow semantic bump on dirty tree (avoid) | unset |

## Utilities
`scripts/version-utils.ts` centralizes:
* 4-part validation & padding
* Read/write of `package.json` + `pbiviz.json`
* Git cleanliness guard

Increment logic lives in `scripts/increment-version.ts`.

## CI Workflows
Recommended separation:
1. Build/Test workflow (no bump)
2. Manual Release workflow (bump + tag + release)

### 1. Build Workflow (excerpt)
```yaml
steps:
  - uses: actions/checkout@v4
    with: { fetch-depth: 0 }
  - uses: actions/setup-node@v4
    with: { node-version: '18', cache: 'npm' }
  - run: npm ci
  - run: npm test --silent
  - run: npm run build
  - uses: actions/upload-artifact@v4
    with:
      name: visual
      path: dist/*.pbiviz
```

### 2. Manual Release (concept)
```yaml
on:
  workflow_dispatch:
    inputs:
      bump:
        description: "major | minor | patch | revision"
        required: true
        default: revision
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: '18', cache: 'npm' }
      - run: npm ci
      - name: Bump & build
        env: { BUMP: ${{ inputs.bump }} }
        run: npm run release
      - name: Commit & tag
        run: |
          VERSION=$(node -p "require('./package.json').version")
          git config user.name 'github-actions'
          git config user.email 'github-actions@users.noreply.github.com'
          git add package.json pbiviz.json
          git commit -m "chore(release): v${VERSION}"
          TAG=v${VERSION%.*}
          git tag "$TAG"
          git push origin HEAD --tags
      - name: Capture artifact
        id: art
        run: echo "file=$(ls dist/*.pbiviz | head -1)" >> $GITHUB_OUTPUT
      - uses: softprops/action-gh-release@v1
        with: { tag_name: ${{ github.ref_name }}, files: ${{ steps.art.outputs.file }} }
```
Adapt as needed then commit as `.github/workflows/release.yml`.

## Git Tags ↔ File Versions
| Git Tag | Files Version |
|---------|---------------|
| v1.2.0  | 1.2.0.0 |
| (revision bump) | 1.2.0.1 (no new tag) |

## Safety Rules
* One bump per release commit
* Semantic bump blocked if dirty (unless override env)
* Review diffs of version files in PRs

## Troubleshooting
| Issue | Fix |
|-------|-----|
| Drift between files | `npm run sync-version` |
| Need specific version | Edit `package.json` → sync → build |
| Bump blocked | Commit/stash or set override env (avoid in CI) |
| Wrong format | Script pads/truncates to 4 parts |

## Rationale
Earlier automation (auto build increments, CI-derived numbers) caused accidental churn and double bumps. This lean, explicit model is predictable and audit friendly.

## Example Session
```bash
echo Current: $(node -p "require('./package.json').version")
BUMP=patch npm run release   # -> 1.1.1.0
npm run build                # same version
```

---
Need more automation later? Add a new script (e.g. `ci-version.ts`) without changing this explicit core.
