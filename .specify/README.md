# GitHub Spec Kit Workflow

## ⚠️ IMPORTANT: Always Use GitHub Spec Kit for Feature Development

This project uses **GitHub Spec Kit** for structured, spec-driven development. **Do NOT create custom spec structures** - always use the existing `.specify/` directory structure.

## Directory Structure

```
.specify/
├── memory/
│   ├── constitution.md              # Project principles & standards
│   ├── specifications/              # Feature specifications
│   │   └── baseline-architecture.md # Current system baseline
│   ├── plans/                       # Technical implementation plans
│   └── tasks/                       # Broken-down work items
├── templates/                       # Workflow templates
└── scripts/                         # Automation scripts
```

## Workflow Steps

### 1. Create Specification

**Location**: `.specify/memory/specifications/{feature-name}.md`

**Content**:
- User stories (P1, P2, P3 priority)
- Success criteria
- Non-functional requirements
- Out of scope items

**Use Template**: `.specify/templates/spec-template.md`

### 2. Create Technical Plan

**Location**: `.specify/memory/plans/{feature-name}-plan.md`

**Content**:
- Architecture decisions
- Integration points
- Code snippets and examples
- Dependencies and risks
- Testing strategy

**Use Template**: `.specify/templates/plan-template.md`

### 3. Create Implementation Tasks

**Location**: `.specify/memory/tasks/{feature-name}-tasks.md`

**Content**:
- Breakdown into small, actionable tasks
- Time estimates (hours)
- Dependencies between tasks
- Phases (if applicable)
- Acceptance criteria per task

**Use Template**: `.specify/templates/tasks-template.md`

### 4. Implement Tasks

Follow the task list sequentially, marking progress:
- ⏳ Pending
- 🔄 In Progress
- ✅ Completed

## Available Slash Commands

Use these commands to manage the spec kit workflow:

- `/speckit.specify` - Create or update feature specification
- `/speckit.plan` - Generate technical implementation plan
- `/speckit.tasks` - Generate actionable task breakdown
- `/speckit.implement` - Execute implementation tasks

*Note: Slash commands require AI agent integration (e.g., Claude Code, Custom Agents).*

## Best Practices

### ✅ What TO Do

1. **Always use `.specify/` structure**
   ```
   ✅ .specify/memory/specifications/
   ✅ .specify/memory/plans/
   ✅ .specify/memory/tasks/
   ```

2. **Follow the workflow**: Specifications → Plans → Tasks → Implementation

3. **Use existing specs as templates**
   - Look at `.specify/models/` or templates for format.

### ❌ What NOT to Do

1. **Don't create custom spec structures**
   ```
   ❌ specs/001-feature/
   ❌ docs/specs/
   ❌ Custom spec directories
   ```

2. **Don't skip the spec kit workflow**
   - Writing code directly without specs
   - Creating tasks without a plan

## Quick Start Template

When starting a new feature:

1. **Copy Template**:
   Copy `.specify/templates/spec-template.md` to `.specify/memory/specifications/new-feature.md`.

2. **Fill Details**:
   Describe user stories and success criteria.

3. **Plan & Task**:
   Create corresponding Plan and Task files in `memory/plans/` and `memory/tasks/`.

4. **Implement**:
   Code following the defined tasks.

---

**Happy Spec-Driven Development! 🚀**
