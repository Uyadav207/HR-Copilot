## HR Autopilot

**AI-first hiring co-pilot for early-stage teams.**  
Turn messy JDs and CVs into a transparent, auditable pipeline in minutes.

### What it does

- **AI JD → Structure**: Paste a job description and get a structured blueprint (skills, seniority, must-haves).
- **Batch CV ingestion**: Drag-and-drop resumes; they’re parsed, normalized, and linked to jobs.
- **Evidence-based evaluations**: One-click AI evaluations with **Yes / Maybe / No** plus concrete CV snippets.
- **Email automation**: Generate tailored invite / hold / reject email drafts from the evaluation context.
- **Audit trail**: Every important action (parse, evaluate, decide, email) is logged for accountability.

### Tech stack (modern, production-ready)

- **Frontend**: Next.js 14 (App Router), TypeScript, TailwindCSS, shadcn/ui, Radix UI, TanStack Query.
- **Backend**: Bun, Hono, TypeScript, PostgreSQL + Drizzle ORM, Zod, Nodemailer.
- **AI**: OpenAI / Anthropic via a pluggable LLM client and prompt registry.

### Architecture at a glance

- **Domain-driven API**: Jobs, Candidates, Evaluations, Audit Logs exposed via a clean `/api` surface.
- **LLM pipeline**: Prompt templates in `backend/src/prompts` power JD parsing, CV → profile, and profile → evaluation.
- **Typed contracts**: Shared TypeScript types + Zod schemas between routes and services for safe refactors.
- **UX focus**: Sidebar-based app layout with quick actions, skeleton states, and contextual navigation across jobs and candidates.

### Run it locally (2–3 minutes)

**Prerequisites**
- Node.js 18+, Bun, Docker Desktop
- PostgreSQL/Redis via Docker (already configured)
- OpenAI or Anthropic API key

**1. Setup**

```bash
./setup-env.sh               # scaffold env files
docker-compose up -d         # start Postgres (and supporting services)
```

**2. Start services**

```bash
./start-backend.sh           # Bun + Hono API on http://localhost:8000
./start-frontend.sh          # Next.js app on http://localhost:3000
```

### Repo layout

```txt
backend/     Bun + Hono API, Drizzle models, LLM services, audit logging
frontend/    Next.js 14 app, UI, routing, API client hooks
docker-compose.yml
start-*.sh   Helper scripts to run the full stack locally
```

If you’re reviewing this as a recruiter/engineer and want a quick tour, start with:
- `frontend/src/app/page.tsx` (dashboard + UX)
- `backend/src/routes` and `backend/src/services` (API design and business logic)


