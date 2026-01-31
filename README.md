# HR Autopilot

**AI-Powered Candidate Evaluation & Hiring Pipeline**

A modern, full-stack application that automates the candidate screening process using AI. Upload resumes, parse job descriptions, and get detailed AI-powered evaluations with match scores, gap analysis, and interview recommendations.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)

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
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
                    ▼            ▼            ▼
             ┌──────────┐ ┌──────────┐ ┌──────────┐
             │  Redis   │ │   LLM    │ │  Email   │
             │  Cache   │ │ Provider │ │  (SMTP)  │
             └──────────┘ └──────────┘ └──────────┘
```

### Data Flow

1. **Job Creation**: JD text → LLM → Structured Blueprint (skills, experience, responsibilities)
2. **CV Upload**: PDF → Parser → LLM → Candidate Profile (skills, experience, education)
3. **Evaluation**: Blueprint + Profile + CV Text → LLM → Detailed Evaluation with scores
4. **Decision**: HR reviews evaluation → Makes decision → Auto-generates appropriate email

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
bun install
bun run db:push    # Initialize database schema
bun run dev        # Start dev server on :8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev        # Start dev server on :3000
```

---

## Configuration

### Environment Variables

Create `backend/.env`:

```env
# Required - Choose one LLM provider
LLM_PROVIDER=gemini              # Options: gemini, openai, anthropic
GEMINI_API_KEY=your_key          # If using Gemini
OPENAI_API_KEY=your_key          # If using OpenAI
ANTHROPIC_API_KEY=your_key       # If using Anthropic

# Authentication
JWT_SECRET=your-32-char-secret   # Required for auth

# Database (auto-configured in Docker)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hr_autopilot

# Optional
REDIS_URL=redis://localhost:6379/0
SMTP_HOST=smtp.gmail.com         # For sending emails
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_app_password
```

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

## License

MIT

---

**Built with AI, for HR teams who value their time.**
