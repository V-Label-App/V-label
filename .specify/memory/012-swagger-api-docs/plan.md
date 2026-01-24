# Implementation Plan: Swagger API Documentation

**Branch**: `feature/api-docs` | **Date**: 2026-01-24 | **Spec**: [.specify/memory/012-swagger-api-docs/spec.md](file:///Users/mr.triss/FPT University/SWP391/V-label_app/V-label-app/.specify/memory/012-swagger-api-docs/spec.md)
**Input**: Feature specification from `.specify/memory/012-swagger-api-docs/spec.md`

## Summary

Implement comprehensive API documentation using Swagger/OpenAPI 3.0 specification. This includes setting up swagger-jsdoc for annotation-based documentation, swagger-ui-express for interactive UI, and documenting all existing endpoints with request/response schemas, authentication requirements, and examples.

## Technical Context

**Language/Version**: TypeScript (Node.js 22.18.0)  
**Primary Dependencies**: Express, swagger-jsdoc, swagger-ui-express, @types/swagger-jsdoc, @types/swagger-ui-express  
**Documentation Standard**: OpenAPI 3.0  
**Testing**: Manual testing via Swagger UI  
**Target Platform**: Web (Backend API)  
**Project Type**: Monorepo (Server)  
**Performance Goals**: Swagger UI should load in <2s, documentation generation should not impact API performance.

> [!IMPORTANT]
> **Environment Configuration**: Swagger UI should be accessible in development and staging but **disabled in production** for security reasons.

> [!WARNING]
> **Security Considerations**:
> 1. Swagger UI must not expose sensitive information (API keys, secrets).
> 2. JWT authentication must be properly configured in Swagger UI.
> 3. Production environment must have Swagger disabled via environment variable.

**Constraints**: Zero impact on existing API functionality, documentation must stay in sync with code.  
**Scale/Scope**: ~50-100 endpoints across all modules (Auth, Projects, Labels, Tasks, Annotations, Admin, AI, Notifications).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

[Gates passed: Standard Feature Implementation - Documentation Enhancement]

## Project Structure

### Documentation (this feature)

```text
.specify/memory/012-swagger-api-docs/
├── spec.md              # Feature Spec
├── plan.md              # This file
└── task.md              # Task Decomposition
```

### Source Code (V-label App)

```text
server/
├── src/
│   ├── config/
│   │   └── swagger.config.ts        # [NEW] Swagger configuration
│   ├── docs/
│   │   ├── schemas/                 # [NEW] OpenAPI schema definitions
│   │   │   ├── auth.schemas.ts      # Auth-related schemas
│   │   │   ├── project.schemas.ts   # Project schemas
│   │   │   ├── label.schemas.ts     # Label schemas
│   │   │   ├── task.schemas.ts      # Task schemas
│   │   │   └── common.schemas.ts    # Shared schemas (Error, Pagination)
│   │   └── swagger.ts               # [NEW] Main Swagger setup
│   ├── controllers/
│   │   ├── auth.controller.ts       # [MODIFY] Add JSDoc annotations
│   │   ├── project.controller.ts    # [MODIFY] Add JSDoc annotations
│   │   ├── label.controller.ts      # [MODIFY] Add JSDoc annotations
│   │   └── ...                      # [MODIFY] All other controllers
│   ├── routes/
│   │   └── index.ts                 # [MODIFY] Register Swagger routes
│   └── index.ts                     # [MODIFY] Mount Swagger middleware
├── package.json                     # [MODIFY] Add swagger dependencies
└── .env.example                     # [MODIFY] Add SWAGGER_ENABLED flag
```

**Structure Decision**: Using JSDoc annotations in controllers for inline documentation, separate schema files for reusable type definitions, and centralized Swagger configuration.

## Proposed Changes

### Phase 1: Setup & Configuration

#### [NEW] server/package.json
- Add dependencies:
  - `swagger-jsdoc`: ^6.2.8
  - `swagger-ui-express`: ^5.0.0
  - `@types/swagger-jsdoc`: ^6.0.4
  - `@types/swagger-ui-express`: ^4.1.6

#### [NEW] server/src/config/swagger.config.ts
- Define OpenAPI 3.0 base configuration
- Set API info (title, version, description)
- Configure servers (dev, staging, production)
- Define security schemes (JWT Bearer)
- Set up tags for endpoint grouping

#### [NEW] server/src/docs/swagger.ts
- Initialize swagger-jsdoc with configuration
- Set up swagger-ui-express middleware
- Configure UI customization options
- Add environment-based enable/disable logic

---

### Phase 2: Schema Definitions

#### [NEW] server/src/docs/schemas/common.schemas.ts
- Define reusable schemas:
  - `ErrorResponse`: Standard error format
  - `PaginationMeta`: Pagination metadata
  - `SuccessResponse`: Generic success response

#### [NEW] server/src/docs/schemas/auth.schemas.ts
- `LoginRequest`: Email/password login
- `LoginResponse`: JWT tokens
- `RegisterRequest`: User registration
- `RefreshTokenRequest`: Token refresh
- `UserResponse`: User object

#### [NEW] server/src/docs/schemas/project.schemas.ts
- `Project`: Project entity
- `CreateProjectRequest`: Project creation
- `UpdateProjectRequest`: Project update
- `ProjectListResponse`: Paginated projects

#### [NEW] server/src/docs/schemas/label.schemas.ts
- `Label`: Label entity
- `LabelCategory`: Category entity
- `CreateLabelRequest`: Label creation
- `ProjectLabel`: Project-label association

#### [NEW] server/src/docs/schemas/task.schemas.ts
- `Task`: Task entity
- `Annotation`: Annotation data
- `TaskAssignment`: Assignment info

---

### Phase 3: Controller Documentation

#### [MODIFY] All Controllers
Add JSDoc annotations for each endpoint:
```typescript
/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
```

Priority order:
1. Auth endpoints (login, register, refresh)
2. Project endpoints (CRUD)
3. Label endpoints (CRUD, categories)
4. Task endpoints (CRUD, assignments)
5. Annotation endpoints
6. Admin endpoints
7. AI/Chat endpoints
8. Notification endpoints

---

### Phase 4: Integration

#### [MODIFY] server/src/index.ts
- Import Swagger setup
- Mount Swagger UI at `/api-docs`
- Add conditional logic based on `SWAGGER_ENABLED` env var

#### [MODIFY] server/.env.example
- Add `SWAGGER_ENABLED=true` for development
- Document that it should be `false` in production

---

## Verification Plan

### Automated Tests
- **Test 1**: Verify Swagger JSON is generated without errors
- **Test 2**: Verify all routes are documented (compare route list with Swagger spec)
- **Test 3**: Verify schema validation (request/response match TypeScript types)

### Manual Verification
- **Step 1**: Access `/api-docs` and verify UI loads
- **Step 2**: Test "Try it out" for public endpoints (login, register)
- **Step 3**: Authenticate via "Authorize" button and test protected endpoints
- **Step 4**: Verify all endpoint groups are present and organized
- **Step 5**: Check that examples are helpful and accurate
- **Step 6**: Verify production environment has Swagger disabled

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | | |
