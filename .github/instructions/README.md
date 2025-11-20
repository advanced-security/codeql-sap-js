# Copilot Instructions

This directory contains instruction files for GitHub Copilot and other AI coding agents. These instructions are automatically applied when working with specific file types in this repository.

## Purpose

Instruction files provide high-level guidance, requirements, preferences, and constraints that AI agents should follow when modifying code. They are:

- **Concise**: Sent with every AI request, so kept brief and focused
- **High-level**: Define rules and requirements, not detailed procedures
- **File-scoped**: Applied based on `applyTo` pattern in frontmatter
- **Linked**: Reference detailed prompts in `.github/prompts/` for task-specific guidance

## Structure

Each instruction file follows this template:

```markdown
---
applyTo: '<glob-pattern>'
description: 'Brief description of what this instruction covers'
---

# Copilot Instructions for [Area]

## PURPOSE
What this instruction file is for

## REQUIREMENTS
### COMMON REQUIREMENTS
- ALWAYS/NEVER statements for critical rules

### SPECIFIC REQUIREMENTS
- Domain-specific requirements

## PREFERENCES
- PREFER statements for recommended approaches

## CONSTRAINTS
- NEVER statements for forbidden actions

## RELATED PROMPTS
Links to detailed `.github/prompts/*.prompt.md` files
```

## Instruction Files

### `extractors_cds_tools_ts.instructions.md`

**Applies to**: `extractors/cds/tools/**/*.ts`

Provides guidance for TypeScript development in the CodeQL CDS extractor, including build requirements, testing practices, and architectural patterns.

**Related Agent**: `.github/agents/cds-extractor-agent.md`

**Related Prompt**: `.github/prompts/cds_extractor_development.prompt.md`

### `javascript_cap_ql.instructions.md`

**Applies to**: `javascript/frameworks/cap/**/*.ql`, `javascript/frameworks/cap/**/*.qll`

Provides guidance for developing CodeQL queries and library models for the SAP CAP framework.

**Related Agent**: `.github/agents/cap-modeling-agent.md`

**Related Prompt**: `.github/prompts/cap_framework_development.prompt.md`

### `javascript_ui5_ql.instructions.md`

**Applies to**: `javascript/frameworks/ui5/**/*.ql`, `javascript/frameworks/ui5/**/*.qll`

Provides guidance for developing CodeQL queries and library models for the SAPUI5 framework.

**Related Agent**: `.github/agents/ui5-modeling-agent.md`

**Related Prompt**: `.github/prompts/ui5_framework_development.prompt.md`

### `javascript_xsjs_ql.instructions.md`

**Applies to**: `javascript/frameworks/xsjs/**/*.ql`, `javascript/frameworks/xsjs/**/*.qll`

Provides guidance for developing CodeQL queries and library models for the SAP XSJS framework.

**Related Agent**: `.github/agents/xsjs-modeling-agent.md`

**Related Prompt**: `.github/prompts/xsjs_framework_development.prompt.md`

### `dependency_upgrades.instructions.md`

**Applies to**: `extractors/cds/tools/package.json`, `.github/workflows/*.yml`

Provides guidance for upgrading dependencies including Node.js packages, CodeQL/QLT CLI versions, and GitHub Actions.

**Related Agent**: `.github/agents/dependency-upgrade-agent.md`

**Related Prompt**: `.github/prompts/dependency_upgrade.prompt.md`

### `github_maintenance.instructions.md`

**Applies to**: `.github/**/*.md`, `.github/**/*.yml`, `PROMPTS.md`

Provides guidance for maintaining the GitHub infrastructure including agents, instructions, prompts, templates, and workflows.

**Related Agent**: `.github/agents/github-maintenance-agent.md`

**Related Prompt**: `.github/prompts/github_maintenance.prompt.md`

## How Instructions Are Used

1. **Automatic Application**: When an AI agent works on a file matching the `applyTo` pattern, the corresponding instruction file is automatically included in the context.

2. **Hierarchy**: Instructions are part of a larger hierarchy documented in `PROMPTS.md`:
   - Level 1: `.github/ISSUE_TEMPLATE/*.yml` - Entry points
   - Level 2: `.github/agents/*.md` - Agent definitions
   - Level 3: `.github/instructions/*.instructions.md` - High-level rules (this directory)
   - Level 4: `.github/prompts/*.prompt.md` - Detailed task guides

3. **Enforcement**: Instructions define "ALWAYS" and "NEVER" rules that agents should strictly follow.

4. **Guidance**: Instructions provide "PREFER" recommendations for best practices.

## Best Practices

When creating or modifying instruction files:

1. **Keep them concise** - They're sent with every request
2. **Use clear ALWAYS/NEVER statements** - Make requirements unambiguous
3. **Link to prompts** - Reference detailed guidance in the RELATED PROMPTS section
4. **Maintain structure** - Use the standard template format
5. **Update the hierarchy** - Reflect changes in `PROMPTS.md`

## Related Documentation

- **Prompts Hierarchy**: `PROMPTS.md` - Overview of the entire agentic maintenance system
- **Agents**: `.github/agents/` - Specialized AI agent definitions
- **Prompts**: `.github/prompts/` - Detailed task-specific guidance
- **Issue Templates**: `.github/ISSUE_TEMPLATE/` - Entry points for agent workflows

## Contributing

When adding new instruction files:

1. Follow the template structure
2. Define a clear `applyTo` pattern
3. Link to related agents and prompts
4. Update `PROMPTS.md` with the new instruction
5. Test that the `applyTo` pattern matches the intended files
