#!/bin/bash
# V-Label Setup Script
# Run this after cloning the repository
# Exit immediately if a command exits with a non-zero status
set -e

echo "🚀 Starting setup process..."

echo "📦 Installing Client dependencies..."
cd client
npm install
cd ..

echo "📦 Installing Server dependencies..."
cd server
npm install

# Sure to update the database into node_modules/@prisma/client
echo "🔄 Generating Prisma Client..."
npx prisma generate

echo "🗄️  Updating Database..."
npm run db:update

echo "✅ Setup finished successfully!"
