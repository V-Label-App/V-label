# Database Migrations

This folder contains SQL migration files for database schema changes.

## Naming Convention

Migrations should follow this format:
```
XXX_description.sql
```

Where:
- `XXX` = Sequential number (001, 002, 003, etc.)
- `description` = Brief description using snake_case

Examples:
- `001_initial_schema.sql` - Initial database setup
- `002_add_users_table.sql` - Add users table
- `003_add_products_table.sql` - Add products table

## How It Works

All `.sql` files in this folder are automatically executed when the PostgreSQL container is first created, in alphabetical order.

## Creating New Migrations

### Using npm script (recommended):
```bash
npm run migration:create -- add_products_table
```

This will create a new file like `002_add_products_table.sql` with a template.

### Manual creation:
1. Create a new file with the next sequential number
2. Write your SQL statements
3. Run migrations:
   ```bash
   npm run migration:run
   ```

## Running Migrations

The migration runner automatically tracks which migrations have been applied:

```bash
# Run migrations (only new ones will be applied)
npm run migration
```

**How it works:**
- Creates a `schema_migrations` table to track applied migrations
- Skips migrations that have already been applied
- Runs new migrations in alphabetical order
- Each migration runs in a transaction (rollback on error)

**Output example:**
```
✅ Database connection established
📋 Found 3 migration file(s)

⏭️  Skipping 001_initial_schema.sql (already applied)
🔄 Running migration: 002_add_products.sql
✅ Migration 002_add_products.sql applied successfully

✅ Migration process completed
   Applied: 1 | Skipped: 1 | Total: 2
```

## Important Notes

- Migrations only run on **first container creation**
- To apply new migrations to existing database, you need to:
  - Run them manually: `docker exec -i postgres psql -U vlabel_user -d vlabel_db < src/migrations/XXX_new_migration.sql`
  - Or recreate the container: `docker-compose down -v && docker-compose up -d`
