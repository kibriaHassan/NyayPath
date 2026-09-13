# NyayPath Backend API

Zero-dependency Node.js REST API (built-in `http` + JSON file DB).  
**No `npm install` required.**

## Run

```bash
cd backend
node server.mjs
```

Or:

```bash
npm run dev
```

API: **http://localhost:4000**

## Demo accounts

| Role   | Email               | Password  |
|--------|---------------------|-----------|
| Lawyer | rafiqul@nyaypath.bd | lawyer123 |
| Staff  | mahmud@nyaypath.bd  | staff123  |

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | — | Health check |
| POST | `/api/auth/login` | — | Login |
| POST | `/api/auth/register/lawyer` | — | Lawyer registration |
| GET | `/api/auth/me` | JWT | Current user |
| GET | `/api/lawyers` | — | Public directory (+ filters) |
| GET | `/api/lawyers/:id` | — | Public profile |
| GET | `/api/cases/search?q=` | — | Public case search (no private fields) |
| GET/POST | `/api/cases` | JWT | List / create cases |
| GET/PUT | `/api/cases/:id` | JWT | Case details / update |
| GET/POST | `/api/staff` | Lawyer | Staff management |
| PATCH | `/api/staff/:id/access` | Lawyer | Enable / disable staff |
| GET/POST | `/api/hearings` | JWT | Hearings |
| GET/POST | `/api/tasks` | JWT | Tasks |
| PATCH | `/api/tasks/:id/status` | JWT | Update task status |
| GET/POST | `/api/documents` | JWT | Documents |
| GET | `/api/notifications` | JWT | Notifications |
| GET/PUT | `/api/profile/lawyer` | Lawyer | Profile |
| GET | `/api/dashboard/lawyer` | Lawyer | Stats |
| GET | `/api/dashboard/staff` | Staff | Stats |
| POST | `/api/contact` | — | Contact form |
| POST | `/api/admin/reseed` | — | Reset seed data |

Auth header: `Authorization: Bearer <token>`

## Data

Seeded data is stored in `data/db.json` (auto-created on first run).

## Frontend

Set in `vite-project/.env`:

```
VITE_API_URL=http://localhost:4000/api
```

Login / Register already call this API.

## Optional Prisma stack

The `prisma/` and `src/` folders contain an Express + Prisma + SQLite version for later production use (`npm install` needed when disk space allows). The active zero-dep server is `server.mjs`.
