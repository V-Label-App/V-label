#!/bin/bash
# ===========================================
# V-Label Database Backup Script
# ===========================================
# Usage: ./scripts/backup.sh
# Cron:  0 3 * * * /opt/vlabel/scripts/backup.sh >> /var/log/vlabel-backup.log 2>&1

set -e

# Configuration
PROJECT_DIR=${PROJECT_DIR:-/opt/vlabel}
BACKUP_DIR=${BACKUP_DIR:-$PROJECT_DIR/backups}
COMPOSE_FILE=${COMPOSE_FILE:-$PROJECT_DIR/docker-compose.prod.yml}
RETENTION_DAYS=${RETENTION_DAYS:-7}

# Database credentials (loaded from environment or .env.production)
DB_USER=${DB_USER:-vlabel_user}
DB_NAME=${DB_NAME:-vlabel_db}

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="vlabel_${DATE}.sql.gz"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILE"

echo "=== V-Label Backup Started at $(date) ==="
echo "Backup file: $BACKUP_FILE"

# Perform backup
docker compose -f "$COMPOSE_FILE" exec -T postgres \
    pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_PATH"

# Verify backup
if [ -f "$BACKUP_PATH" ] && [ -s "$BACKUP_PATH" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
    echo "Backup completed successfully!"
    echo "Size: $BACKUP_SIZE"
else
    echo "ERROR: Backup failed or file is empty!"
    exit 1
fi

# Clean up old backups
echo "Cleaning up backups older than $RETENTION_DAYS days..."
DELETED=$(find "$BACKUP_DIR" -name "vlabel_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
echo "Deleted $DELETED old backup(s)"

# List remaining backups
echo "Current backups:"
ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "No backups found"

echo "=== Backup Finished at $(date) ==="
