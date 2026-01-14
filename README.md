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

# Run migrations (Prisma)
npm run db:migrate

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

# Migrations & Prisma
npm run db:migrate       # Apply schema changes & migrate
npm run db:studio        # Open GUI to view/edit data
npm run db:generate      # Regenerate TypeScript Client
```

## Project Structure

```
server/
├── prisma/             # Database Schema & Migrations
│   ├── migrations/     
│   ├── schema.prisma   
│   └── README.md
├── src/
│   ├── config/         # Environment & configuration
│   ├── middlewares/    # Express middlewares
│   ├── utils/          # Utilities (logger, database)
│   └── index.ts        # Main server entry
├── scripts/            # Build scripts
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
# Reset database (WARNING: Deletes content) and rerun migrations
npm run db:reset
npm run db:migrate
```

## Need Help?

- Check [server/README.md](./server/README.md) for detailed docs
- Check [server/prisma/README.md](./server/prisma/README.md) for DB Vibecoding Rules
- Ask the team on Slack/Discord
