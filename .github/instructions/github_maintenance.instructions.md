---
applyTo: '.github/**/*.md,.github/**/*.yml,PROMPTS.md'
description: 'Instructions for maintaining GitHub infrastructure including agents, instructions, prompts, templates, and workflows.'
---

# Copilot Instructions for GitHub Maintenance

## PURPOSE

This file contains instructions for maintaining the `.github/` directory infrastructure that enables agentic development in this repository.

## REQUIREMENTS

### COMMON REQUIREMENTS

- ALWAYS follow best practices from GitHub's "How to write a great agents.md" guide.
- ALWAYS keep the `PROMPTS.md` documentation up-to-date, especially its mermaid diagram.
- ALWAYS validate GitHub Actions workflow syntax before committing.
- ALWAYS test issue and PR templates for proper rendering.
- NEVER break existing workflows or templates.
- NEVER create overly complex agent definitions.
- NEVER skip updating PROMPTS.md when adding/removing prompts or instructions.

### AGENT DEFINITION REQUIREMENTS

Agent files in `.github/agents/*.md` must:
- ALWAYS include frontmatter with name and description.
- ALWAYS start with executable commands section.
- ALWAYS include code examples showing expected output.
- ALWAYS clearly define boundaries (what agent must not touch).
- ALWAYS cover: Commands, Testing, Project Structure, Code Style, Boundaries.
- ALWAYS be specific about agent's exact responsibilities.
- NEVER be overly generic - agents should have clear, specialized personas.

### INSTRUCTION FILE REQUIREMENTS

Instruction files in `.github/instructions/*.instructions.md` must:
- ALWAYS include frontmatter with `applyTo` pattern and description.
- ALWAYS be concise (sent with every LLM request).
- ALWAYS link to related prompts in "RELATED PROMPTS" section.
- ALWAYS organize as: PURPOSE, REQUIREMENTS, PREFERENCES, CONSTRAINTS, RELATED PROMPTS.
- NEVER duplicate content from prompts - instructions are high-level rules.

### PROMPT FILE REQUIREMENTS

Prompt files in `.github/prompts/*.prompt.md` must:
- ALWAYS provide detailed, step-by-step guidance for specific tasks.
- ALWAYS include concrete examples and command sequences.
- ALWAYS reference tool-specific resources when applicable.
- ALWAYS be task-focused and actionable.
- NEVER be overly verbose - keep focused on the task domain.

### ISSUE TEMPLATE REQUIREMENTS

Issue templates in `.github/ISSUE_TEMPLATE/*.yml` must:
- ALWAYS link to the appropriate agent in description.
- ALWAYS include required fields for task description.
- ALWAYS use appropriate labels for categorization.
- ALWAYS follow YAML syntax strictly.
- NEVER create templates without corresponding agents.

### WORKFLOW REQUIREMENTS

When modifying `.github/workflows/*.yml`:
- ALWAYS validate YAML syntax before committing.
- ALWAYS test workflow changes in PR before merging.
- ALWAYS use semantic versioning for action references.
- NEVER break existing workflow functionality.

## PREFERENCES

- PREFER keeping agents focused on specific domains over creating general-purpose agents.
- PREFER clear, executable commands over abstract descriptions.
- PREFER code examples over prose explanations.
- PREFER updating existing files over creating new ones when possible.

## CONSTRAINTS

- NEVER duplicate content between agents, instructions, and prompts.
- NEVER create documentation files purely for planning (use git commits).
- NEVER skip validation of YAML syntax.
- NEVER modify the hierarchy structure without updating PROMPTS.md.

## PROMPT HIERARCHY

Level 1 (Entry): `.github/ISSUE_TEMPLATE/*.yml` → Entry point for agents
Level 2 (Instructions): `.github/instructions/*.instructions.md` → Always-sent rules
Level 3 (Prompts): `.github/prompts/*.prompt.md` → Detailed task guides
Level 4 (Resources): Tool-specific documentation and examples

## RELATED PROMPTS

For detailed guidance on GitHub maintenance tasks, refer to:
- `.github/prompts/github_maintenance.prompt.md` - Comprehensive maintenance procedures
