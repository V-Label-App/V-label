# V-Label Server

## Quick Start

### 1. Setup Database

```bash
# Start PostgreSQL container
npm run db:setup

# Or manually with docker-compose
docker-compose up -d
```

### 2. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your settings (optional, defaults work for local dev)
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Server will start on `http://localhost:4000`

## Database Management

### NPM Scripts

```bash
# Setup database (start container)
npm run db:setup

# Stop database
npm run db:stop

# Reset database (remove all data and recreate)
npm run db:reset

# Access PostgreSQL CLI
npm run db:cli

# --- PRISMA COMMANDS ---

# Apply schema changes & create migration (Run this after editing schema.prisma)
npm run db:migrate

# Open Database GUI
npm run db:studio

# Regenerate TypeScript Types (If autocomplete is broken)
npm run db:generate
```

```bash
# Start database
docker-compose up -d

# Stop database
docker-compose down

# Stop and remove data (will recreate schema on next start)
docker-compose down -v

# Access PostgreSQL CLI
docker exec -it postgres psql -U vlabel_user -d vlabel_db
```

## Default Database Configuration

- **Host**: localhost
- **Port**: 5433
- **Database**: vlabel_db
- **User**: vlabel_user
- **Password**: vlabel_password

> ⚠️ **Note**: These are development credentials. Change them in production!

## Project Structure

```
server/
├── prisma/             # Database Schema (Source of Truth)
│   ├── migrations/     # Generated SQL files (DO NOT EDIT)
│   ├── schema.prisma   # Main Schema Config
│   └── README.md       # Vibecoding Rules
├── src/
│   ├── config/         # Configuration files
│   ├── middlewares/    # Express middlewares
│   ├── utils/          # Utility functions (logger, database)
│   └── index.ts        # Main server file
├── docker-compose.yml  # PostgreSQL container config
└── .env.example       # Environment variables template
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `docker-compose up -d` - Start PostgreSQL database
- `docker-compose down` - Stop PostgreSQL database

## Health Check

```bash
curl http://localhost:4000/api/v1/health
```

## Troubleshooting

### Database connection failed

1. Check if Docker is running: `docker ps`
2. Check database logs: `docker-compose logs postgres`
3. Verify .env configuration matches docker-compose.yml

### Port already in use

```bash
# Find process using port 4000
lsof -i :4000

# Kill the process
kill -9 <PID>
```
