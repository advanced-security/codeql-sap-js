# Dependency Upgrade Prompt

This prompt provides comprehensive guidance for upgrading dependencies in the codeql-sap-js repository.

## Overview

Regular dependency upgrades are essential for security, bug fixes, and new features. This guide covers upgrading:

1. Node.js dependencies in the CDS extractor
2. CodeQL CLI versions
3. QLT (CodeQL Testing) CLI versions
4. GitHub Actions versions

## Node.js Dependency Upgrades

### Workflow

```bash
cd extractors/cds/tools

# 1. Check for outdated packages
npm outdated

# 2. Check for security vulnerabilities
npm audit

# 3. Review each outdated package
# - Check release notes for breaking changes
# - Determine if upgrade is needed

# 4. Upgrade specific package
npm install <package>@<version>

# 5. Run all tests
npm run build:all

# 6. If tests pass, commit
git add package.json package-lock.json
git commit -m "Upgrade <package> from <old> to <new>"
```

### Security Vulnerabilities

If `npm audit` shows vulnerabilities:

```bash
# Review audit report
npm audit

# Try automatic fix
npm audit fix

# For breaking changes that can't be auto-fixed
npm audit fix --force  # Use with caution

# Run tests
npm run build:all

# If tests fail, investigate and fix
```

### Major Version Upgrades

For major version upgrades:

1. Read migration guides carefully
2. Check for breaking changes
3. Update code if needed
4. Run comprehensive tests
5. Consider creating a separate PR for large upgrades

## CodeQL/QLT CLI Upgrades

### Check Latest Versions

```bash
# Check current versions
codeql version
qlt --version

# Check latest releases on GitHub
# CodeQL: https://github.com/github/codeql-cli-binaries/releases
# QLT: Check internal sources
```

### Update Workflows

Update version in `.github/workflows/*.yml`:

```yaml
# Before
- uses: github/codeql-action/init@v2
  with:
    codeql-version: 2.14.6

# After
- uses: github/codeql-action/init@v3
  with:
    codeql-version: 2.15.4
```

### Validation

1. Create PR with version update
2. Monitor all workflow runs
3. Ensure CodeQL tests pass
4. Ensure CDS extractor tests pass
5. Merge if all checks pass

## GitHub Actions Upgrades

### Check for Updates

```bash
# Check Dependabot alerts
# Navigate to repository → Security → Dependabot alerts
```

### Update Actions

```yaml
# Before
- uses: actions/checkout@v3

# After
- uses: actions/checkout@v4
```

### Common Actions to Monitor

- `actions/checkout`
- `actions/setup-node`
- `github/codeql-action/*`
- `actions/upload-artifact`
- `actions/download-artifact`

## PR Best Practices

### PR Title Format

```
Upgrade <category>: <package> from <old> to <new>
```

Examples:
- `Upgrade Node.js dependencies: @sap/cds from 7.4.0 to 7.5.0`
- `Upgrade CodeQL CLI from 2.14.6 to 2.15.4`
- `Upgrade GitHub Actions: checkout from v3 to v4`

### PR Description Template

```markdown
## Dependency Upgrade

### Category
[Node.js / CodeQL / QLT / GitHub Actions]

### Changes
- Package: `<package-name>`
- Old version: `<old-version>`
- New version: `<new-version>`

### Reason for Upgrade
[Security fix / Bug fix / New features / Routine maintenance]

### Breaking Changes
[None / List breaking changes and migration steps]

### Testing
- [ ] All tests pass
- [ ] No new security vulnerabilities
- [ ] Workflows function correctly (for CLI/Actions upgrades)

### Release Notes
[Link to release notes or changelog]
```

## Validation Checklist

Before committing:

- [ ] Tests pass locally
- [ ] No new security vulnerabilities
- [ ] Breaking changes documented
- [ ] PR description complete
- [ ] Appropriate labels applied

## Related Resources

- CodeQL releases: https://github.com/github/codeql-cli-binaries/releases
