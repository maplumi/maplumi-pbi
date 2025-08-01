# Contributing to Maplumi Power BI Visual 🤝

Thank you for your interest in contributing to Maplumi! We welcome contributions from developers, designers, documentation writers, and Power BI users. This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation Guidelines](#documentation-guidelines)
- [Issue and Bug Reports](#issue-and-bug-reports)
- [Feature Requests](#feature-requests)
- [Community Guidelines](#community-guidelines)

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). We are committed to providing a welcoming and inspiring community for all.

### Our Standards

- **Be respectful**: Treat everyone with respect and kindness
- **Be inclusive**: Welcome newcomers and help them succeed
- **Be collaborative**: Work together and share knowledge
- **Be constructive**: Provide helpful feedback and suggestions
- **Be patient**: Remember that everyone has different experience levels

## How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check the [existing issues](https://github.com/ayiemba/maplumi-pbi/issues) to avoid duplicates.

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

We love feature suggestions! Please check [existing feature requests](https://github.com/ayiemba/maplumi-pbi/issues?q=is%3Aissue+is%3Aopen+label%3Aenhancement) first.

**When suggesting features:**
- Use a clear, descriptive title
- Provide detailed description of the feature
- Explain the use case and benefits
- Include mockups or examples if possible
- Consider implementation complexity

### 📝 Documentation Improvements

Help us improve our documentation:
- Fix typos or unclear explanations
- Add missing information
- Improve code examples
- Translate documentation
- Create tutorials or guides

### 🔧 Code Contributions

We welcome code contributions! See the [Development Setup](#development-setup) section below.

## Development Setup

### Prerequisites

- **Node.js** (v16 or higher)
- **npm** (v8 or higher)
- **Git**
- **Power BI Desktop** (for testing)

### Getting Started

1. **Fork the repository**
   ```bash
   # Click the "Fork" button on GitHub
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/maplumi-pbi.git
   cd maplumi-pbi
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/ayiemba/maplumi-pbi.git
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Start development server**
   ```bash
   npm start
   ```

6. **Run tests**
   ```bash
   npm test
   ```

### Project Structure

```
maplumi-pbi/
├── src/                    # Source code
│   ├── visual.ts          # Main visual class
│   ├── settings.ts        # Visual settings
│   ├── layers/            # Map layers (choropleth, circles)
│   ├── services/          # Data services and utilities
│   └── utils/             # Helper functions
├── style/                 # LESS stylesheets
├── tests/                 # Test files
├── specs/                 # Documentation
└── assets/                # Static assets
```

### Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, documented code
   - Follow our coding standards
   - Add tests for new functionality
   - Update documentation if needed

3. **Test your changes**
   ```bash
   npm test
   npm run lint
   npm run build
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**

## Pull Request Process

### Before Submitting

- [ ] Code follows our style guidelines
- [ ] Tests pass locally (`npm test`)
- [ ] Code builds successfully (`npm run build`)
- [ ] Documentation is updated (if needed)
- [ ] Commit messages follow our format
- [ ] Branch is up to date with main

### Commit Message Format

We use [Conventional Commits](https://conventionalcommits.org/) format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(choropleth): add new color classification method
fix(circles): resolve scaling issue with large datasets
docs(readme): update installation instructions
test(services): add unit tests for data processing
```

### Pull Request Template

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] New tests added (if applicable)
- [ ] Manual testing completed

## Screenshots
Include screenshots for visual changes.

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or clearly documented)
```

## Coding Standards

### TypeScript/JavaScript

- Use **TypeScript** for all new code
- Follow **ESLint** configuration
- Use **meaningful variable names**
- Add **JSDoc comments** for public methods
- Prefer **const** over **let** where possible
- Use **async/await** over Promises when possible

**Note on AI-Assisted Development**: Contributors are welcome to use AI tools (GitHub Copilot, ChatGPT, etc.) to assist with code generation, but you remain fully responsible for understanding, testing, and maintaining the quality of all submitted code.

```typescript
/**
 * Calculates the scaled radius for a circle based on data value
 * @param value - The data value to scale
 * @param minValue - Minimum value in dataset
 * @param maxValue - Maximum value in dataset
 * @param minRadius - Minimum circle radius
 * @param maxRadius - Maximum circle radius
 * @returns Scaled radius value
 */
export function calculateScaledRadius(
  value: number,
  minValue: number,
  maxValue: number,
  minRadius: number,
  maxRadius: number
): number {
  // Implementation here
}
```

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

### Test Structure

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test component interactions
- **Visual Tests**: Test Power BI integration

### Writing Tests

```typescript
describe('ColorRampManager', () => {
  it('should generate correct color ramp for given values', () => {
    const manager = new ColorRampManager();
    const values = [10, 20, 30, 40, 50];
    const colors = manager.generateColorRamp(values, 'blues', 5);
    
    expect(colors).toHaveLength(5);
    expect(colors[0]).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});
```

### Test Coverage

- Aim for **80%+ code coverage**
- Focus on **critical business logic**
- Test **edge cases** and **error conditions**
- Mock **external dependencies**

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

### Versioning

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Schedule

- **Minor releases**: Monthly (if features ready)
- **Patch releases**: As needed for critical bugs
- **Major releases**: When breaking changes accumulated

## Questions?

- **General questions**: [GitHub Discussions](https://github.com/ayiemba/maplumi-pbi/discussions)
- **Bug reports**: [GitHub Issues](https://github.com/ayiemba/maplumi-pbi/issues)
- **Security issues**: Email ayiembaelvis@gmail.com
- **Direct contact**: [@ayiemba](https://github.com/ayiemba)

---

**Thank you for contributing to Maplumi!** 🎉

Every contribution, no matter how small, helps make Maplumi better for the entire Power BI community. We appreciate your time and effort in improving this project.
