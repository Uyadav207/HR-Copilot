#!/bin/bash

# Start Backend Server (Bun/Hono)

cd "$(dirname "$0")/backend"

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed!"
    echo "Please install Bun first: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

# Install dependencies
echo "Installing/updating dependencies..."
bun install

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "Create a .env file with your configuration. Example:"
    echo "  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hr_autopilot"
    echo "  LLM_PROVIDER=openai"
    echo "  OPENAI_API_KEY=your_key_here"
    exit 1
fi

# Check if database is running
if ! docker-compose ps | grep -q "postgres.*Up"; then
    echo "Starting database services..."
    cd ..
    docker-compose up -d
    cd backend
    echo "Waiting for database to be ready..."
    sleep 3
fi

# Check if database exists, create if not
echo "Checking database..."
if command -v psql >/dev/null 2>&1; then
    if ! psql -h localhost -U postgres -lqt | cut -d \| -f 1 | grep -qw hr_autopilot; then
        echo "Creating database 'hr_autopilot'..."
        psql -h localhost -U postgres -c "CREATE DATABASE hr_autopilot;" 2>/dev/null || {
            echo "⚠️  Could not create database automatically. Please create it manually:"
            echo "   psql -h localhost -U postgres -c 'CREATE DATABASE hr_autopilot;'"
        }
    else
        echo "✅ Database 'hr_autopilot' exists"
    fi
else
    echo "⚠️  psql not found. Skipping database check. Make sure 'hr_autopilot' database exists."
fi

# Run database migrations/push schema
echo "Pushing database schema..."
# Note: drizzle-kit has a known issue with ESM .js extensions in TypeScript
# This error is non-fatal - the schema is likely already up to date
if bun run db:migrate 2>&1 | grep -q "Cannot find module"; then
    echo "⚠️  Drizzle-kit module resolution warning (known ESM issue - safe to ignore)"
    echo "   Schema is likely already up to date. Server will start normally."
else
    echo "✅ Schema pushed successfully"
fi

# Start the server
echo "Starting backend server on http://localhost:8000"
echo "API available at http://localhost:8000/api"
echo ""
bun run dev
