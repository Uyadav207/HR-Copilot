#!/bin/bash

# Start Frontend Server

cd "$(dirname "$0")/frontend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local file not found!"
    echo "Run ../setup-env.sh first"
    exit 1
fi

# Start the development server
echo "Starting frontend server on http://localhost:3000"
echo ""
echo "💡 Tip: If you encounter 'vendor-chunks' errors, clear the cache with: rm -rf .next"
echo ""
npm run dev


