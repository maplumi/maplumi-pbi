# Automated TypeScript Versioning for Power BI Visuals

This project includes **TypeScript-based automated versioning scripts** that handle Power BI's unique 4-digit versioning requirements with full type safety and modern tooling.

## Overview

Power BI visuals require **4-digit versioning** (e.g., `1.2.3.4`) throughout the entire system. Our TypeScript automation provides type-safe version management with modern development practices.

**Key Features:**
- ✅ **TypeScript-based scripts** with full type safety
- ✅ **4-digit versioning** throughout (no format conversion needed)
- ✅ **Power BI compliance** from the start
- ✅ **Modern tooling** with tsx runner
- ✅ **IDE support** with IntelliSense and error checking

## Quick Start

### Manual Versioning

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

```bash
# Generate version based on git tags + CI build number
npm run build:ci
```

## Available Scripts

| Script | Purpose | Technology | Example |
|--------|---------|------------|---------|
| `sync-version` | Sync versions between files | TypeScript | `1.0.1.0` → Both files |
| `version:patch` | Increment patch version | TypeScript | `1.0.1.0` → `1.0.2.0` |
| `version:minor` | Increment minor version | TypeScript | `1.0.1.0` → `1.1.0.0` |
| `version:major` | Increment major version | TypeScript | `1.0.1.0` → `2.0.0.0` |
| `version:build` | Increment build number | TypeScript | `1.0.1.0` → `1.0.1.1` |
| `version:ci` | CI-based versioning | TypeScript | Git tag + build number |
| `build:ci` | Build with CI version | Combined | Auto-version + pbiviz package |

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

```
scripts/
├── tsconfig.json           # TypeScript config for scripts
├── sync-version.ts         # Type-safe version synchronization
├── increment-version.ts    # Type-safe version increments
└── ci-version.ts          # Type-safe CI/CD versioning
```

### Modern Execution

All scripts use **tsx** (TypeScript runner) for direct execution:

```bash
# Direct TypeScript execution (no compilation step)
tsx scripts/increment-version.ts patch
```

## Versioning Strategies

### 1. Manual Development

For local development and manual releases:

```bash
# Feature development
npm run version:minor    # 1.0.1.0 → 1.1.0.0
npm run build

# Bug fixes  
npm run version:patch    # 1.0.1.0 → 1.0.2.0
npm run build

# Breaking changes
npm run version:major    # 1.0.1.0 → 2.0.0.0
npm run build

# Quick iterations
npm run version:build    # 1.0.1.0 → 1.0.1.1
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

The TypeScript `ci-version.ts` script automatically:
- Detects latest git tag using typed interfaces
- Counts commits since tag with error handling
- Uses CI build numbers with environment detection
- Generates appropriate versions with type safety

**Examples:**
- Git tag `v1.2.0` + Build #45 → `1.2.0.45`
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

The TypeScript `ci-version.ts` script recognizes these environment variables:

| Variable | Source | Purpose |
|----------|--------|---------|
| `CI` | Most CI systems | Detects CI environment |
| `BUILD_NUMBER` | Jenkins | Build number |
| `GITHUB_RUN_NUMBER` | GitHub Actions | Run number |
| `BUILD_ID` | Various | Build identifier |

## GitHub Actions Integration

### Modern Workflow (Updated)

```yaml
# .github/workflows/build.yml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '18'
    cache: 'npm'

- name: Install dependencies (includes tsx)
  run: npm ci

- name: Generate CI version (TypeScript)
  run: npm run version:ci
  env:
    BUILD_NUMBER: ${{ github.run_number }}

- name: Build visual (TypeScript automation)
  run: npm run build:ci

- name: Create Release (Modern Action)
  uses: softprops/action-gh-release@v1
  with:
    files: dist/*.pbiviz
```

### Dependencies

The workflow automatically installs:
- **tsx** - TypeScript runner
- **@types/node** - Node.js type definitions
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

### 4. **CI/CD with TypeScript:**
   ```bash
   # CI/CD workflow now uses TypeScript
   npm ci                  # Installs tsx
   npm run version:ci      # TypeScript CI versioning
   npm run build:ci        # TypeScript automation
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
// Environment detection in ci-version.ts
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
└── ci-version.ts          # Type-safe CI/CD versioning

.github/workflows/
└── build.yml              # Modern GitHub Actions (no deprecated warnings)

package.json                # 4-digit versioning throughout
pbiviz.json                 # 4-digit versioning throughout
```

### Dependencies

```json
// package.json devDependencies
{
  "tsx": "^4.0.0",           // TypeScript runner
  "@types/node": "^20.0.0"   // Node.js type definitions
}
```

## Examples

### TypeScript Development Workflow

```bash
# Start new feature
git checkout -b feature/new-map-style

# Develop and test (TypeScript scripts)
npm start

# Ready to release (type-safe)
npm run version:minor    # 1.0.1.0 → 1.1.0.0 (TypeScript)
npm run build           # Creates package with TypeScript automation
git tag v1.1.0
git push origin v1.1.0
```

### TypeScript Hotfix Workflow

```bash
# Quick fix needed
git checkout main
git checkout -b hotfix/legend-bug

# Fix the bug
# ...

# Type-safe build increment
npm run version:build    # 1.1.0.0 → 1.1.0.1 (TypeScript)
npm run build           # TypeScript automation
```

### Modern CI Release

```bash
# CI detects tag v1.2.0
# TypeScript CI versioning: 1.2.0.{BUILD_NUMBER}
# Modern GitHub Actions (no deprecation warnings)
# Type-safe build and release process
```

### IDE Integration Example

```bash
# VS Code IntelliSense support
npm run version:[TAB]    # Auto-completion: build, patch, minor, major, ci

# Error checking in real-time
tsx scripts/increment-version.ts invalid-type  # TypeScript error shown
```

### Power BI Workflow with TypeScript

```bash
# Daily development
pbiviz start                    # Dev server

# Type-safe iteration
npm run version:build           # TypeScript increment: 1.0.1.0 → 1.0.1.1
pbiviz package                  # Power BI package: ...1.0.1.1.pbiviz

# Feature complete
npm run release:minor           # TypeScript automation: version + test + build
# Result: maplumi{GUID}.1.1.0.0.pbiviz
```

## Migration Benefits

### Before (JavaScript)
- ❌ No type safety
- ❌ Runtime error discovery
- ❌ Limited IDE support
- ❌ Format conversion complexity

### After (TypeScript)
- ✅ **Compile-time type checking**
- ✅ **IntelliSense auto-completion**
- ✅ **Refactoring support**
- ✅ **4-digit native consistency**
- ✅ **Modern tooling (tsx)**
- ✅ **Better error messages**

This TypeScript automation ensures your Power BI visual always has correct, incrementing version numbers that meet Microsoft's requirements with modern development practices and full type safety.
