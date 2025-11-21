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
## REQUIREMENTS
## PREFERENCES
## CONSTRAINTS
## RELATED PROMPTS
```

## How Instructions Are Used

1. **Automatic Application**: When an AI agent works on a file matching the `applyTo` pattern, the corresponding instruction file is automatically included in the context.

2. **Hierarchy**: Instructions are part of a larger hierarchy documented in `PROMPTS.md`:
   - Level 1: `.github/ISSUE_TEMPLATE/*.yml` - Entry points
   - Level 2: `.github/agents/*.md` - Agent definitions
   - Level 3: `.github/instructions/*.instructions.md` - High-level rules (this directory)
   - Level 4: `.github/prompts/*.prompt.md` - Detailed task guides

3. **Enforcement**: Instructions define "ALWAYS" and "NEVER" rules that agents should strictly follow.

## Related Documentation

- **Prompts Hierarchy**: `PROMPTS.md` - Overview of the entire agentic maintenance system
- **Agents**: `.github/agents/` - Specialized AI agent definitions
- **Prompts**: `.github/prompts/` - Detailed task-specific guidance
- **Issue Templates**: `.github/ISSUE_TEMPLATE/` - Entry points for agent workflows
