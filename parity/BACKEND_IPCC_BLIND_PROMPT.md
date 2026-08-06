# Blind backend IPCC formula run

Copy everything below the line into a **backend** Cursor chat (`carbon-credit-backend`).

Do **not** paste frontend results. Do **not** open or read any SPA parity files (`cases.json`, `frontend_results.json`, `spaMath.ts`, etc.).

---

## Task

For each IPCC input case below, run the backend formula **once** (`fastapi_app/ghg_calc/ipcc_*.py` and/or live `POST /api/v1/calc/ipcc/...` with JWT if available).

Return whatever number the backend actually produces. Nothing else.

### Hard rules

- **No expected values.** Do not invent targets. Do not check against fixtures. Do not “verify” or “assert”.
- **No comparison.** Do not compare to SPA, goldens, docs, or prior runs.
- **One authentic pass.** Compute each case once; report that result as-is.
- Do not round beyond what the backend already returns.
- Do not edit formulas to “make numbers nicer”.
- If a case fails, set `"emissions_kg": null` and `"error": "<message>"`.
- Final answer = **only** this JSON (or JSON in a fenced block):

```json
{
  "side": "backend_ghg_calc_ipcc",
  "generated_at": "<ISO timestamp>",
  "case_count": <number>,
  "results": [
    {
      "suite": "<suite_name>",
      "id": "<case_id>",
      "emissions_kg": <number or null>,
      "route": "</api/v1/calc/ipcc/...>",
      "extra": {}
    }
  ]
}
```

## Input cases only (IPCC)

### ipcc_stationary → POST `/api/v1/calc/ipcc/stationary`
- `ipcc_stat_basic`: quantity=100, factor=2.0627
- `ipcc_stat_fractional`: quantity=37.5, factor=1.234567

### ipcc_flaring → POST `/api/v1/calc/ipcc/flaring`
- `flare_m3_ch4_co2`: volume=1000, unit=`m3`, composition=`[{"formula":"CH4","percentage":80},{"formula":"CO2","percentage":20}]`
- `flare_mmscf_mixed`: volume=0.5, unit=`MMSCF`, composition=`[{"formula":"CH4","percentage":70},{"formula":"C2H6","percentage":15},{"formula":"C3H8","percentage":10},{"formula":"CO2","percentage":5}]`
- `flare_m3_with_inert`: volume=500, unit=`m3`, composition=`[{"formula":"CH4","percentage":60},{"formula":"N2","percentage":30},{"formula":"CO2","percentage":10}]`
- `flare_m3_heavier`: volume=250, unit=`m3`, composition=`[{"formula":"C4H10","percentage":25},{"formula":"C5H12","percentage":25},{"formula":"C6H14","percentage":25},{"formula":"CH4","percentage":25}]`

### ipcc_venting → POST `/api/v1/calc/ipcc/venting`
- `vent_m3_ch4_co2`: volume=1000, unit=`m3`, composition=`[{"gas":"CH4","percentage":85},{"gas":"CO2","percentage":10},{"gas":"N2","percentage":5}]`
- `vent_mmscf_multi`: volume=0.25, unit=`MMSCF`, composition=`[{"gas":"CH4","percentage":50},{"gas":"C2H6","percentage":20},{"gas":"C3H8","percentage":15},{"gas":"CO2","percentage":15}]`
- `vent_m3_all_alkanes`: volume=800, unit=`m3`, composition=`[{"gas":"CH4","percentage":40},{"gas":"C2H6","percentage":20},{"gas":"C3H8","percentage":15},{"gas":"C4H10","percentage":10},{"gas":"C5H12","percentage":8},{"gas":"C6H14","percentage":7}]`

### ipcc_vehicular → POST `/api/v1/calc/ipcc/vehicular`
- `ipcc_veh_both`: diesel_liters=200, petrol_liters=50, diesel_factor=2.68, petrol_factor=2.31
- `ipcc_veh_diesel_only`: diesel_liters=500, petrol_liters=0, diesel_factor=2.7, petrol_factor=2.32

### ipcc_kitchen → POST `/api/v1/calc/ipcc/kitchen`
- `ipcc_kitchen_lpg_ng`: lpg_kg=40, ng_mmscf=0.5, ghv=1000, lpg_factor=1.51, natural_gas_co2=0.0544
- `ipcc_kitchen_lpg_only`: lpg_kg=120, ng_mmscf=0, ghv=1000, lpg_factor=1.51, natural_gas_co2=53.06

### ipcc_power → POST `/api/v1/calc/ipcc/power`
- `ipcc_power_mixed`: diesel_liters=100, ng_mmscf=0.2, ghv=1030, diesel_factor=2.68, natural_gas_co2=0.0544
- `ipcc_power_diesel_only`: diesel_liters=250, ng_mmscf=0, ghv=0, diesel_factor=2.7, natural_gas_co2=53.06

### ipcc_heating → POST `/api/v1/calc/ipcc/heating`
- `ipcc_heat_ng`: ng_mmscf=1.25, ghv=1037, natural_gas_co2=0.0544
- `ipcc_heat_default_factor`: ng_mmscf=2.0, ghv=1037, natural_gas_co2=53.06

### ipcc_road → POST `/api/v1/calc/ipcc/road`
- `ipcc_road_basic`: quantity=500, factor=0.192

### ipcc_road_vehicle → POST `/api/v1/calc/ipcc/road-vehicle`
- `ipcc_rv_ch4`: quantity=1000, ch4_factor=0.00005, n2o_factor=0.00003, selected_factor=`CH4`
- `ipcc_rv_n2o`: quantity=1000, ch4_factor=0.00005, n2o_factor=0.00003, selected_factor=`NO2`

### ipcc_usa_vehicles → POST `/api/v1/calc/ipcc/usa-vehicles`
- `ipcc_usa_basic`: quantity=250, factor=8.78
- `ipcc_usa_fractional`: quantity=42.5, factor=10.21

### ipcc_alt_fuel → POST `/api/v1/calc/ipcc/alt-fuel`
- `ipcc_alt_ch4`: quantity=1000, ch4_factor=0.00012, n2o_factor=0.00008, selected_factor=`CH4`
- `ipcc_alt_n2o`: quantity=1000, ch4_factor=0.00012, n2o_factor=0.00008, selected_factor=`N2O`

### ipcc_industry → POST `/api/v1/calc/ipcc/industry`
- `ipcc_ind_co2`: quantity=10, ef_co2=94.6, ef_ch4=1.0, ef_n2o=0.1, selected_factor=`CO2`
- `ipcc_ind_ch4`: quantity=10, ef_co2=94.6, ef_ch4=1.0, ef_n2o=0.1, selected_factor=`CH4`
- `ipcc_ind_n2o`: quantity=10, ef_co2=94.6, ef_ch4=1.0, ef_n2o=0.1, selected_factor=`N2O`
