# Getting Started - V-Label Server

## Prerequisites

- **Node.js**: v18+ (recommended: v22)
- **Docker**: For PostgreSQL database
- **npm**: v8+

## Quick Setup (3 steps)

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env if needed (defaults work for local development)
```

### 3. Start Everything
```bash
# Start database
npm run db:setup

# Run migrations
npm run migration

# Start server
npm run dev
```

✅ Server running at `http://localhost:4000`

## Verify Setup

```bash
# Check health endpoint
curl http://localhost:4000/api/v1/health

# Expected response:
# {"status":"ok"}
```

## Common Commands

```bash
# Development
npm run dev              # Start server (no auto-reload)
npm run dev:watch        # Start server (with auto-reload)

# Database
npm run db:setup         # Start PostgreSQL
npm run db:stop          # Stop PostgreSQL
npm run db:reset         # Reset database (removes all data)
npm run db:cli           # Access PostgreSQL CLI

# Migrations
npm run migration        # Run new migrations
npm run migration:create -- name  # Create new migration
```

## Project Structure

```
server/
├── src/
│   ├── config/         # Environment & configuration
│   ├── middlewares/    # Express middlewares
│   ├── migrations/     # Database migrations
│   └── utils/          # Utilities (logger, database)
├── scripts/            # Build & migration scripts
└── docker-compose.yml  # PostgreSQL setup
```

## Troubleshooting

### Port already in use
```bash
# Find process using port 4000
lsof -i :4000
kill -9 <PID>
```

### Database connection failed
```bash
# Check if Docker is running
docker ps

# Check database logs
docker-compose logs postgres

# Restart database
npm run db:reset
```

### Migration errors
```bash
# Reset database and rerun migrations
npm run db:reset
npm run migration
```

## Need Help?

- Check [server/README.md](./server/README.md) for detailed docs
- Check [migrations/README.md](./server/src/migrations/README.md) for migration guide
- Ask the team on Slack/Discord
