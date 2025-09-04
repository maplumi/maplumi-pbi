# Contributing to Maplumi Power BI Visual 🤝

Thanks for your interest in Maplumi! This page gives you the fastest path to contribute code, docs, or issues.

> You may use AI tools (e.g., GitHub Copilot) to assist, but you’re responsible for the quality of your changes.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Versioning](#versioning)

## Code of Conduct

By participating, you agree to our [Code of Conduct](CODE_OF_CONDUCT.md).

## How Can I Contribute?

### 🐛 Reporting Bugs

Check existing issues first: https://github.com/maplumi/maplumi-pbi/issues

**When submitting a bug report, please include:**
- Clear, descriptive title
- Steps to reproduce the issue
- Expected vs. actual behavior
- Screenshots or screen recordings (if applicable)
- Power BI version and browser information
- Sample data or .pbix file (if possible)

**Use this template:**
```markdown
**Bug Description**
A clear description of what the bug is.

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. Configure '...'
4. See error

**Expected Behavior**
What you expected to happen.

**Screenshots**
Add screenshots to help explain the problem.

**Environment**
- Power BI Version: [e.g., Power BI Desktop March 2024]
- Browser: [e.g., Chrome 120.0]
- Visual Version: [e.g., 1.0.0]
```

### 💡 Suggesting Features

We love ideas! Start here: https://github.com/maplumi/maplumi-pbi/issues?q=is%3Aissue+is%3Aopen+label%3Aenhancement

**When suggesting features:**
- Use a clear, descriptive title
- Provide detailed description of the feature
- Explain the use case and benefits
- Include mockups or examples if possible
- Consider implementation complexity

### 📝 Documentation Improvements

- Fix typos, clarify sections, add examples
- Link to related specs under `spec/`

### 🔧 Code Contributions

See [Development Setup](#development-setup) and [Pull Request Process](#pull-request-process).

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- Power BI Desktop (for local testing)

### Getting Started (quick)

1. Fork and clone your fork
2. Install deps: `npm install`
3. Dev server: `npm start` (use Power BI Developer Mode)
4. Tests: `npm test`
5. Package: `npm run build` (dist/*.pbiviz)

### Project Structure (high level)

`src/` (visual, settings, layers, services, utils), `style/`, `tests/`, `spec/`, `assets/`.

### Development Workflow

1) Branch: `git checkout -b feature/my-change`
2) Code + tests + docs
3) Lint/tests/build: `npm run lint && npm test && npm run build`
4) Commit (Conventional Commits): `feat(scope): summary`
5) Push and open a PR

## Pull Request Process

### Before Submitting

- Tests pass (`npm test`) and build succeeds (`npm run build`)
- Visual validated in Desktop (bindings, cross-filtering, performance)
- Docs updated if behavior changed
- Conventional Commits used (e.g., `feat(circles): add donut mode`)

## Coding Standards

### Coding Standards

- TypeScript, ESLint, small pure functions where possible
- Power BI: use Formatting Model API, selection manager, and clean up resources in `destroy()`
- Performance: handle up to ~30k rows; validate inputs; avoid unnecessary reflows
- Security: HTTPS-only for external requests; respect capabilities and privacy

### CSS/LESS

- Use **LESS** for styling
- Follow **BEM naming convention**
- Use **semantic class names**
- Avoid **!important** unless absolutely necessary

```less
.maplumi {
  &__container {
    position: relative;
    width: 100%;
    height: 100%;
  }

  &__legend {
    position: absolute;
    background: rgba(255, 255, 255, 0.9);
    
    &--top {
      top: 10px;
    }
    
    &--bottom {
      bottom: 10px;
    }
  }
}
```

## Testing Guidelines

- Unit tests with Jest; aim for meaningful coverage of core logic
- Run locally: `npm test` (watch: `npm run test:watch`, coverage: `npm run test:coverage`)
- Validate in Desktop (bindings, cross-filtering, tooltips, performance)
- Optional: `pbiviz validate` and `pbiviz package` before PR

## Versioning

See docs/versioning: [docs/versioning.md](docs/versioning.md)

## Documentation Guidelines

### Code Documentation

- Use **JSDoc** for TypeScript/JavaScript
- Document **public APIs** thoroughly
- Include **usage examples**
- Explain **complex algorithms**

### User Documentation

- Write in **clear, simple language**
- Include **step-by-step instructions**
- Add **screenshots** for visual guidance
- Provide **real-world examples**

### API Documentation

- Document all **public methods**
- Include **parameter types** and **return values**
- Provide **usage examples**
- Note **breaking changes**

## Issue and Bug Reports

### Issue Labels

We use these labels to categorize issues:

- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Improvements or additions to docs
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention is needed
- `question`: Further information is requested
- `priority-high`: High priority issue
- `priority-low`: Low priority issue

### Bug Severity

- **Critical**: Visual crashes or doesn't load
- **High**: Major functionality broken
- **Medium**: Minor functionality issues
- **Low**: Cosmetic issues or minor inconveniences

## Feature Requests

### Feature Categories

- **Core Functionality**: Map rendering, data processing
- **User Interface**: Styling, configuration options
- **Performance**: Speed and memory optimizations
- **Integration**: Power BI specific features
- **Accessibility**: Screen readers, keyboard navigation

### Evaluation Criteria

We evaluate features based on:
- **User impact**: How many users will benefit?
- **Implementation effort**: How complex is it to build?
- **Maintenance cost**: Ongoing support requirements
- **Power BI alignment**: Fits with Power BI ecosystem?

## Community Guidelines

### Getting Help

- **GitHub Discussions**: Ask questions and share ideas
- **Issues**: Report bugs and request features
- **Stack Overflow**: Use tag `maplumi-powerbi`
- **Power BI Community**: Connect with other users

### Mentorship

- **First-time contributors**: Look for `good first issue` label
- **Mentoring available**: Maintainers help newcomers
- **Pair programming**: Available for complex features
- **Code reviews**: Learning opportunity for all

### Recognition

Contributors are recognized through:
- **Contributors list** in README
- **Release notes** mention significant contributions
- **GitHub achievements** and profile highlights
- **Community shoutouts** for helpful members

## Release Process

### Automated Versioning System

This project includes **automated versioning scripts** that handle Power BI's 4-digit versioning requirements while maintaining development efficiency.

**Key Features:**
- ✅ **4-digit versioning** throughout (e.g., `1.0.0.0`)
- ✅ **Automatic sync** between `package.json` and `pbiviz.json`
- ✅ **Microsoft Power BI compliance**
- ✅ **CI/CD integration** ready
- ✅ **One-command releases**

### Quick Start Commands

#### **Daily Development**
```bash
# Start development server
npm start

# Quick package with current version
npm run package

# Quick iteration (increment build number)
npm run version:build    # 1.0.0.0 → 1.0.0.1
pbiviz package
```

#### **Version Management**
```bash
# Bug fixes
npm run version:patch    # 1.0.0.0 → 1.0.1.0

# New features  
npm run version:minor    # 1.0.0.0 → 1.1.0.0

# Breaking changes
npm run version:major    # 1.0.0.0 → 2.0.0.0

# Quick builds
npm run version:build    # 1.0.0.0 → 1.0.0.1
```

#### **Complete Releases**
```bash
# Full release process (includes testing)
npm run release:patch   # Version + test + build
npm run release:minor   # Version + test + build  
npm run release:major   # Version + test + build
```

#### **CI/CD Automation**
```bash
# After tests pass, auto bump build part (or semantic if SEMVER_BUMP set)
npm run version:auto
```

### Development Workflows

#### **Feature Development**
```bash
# 1. Start feature branch
git checkout -b feature/new-map-style

# 2. Development loop
npm start              # Dev server
# Make changes, test in Power BI Desktop

# 3. Ready to release
npm run version:minor  # Increment version
npm run package       # Create .pbiviz file

# 4. Commit and merge
git commit -am "feat: add new map styling options"
git checkout main && git merge feature/new-map-style
```

#### **Bug Fix Workflow**
```bash
# Quick fix
npm run version:patch  # 1.0.1.0 → 1.0.2.0
npm run package

# Emergency hotfix
npm run version:build  # 1.0.1.0 → 1.0.1.1
pbiviz package
```

#### **Testing Workflow**
```bash
# Continuous testing during development
npm start              # Terminal 1: Dev server

# Terminal 2: When ready to test
npm run version:build  # Quick increment
npm run package       # New .pbiviz for Power BI Desktop
```

### Versioning Strategy

**Power BI Visual Versioning (Required by Microsoft):**

Power BI visuals **must** use 4-digit versioning format:

- **Format**: Four digits `x.x.x.x` (e.g., `1.0.0.0`, `1.2.1.0`)
- **Automatic**: Our scripts handle this automatically
- **Consistent**: Same version in both `package.json` and `pbiviz.json`
- **AppSource**: Required for marketplace submissions

**Version Meaning:**
- **MAJOR.MINOR.PATCH.BUILD** (e.g., `1.2.3.4`)
  - **MAJOR**: Breaking changes that affect existing functionality
  - **MINOR**: New features (backward compatible)
  - **PATCH**: Bug fixes (backward compatible)  
  - **BUILD**: Quick iterations, hotfixes, internal builds

**Examples:**
```json
// Both package.json and pbiviz.json use same format
{
  "version": "1.0.0.0"  // ✅ Initial release
  "version": "1.1.0.0"  // ✅ New feature added
  "version": "1.1.1.0"  // ✅ Bug fix
  "version": "1.1.1.1"  // ✅ Quick iteration
  "version": "2.0.0.0"  // ✅ Breaking changes
}
```

### Automated Scripts Overview

| Script | Purpose | Example Output |
|--------|---------|----------------|
| `sync-version` | Sync versions between files | Ensures consistency |
| `version:patch` | Bug fix increment | `1.0.0.0` → `1.0.1.0` |
| `version:minor` | Feature increment | `1.0.0.0` → `1.1.0.0` |
| `version:major` | Breaking change increment | `1.0.0.0` → `2.0.0.0` |
| `version:build` | Quick iteration | `1.0.0.0` → `1.0.0.1` |
| `version:auto` | CI/CD auto semantic/build bump | Env (SEMVER_BUMP) + build increment |
| `package` | Sync + build visual | Creates `.pbiviz` file |
| `release:*` | Full release process | Version + test + build |

### Manual Version Override

If you need to set a specific version:

```bash
# Edit package.json version manually, then:
npm run sync-version   # Sync to pbiviz.json
npm run package       # Build with new version
```

### CI/CD Integration

The project includes GitHub Actions automation:

```yaml
# After tests succeed
- name: Auto version
  run: npm run version:auto
```

**Environment Variables Supported:**
- `BUILD_NUMBER` - Jenkins builds
- `GITHUB_RUN_NUMBER` - GitHub Actions
- `BUILD_ID` - General CI systems

### File Management

The automated system manages these files:

```
📦 Version synchronization:
├── package.json          # 4-digit version
├── pbiviz.json           # 4-digit version (visual.version + version)
└── dist/*.pbiviz         # Auto-generated with version in filename

📝 Generated files:
├── maplumi{GUID}.1.0.0.0.pbiviz    # Versioned package
└── Automatic filename versioning   # No manual naming needed
```

### Best Practices

1. **Use semantic versioning principles:**
   ```bash
   npm run version:build   # Quick iterations
   npm run version:patch   # Bug fixes  
   npm run version:minor   # New features
   npm run version:major   # Breaking changes
   ```

2. **Test before releasing:**
   ```bash
   npm test                # Run unit tests
   npm run lint           # Check code style
   npm run package        # Test build process
   ```

3. **Git workflow integration:**
   ```bash
   npm run version:minor   # Increment version
   git add .
   git commit -m "feat: new map feature"
   git tag v1.1.0         # Tag the release
   git push origin v1.1.0
   ```

4. **Power BI Desktop testing:**
   - Always test new versions in Power BI Desktop
   - Verify cross-filtering functionality
   - Test with realistic data sizes
   - Validate visual interactions

### AppSource Submission

For Microsoft AppSource submissions:

```bash
# 1. Prepare release
npm run release:minor    # Full release process

# 2. Quality checks
npm test                # All tests pass
npm run lint           # No linting errors
pbiviz package         # Verify build success

# 3. Version verification
# ✅ Version incremented from previous submission
# ✅ No GUID changes
# ✅ Proper 4-digit format
# ✅ All files updated consistently
```

### Troubleshooting

#### Version Sync Issues
```bash
npm run sync-version    # Fix version mismatches
```

#### Manual Reset
```bash
# Reset to specific version
# 1. Edit package.json version
# 2. Run sync
npm run sync-version
```

#### Build Issues
```bash
# Clean rebuild
rm -rf dist/
npm run package
```

For complete versioning documentation, see [`docs/versioning.md`](docs/versioning.md).

### Release Schedule

- **Build increments**: As needed during development
- **Patch releases**: For critical bugs and small fixes
- **Minor releases**: Monthly for new features (when ready)
- **Major releases**: When breaking changes accumulated

**Important Notes:**
- ✅ Never change the GUID when updating versions
- ✅ Always test new versions in Power BI Desktop
- ✅ AppSource submissions require version increments
- ✅ Use automated scripts to prevent version inconsistencies
- ✅ CI/CD handles versioning automatically

## Questions?

- **General questions**: [GitHub Discussions](https://github.com/ayiemba/maplumi-pbi/discussions)
- **Bug reports**: [GitHub Issues](https://github.com/ayiemba/maplumi-pbi/issues)
- **Security issues**: Email ayiembaelvis@gmail.com
- **Direct contact**: [@ayiemba](https://github.com/ayiemba)

---

**Thank you for contributing to Maplumi!** 🎉

Every contribution, no matter how small, helps make Maplumi better for the entire Power BI community. We appreciate your time and effort in improving this project.
