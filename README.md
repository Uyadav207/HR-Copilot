# HR Autopilot MVP

An AI-powered, transparent hiring system for startups without a dedicated HR team.

## Quick Start

### 1. Prerequisites
- Python 3.11+
- Node.js 18+
- Docker Desktop
- OpenAI or Anthropic API key

### 2. Initial Setup

```bash
# 1. Set up environment files
./setup-env.sh

# 2. Edit backend/.env and add your API key
# Replace 'your_openai_api_key_here' with your actual key

# 3. Start database services
docker-compose up -d

# 4. Start backend (in one terminal)
./start-backend.sh

# 5. Start frontend (in another terminal)
./start-frontend.sh
```

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Manual Setup (Alternative)

See [START_HERE.md](START_HERE.md) for detailed step-by-step instructions.

## Features

- ✅ **Job Description Management**: Create and parse job descriptions into structured blueprints
- ✅ **Batch CV Upload**: Upload multiple candidate CVs at once
- ✅ **AI-Powered Evaluation**: Generate evidence-based decision cards (Yes/Maybe/No)
- ✅ **Transparent Decisions**: Every decision includes CV evidence snippets
- ✅ **Email Drafts**: One-click generate role-specific email drafts
- ✅ **Full Audit Trail**: Complete candidate timeline and action history

## Tech Stack

### Frontend
- Next.js 14+ (App Router)
- TypeScript
- TailwindCSS
- shadcn/ui
- TanStack Query

### Backend
- FastAPI (Python)
- Pydantic v2
- PostgreSQL
- SQLAlchemy (async)
- Alembic
- Redis (for background jobs)
- FastAPI BackgroundTasks

## Project Structure

```
/hr-autopilot
├── frontend/          # Next.js application
├── backend/           # FastAPI application
├── docker-compose.yml # PostgreSQL + Redis
├── setup-env.sh      # Environment setup script
├── start-backend.sh   # Backend startup script
├── start-frontend.sh  # Frontend startup script
├── start-all.sh      # Start everything script
└── README.md
```

## Development

### Database Migrations

```bash
cd backend
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

### Stopping Services

```bash
# Stop frontend/backend (Ctrl+C in terminals)
# Stop database
docker-compose down
```

## Troubleshooting

### Database Issues
```bash
# Check if containers are running
docker-compose ps

# View logs
docker-compose logs

# Restart services
docker-compose restart
```

### Backend Issues
- Ensure port 8000 is available
- Check `backend/.env` has correct API keys
- Verify database is running: `docker-compose ps`

### Frontend Issues
- Ensure port 3000 is available
- Check `frontend/.env.local` has correct API URL
- Clear cache: `rm -rf frontend/.next`

## License

MIT
