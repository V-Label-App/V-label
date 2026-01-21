@echo off
REM V-Label Setup Script for Windows
REM Run this after cloning the repository or when fixing dependency issues
REM Exit immediately if a command exits with a non-zero status

echo 🚀 Starting setup process...

echo.
echo 📦 Installing dependencies from root (workspace)...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b %errorlevel%
)

echo.
echo 🔄 Generating Prisma Client...
cd server
call npx prisma generate
if %errorlevel% neq 0 (
    echo ❌ Failed to generate Prisma Client
    cd ..
    pause
    exit /b %errorlevel%
)

echo.
echo 🗄️  Updating Database...
call npm run db:update
if %errorlevel% neq 0 (
    echo ⚠️  Database update failed (this is OK if database is not running)
)

cd ..

echo.
echo ✅ Setup finished successfully!
echo.
echo 📝 Next steps:
echo 1. Make sure PostgreSQL is running: cd server ^&^& npm run db:setup
echo 2. Start development servers: .\start-dev.bat
echo.
pause
