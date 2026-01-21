#!/bin/bash
# ===========================================
# V-Label Database Restore Script
# ===========================================
# Usage: ./scripts/restore.sh [backup_file]
# Example: ./scripts/restore.sh backups/vlabel_20240115_030000.sql.gz

set -e

# Configuration
PROJECT_DIR=${PROJECT_DIR:-/opt/vlabel}
BACKUP_DIR=${BACKUP_DIR:-$PROJECT_DIR/backups}
COMPOSE_FILE=${COMPOSE_FILE:-$PROJECT_DIR/docker-compose.prod.yml}

# Database credentials
DB_USER=${DB_USER:-vlabel_user}
DB_NAME=${DB_NAME:-vlabel_db}

# Get backup file from argument or show available backups
BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "=== Available Backups ==="
    ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "No backups found in $BACKUP_DIR"
    echo ""
    echo "Usage: $0 <backup_file>"
    echo "Example: $0 $BACKUP_DIR/vlabel_20240115_030000.sql.gz"
    exit 1
fi

# Validate backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "=== V-Label Database Restore ==="
echo "Backup file: $BACKUP_FILE"
echo ""
echo "WARNING: This will REPLACE ALL DATA in the database!"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo ""
echo "Starting restore..."

# Stop server to prevent new connections
echo "Stopping server..."
docker compose -f "$COMPOSE_FILE" stop server

# Drop and recreate database
echo "Recreating database..."
docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

# Restore backup
echo "Restoring data..."
gunzip < "$BACKUP_FILE" | docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U "$DB_USER" "$DB_NAME"

# Start server
echo "Starting server..."
docker compose -f "$COMPOSE_FILE" start server

echo ""
echo "=== Restore Completed Successfully ==="
echo "Database has been restored from: $BACKUP_FILE"
