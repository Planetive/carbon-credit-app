# Backend fix prompt — 2 formula mismatches vs SPA

Paste everything below the line into the **backend** Cursor chat (`carbon-credit-backend`).

Do **not** change SPA formulas. Align backend `ghg_calc` to match frontend behavior below.

---

## Context

Blind parity: **41/43** matched. These two failed because backend skipped unit conversions that the SPA always applies when the request fields say so.

| Case | SPA | Backend (broken) |
|---|---:|---:|
| `mobile_liter_to_gallon` | 23.194317 | 87.8 |
| `heat_mmscf_to_mmbtu` | 55023.22 | 53.06 |

---

## 1) EPA mobile fuel — liter → gallon

### SPA source of truth
- UI: `MobileFuelEmissions.tsx` → `localMobileFuelEmissionsKg` / `resolveEpaMobileFuelEmissionsKg`
- Shared helper: `src/api/calcConnection.ts` → `localMobileFuelEmissionsKg`

### SPA formula (exact)

```
LITERS_PER_GALLON = 3.78541

if input_unit starts with "liter" or "litre" (case-insensitive):
  qty = quantity / 3.78541
else:
  qty = quantity

emissions_kg = Number((qty * factor).toFixed(6))
```

### What SPA does **not** require
- It does **not** require factor `unit` to contain `"gallon"` before converting.
- Conversion is driven **only** by `input_unit`.

### Broken backend behavior today
In `fastapi_app/ghg_calc/mobile_fuel.py` `calculate_mobile_fuel`:

```python
is_gallon_base = "gallon" in base_unit.lower()
if is_gallon_base and iu == "liter":
    effective = quantity / 3.78541
```

When the request is only `{ quantity, factor, input_unit: "liter" }` (no factor unit string), `is_gallon_base` is false → no conversion → `10 * 8.78 = 87.8`.

### Required backend fix
When `input_unit` is liter/litre, **always** convert:

```python
iu = (input_unit or "").lower()
if iu.startswith("liter") or iu.startswith("litre"):
    effective = float(quantity) / 3.78541
else:
    effective = float(quantity)
emissions_kg = round6(effective * float(resolved_factor))
```

### Replay case (must become SPA result)
Request to `/api/v1/calc/epa/mobile-fuel`:
```json
{ "quantity": 10, "factor": 8.78, "input_unit": "liter" }
```
Expected backend result: **`emissions_kg = 23.194317`**  
(= `Number(((10 / 3.78541) * 8.78).toFixed(6))`)

Also keep gallon path unchanged:
```json
{ "quantity": 10, "factor": 8.78, "input_unit": "gallon" }
```
→ **`87.8`**

---

## 2) Heat & steam — MMSCF → mmBtu

### SPA source of truth
- UI: `HeatSteamEmissions.tsx`
  - `MMBTU_PER_MMSCF = 1037`
  - `computeEmissionsKg(gas, factor, quantityInBaseUnit)`
- Connection helper: `resolveHeatSteamEmissionsKg` in `calcConnection.ts`

### SPA formula (exact)

```
MMBTU_PER_MMSCF = 1037

qty_base = quantity
if quantity_unit == "mmscf" (case-insensitive):
  qty_base = quantity * 1037

if gas == "co2":
  emissions_kg = Number((qty_base * co2_factor).toFixed(6))
elif gas == "ch4":
  emissions_kg = Number(((qty_base * ch4_factor) / 1000).toFixed(6))
elif gas == "n2o":
  emissions_kg = Number(((qty_base * n2o_factor) / 1000).toFixed(6))
```

### What SPA connection layer does
When the client sends `quantity_unit: "mmscf"`, conversion **always** happens.  
There is **no** extra `supports_mmscf` gate in `resolveHeatSteamEmissionsKg`.

(UI only offers the mmscf selector when the factor row supports it, but once `quantity_unit` is `"mmscf"` on the wire, convert.)

### Broken backend behavior today
In `fastapi_app/ghg_calc/heat_steam.py` `calculate_heat_steam`:

```python
qty_base = (
    float(quantity) * 1037
    if quantity_unit == "mmscf" and supports
    else float(quantity)
)
```

With explicit factors only (no sheet row / no `unit` containing mmBtu), `supports` is false → no ×1037 → `1 * 53.06 = 53.06`.

### Required backend fix
If request `quantity_unit` is `"mmscf"`, always convert (do not require `supports`):

```python
if str(quantity_unit or "").lower() == "mmscf":
    qty_base = float(quantity) * 1037  # MMBTU_PER_MMSCF
else:
    qty_base = float(quantity)
```

Keep gas math the same as SPA (`co2` no /1000; `ch4`/`n2o` /1000 then round6).

### Replay case (must become SPA result)
Request to `/api/v1/calc/heat-steam`:
```json
{
  "quantity": 1,
  "quantity_unit": "mmscf",
  "gas": "co2",
  "co2_factor": 53.06
}
```
Expected backend result: **`emissions_kg = 55023.22`**  
(= `Number((1 * 1037 * 53.06).toFixed(6))`)

Also keep base-unit path unchanged:
```json
{ "quantity": 10, "gas": "co2", "co2_factor": 53.06 }
```
→ **`530.6`**

---

## After the fix

Re-run only these two cases and return JSON:

```json
{
  "side": "backend_ghg_calc_recheck",
  "results": [
    {"suite": "mobile_fuel", "id": "mobile_liter_to_gallon", "emissions_kg": <number>},
    {"suite": "heat_steam", "id": "heat_mmscf_to_mmbtu", "emissions_kg": <number>}
  ]
}
```

Target: `23.194317` and `55023.22`.
