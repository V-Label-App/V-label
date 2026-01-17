# Prisma Database Configuration

This directory contains the **Source of Truth** for the V-Label application's database schema.

## 📂 Structure
*   **`schema.prisma`**: The main configuration file. All DB tables, enums, and relationships are defined here using Prisma DSL.
*   **`migrations/`**: Auto-generated SQL history. **DO NOT** edit these files manually.

## ⚡ Vibecoding Rules (Workflow)

When working with Database changes, follow this strict workflow to ensure the team stays in sync:

### 1. 📝 Where to Edit? (The "Golden Rule")
*   **ALWAYS** modify **`schema.prisma`** first.
*   **NEVER** directly edit the database using SQL tools (PGAdmin, DBeaver) or edit files inside `migrations/`.
*   *Why?* Because `schema.prisma` is what generates the type definitions for the backend code. If you bypass it, the backend types will break.

### 2. 🚀 How to Apply Changes?
After editing `schema.prisma`, run the following command in the `server` directory:

```bash
npm run migrate
```

*   **What this does**:
    1.  Compares your new schema with the old DB state.
    2.  Generates a new SQL migration file in `migrations/`.
    3.  Applies the SQL to your local database.
    4.  Regenerates the Prisma Client (TypeScript types).

### 3. 📖 Documentation
If you introduce a **Major Change** (new table, complex logic change), please update the log in:
`server/docs/db_history/`

### 4. ⚠️ Emergency Fixes
If you mess up your local DB (Migration drift, mismatch errors), run this "Nuclear Option" to reset everything:
```bash
# WARNING: Deletes all data!
npm run db:reset
```
