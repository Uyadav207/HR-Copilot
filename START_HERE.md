# HR Autopilot - Quick Start Guide

## Prerequisites

- Python 3.11+ installed
- Node.js 18+ installed
- Docker and Docker Compose installed
- OpenAI or Anthropic API key

## Step-by-Step Setup

### 1. Set Up Environment Variables

```bash
# Run the setup script (if not already done)
./setup-env.sh

# Edit backend/.env and add your API key
# Replace 'your_openai_api_key_here' with your actual OpenAI API key
# OR set ANTHROPIC_API_KEY if using Anthropic
```

### 2. Start Database Services (PostgreSQL + Redis)

```bash
# Start PostgreSQL and Redis in Docker
docker-compose up -d

# Verify they're running
docker-compose ps
```

### 3. Set Up Backend

```bash
# Navigate to backend directory
cd backend

# Create virtual environment (if not exists)
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start the backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend will be available at: http://localhost:8000
API docs at: http://localhost:8000/docs

### 4. Set Up Frontend (in a new terminal)

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be available at: http://localhost:3000

## Quick Start Scripts

We've also created helper scripts:
- `start-backend.sh` - Starts the backend
- `start-frontend.sh` - Starts the frontend
- `start-all.sh` - Starts everything (database + backend + frontend)

## Troubleshooting

### Database Connection Issues
- Make sure Docker is running: `docker ps`
- Check if containers are up: `docker-compose ps`
- View logs: `docker-compose logs`

### Backend Issues
- Check if port 8000 is available
- Verify API keys in `backend/.env`
- Check backend logs for errors

### Frontend Issues
- Check if port 3000 is available
- Verify `NEXT_PUBLIC_API_URL` in `frontend/.env.local`
- Clear Next.js cache: `rm -rf .next` then restart

## Stopping Everything

```bash
# Stop frontend (Ctrl+C in terminal)
# Stop backend (Ctrl+C in terminal)

# Stop database services
docker-compose down
```


