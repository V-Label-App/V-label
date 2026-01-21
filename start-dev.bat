@echo off
REM V-Label Development Launcher for Windows (Batch)
REM Run this to start both server and client in separate windows

echo  Launching development environment...

REM Start Server in a new CMD window
start "V-Label Server" cmd /k "cd /d "%~dp0server" && npm run dev"

REM Start Client in a new CMD window
start "V-Label Client" cmd /k "cd /d "%~dp0client" && npm run dev"

echo  Separate terminals launched!
echo Server: http://localhost:4000
echo Client: http://localhost:5173

pause
