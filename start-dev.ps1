# V-Label Development Launcher for Windows (PowerShell)
# Run this to start both server and client in separate windows

$ProjectRoot = $PSScriptRoot

Write-Host "Launching development environment..." -ForegroundColor Green

# Start Server in a new PowerShell window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ProjectRoot\server'; npm run dev"

# Start Client in a new PowerShell window  
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ProjectRoot\client'; npm run dev"

Write-Host "Separate terminals launched!" -ForegroundColor Green
Write-Host "Server: http://localhost:4000" -ForegroundColor Cyan
Write-Host "Client: http://localhost:5173" -ForegroundColor Cyan
