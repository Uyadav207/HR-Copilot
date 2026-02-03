# HR Autopilot

**AI-Powered Candidate Evaluation & Hiring Pipeline**

A modern, full-stack application that automates the candidate screening process using AI. Upload resumes, parse job descriptions, and get detailed AI-powered evaluations with match scores, gap analysis, and interview recommendations. Supports RAG (Retrieval-Augmented Generation) via Pinecone for evidence-based CV parsing and candidate chat.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Evaluation Output Structure](#evaluation-output-structure)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Documentation](#documentation)

---

## Features

| Feature | Description |
|---------|-------------|
| **Job Blueprint Generation** | AI parses job descriptions into structured blueprints with must-have/nice-to-have requirements |
| **CV Parsing** | Automatic extraction of skills, experience, education from PDF resumes |
| **AI Evaluation** | Deep candidate-to-job matching with confidence scores and evidence-based reasoning |
| **Gap Analysis** | Critical, major, and moderate gaps identified with transferability assessment |
| **Email Generation** | Auto-generated invite/reject/hold emails based on evaluation |
| **Candidate Chat** | AI-powered Q&A about specific candidates |
| **Multi-tenant** | Organization-based data isolation with JWT authentication |

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│    Frontend     │────▶│    Backend      │────▶│   PostgreSQL    │
│   (Next.js)     │     │   (Hono/Bun)    │     │                 │
│   Port: 3000    │     │   Port: 8000    │     │   Port: 5432    │
│                 │     │                 │     │                 │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                    ┌────────────┼────────────┬────────────┐
                    │            │            │            │
                    ▼            ▼            ▼            ▼
             ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
             │  Redis   │ │   LLM    │ │ Pinecone │ │  Email   │
             │  Cache   │ │ Provider │ │ (Vector) │ │  (SMTP)  │
             └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

### Data Flow

1. **Job Creation**: JD text → LLM → Structured Blueprint (skills, experience, responsibilities)
2. **CV Upload**: PDF → Parser → Chunking → Embeddings → Pinecone; LLM (with optional RAG) → Candidate Profile
3. **Evaluation**: Blueprint + Profile + CV Text (and optionally RAG chunks) → LLM → Detailed Evaluation with scores
4. **Candidate Chat**: Question + Profile + Job Blueprint + RAG chunks → LLM → Answer (optionally streamed)
5. **Decision**: HR reviews evaluation → Makes decision → Auto-generates appropriate email

---

## Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **Bun** | JavaScript runtime (fast, TypeScript-native) |
| **Hono** | Lightweight web framework |
| **Drizzle ORM** | Type-safe database queries |
| **PostgreSQL** | Primary database |
| **Redis** | Caching layer |

### Frontend
| Technology | Purpose |
|------------|---------|
| **Next.js 14** | React framework with App Router |
| **TailwindCSS** | Utility-first styling |
| **shadcn/ui** | Component library |
| **TanStack Query** | Data fetching & caching |

### AI/LLM
| Provider | Models Supported |
|----------|------------------|
| **Gemini** | gemini-2.0-flash (default) |
| **OpenAI** | gpt-4o, gpt-4-turbo |
| **Anthropic** | claude-3-5-sonnet |

---

## Quick Start

### Using Docker (Recommended)

```bash
# 1. Clone and enter directory
cd HR

# 2. Create backend environment file
cat > backend/.env << 'EOF'
GEMINI_API_KEY=your_gemini_api_key
LLM_PROVIDER=gemini
JWT_SECRET=your-secret-key-min-32-chars-long
EOF

# 3. Start all services
docker compose up --build

# 4. Access the application
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
```

### Local Development

```bash
# Backend
cd backend
# Create backend/.env with at least LLM_PROVIDER, API key, JWT_SECRET, DATABASE_URL
bun install
bun run db:migrate     # Initialize database schema
bun run dev             # Start dev server on :8000

# Frontend (separate terminal)
cd frontend
# Create frontend/.env.local with NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev             # Start dev server on :3000
```

**Optional (RAG):** To enable CV chunking and candidate chat with citations, set `PINECONE_API_KEY` and `PINECONE_INDEX_NAME` in `backend/.env`, and create a Pinecone index with dimension `512` and metric `cosine`.

---

## Configuration

### Backend environment variables

Create `backend/.env`. You can copy `backend/.env.example` and fill in values.

| Variable | Required | Description |
|----------|----------|-------------|
| `LLM_PROVIDER` | Yes | `gemini`, `openai`, or `anthropic` |
| `GEMINI_API_KEY` | If Gemini | Google AI API key |
| `OPENAI_API_KEY` | If OpenAI | OpenAI API key |
| `ANTHROPIC_API_KEY` | If Anthropic | Anthropic API key |
| `JWT_SECRET` | Yes | Secret for signing JWTs (min 32 chars in production) |
| `DATABASE_URL` | Yes* | PostgreSQL connection string (*set automatically in Docker) |
| `REDIS_URL` | No | Redis URL (default: `redis://localhost:6379/0`) |
| `PORT` | No | Server port (default: `8000`) |
| `API_PREFIX` | No | API path prefix (default: `/api`) |
| `CORS_ORIGINS` | No | Comma-separated allowed origins |
| `JWT_EXPIRES_IN_SECONDS` | No | Token expiry (default: 604800 = 7 days) |
| `GEMINI_MODEL` | No | Gemini model (default: `gemini-2.0-flash`) |
| `OPENAI_MODEL` | No | OpenAI model (default: `gpt-4-turbo-preview`) |
| `ANTHROPIC_MODEL` | No | Anthropic model (default: `claude-3-opus-20240229`) |
| **Pinecone (RAG)** | | |
| `PINECONE_API_KEY` | For RAG | Enables RAG CV parsing and candidate chat with citations |
| `PINECONE_INDEX_NAME` | No | Index name (default: `cv-chunks`) |
| `PINECONE_ENVIRONMENT` | No | e.g. `us-east-1` |
| `EMBEDDING_MODEL` | No | e.g. `text-embedding-004` (Gemini) or `text-embedding-3-small` (OpenAI) |
| `EMBEDDING_DIMENSION` | No | Must match index (default: `512`) |
| **Email** | | |
| `EMAIL_HOST` | No | SMTP host (e.g. `smtp.gmail.com`) |
| `EMAIL_PORT` | No | SMTP port (e.g. `587`) |
| `EMAIL_USER` | No | SMTP username |
| `EMAIL_PASS` | No | SMTP password / app password |
| `EMAIL_FROM` | No | From address for outgoing emails |
| `HIRING_MANAGER` | No | Display name (default: `Hiring Manager`) |
| **Other** | | |
| `ENVIRONMENT` | No | `development` or `production` |
| `LOG_LEVEL` | No | e.g. `INFO`, `DEBUG` |

### Frontend environment variables

Create `frontend/.env.local`:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API base URL (e.g. `http://localhost:8000`) |

For Docker, the frontend receives the API URL via build args; for local dev, set `NEXT_PUBLIC_API_URL` in `.env.local`.

---

## API Reference

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/signup` | POST | Create new user account |
| `/api/auth/login` | POST | Get JWT token |
| `/api/auth/me` | GET | Get current user |

### Jobs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/jobs` | GET | List all jobs |
| `/api/jobs` | POST | Create job (with JD parsing) |
| `/api/jobs/:id` | GET | Get job details |
| `/api/jobs/:id` | DELETE | Delete job |

### Candidates
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/jobs/:id/candidates` | GET | List candidates for job |
| `/api/jobs/:id/candidates` | POST | Upload CV (multipart/form-data) |
| `/api/candidates/:id` | GET | Get candidate details |
| `/api/candidates/:id/evaluate` | POST | Trigger AI evaluation |
| `/api/candidates/:id/evaluation` | GET | Get evaluation results |
| `/api/candidates/:id/chat` | POST | Chat about candidate |

### Evaluations
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/evaluations/:id/decision` | PATCH | Set final decision |
| `/api/evaluations/:id/email-draft` | POST | Generate email |
| `/api/evaluations/:id/send-email` | POST | Send email to candidate |

### Candidate chat (RAG-aware)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/candidates/:candidateId/chat` | POST | Send message, get answer (body: `{ question, conversation_history? }`) |
| `/api/candidates/:candidateId/chat/stream` | POST | Stream answer via SSE (same body) |
| `/api/candidates/:candidateId/chat/suggestions` | GET | Get suggested questions for the candidate |

### Audit
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/candidates/:candidateId/timeline` | GET | Audit timeline for a candidate |
| `/api/jobs/:jobId/audit-logs` | GET | Audit logs for a job |

---

## Project Structure

```
HR/
├── backend/
│   ├── src/
│   │   ├── index.ts           # App entry point
│   │   ├── config.ts          # Environment configuration
│   │   ├── database.ts        # Drizzle DB connection
│   │   ├── models/            # Database schemas (Drizzle)
│   │   ├── routes/            # API route handlers
│   │   ├── services/          # Business logic
│   │   │   ├── llmClient.ts       # LLM integration
│   │   │   ├── evaluationService.ts
│   │   │   ├── candidateService.ts
│   │   │   └── jobService.ts
│   │   ├── prompts/           # LLM prompt templates
│   │   │   └── v1/            # Versioned prompts
│   │   └── middleware/        # Auth middleware
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/               # Next.js App Router pages
│   │   │   ├── jobs/          # Job management
│   │   │   ├── candidates/    # Candidate views
│   │   │   └── settings/      # App settings
│   │   ├── components/        # React components
│   │   │   ├── ui/            # shadcn components
│   │   │   └── *.tsx          # Feature components
│   │   ├── lib/               # Utilities
│   │   └── types/             # TypeScript types
│   └── package.json
│
├── docker-compose.yml         # Container orchestration
└── README.md
```

---

## Evaluation Output Structure

The AI evaluation produces a comprehensive assessment:

```typescript
{
  decision: "yes" | "maybe" | "no",
  confidence: 0.85,
  overall_match_score: 0.72,
  
  // Detailed Analysis
  jd_requirements_analysis: { must_have: [...], nice_to_have: [...] },
  skills_comparison: [{ skill, jd_requirement, candidate_level, matches, evidence }],
  experience_analysis: { jd_requirement, candidate_years, matches, gap_analysis },
  
  // Gap Analysis
  matching_strengths: { skills_that_match: [...], experience_that_matches: [...] },
  missing_gaps: { technology_gaps, experience_gaps, skill_gaps },
  brutal_gap_analysis: { critical_gaps, major_gaps, moderate_gaps },
  
  // Recommendations
  strengths: [{ point, evidence }],
  concerns: [{ point, evidence }],
  recommended_interview_questions: [...]
}
```

---

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| **"OPENAI_API_KEY / GEMINI_API_KEY not set"** | Set the API key for your chosen `LLM_PROVIDER` in `backend/.env`. |
| **"PINECONE_API_KEY is required"** | RAG features (CV chunk storage, candidate chat with citations) need Pinecone. Either set `PINECONE_API_KEY` and create an index with the same dimension as `EMBEDDING_DIMENSION` (default 512), or ensure the code path does not require Pinecone. |
| **Pinecone index not found** | Create the index in the [Pinecone console](https://app.pinecone.io) with dimension `512` (or your `EMBEDDING_DIMENSION`), metric `cosine`. Name must match `PINECONE_INDEX_NAME`. |
| **CV parsing fails or returns "Error"** | Check PDF is valid and not scanned/image-only. Check LLM API key and rate limits. |
| **Email not sending** | Set `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`. For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833). |
| **CORS errors in browser** | Add your frontend origin to `CORS_ORIGINS` in `backend/.env` (comma-separated). |
| **401 on API calls** | Ensure the frontend sends `Authorization: Bearer <token>` and the token is valid. Log in again if expired. |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, code style, and how to submit changes.

## Documentation

| Document | Description |
|----------|-------------|
| [README.md](README.md) | This file – overview, setup, API, config |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to run locally, code style, PR process |
| [backend/README.md](backend/README.md) | Backend scripts, env, directory structure |
| [frontend/README.md](frontend/README.md) | Frontend scripts, env, API usage |

Key backend modules are documented with JSDoc: `config.ts`, `database.ts`, `index.ts`, `middleware/auth.ts`, `prompts/registry.ts`, and services under `backend/src/services/` (e.g. `llmClient.ts`, `candidateService.ts`, `evaluationService.ts`, `vectorStoreService.ts`, `embeddingService.ts`). Frontend: `lib/api.ts`, `contexts/auth-context.tsx`.

---

## License

MIT

---

**Built with AI, for HR teams who value their time.**
