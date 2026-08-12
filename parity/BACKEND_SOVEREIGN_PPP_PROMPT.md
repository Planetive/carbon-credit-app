# Backend: Sovereign debt PPP-GDP + calculation

Apply in **carbon-credit-backend** (`fastapi_app`).

## 1. Catalog route — list PPP-adjusted GDP

**File:** `fastapi_app/catalog_routes.py` (or equivalent catalog router)

```python
@router.get("/ppp-adjusted-gdp")
def list_ppp_adjusted_gdp(limit: int = 5000, offset: int = 0, db: Session = Depends(get_db)):
    rows = db.execute(
        text("""
            SELECT country_name, gdp_2024, gdp_2025
            FROM ref.ppp_adjusted_gdp
            ORDER BY country_name
            LIMIT :limit OFFSET :offset
        """),
        {"limit": limit, "offset": offset},
    ).mappings().all()
    return [dict(r) for r in rows]
```

Register under `/api/v1/catalog/ppp-adjusted-gdp`.

## 2. PPP resolution helper

**File:** `fastapi_app/ppp_gdp.py`

```python
from decimal import Decimal
from typing import Optional, Tuple

PREFERRED_YEAR = 2025
FALLBACK_YEAR = 2024

def resolve_ppp_gdp(row: dict, preferred_year: int = PREFERRED_YEAR) -> Optional[Tuple[Decimal, int, bool]]:
    g2025 = row.get("gdp_2025")
    g2024 = row.get("gdp_2024")
    if preferred_year == PREFERRED_YEAR and g2025 is not None and Decimal(g2025) > 0:
        return Decimal(g2025), PREFERRED_YEAR, False
    if g2025 is not None and Decimal(g2025) > 0:
        return Decimal(g2025), PREFERRED_YEAR, False
    if g2024 is not None and Decimal(g2024) > 0:
        used_fallback = preferred_year == PREFERRED_YEAR
        return Decimal(g2024), FALLBACK_YEAR, used_fallback
    return None

def load_ppp_gdp(db, country_name: str, preferred_year: int = PREFERRED_YEAR):
    row = db.execute(
        text("""
            SELECT country_name, gdp_2024, gdp_2025
            FROM ref.ppp_adjusted_gdp
            WHERE lower(country_name) = lower(:name)
        """),
        {"name": country_name},
    ).mappings().first()
    if not row:
        return None
    resolved = resolve_ppp_gdp(dict(row), preferred_year)
    if not resolved:
        return None
    value, year, used_fallback = resolved
    return {"pp_adjusted_gdp": float(value), "ppp_gdp_year": year, "ppp_gdp_used_fallback": used_fallback}
```

## 3. Extend `POST /api/v1/financed-emissions/calculate`

Before running sovereign formula IDs (`1a-sovereign-debt` … `3b-sovereign-debt`), when `inputs.resolve_ppp_gdp` is true:

```python
if inputs.get("resolve_ppp_gdp"):
    country = inputs.get("sovereign_country_name")
    if country:
        ppp = load_ppp_gdp(db, country)
        if not ppp:
            raise HTTPException(400, f"No PPP-adjusted GDP for {country}")
        inputs["pp_adjusted_gdp"] = ppp["pp_adjusted_gdp"]
        inputs["ppp_gdp_year"] = ppp["ppp_gdp_year"]
        inputs["ppp_gdp_used_fallback"] = ppp["ppp_gdp_used_fallback"]

    proxy = inputs.get("proxy_sovereign_country_name")
    if proxy:
        proxy_ppp = load_ppp_gdp(db, proxy)
        if proxy_ppp:
            inputs["proxy_pp_adjusted_gdp"] = proxy_ppp["pp_adjusted_gdp"]
            inputs["proxy_ppp_gdp_year"] = proxy_ppp["ppp_gdp_year"]
            inputs["proxy_ppp_gdp_used_fallback"] = proxy_ppp["ppp_gdp_used_fallback"]
```

Then run existing sovereign PCAF math (`sovereign_debt_configs.py` / calculation engine) with resolved `pp_adjusted_gdp`.

## 4. Country menu filtering (backend + frontend)

Only expose countries where `resolve_ppp_gdp(row)` is not null — i.e. at least one of `gdp_2025` or `gdp_2024` is present and > 0. Rows with both NULL are excluded.

## 5. Year rule

- Prefer **2025** when `gdp_2025` is not null.
- Else use **2024** and set `ppp_gdp_used_fallback: true` in inputs/results metadata.

## 6. Frontend contract (already wired)

The SPA sends:

```json
{
  "formula_id": "1a-sovereign-debt",
  "company_type": "listed",
  "inputs": {
    "resolve_ppp_gdp": true,
    "sovereign_country_name": "Albania",
    "outstanding_amount": 50000000,
    "verified_country_emissions": 12000000
  }
}
```

Backend must return standard calculate response:

```json
{
  "success": true,
  "result": {
    "attribution_factor": 0.000787,
    "financed_emissions": 9444.0,
    "data_quality_score": 1,
    "methodology": "PCAF Option 1a - Verified Country Emissions (Sovereign Debt)",
    "calculation_steps": []
  }
}
```

## 7. DB

Table already on EC2: `ref.ppp_adjusted_gdp(country_name, gdp_2024, gdp_2025)`.

Migration in this repo: `db/migrations/0012_ref_ppp_adjusted_gdp.sql`.
