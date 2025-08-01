# Automated Versioning for Power BI Visuals

This project includes automated versioning scripts that handle the unique requirements of Power BI visuals while maintaining standard npm versioning practices.

## Overview

Power BI visuals require **4-digit versioning** (e.g., `1.2.3.4`) while npm uses **3-digit versioning** (e.g., `1.2.3`). Our automation handles this seamlessly.

## Quick Start

### Manual Versioning

```bash
# Patch release (1.0.0 → 1.0.1.0)
npm run release:patch

# Minor release (1.0.0 → 1.1.0.0)  
npm run release:minor

# Major release (1.0.0 → 2.0.0.0)
npm run release:major

# Build number increment (1.0.0.0 → 1.0.0.1)
npm run version:build
```

### Automated CI/CD

```bash
# Generate version based on git tags + CI build number
npm run build:ci
```

## Available Scripts

| Script | Purpose | Example |
|--------|---------|---------|
| `sync-version` | Sync package.json → pbiviz.json | `1.0.0` → `1.0.0.0` |
| `version:patch` | Increment patch version | `1.0.0` → `1.0.1` |
| `version:minor` | Increment minor version | `1.0.0` → `1.1.0` |
| `version:major` | Increment major version | `1.0.0` → `2.0.0` |
| `version:build` | Increment build number | `1.0.0.0` → `1.0.0.1` |
| `version:ci` | CI-based versioning | Git tag + build number |
| `build:ci` | Build with CI version | Auto-version + package |

## Versioning Strategies

### 1. Manual Development

For local development and manual releases:

```bash
# Feature development
npm run version:minor
npm run build

# Bug fixes  
npm run version:patch
npm run build

# Breaking changes
npm run version:major
npm run build

# Quick iterations
npm run version:build
npm run build
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

The `version:ci` script automatically:
- Detects latest git tag
- Counts commits since tag
- Uses CI build numbers
- Generates appropriate versions

**Examples:**
- Git tag `v1.2.0` + Build #45 → `1.2.0.45`
- No tags + 5 commits → `1.0.0.5`
- Local development → `1.0.0.{commits}`

## Version Format

### Power BI Requirements

Power BI visuals **must** use 4-digit versioning:

```json
// pbiviz.json
{
  "visual": {
    "version": "1.2.3.4"  // ✅ Required format
  },
  "version": "1.2.3.4"     // ✅ Also required
}
```

### NPM Compatibility

NPM packages use 3-digit versioning:

```json
// package.json  
{
  "version": "1.2.3"  // ✅ Standard npm format
}
```

Our scripts handle the conversion automatically.

## CI/CD Environment Variables

The `ci-version.js` script recognizes these environment variables:

| Variable | Source | Purpose |
|----------|--------|---------|
| `CI` | Most CI systems | Detects CI environment |
| `BUILD_NUMBER` | Jenkins | Build number |
| `GITHUB_RUN_NUMBER` | GitHub Actions | Run number |
| `BUILD_ID` | Various | Build identifier |

## GitHub Actions Integration

```yaml
# .github/workflows/build.yml
- name: Generate CI version
  run: npm run version:ci
  env:
    BUILD_NUMBER: ${{ github.run_number }}

- name: Build visual
  run: npm run build:ci
```

## Manual Override

You can manually set versions by editing `package.json`:

```bash
# Set specific version
npm version 2.1.0 --no-git-tag-version
npm run sync-version
npm run build
```

## Troubleshooting

### Version Sync Issues

If versions get out of sync:

```bash
npm run sync-version
```

### Git Tag Issues

If git commands fail:

```bash
# Initialize git repository
git init
git add .
git commit -m "Initial commit"

# Or use manual versioning
npm run version:patch
```

### Build Number Reset

To reset build numbers:

```bash
# Edit package.json to desired base version
npm version 1.2.3 --no-git-tag-version
npm run sync-version
```

## Best Practices

1. **Use semantic versioning principles:**
   - `MAJOR`: Breaking changes
   - `MINOR`: New features (backward compatible)
   - `PATCH`: Bug fixes
   - `BUILD`: Internal builds, hotfixes

2. **Git tag strategy:**
   ```bash
   git tag v1.0.0    # Release
   git tag v1.1.0    # Feature release
   git tag v1.1.1    # Patch release
   ```

3. **CI/CD workflow:**
   - Commits to `develop` → Pre-release builds
   - Tags on `main` → Release builds
   - Pull requests → Test builds

4. **AppStore submissions:**
   - Always increment version for AppStore
   - Test thoroughly before version increment
   - Document changes in release notes

## File Structure

```
scripts/
├── sync-version.js     # Basic version sync
├── increment-build.js  # Build number management  
└── ci-version.js      # CI/CD versioning

.github/workflows/
└── build.yml          # GitHub Actions automation
```

## Examples

### Development Workflow

```bash
# Start new feature
git checkout -b feature/new-map-style

# Develop and test
npm start

# Ready to release  
npm run version:minor    # 1.0.0 → 1.1.0.0
npm run build           # Creates package
git tag v1.1.0
git push origin v1.1.0
```

### Hotfix Workflow

```bash
# Quick fix needed
git checkout main
git checkout -b hotfix/legend-bug

# Fix the bug
# ...

# Quick build increment
npm run version:build    # 1.1.0.0 → 1.1.0.1
npm run build
```

### CI Release

```bash
# CI detects tag v1.2.0
# Automatically generates: 1.2.0.{BUILD_NUMBER}
# Builds and releases visual package
```

This automation ensures your Power BI visual always has correct, incrementing version numbers that meet Microsoft's requirements while maintaining compatibility with standard JavaScript tooling.
