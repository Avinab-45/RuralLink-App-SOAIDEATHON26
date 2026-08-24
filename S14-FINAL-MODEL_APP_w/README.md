# ReAnnex rural logistics

## What is now connected

`Customer website → Gemini (or offline parser) → ML priority/ETA/risk → SQLite → OR-Tools → OpenRouteService road route → operations website → driver PWA`

The new customer portal is `frontend/index.html`; the existing driver PWA is linked from it. Customer submissions use `POST /api/orders`, which parses, scores and persists each order. Operations uses `POST /api/orders/plan` to optimise saved orders and return a road-following GeoJSON polyline.

## Start locally

1. Copy `backend/.env.example` to `backend/.env` and paste both keys there.
2. Run `powershell -ExecutionPolicy Bypass -File .\run-app.ps1 -Install` from this folder.
3. Open `http://127.0.0.1:3000`.

The parser falls back to local keyword extraction if Gemini is not configured. Routing is deliberately labelled **straight-line fallback** if `ORS_API_KEY` is absent or ORS is unavailable; it never presents that fallback as an actual road route.

## API additions

- `POST /api/orders` — customer order, parse/score/store
- `GET /api/orders` and `GET /api/orders/{id}` — operations/customer tracking
- `POST /api/orders/plan` — OR-Tools route order plus OpenRouteService road geometry

`backend/.env.example` lists the required environment variable names. The app
loads `backend/.env` automatically and `.env` is excluded from version control.
