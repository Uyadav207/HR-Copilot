# HR Autopilot Backend

AI-powered hiring system API built with Bun, Hono, and TypeScript.

## Tech Stack

- **Runtime**: Bun
- **Framework**: Hono
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Validation**: Zod
- **LLM Providers**: OpenAI / Anthropic

## Prerequisites

- [Bun](https://bun.sh/) - Install with: `curl -fsSL https://bun.sh/install | bash`
- PostgreSQL 15+
- Docker (for local database setup)

## Setup

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Set up environment variables:**
   ```bash
   # Copy and edit .env file
   cp .env.example .env
   # Or use the setup script from project root
   ../setup-env.sh
   ```

3. **Start database services:**
   ```bash
   docker-compose up -d
   ```

4. **Run database migrations:**
   ```bash
   bun run db:migrate
   ```

5. **Start the development server:**
   ```bash
   bun run dev
   # Or use the start script
   ./start-backend.sh
   ```

The API will be available at `http://localhost:8000`

## API Endpoints

All endpoints are prefixed with `/api` (configurable via `API_PREFIX` env variable).

### Jobs
- `POST /api/jobs` - Create a new job
- `GET /api/jobs` - List all jobs
- `GET /api/jobs/:id` - Get job details
- `PUT /api/jobs/:id` - Update a job
- `DELETE /api/jobs/:id` - Delete a job
- `POST /api/jobs/:id/parse-blueprint` - Manually trigger blueprint parsing

### Candidates
- `POST /api/jobs/:jobId/candidates` - Upload candidate CVs (multipart/form-data)
- `GET /api/jobs/:jobId/candidates` - List candidates for a job
- `GET /api/candidates/:id` - Get candidate details
- `POST /api/candidates/:id/parse` - Manually trigger CV parsing
- `DELETE /api/candidates/:id` - Delete a candidate

### Evaluations
- `POST /api/candidates/:candidateId/evaluate` - Evaluate a candidate
- `GET /api/candidates/:candidateId/evaluation` - Get evaluation for a candidate
- `PATCH /api/evaluations/:id/decision` - Update final decision
- `POST /api/evaluations/:id/email-draft` - Generate email draft
- `GET /api/evaluations/:id/email-draft` - Get email draft

### Audit
- `GET /api/candidates/:candidateId/timeline` - Get candidate timeline
- `GET /api/jobs/:jobId/audit-logs` - Get audit logs for a job

## Database

The project uses Drizzle ORM with PostgreSQL. Models are defined in `src/models/`.

### Database Commands

- `bun run db:generate` - Generate migrations
- `bun run db:migrate` - Push schema to database
- `bun run db:studio` - Open Drizzle Studio

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hr_autopilot

# Redis (optional)
REDIS_URL=redis://localhost:6379/0

# LLM Configuration
LLM_PROVIDER=openai  # or "anthropic"
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
OPENAI_MODEL=gpt-4-turbo-preview
ANTHROPIC_MODEL=claude-3-opus-20240229

# Application
ENVIRONMENT=development
LOG_LEVEL=INFO
API_PREFIX=/api
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

## Project Structure

```
src/
├── config.ts          # Configuration and settings
├── database.ts        # Database connection
├── index.ts           # Main entry point
├── models/            # Database models (Drizzle)
├── routes/            # API routes (Hono)
├── schemas/           # Zod validation schemas
├── services/          # Business logic
└── prompts/           # LLM prompt templates
```

## Development

- `bun run dev` - Start development server with hot reload
- `bun run start` - Start production server

## Migration from Python/FastAPI

This project was migrated from Python/FastAPI to Bun/Hono/TypeScript. All Python code has been removed and replaced with TypeScript equivalents.
