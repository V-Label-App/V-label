# V-Label - Data Labeling Platform

A fullstack web application for data labeling workflows, built with React, Express, and PostgreSQL.

## Documentation

| Document | Description |
|----------|-------------|
| [Overview](./docs/00_overview.md) | Project overview, tech stack, architecture |
| [Business Requirements](./docs/01_business.md) | Business context and goals |
| [Functional Requirements](./docs/02_requirements.md) | Feature specifications |
| [Architecture](./docs/03_architecture.md) | System design and components |
| [Database](./docs/04_database.md) | Database schema and relationships |
| [API Reference](./docs/05_api.md) | REST API endpoints |
| [Security](./docs/06_security.md) | Security guidelines and best practices |
| [Development Guide](./docs/07_dev_guide.md) | Setup and development workflow |
| [Deployment](./docs/08_deployment.md) | VPS deployment with Docker & CI/CD |
| [Roadmap](./docs/09_roadmap.md) | Project roadmap and milestones |
| [Coding Rules](./docs/10_coding_rules.md) | Code standards and conventions |

---

## Quick Start

### Prerequisites

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
RUN
```bash
cd server
# Start database
npm run db:setup

# Run migrations (Prisma)
npm run db:update

# Start server
OR
# Install Dependencies
./setup.sh
# Run both 
./start-dev.sh
```

✅ Server running at `http://localhost:4000`

## Verify Setup
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

- Check [Documentation](#documentation) section above for detailed guides
- Check [Deployment Guide](./docs/08_deployment.md) for production setup
- Check [Coding Rules](./docs/10_coding_rules.md) for code standards
- Check [server/prisma/README.md](./server/prisma/README.md) for DB schema rules
