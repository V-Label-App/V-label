#!/bin/bash

# ============================================
# V-Label Database Backup Script
# ============================================

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/vlabel_backup_$TIMESTAMP.sql"
RETENTION_DAYS=7

# Load environment
export $(cat .env.production | grep -v '^#' | xargs)

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

echo "🔄 Starting database backup..."

# Create backup
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump \
    -U $DB_USER \
    -d $DB_NAME \
    --clean \
    --if-exists \
    > $BACKUP_FILE

if [ $? -eq 0 ]; then
    # Compress backup
    gzip $BACKUP_FILE
    echo "✅ Backup completed: ${BACKUP_FILE}.gz"
    
    # Remove old backups
    find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
    echo "🗑️  Old backups removed (older than $RETENTION_DAYS days)"
    
    # Show backup size
    du -h ${BACKUP_FILE}.gz
else
    echo "❌ Backup failed!"
    exit 1
fi
