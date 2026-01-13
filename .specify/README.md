# GitHub Spec Kit Workflow for V-label App

## ⚠️ IMPORTANT: Always Use GitHub Spec Kit for Feature Development

This project uses **GitHub Spec Kit** for structured, spec-driven development. **Do NOT "vibe code"**. Always follow the spec-plan-task workflow using the provided slash commands.

## Directory Structure

```
.specify/
├── agent-commands/          # Agent behavior definitions (DO NOT EDIT)
│   ├── specify.md
│   ├── checklist.md
│   ├── clarify.md
│   ├── constitution.md
│   ├── plan.md
│   ├── tasks.md
│   ├── analyze.md
│   └── implement.md
├── memory/                  # Project Context Brain
│   ├── constitution.md      # Rules, Tech Stack, Principles
│   ├── specifications/      # Feature Specs (User Stories)
│   ├── plans/               # Technical Implementation Plans
│   └── tasks/               # Actionable Task Checklists
└── templates/               # Standardized Templates
    ├── spec-template.md     # Feature Spec Template
    ├── plan-template.md     # Tech Plan Template
    └── tasks-template.md    # Tasks Template
```

## The Spec-Driven Workflow

### Phase 1: Specification
1.  **Create Spec**: Run `/speckit.specify "Feature Name"`.
    *   *Input*: Natural language description.
    *   *Output*: `.specify/memory/specifications/[feature].md`.
    *   *Focus*: User Stories (P1, P2...), Success Criteria (Metrics), Independent Testing.
2.  **Verify Quality**: Run `/speckit.checklist`.
    *   *Action*: Generates a quality checklist (UX, Security, etc.) to ensure the spec is ready.
3.  **Refine Ambiguity**: Run `/speckit.clarify`.
    *   *Action*: AI asks 3-5 targeted questions to clear up logical gaps in the spec.

### Phase 2: Planning
4.  **Create Plan**: Run `/speckit.plan`.
    *   *Input*: Approved Spec + Constitution.
    *   *Output*: `.specify/memory/plans/[feature]-plan.md`.
    *   *Focus*: Architecture, Data Model, API Contracts, Monorepo Integration.

### Phase 3: Task Breakdown
5.  **Generate Tasks**: Run `/speckit.tasks`.
    *   *Input*: Plan + Spec.
    *   *Output*: `.specify/memory/tasks/[feature]-tasks.md`.
    *   *Focus*: Step-by-step checklist, categorized by User Story phases.
6.  **Consistency Check**: Run `/speckit.analyze`.
    *   *Action*: Verifies that Spec, Plan, and Tasks are consistent with each other and the Constitution.

### Phase 4: Execution
7.  **Implement**: Run `/speckit.implement`.
    *   *Action*: AI executes the tasks in `.specify/memory/tasks/[feature]-tasks.md` sequentially.

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
1.  **Prioritize User Stories**: Treat each User Story (P1, P2) as an independent MVP delivery.
2.  **Independent Testing**: Define how to test *just* that story without the rest of the system.
3.  **Strict File Paths**: Always use absolute or project-relative paths (`server/src/...`) in plans and tasks.
4.  **Constitution First**: If a rule conflicts with `constitution.md`, the Constitution wins.

### ❌ What NOT to Do
1.  **Don't skip the layout**: Do not create files outside `.specify/memory/`.
2.  **Don't merge P1/P2/P3**: Don't try to build everything at once. Build P1, test P1, then move to P2.

---

**Happy Spec-Driven Development! 🚀**
