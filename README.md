# Rethink Carbon (frontend)

Vite + React SPA for Planetive / Rethink Carbon.

## API backend

The FastAPI service lives in a **separate** repository: [Planetive/carbon-credit-backend](https://github.com/Planetive/carbon-credit-backend.git).

Do not run or embed a backend from this repo. For local dual-auth / JWT work:

```bash
# In carbon-credit-backend
uvicorn fastapi_app.main:app --reload --port 8000
```

Then in this repo set `.env`:

```env
VITE_BACKEND_URL=http://127.0.0.1:8000
VITE_USE_JWT_AUTH=true
```

See [`.env.example`](.env.example) and [`parity/README.md`](parity/README.md) for parity against that API.

## Frontend scripts

```bash
npm install
npm run dev
npm run build
npm run parity
npm run parity:api   # needs backend running + JWT
```
