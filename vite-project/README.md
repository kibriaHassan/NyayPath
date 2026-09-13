# NyayPath — Law Case Management & Lawyer Directory

Modern, professional, responsive frontend for managing legal cases, staff, hearings, and a public lawyer directory.

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS v4
- React Router
- Zustand (auth)
- Lucide icons
- date-fns (calendar)
- Mock data ready for future API integration

## Getting Started

### Frontend

```bash
cd vite-project
npm install
npm run dev
```

Open `http://localhost:5173`.

### Backend (separate folder)

```bash
cd backend
node server.mjs
```

API: `http://localhost:4000` — no npm install needed.

Frontend `.env` already points to `VITE_API_URL=http://localhost:4000/api`.
Login/Register use the API; if backend is offline, demo mock login still works.

## Demo Accounts

| Role   | Email                 | Password   |
|--------|-----------------------|------------|
| Lawyer | rafiqul@nyaypath.bd   | lawyer123  |
| Staff  | mahmud@nyaypath.bd    | staff123   |

## Key Public Flows

1. **Case Search** — try `123/2026` on the landing page or `/cases/search`
2. **Find a Lawyer** — `/lawyers`
3. **Lawyer Register / Login** — `/register`, `/login`

## Project Structure

```
vite-project/   # React frontend
backend/        # Node.js API (server.mjs)
```

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run preview` — preview production build
