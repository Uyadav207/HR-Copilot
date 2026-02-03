# HR Autopilot – Frontend

Next.js 14 frontend for the HR Autopilot application.

## Overview

- **Framework:** Next.js 14 (App Router)
- **Styling:** TailwindCSS
- **UI:** shadcn/ui (Radix-based components)
- **Data:** TanStack Query + `lib/api.ts` for authenticated requests

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server (default port 3000) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Environment

Create `.env.local` (or copy from `.env.example`):

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL (e.g. `http://localhost:8000`) |

Only `NEXT_PUBLIC_*` variables are exposed to the browser. The frontend does not need `JWT_SECRET`; auth is handled via the token stored after login (e.g. in `localStorage`).

## Directory structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home/landing
│   │   ├── login/              # Login page
│   │   ├── signup/             # Signup page
│   │   ├── dashboard/          # Dashboard
│   │   ├── jobs/               # Job list, detail, new job
│   │   │   └── [id]/           # Job detail, candidates, upload
│   │   ├── candidates/         # Candidate list
│   │   └── settings/           # Settings
│   ├── components/             # React components
│   │   ├── ui/                 # shadcn components
│   │   ├── app-layout.tsx
│   │   ├── app-sidebar.tsx
│   │   ├── candidate-chat.tsx   # Candidate Q&A chat
│   │   ├── floating-candidate-chat.tsx
│   │   ├── jd-chat.tsx
│   │   ├── pdf-viewer.tsx
│   │   └── ...
│   ├── contexts/               # React context (e.g. auth)
│   ├── hooks/                  # Custom hooks (e.g. toast)
│   ├── lib/                    # api.ts (API_URL, apiRequest, apiUpload), utils
│   ├── types/                  # Shared TypeScript types
│   └── middleware.ts           # Next middleware (e.g. auth redirects)
├── package.json
└── README.md                   # This file
```

## API usage

Use `apiRequest` and `apiUpload` from `src/lib/api.ts`. They automatically:

- Use `NEXT_PUBLIC_API_URL` as base
- Attach `Authorization: Bearer <token>` from `localStorage` when present
- Set `Content-Type: application/json` for JSON bodies (not for FormData)
- Parse error responses and throw with a readable message

Example:

```ts
import { apiRequest } from '@/lib/api';

const jobs = await apiRequest<Job[]>('/jobs');
```
