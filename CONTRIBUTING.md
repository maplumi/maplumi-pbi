# Contributing to Maplumi Power BI Visual 🤝

Thank you for your interest in contributing to Maplumi! We welcome contributions from developers, designers, documentation writers, and Power BI users. This guide will help you get started.

> **Note on AI-Assisted Development**: Contributors are welcome to use AI tools (GitHub Copilot, ChatGPT, etc.) to assist with code generation, but you remain fully responsible for understanding, testing, and maintaining the quality of all submitted code.

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
- **powerbi-visuals-tools** (pbiviz CLI)

Install the Power BI visual tools globally:
```bash
npm install -g powerbi-visuals-tools
```

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
   # Run unit tests
   npm test
   
   # Lint code for style issues
   npm run lint
   
   # Build the visual package
   npm run build
   
   # Validate Power BI visual package
   pbiviz package
   
   # Start development server for testing
   pbiviz start
   ```

4. **Power BI Testing**
   - Load the visual in Power BI Desktop
   - Test with sample data from different sources
   - Verify cross-filtering and interactions work
   - Test performance with large datasets
   - Validate accessibility features
   - Check mobile responsiveness

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
- [ ] Visual package builds without errors (`pbiviz package`)
- [ ] Visual loads correctly in Power BI Desktop
- [ ] Cross-filtering and interactions work properly
- [ ] Performance tested with large datasets (1000+ rows)
- [ ] Accessibility features validated
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
- [ ] Tests pass locally (`npm test`)
- [ ] Visual package builds successfully (`pbiviz package`)
- [ ] Manual testing completed in Power BI Desktop
- [ ] Cross-filtering functionality verified
- [ ] Performance tested with large datasets
- [ ] New tests added (if applicable)
- [ ] Accessibility features validated

## Screenshots
Include screenshots for visual changes.

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or clearly documented)
```

## Coding Standards

### Power BI Visual Specific Guidelines

Following Microsoft's Power BI custom visual development guidelines:

- **Performance**: Visuals must render within 1000ms for datasets up to 30,000 rows
- **Memory Usage**: Keep memory footprint under 50MB
- **API Compliance**: Use only supported Power BI Visual API methods
- **Cross-filtering**: Implement proper selection manager integration
- **Accessibility**: Support screen readers and keyboard navigation
- **Responsive Design**: Visual must work on mobile devices
- **Error Handling**: Graceful degradation when data is invalid or missing
- **Security**: No external HTTP requests without user consent
- **Localization**: Support RTL languages and locale-specific formatting

### TypeScript/JavaScript

- Use **TypeScript** for all new code
- Follow **ESLint** configuration
- Use **meaningful variable names**
- Add **JSDoc comments** for public methods
- Prefer **const** over **let** where possible
- Use **async/await** over Promises when possible

### Power BI Specific Standards

**Capabilities.json**:
- Keep data roles minimal and well-documented
- Use appropriate data type restrictions
- Implement proper grouping and sorting options
- Follow naming conventions for roles and properties

**Visual Settings**:
- Use Power BI's formatting model API
- Implement proper validation for user inputs
- Provide meaningful default values
- Group related settings logically

**Data Processing**:
- Handle large datasets efficiently using data view streaming
- Implement proper null/undefined checks
- Use appropriate data transformation techniques
- Optimize for Power BI's columnar data structure

**Rendering**:
- Use requestAnimationFrame for smooth animations
- Implement proper cleanup in destroy() method
- Handle viewport changes gracefully
- Optimize SVG/canvas usage for performance

```typescript
// Example of proper Power BI visual lifecycle management
export class Visual implements IVisual {
    private target: HTMLElement;
    private selectionManager: ISelectionManager;
    
    constructor(options: VisualConstructorOptions) {
        this.target = options.element;
        this.selectionManager = options.host.createSelectionManager();
    }
    
    public update(options: VisualUpdateOptions) {
        // Handle null/undefined data gracefully
        if (!options.dataViews || !options.dataViews[0]) {
            this.clearVisual();
            return;
        }
        
        // Process data efficiently
        const dataView = options.dataViews[0];
        this.renderVisual(dataView, options.viewport);
    }
    
    public destroy(): void {
        // Clean up resources
        this.target.innerHTML = '';
    }
}
```

```typescript
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
  // Validate inputs
  if (value == null || minValue == null || maxValue == null) {
    return minRadius;
  }
  
  // Handle edge cases
  if (maxValue === minValue) {
    return minRadius;
  }
  
  // Calculate proportional scaling
  const ratio = (value - minValue) / (maxValue - minValue);
  return minRadius + (ratio * (maxRadius - minRadius));
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

### Power BI Visual Testing

In addition to unit tests, test your visual with:

```bash
# Start development server
pbiviz start

# Package visual for testing
pbiviz package

# Validate capabilities.json
pbiviz validate
```

**Manual Testing Checklist:**
- [ ] Visual loads in Power BI Desktop
- [ ] Data binding works with different field types
- [ ] Cross-filtering with other visuals functions correctly
- [ ] Selection manager interactions work properly
- [ ] Visual handles null/empty data gracefully
- [ ] Performance is acceptable with large datasets
- [ ] Visual is responsive on different screen sizes
- [ ] Accessibility features work (screen readers, keyboard navigation)
- [ ] Visual respects Power BI theme colors
- [ ] Tooltips display correctly
- [ ] Export functionality works (if implemented)

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

**Power BI Visual Versioning (Required by Microsoft):**

Power BI visuals must follow Microsoft's specific versioning requirements:

- **Format**: Four digits in the format `x.x.x.x` (e.g., `1.0.0.0`, `1.2.1.0`)
- **Required**: If your visual only has three digits, add a `.0` at the end
- **pbiviz.json**: Version must be updated in the `visual.version` field
- **Marketplace**: Version changes are required for AppSource submissions

**Recommended Approach:**
- **MAJOR.MINOR.PATCH.BUILD** (e.g., `1.2.3.0`)
  - **MAJOR**: Breaking changes that affect existing functionality
  - **MINOR**: New features (backward compatible)
  - **PATCH**: Bug fixes (backward compatible)  
  - **BUILD**: Internal builds, hotfixes, or metadata changes

**Examples:**
```json
// pbiviz.json
{
  "visual": {
    "version": "1.0.0.0"  // Initial release
    "version": "1.1.0.0"  // New feature added
    "version": "1.1.1.0"  // Bug fix
    "version": "2.0.0.0"  // Breaking changes
  }
}
```

**Important Notes:**
- Never change the GUID when updating versions
- Ensure version consistency between `pbiviz.json` and `package.json`
- AppSource submissions require version increments
- Test new versions thoroughly before submission

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
