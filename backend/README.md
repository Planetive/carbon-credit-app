# Finance Emission FastAPI Service

Minimal FastAPI backend to calculate Finance Emission and Facilitated Emission.

## Quickstart

1) Create venv and install deps

```bash
python -m venv .venv
. .venv/Scripts/activate  # Windows PowerShell: . .venv/Scripts/Activate.ps1
pip install -r backend/requirements.txt
```

2) Run dev server

```bash
uvicorn backend.fastapi_app.main:app --reload
```

3) Open docs

- Swagger UI: http://localhost:8000/docs
- Health: http://localhost:8000/health

## Endpoints

- POST /finance-emission
- POST /facilitated-emission

Request/response models are in `backend/fastapi_app/models.py`.

## Notes

- The engine currently contains placeholder logic; port the existing frontend formulas into `backend/fastapi_app/engine.py` to match results exactly.
- Keep inputs in base units (tCO2e, PKR) on the server; do UI formatting client-side.
- Consider adding authentication and proper CORS rules in production.

