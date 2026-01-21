#!/bin/bash

# Get project root path
PROJECT_ROOT=$(pwd)

echo "🚀 Launching development environment..."

# Open Server in a new Terminal window/tab
osascript -e "tell application \"Terminal\" to do script \"cd '$PROJECT_ROOT/server' && npm run dev\""

# Open Client in a new Terminal window/tab
osascript -e "tell application \"Terminal\" to do script \"cd '$PROJECT_ROOT/client' && npm run dev\""

echo "✅ Separate terminals launched!"
