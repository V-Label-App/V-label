# Baseline Architecture: V-label App

## Overview
V-label is a web application for [insert core purpose, e.g., labeling data, visual annotation]. It consists of a React frontend and a Node.js/Express backend backed by PostgreSQL.

## Current System State

### Backend (Server)
-   **Entry Point**: `src/index.ts` - initializes Express app, database connection, and middlewares.
-   **Database**: PostgreSQL 16 running in a Docker container (`v-label`).
    -   Port mapped: `5433` (Host) -> `5432` (Container).
    -   Connection managed via `src/utils/database.ts` using `pg.Pool`.
-   **Authentication**: Basic JWT structure (in progress).
-   **Logging**: Custom request logger middleware.
-   **Migrations**: Custom smart migration runner (`scripts/run-migrations.ts`).

### Frontend (Client)
-   **Stack**: React 19 + Vite + TypeScript.
-   **Visual Config**: Uses Konva for canvas/labeling operations.
-   **State**: Zustand for global state management.
-   **Routing**: React Router DOM v7.

### Infrastructure
-   **Docker Compose**: Manages the PostgreSQL service.
-   **Setup**: Automated `setup.sh` script for onboarding.

## Key Integration Points
-   **API Base URL**: `http://localhost:4000/api/v1`
-   **Database Connection**: defined in `.env` (managed by `.env.example`).
