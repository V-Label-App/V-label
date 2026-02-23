#!/bin/bash
set -e

# Configuration
VPS_USER="root"
VPS_IP="103.249.201.27"
REMOTE_DIR="~/V-label" # Based on your screenshots
COMPOSE_FILE="docker-compose.prod.yml"
LOCAL_BACKUP_DIR="./backups"

# Ensure local backup dir exists
mkdir -p "$LOCAL_BACKUP_DIR"
FILENAME="prod_dump_$(date +%Y%m%d_%H%M%S).sql"
OUTPUT_FILE="$LOCAL_BACKUP_DIR/$FILENAME"

echo "🚀 Starting DB Sync from VPS ($VPS_IP)..."
echo "📂 Saving to: $OUTPUT_FILE"

# Run pg_dump remotely and pipe to local file
# We use 'docker compose exec -T' to avoid TTY errors
ssh "$VPS_USER@$VPS_IP" "cd $REMOTE_DIR && docker compose -f $COMPOSE_FILE exec -T postgres pg_dump -U vlabel_user vlabel_db" > "$OUTPUT_FILE"

echo "✅ Database downloaded successfully!"
echo ""
echo "❓ To restore this to your LOCAL development database, run:"
echo "   docker compose exec -T postgres psql -U postgres vlabel_db < $OUTPUT_FILE"
