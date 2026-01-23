# Git Branches - V-Label Project

**Last Updated:** 2026-01-23
**Total Feature Branches:** 18

---

## Branch Organization

### Main Branches
- `main` - Production-ready code
- `develop` - Integration branch (optional)

### Current Work
- `feat/web-socket-implement` - WebSocket real-time features (active)

---

## Feature Branches

### Phase 1: MVP Core (Critical Priority) 🔴

These branches implement the core annotation workflow required for MVP.

| Branch | Purpose | Effort | Status | Assignee |
|--------|---------|--------|--------|----------|
| `feature/project-management` | Project CRUD, image upload, member management | 5-7 days | 🆕 Ready | Unassigned |
| `feature/task-assignment` | Task assignment (manual + auto), annotator queue | 4-6 days | 🆕 Ready | Unassigned |
| `feature/annotation-submit` | Save/submit annotations, auto-save | 2-3 days | 🆕 Ready | Unassigned |
| `feature/review-system` | Review workflow, approve/reject, reputation | 5-7 days | 🆕 Ready | Unassigned |
| `feature/data-export` | YOLO format export, ZIP download | 3-4 days | 🆕 Ready | Unassigned |

**Phase 1 Total:** 19-27 days (4-5.5 weeks)

---

### Phase 2: UX & Performance (High Priority) 🟡

These branches improve user experience and system performance.

| Branch | Purpose | Effort | Status | Assignee |
|--------|---------|--------|--------|----------|
| `feature/project-stats` | Dashboard charts, team metrics | 2-3 days | 🆕 Ready | Unassigned |
| `feature/cloud-storage` | AWS S3/Cloudinary integration | 2-3 days | 🆕 Ready | Unassigned |
| `feature/polygon-tool` | Polygon annotation, vertex editing | 3-4 days | 🆕 Ready | Unassigned |
| `feature/automated-testing` | Jest, Vitest, Playwright, CI | 7-10 days | 🆕 Ready | Unassigned |
| `feature/error-tracking` | Sentry integration, monitoring | 2-3 days | 🆕 Ready | Unassigned |

**Phase 2 Total:** 16-23 days (3-4.5 weeks)

---

### Phase 3: Advanced Features (Medium Priority) 🟢

These branches add advanced functionality and optimizations.

| Branch | Purpose | Effort | Status | Assignee |
|--------|---------|--------|--------|----------|
| `feature/auto-assign-algorithms` | Round-robin, skill-based assignment | 3-4 days | 🆕 Ready | Unassigned |
| `feature/consensus-metrics` | IoU, inter-annotator agreement | 4-5 days | 🆕 Ready | Unassigned |
| `feature/export-coco` | COCO JSON export format | 2-3 days | 🆕 Ready | Unassigned |
| `feature/export-voc` | Pascal VOC XML export format | 2-3 days | 🆕 Ready | Unassigned |
| `feature/redis-caching` | Redis cache layer, performance | 3-4 days | 🆕 Ready | Unassigned |
| `feature/onboarding` | Interactive tutorial, walkthrough | 3-4 days | 🆕 Ready | Unassigned |
| `feature/dark-mode` | Dark theme toggle | 2 days | 🆕 Ready | Unassigned |
| `feature/api-docs` | OpenAPI/Swagger documentation | 2-3 days | 🆕 Ready | Unassigned |

**Phase 3 Total:** 21-29 days (4-5.5 weeks)

---

## Branch Workflow

### 1. Starting Work on a Feature

```bash
# Fetch latest changes
git fetch origin

# Checkout feature branch
git checkout feature/project-management

# Pull latest (if others contributed)
git pull origin feature/project-management

# Create your working branch (optional)
git checkout -b dev/project-management-yourname
```

### 2. During Development

```bash
# Regular commits
git add .
git commit -m "feat: add project creation endpoint"

# Push to feature branch
git push origin feature/project-management
```

### 3. Ready for Review

```bash
# Ensure branch is up to date with main
git fetch origin main
git rebase origin/main  # or merge if preferred

# Push final changes
git push origin feature/project-management

# Create Pull Request on GitHub
# Target: main (or develop)
# Reviewers: Team lead, 1-2 developers
```

### 4. After Merge

```bash
# Delete local branch
git branch -d feature/project-management

# Delete remote branch (GitHub does this automatically after PR merge)
git push origin --delete feature/project-management
```

---

## Branch Naming Conventions

### Feature Branches
```
feature/{feature-name}
```
Examples:
- `feature/project-management`
- `feature/dark-mode`
- `feature/api-docs`

### Bug Fix Branches
```
bugfix/{issue-description}
```
Examples:
- `bugfix/login-redirect-loop`
- `bugfix/annotation-save-error`

### Hotfix Branches (Production Issues)
```
hotfix/{critical-issue}
```
Examples:
- `hotfix/security-jwt-validation`
- `hotfix/database-connection-leak`

### Release Branches
```
release/{version}
```
Examples:
- `release/1.0.0`
- `release/1.1.0`

---

## Pull Request Guidelines

### PR Title Format
```
<type>: <description>

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Code style (formatting)
- refactor: Code refactoring
- test: Adding tests
- chore: Maintenance tasks
```

### PR Description Template
```markdown
## What does this PR do?
Brief description of changes

## Related Issue
Fixes #123

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Breaking change
- [ ] Documentation update

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-reviewed code
- [ ] Commented complex logic
- [ ] Updated documentation
- [ ] Added/updated tests
- [ ] All tests passing
- [ ] No new warnings

## Screenshots (if applicable)
[Add screenshots for UI changes]

## Testing Instructions
1. Step-by-step testing guide
2. Expected behavior
3. Edge cases to test
```

---

## Current Branch Status

### Active Branches
- ✅ `feat/web-socket-implement` - WebSocket real-time features (in development)

### Ready for Development (18 branches)
All Phase 1-3 feature branches created and pushed to GitHub

### Completed Branches
- `feature/label-management` - Merged to main (2026-01-22)
- `feature/ai-chat-widget` - Merged to main (2026-01-20)

---

## Next Steps

### Immediate (This Week)
1. Assign developers to Phase 1 branches
2. Start with `feature/project-management` (highest priority)
3. Setup project board/Kanban for tracking

### Short-term (Next 2 Weeks)
4. Complete all Phase 1 features
5. Conduct code reviews
6. Merge to main after testing

### Medium-term (Month 2)
7. Begin Phase 2 features
8. Setup automated testing (CI pipeline)
9. Performance testing

---

## Helpful Commands

### View all remote branches
```bash
git branch -r
```

### View all local branches
```bash
git branch
```

### View merged branches
```bash
git branch --merged main
```

### Delete merged local branches
```bash
git branch --merged main | grep -v "main" | xargs git branch -d
```

### Sync with remote
```bash
git fetch origin --prune
```

---

## Resources

- **Roadmap:** See `docs/09_roadmap.md` for detailed timeline
- **System Analysis:** See `docs/10_system_analysis.md` for technical details
- **Architecture:** See `docs/01_architecture.md`
- **API Docs:** See `docs/05_api.md` (to be generated)

---

**Maintained By:** Development Team
**Review Frequency:** Weekly (Monday standup)
**Questions?** Contact team lead or check project Wiki
