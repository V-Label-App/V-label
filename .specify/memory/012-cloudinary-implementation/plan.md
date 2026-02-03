# Implementation Plan: Cloudinary Integration

**Branch**: `001-cloudinary-implementation` | **Date**: 2026-02-03 | **Spec**: [.specify/memory/001-cloudinary-implementation/spec.md](spec.md)
**Input**: Feature specification from `.specify/memory/001-cloudinary-implementation/spec.md`

## Summary

Implement Cloudinary integration for scalable and optimized image storage. This replaces local/direct S3 handling for image uploads. The backend will use `cloudinary` SDK to upload images and store the secure URLs in the database. The frontend will remain largely unchanged but will benefit from optimized image delivery.

## Technical Context

**Language/Version**: TypeScript (Node.js 20+ / React 19)
**Primary Dependencies**: `cloudinary` (backend SDK), `multer` (multipart handling)
**Storage**: Cloudinary (Media assets), PostgreSQL (Metadata/URLs)
**Testing**: Jest (Unit/Integration)
**Target Platform**: Web (Vite Client), Server (Node.js Container)
**Project Type**: Monorepo (Client + Server)
**Performance Goals**: Image load time < 1.0s, Upload success > 99%
**Constraints**: Must use environment variables for secrets, no hardcoding.
**Scale/Scope**: Feature-level integration (Image upload flow).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Strict Type Safety**: All new services and configs will be strictly typed.
- [x] **No Hardcoding**: Cloudinary credentials will be loaded from `process.env` via `src/config/env.ts`.
- [x] **Environment Configuration**: Config will be centralized.
- [x] **Error Handling**: Upload failures will be caught and logged using standard logger.
- [x] **Database Security**: Using Prisma (ORM) securely handles queries; if raw SQL is used, parameters will be bound. *Note: Constitution mentions `pg` client but project uses Prisma.*
- [x] **Code Organization**: Logic will be in `services/image.service.ts` or similar, separated from controllers.
- [x] **Performance**: Async/await used for Cloudinary API calls.

## Project Structure

### Documentation (this feature)

```text
.specify/memory/001-cloudinary-implementation/
├── spec.md              # Feature Spec
├── plan.md              # This file
├── tasks.md             # Task Decomposition
├── research.md          # Research findings
├── data-model.md        # DB Schema changes
├── checklists/          # Quality Checklists
└── contracts/           # API Contracts
```

### Source Code (V-label App)

```text
server/
├── src/
│   ├── config/
│   │   ├── env.ts           # Add Cloudinary Env Vars
│   │   └── cloudinary.ts    # [NEW] Cloudinary Configuration
│   ├── services/
│   │   └── upload.service.ts # [NEW] Upload Logic
│   ├── controllers/
│   │   └── project.controller.ts # Update image upload handler
│   └── routes/
│       └── project.routes.ts # Ensure multer middleware is configured
```

**Structure Decision**:
- **Configuration**: Create a dedicated `cloudinary.ts` config file to encapsulate SDK setup.
- **Service**: Implement `UploadService` to abstract Cloudinary interaction, making it swappable or mockable for testing.
- **Middleware**: Use `multer` with memory storage to handle the file buffer before sending to Cloudinary.

## Complexity Tracking

*No violations of constitution found.*
