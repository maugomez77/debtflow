# DebtFlow — Technical Debt Quantifier

## Project Overview
DebtFlow puts a dollar cost on technical debt so teams can justify refactoring to management.

## Architecture
- **Backend**: FastAPI + SQLAlchemy async + PostgreSQL (Neon)
- **CLI**: Typer + Rich
- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Deployment**: Vercel (frontend), Render (backend)

## Quick Start

### Backend
```bash
cd /Users/mauriciogomez/dev/debtflow
pip install -e .
# Set DATABASE_URL env var
debtflow serve
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### CLI
```bash
debtflow scan --repo https://github.com/user/repo
debtflow cost --repo https://github.com/user/repo
debtflow dashboard
```

## Environment Variables
- `DATABASE_URL` — Neon PostgreSQL connection string
- `GITHUB_TOKEN` — GitHub personal access token (optional, for rate limits)
- `HOURLY_RATE` — Default hourly rate for cost calculations (default: $150)
- `FRONTEND_URL` — Frontend URL for CORS (default: http://localhost:5173)

## Commands
- `debtflow scan --repo URL` — Scan a repository
- `debtflow report` — Show formatted report
- `debtflow cost --repo URL` — Cost breakdown
- `debtflow timeline` — Debt history
- `debtflow roi --hours HOURS` — ROI calculation
- `debtflow dashboard` — Open web UI
- `debtflow serve` — Start API server

## API Endpoints
- `GET /health`
- `GET/POST /api/repos`
- `GET/DELETE /api/repos/{id}`
- `POST /api/repos/scan`
- `GET /api/debt`
- `GET /api/debt/{id}`
- `PATCH /api/debt/{id}/resolve`
- `GET /api/costs`
- `GET /api/timeline`
- `GET /api/roi/{id}`
- `GET /api/ai/recommend`

## Tech Stack
- Python 3.11+, Typer, Rich, FastAPI, SQLAlchemy, asyncpg, Pydantic
- React 18, TypeScript, Vite, TailwindCSS, Framer Motion, Recharts, i18next
