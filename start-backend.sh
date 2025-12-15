#!/bin/bash

# Start Backend Server

cd "$(dirname "$0")/backend"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install/upgrade dependencies
echo "Installing/updating dependencies..."
pip install --upgrade pip

# Install dependencies - prefer binary wheels for Python 3.13 compatibility
echo "Installing core dependencies..."
if ! pip install --prefer-binary -r requirements.txt; then
    echo "❌ Failed to install dependencies. Please check the error above."
    echo "Trying to install core packages individually with binary wheels..."
    pip install --prefer-binary 'fastapi' 'uvicorn[standard]' 'pydantic>=2.9.0' 'pydantic-settings' 'sqlalchemy[asyncio]' 'alembic' 'psycopg[binary]' 'python-multipart' 'python-dotenv'
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "Run ../setup-env.sh first, then update backend/.env with your API keys"
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

# Run migrations
echo "Running database migrations..."
# Check if any migrations exist, if not create initial migration
if [ -z "$(ls -A alembic/versions/*.py 2>/dev/null | grep -v __pycache__ | grep -v .gitkeep)" ]; then
    echo "No migrations found. Creating initial migration..."
    alembic revision --autogenerate -m "Initial migration"
fi
echo "Applying migrations..."
alembic upgrade head

# Start the server
echo "Starting backend server on http://localhost:8000"
echo "API docs available at http://localhost:8000/docs"
echo ""
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000


