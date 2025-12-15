#!/bin/bash

# Start Everything: Database + Backend + Frontend

echo "🚀 Starting HR Autopilot..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start database services
echo "📦 Starting database services (PostgreSQL + Redis)..."
docker-compose up -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Check if database is up
if docker-compose ps | grep -q "postgres.*Up"; then
    echo "✅ Database is running"
else
    echo "❌ Database failed to start. Check logs with: docker-compose logs"
    exit 1
fi

echo ""
echo "🔧 Starting backend and frontend..."
echo ""
echo "📝 Note: You'll need to run backend and frontend in separate terminals:"
echo ""
echo "Terminal 1 (Backend):"
echo "  ./start-backend.sh"
echo ""
echo "Terminal 2 (Frontend):"
echo "  ./start-frontend.sh"
echo ""
echo "Or use the helper scripts in separate terminal windows."
echo ""

# Optionally, you can uncomment these to auto-start (requires tmux or similar):
# echo "Starting backend in background..."
# ./start-backend.sh &
# 
# sleep 3
# 
# echo "Starting frontend..."
# ./start-frontend.sh


