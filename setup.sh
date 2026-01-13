#!/bin/bash

# V-Label Server Setup Script
# Automates the initial setup for new developers

set -e  # Exit on error

echo "🚀 V-Label Server Setup"
echo "======================="
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v18+ first."
    exit 1
fi
echo "✅ Node.js $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi
echo "✅ npm $(npm --version)"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi
echo "✅ Docker $(docker --version)"

echo ""
echo "📦 Installing dependencies..."
cd server
npm install

echo ""
echo "⚙️  Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file"
else
    echo "⏭️  .env already exists, skipping"
fi

echo ""
echo "🐘 Starting PostgreSQL..."
npm run db:setup
sleep 3  # Wait for database to be ready

echo ""
echo "🔄 Running migrations..."
npm run migration

echo ""
echo "============================================"
echo "✅ Setup complete!"
echo "============================================"
echo ""
echo "To start the server:"
echo "  cd server"
echo "  npm run dev"
echo ""
echo "Server will be available at: http://localhost:4000"
echo "Health check: http://localhost:4000/api/v1/health"
echo ""
