# Motor vehicle loans — PCAF scores (EPA emission factors)

Emission factors by fuel type are **EPA** (Mobile Fuel / on-road tables). DEFRA remains available as an alternate library in the calculator form.

### Score 1a — Ask From User

- Outstanding amount
- Total value at origination
- Fuel type
- *Actual fuel consumed in litres/m³ for the year*

*Pre-loaded in platform:* Emission factor by fuel type **(EPA)**

*Formula:* Attribution × Fuel consumption × EF

---

### Score 1b — Ask From User

- Outstanding amount
- Total value at origination
- Fuel type
- *Actual km driven in the year* (from odometer)
- *Vehicle Brand / Model / Year* (from make/model sheet)

*Pre-loaded in platform:* Fuel efficiency from **Efficiency (Average)** + unit; emission factor by fuel type **(EPA Mobile Fuel — same as Score 2)**

*Formula:* Attribution × Distance × Efficiency(make/model) × EF

---

### Score 2 — Ask From User

- Outstanding amount
- Total value at origination
- Private / public (+ intercity / outercity if public)
- Fuel type
- *Vehicle Brand / Model+Year* (from make/model sheet)

*Pre-loaded in platform:* Local statistical distance by vehicle use/class, **fuel efficiency from make/model sheet**, emission factor by fuel type (EPA)

*Formula:* Attribution × Distance(local stats) × Efficiency(make/model) × EF

---

### Score 3 — Ask From User

- Outstanding amount
- Total value at origination
- Private / public (+ intercity / outercity if public)
- Fuel type
- *Vehicle make and model* (Brand / Model+Year from sheet)
- *Distance traveled (regional)* — auto from distance stats

*Pre-loaded in platform:* Efficiency from make/model sheet + emission factor by EPA fuel type (same as Score 2)

*Formula:* Attribution × Distance(regional) × Efficiency(make/model) × EF

*Note:* Score 3 UI matches Score 2; only the distance label/scope is regional.

---

### Score 4 — Ask From User

- Outstanding amount
- Total value at origination
- Private / public (+ intercity / outercity if public)
- Local or regional distance scope
- **EPA emission factor source** (combined in Score 4 only):
  - **Table 3** On-Road Gasoline — vehicle type + model year (g CO₂e/mile)
  - **Table 4** On-Road Diesel & Alt Fuel — vehicle type + fuel + model year (g CO₂e/mile)
  - **Mobile Fuel** — fuel type (kg CO₂e / unit) with distance × efficiency
  - **Non-Road** — vehicle type + fuel + fuel quantity (g CO₂e/gallon)
- Distance traveled (from stats; Non-Road also needs fuel quantity)

*Pre-loaded in platform:* Emission factors from the selected EPA source above

*Formula:* Attribution × Distance × EF (Table 3/4), or Distance × Efficiency × EF (Mobile), or Fuel × EF (Non-Road)

---

### Score 5 — Ask From User

- Outstanding amount
- Total value at origination
- Private / public (+ intercity / outercity if public)
- Local or regional distance scope
- Fuel type
- *Engine CC (cubic capacity)*
- Distance traveled

*Pre-loaded in platform:* Emission factor from **EPA Mobile Fuel** by fuel type; efficiency from engine CC bands (provisional until datasheet)

*Formula:* Attribution × Distance × Efficiency(CC) × EF

---

## Software design view

```
USER INPUTS (form fields)          PRE-LOADED IN PLATFORM (database)
─────────────────────────          ──────────────────────────────────
Always required:                   Always pre-loaded:
  - Outstanding amount               - Emission factor by fuel type
  - Value at origination               (EPA emission factors by fuel type)
  - Fuel type

Score 1a adds:
  - Actual fuel consumed

Score 1b adds:                     Score 1b platform provides:
  - Actual km driven                 - Emission factor by fuel type
  - Make and model                     (EPA Mobile Fuel, same as Score 2)
  - Fuel efficiency (L/km)

Score 2 adds:                      Score 2 platform provides:
  - Private/public + class           - Local distance stats
  - Brand / Model+Year               - Efficiency from make/model sheet
                                     - EPA Mobile Fuel EF

Score 3 adds:                      Score 3 platform provides:
  - Same as Score 2                  - Regional distance stats
                                     - Same make/model efficiency + EPA EF

Score 4 adds:                      Score 4 platform provides:
  - Private/public + local/regional  - Combined EPA EF sources:
  - EPA source picker                  Table 3, Table 4, Mobile Fuel,
                                       Non-Road
  - Distance (+ fuel qty if Non-Road)

Score 5:                           Score 5 platform provides:
  - Private/public + local/regional  - EF from EPA Mobile Fuel
  - Fuel type                        - Efficiency by engine CC
  - Engine CC
  - Distance
```

---

## Progressive UI (wizard)

The motor-vehicle method step is progressive: it asks for the richest data first and auto-selects the PCAF option.

1. Outstanding amount, origination value, fuel type — collected on the calculator form (always required).
2. Can you provide actual fuel consumption? → Yes = **Score 1a** (`1a`)
3. Can you provide actual km driven + make/model? → Yes = **Score 1b** (`1b`)
4. Can you provide make/model only? → Yes = **Score 2 or 3** (`2a` / `2b` after local vs regional choice)
5. Can you provide vehicle type (broad)? → Yes = **Score 4** (`3a`)
6. None of the above → **Score 5** (`3b`)

Option codes in code: `1a`, `1b`, `2a`, `2b`, `3a`, `3b` (PCAF Table 10.1-6).
