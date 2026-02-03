# Contributing to HR Autopilot

Thank you for considering contributing. This document covers local setup, conventions, and how to submit changes.

## Development setup

1. **Prerequisites**
   - [Bun](https://bun.sh) (backend)
   - Node.js 18+ and npm (frontend)
   - PostgreSQL and Redis (or use Docker for both)

2. **Backend**
   ```bash
   cd backend
   bun install
   # Create .env with DATABASE_URL, LLM_PROVIDER, API key, JWT_SECRET (see README)
   bun run db:migrate
   bun run dev
   ```

3. **Frontend**
   ```bash
   cd frontend
   npm install
   # Create .env.local with NEXT_PUBLIC_API_URL=http://localhost:8000
   npm run dev
   ```

4. **Optional – RAG**
   - Set `PINECONE_API_KEY` and `PINECONE_INDEX_NAME` in `backend/.env`.
   - Create a Pinecone index with dimension `512` and metric `cosine`.

## Code style

- **TypeScript:** Use strict types; avoid `any` where possible.
- **Backend:** Follow existing patterns in `routes/` and `services/`; use Zod schemas in `schemas/` for request validation.
- **Frontend:** Use existing components from `components/ui` and `lib/api` for API calls; keep pages thin and logic in hooks/services where it makes sense.
- **Formatting:** Use the project’s existing formatting (e.g. no trailing commas or semicolons if that’s the current style). Run `npm run lint` in the frontend.

## Project layout

- **Backend:** `backend/README.md` and root [README – Project structure](README.md#project-structure).
- **Frontend:** `frontend/README.md`.

## Submitting changes

1. Create a branch from `main` (e.g. `feature/your-feature` or `fix/issue-description`).
2. Make your changes and ensure:
   - Backend runs with `bun run dev` and relevant endpoints work.
   - Frontend runs with `npm run dev` and `npm run lint` passes.
3. Commit with clear messages (e.g. “Add X”, “Fix Y when Z”).
4. Open a pull request describing the change and how to test it.

## API and database

- New API routes should go under the existing route modules in `backend/src/routes/` and use the auth middleware where appropriate.
- Schema changes: update Drizzle models in `backend/src/models/` and run `bun run db:generate` / `bun run db:migrate` as needed. Document any new env vars in the root README.

## Questions

If something is unclear, open an issue with the “question” or “documentation” label.
