# GitHub Spec Kit Workflow for V-label App

## ⚠️ IMPORTANT: Always Use GitHub Spec Kit for Feature Development

This project uses **GitHub Spec Kit** for structured, spec-driven development. **Do NOT "vibe code"**. Always follow the spec-plan-task workflow using the provided slash commands.

## Directory Structure

```
.specify/
├── agent-commands/          # Agent behavior definitions (DO NOT EDIT)
│   ├── specify.md
│   ├── ...
├── memory/                  # Project Context Brain
│   ├── constitution.md      # Rules, Tech Stack, Principles
│   ├── [feature-name]/      # 🌟 FEATURE FOLDERS
│   │   ├── spec.md          # Feature Specification
│   │   ├── plan.md          # Implementation Plan
│   │   └── tasks.md         # Actionable Tasks
│   └── specifications/      # Global/Baseline Specs (e.g. baseline-architecture)
└── templates/               # Standardized Templates
```

## The Spec-Driven Workflow

### Phase 1: Specification
1.  **Create Spec**: Run `/speckit.specify "Feature Name"`.
    *   *Input*: Natural language description.
    *   *Output*: `.specify/memory/[feature-name]/spec.md`.
    *   *Focus*: User Stories (P1, P2...), Success Criteria (Metrics), Independent Testing.
2.  **Verify Quality**: Run `/speckit.checklist`.
    *   *Action*: Generates a quality checklist in `.specify/memory/[feature-name]/checklists/`.
3.  **Refine Ambiguity**: Run `/speckit.clarify`.
    *   *Action*: Updates `.specify/memory/[feature-name]/spec.md`.

### Phase 2: Planning
4.  **Create Plan**: Run `/speckit.plan`.
    *   *Input*: Approved Spec + Constitution.
    *   *Output*: `.specify/memory/[feature-name]/plan.md`.

### Phase 3: Task Breakdown
5.  **Generate Tasks**: Run `/speckit.tasks`.
    *   *Input*: Plan + Spec.
    *   *Output*: `.specify/memory/[feature-name]/tasks.md`.
6.  **Consistency Check**: Run `/speckit.analyze`.
    *   *Action*: Verifies consistency between Spec, Plan, and Tasks.

### Phase 4: Execution
7.  **Implement**: Run `/speckit.implement`.
    *   *Action*: Executes tasks from `.specify/memory/[feature-name]/tasks.md`.

## Available Slash Commands

| Command | Purpose | When to use |
| :--- | :--- | :--- |
| `/speckit.specify` | Create/Update Feature Spec | Start of a new feature |
| `/speckit.checklist` | Validate Spec Quality | After writing Spec |
| `/speckit.clarify` | Resolve Spec Ambiguities | If Spec is vague |
| `/speckit.constitution`| Update Project Rules | When rules change |
| `/speckit.plan` | Create Technical Plan | After Spec is approved |
| `/speckit.tasks` | Break Plan into Tasks | After Plan is approved |
| `/speckit.analyze` | Consistency Check | Before Implementation |
| `/speckit.implement` | Execute Code Changes | Ready to build |

## Best Practices

### ✅ What TO Do
1.  **One Folder Per Feature**: Keep all artifacts for a feature in `.specify/memory/[feature-name]/`.
2.  **Prioritize User Stories**: Treat each User Story as an independent MVP delivery.
3.  **Consistency**: Make sure `spec.md`, `plan.md`, and `tasks.md` link to each other correctly.

---

**Happy Spec-Driven Development! 🚀**
