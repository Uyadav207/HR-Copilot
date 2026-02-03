# HR Autopilot – Backend

API and services for the HR Autopilot application. Built with **Bun**, **Hono**, **Drizzle ORM**, and optional **Pinecone** for RAG.

## Overview

- **Runtime:** Bun
- **Framework:** Hono
- **Database:** PostgreSQL via Drizzle ORM
- **Cache:** Redis (optional)
- **LLM:** Gemini (default), OpenAI, or Anthropic
- **Vector store:** Pinecone (optional, for RAG CV chunking and candidate chat)

## Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start dev server with hot reload (port 8000) |
| `bun run start` | Start production server |
| `bun run db:migrate` | Push Drizzle schema to PostgreSQL (`drizzle-kit push`) |
| `bun run db:generate` | Generate migrations (`drizzle-kit generate`) |
| `bun run db:studio` | Open Drizzle Studio for the database |
| `bun run db:clear` | Clear database (script: `scripts/clear-database.ts`) |
| `bun run db:migrate-multi-tenant` | Apply multi-tenant migration |
| `bun run db:add-enhanced-column` | Add enhanced data column if missing |

## Environment

Create `.env` and set at least:

- `LLM_PROVIDER` and the corresponding API key (`GEMINI_API_KEY`, `OPENAI_API_KEY`, or `ANTHROPIC_API_KEY`)
- `JWT_SECRET` (min 32 characters in production)
- `DATABASE_URL` (PostgreSQL connection string)

For RAG (CV chunking, candidate chat with citations), also set:

- `PINECONE_API_KEY`
- `PINECONE_INDEX_NAME` (index must exist; dimension must match `EMBEDDING_DIMENSION`, default 512)

See the [root README](../README.md#configuration) for the full list of environment variables.

## Directory structure

```
backend/
├── src/
│   ├── index.ts          # App entry, Hono app, routes mounting
│   ├── config.ts         # Environment and settings
│   ├── database.ts       # Drizzle client and connection
│   ├── constants/        # LLM token limits, etc.
│   ├── middleware/      # Auth (JWT)
│   ├── models/          # Drizzle schemas (users, jobs, candidates, evaluations, etc.)
│   ├── routes/          # API handlers (auth, jobs, candidates, evaluations, audit, chat)
│   ├── schemas/         # Zod validation schemas
│   ├── services/        # Business logic
│   │   ├── llmClient.ts         # Multi-provider LLM calls
│   │   ├── embeddingService.ts # Embeddings (OpenAI / Gemini)
│   │   ├── vectorStoreService.ts # Pinecone upsert/search
│   │   ├── cvChunkingService.ts # CV chunking for RAG
│   │   ├── candidateService.ts
│   │   ├── candidateChatService.ts
│   │   ├── evaluationService.ts
│   │   ├── jobService.ts
│   │   ├── emailService.ts
│   │   ├── auditService.ts
│   │   └── ...
│   ├── prompts/         # LLM prompt templates
│   │   ├── registry.ts  # Prompt versioning
│   │   └── v1/          # Versioned prompt files
│   └── utils/           # Logger, JSON repair, transform
├── scripts/             # DB and migration scripts
├── drizzle.config.ts
├── package.json
└── README.md            # This file
```

## API base

All API routes are under the prefix configured by `API_PREFIX` (default `/api`). Authentication is JWT; send `Authorization: Bearer <token>` for protected routes.

See the [root README – API Reference](../README.md#api-reference) for endpoint listing.
