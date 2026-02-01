#!/bin/bash

# ============================================
# V-Label Production Deployment Script
# ============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if .env.production exists
if [ ! -f .env.production ]; then
    print_error ".env.production file not found!"
    print_info "Please copy .env.production.example to .env.production and fill in your values"
    exit 1
fi

# Load environment variables
print_info "Loading environment variables..."
export $(cat .env.production | grep -v '^#' | xargs)

# Check required variables
REQUIRED_VARS=(
    "DB_USER"
    "DB_PASSWORD"
    "DB_NAME"
    "JWT_SECRET"
    "DOMAIN"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        print_error "Required environment variable $var is not set"
        exit 1
    fi
done

print_success "Environment variables loaded"

# Main deployment
print_header "🚀 V-Label Production Deployment"

# Stop existing containers
print_info "Stopping existing containers..."
docker compose -f docker-compose.prod.yml down || true
print_success "Containers stopped"

# Pull latest code (if using git)
if [ -d ".git" ]; then
    print_info "Pulling latest code..."
    git pull origin main || print_warning "Git pull failed, continuing with local code"
fi

# Build and start services
print_header "🏗️  Building Docker Images"
docker compose -f docker-compose.prod.yml build --no-cache

print_header "🚀 Starting Services"
docker compose -f docker-compose.prod.yml up -d

# Wait for database to be ready
print_info "Waiting for database to be ready..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if docker compose -f docker-compose.prod.yml exec -T postgres pg_isready -U $DB_USER -d $DB_NAME > /dev/null 2>&1; then
        print_success "Database is ready!"
        break
    fi
    attempt=$((attempt+1))
    echo -n "."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    print_error "Database failed to start"
    exit 1
fi

# Run database migrations
print_header "📦 Running Database Migrations"
docker compose -f docker-compose.prod.yml exec -T server npx prisma migrate deploy

# Optional: Seed database
read -p "Do you want to seed the database? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Seeding database..."
    docker compose -f docker-compose.prod.yml exec -T server npm run seed
    print_success "Database seeded"
fi

# Show status
print_header "📊 Service Status"
docker compose -f docker-compose.prod.yml ps

# Health checks
print_header "🏥 Running Health Checks"

# Check backend
sleep 5
if curl -f http://localhost:4000/api/v1/health > /dev/null 2>&1; then
    print_success "Backend is healthy"
else
    print_error "Backend health check failed"
fi

# Show logs
print_header "📋 Recent Logs"
docker compose -f docker-compose.prod.yml logs --tail=20

# Final message
print_header "✨ Deployment Complete!"
print_success "Application is running at: https://$DOMAIN"
print_info "To view logs: docker compose -f docker-compose.prod.yml logs -f"
print_info "To stop services: docker compose -f docker-compose.prod.yml down"
