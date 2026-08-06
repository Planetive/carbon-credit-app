# Blind backend formula run

Copy everything below the line into a **backend** Cursor chat (`carbon-credit-backend`).

Do **not** paste frontend results. Do **not** open or read any SPA parity files (`cases.json`, `frontend_results.json`, `spaMath.ts`, etc.).

---

## Task

For each input case below, run the backend formula **once** (`fastapi_app/ghg_calc/*` and/or live `POST /api/v1/calc/...` with JWT if available).

Return whatever number the backend actually produces. Nothing else.

### Hard rules

- **No expected values.** Do not invent targets. Do not check against fixtures. Do not “verify” or “assert”.
- **No comparison.** Do not compare to SPA, goldens, docs, or prior runs.
- **One authentic pass.** Compute each case once; report that result as-is.
- Do not round beyond what the backend already returns.
- Do not edit formulas to “make numbers nicer”.
- If a case fails, set `"emissions_kg": null` and `"error": "<message>"`.
- For `epa_refrigerant`, also include `leakage_kg` under `extra` if the backend returns it.
- Final answer = **only** this JSON (or JSON in a fenced block):

```json
{
  "side": "backend_ghg_calc",
  "generated_at": "<ISO timestamp>",
  "case_count": <number>,
  "results": [
    {
      "suite": "<suite_name>",
      "id": "<case_id>",
      "emissions_kg": <number or null>,
      "route": "</api/v1/calc/...>",
      "extra": {}
    }
  ]
}
```

## Input cases only

### uk_fuel → POST `/api/v1/calc/uk/fuel`
- `uk_qty10_factor_2_0627`: quantity=10, factor=2.0627
- `uk_qty1000_factor_0_18254`: quantity=1000, factor=0.18254
- `uk_round6_fractional`: quantity=3.141592, factor=1.234567

### epa_fuel → POST `/api/v1/calc/epa/fuel`
- `epa_co2_mmbtu`: quantity=100, factor=53.06, unit=`CO2 (kg CO2 / mmBtu)`
- `epa_ch4_g_per_mmbtu_div1000`: quantity=100, factor=3.0, unit=`CH4 (g CH4 / mmBtu)`
- `epa_n2o_g_per_gallon_div1000`: quantity=50, factor=0.2, unit=`N2O (g N2O / gallon)`

### mobile_fuel → POST `/api/v1/calc/epa/mobile-fuel`
- `mobile_gallon`: quantity=10, factor=8.78, input_unit=`gallon`
- `mobile_liter_to_gallon`: quantity=10, factor=8.78, input_unit=`liter`

### on_road_gasoline → POST `/api/v1/calc/epa/on-road-gasoline`
- `onroad_ch4_100mi`: distance=100, distance_unit=`mile`, ch4_g_per_mile=0.019, emission_selection=`ch4_only`
- `onroad_ch4_100km`: distance=100, distance_unit=`km`, ch4_g_per_mile=0.019, emission_selection=`ch4_only`

### on_road_diesel → POST `/api/v1/calc/epa/on-road-diesel`
- `diesel_ch4_explicit`: distance=200, distance_unit=`mile`, ch4_g_per_mile=0.0051, emission_selection=`ch4_only`

### non_road → POST `/api/v1/calc/epa/non-road`
- `nonroad_gallon_ch4`: quantity=10, unit=`gallon`, ch4_g_per_gallon=1.0, emission_selection=`ch4`
- `nonroad_liter_ch4`: quantity=10, unit=`liter`, ch4_g_per_gallon=1.0, emission_selection=`ch4`

### heat_steam → POST `/api/v1/calc/heat-steam`
- `heat_co2_mmbtu`: quantity=10, gas=`co2`, co2_factor=53.06
- `heat_ch4_mmbtu`: quantity=10, gas=`ch4`, ch4_factor=1.0
- `heat_mmscf_to_mmbtu`: quantity=1, quantity_unit=`mmscf`, gas=`co2`, co2_factor=53.06

### waste → POST `/api/v1/calc/waste`
- `waste_explicit`: volume=100, disposal_method=`Landfilled`, factor=0.05

### uk_passenger → POST `/api/v1/calc/uk/passenger`
- `passenger_explicit`: distance=50, factor=0.17068

### uk_delivery → POST `/api/v1/calc/uk/delivery`
- `delivery_explicit`: distance=100, factor=0.88246

### uk_refrigerant → POST `/api/v1/calc/uk/refrigerant`
- `refrig_explicit`: quantity=2.5, factor=1430

### electricity → POST `/api/v1/calc/electricity`
- `elec_grid_only_uae`: total_kwh=10000, grid_pct=100, grid_factor=0.4041
- `elec_grid_50_pakistan`: total_kwh=1000, grid_pct=50, grid_factor=0.425
- `elec_grid_plus_other`: total_kwh=1000, grid_pct=80, grid_factor=0.4041, other_pct=20, other_row_emissions_sum=0.5

### epa_refrigerant → POST `/api/v1/calc/epa/refrigerant`
- `epa_refrig_leakage_record`: method=`leakage_record`, gwp=1430, leakage_kg=2.5
- `epa_refrig_estimated`: method=`estimated_leakage`, gwp=3922, charge_kg=10, leakage_rate_percent=5

### freight → POST `/api/v1/calc/freight`
- `freight_basic`: distance=100, weight=2.5, co2_factor=0.12
- `freight_long_haul`: distance=1250.5, weight=18.75, co2_factor=0.0621

### business_travel → POST `/api/v1/calc/business-travel`
- `bt_km_factor`: distance=500, co2_factor=0.15678
- `bt_mile_factor_converted`: distance=100, co2_factor=0.25, unit=`kg CO2 / mile`

### employee_commuting → POST `/api/v1/calc/employee-commuting`
- `commute_km`: employees=40, distance=12.5, co2_factor=0.171
- `commute_mile_factor`: employees=10, distance=20, co2_factor=0.32, unit=`kg CO2e / passenger-mile`

### spend_based → POST `/api/v1/calc/spend-based`
- `spend_goods`: amount=25000, emission_factor=0.00042

### sold_products_qty → POST `/api/v1/calc/sold-products/qty-factor`
- `sold_qty_round6`: quantity=3.141592, factor=1.234567

### ipcc_stationary → POST `/api/v1/calc/ipcc/stationary`
- `ipcc_stat_basic`: quantity=100, factor=2.0627

### ipcc_vehicular → POST `/api/v1/calc/ipcc/vehicular`
- `ipcc_veh_both`: diesel_liters=200, petrol_liters=50, diesel_factor=2.68, petrol_factor=2.31

### ipcc_kitchen → POST `/api/v1/calc/ipcc/kitchen`
- `ipcc_kitchen_lpg_ng`: lpg_kg=40, ng_mmscf=0.5, ghv=1000, lpg_factor=1.51, natural_gas_co2=0.0544

### ipcc_power → POST `/api/v1/calc/ipcc/power`
- `ipcc_power_mixed`: diesel_liters=100, ng_mmscf=0.2, ghv=1030, diesel_factor=2.68, natural_gas_co2=0.0544

### ipcc_heating → POST `/api/v1/calc/ipcc/heating`
- `ipcc_heat_ng`: ng_mmscf=1.25, ghv=1037, natural_gas_co2=0.0544

### ipcc_road → POST `/api/v1/calc/ipcc/road`
- `ipcc_road_basic`: quantity=500, factor=0.192

### ipcc_road_vehicle → POST `/api/v1/calc/ipcc/road-vehicle`
- `ipcc_rv_ch4`: quantity=1000, ch4_factor=0.00005, n2o_factor=0.00003, selected_factor=`CH4`
- `ipcc_rv_n2o`: quantity=1000, ch4_factor=0.00005, n2o_factor=0.00003, selected_factor=`NO2`

### ipcc_industry → POST `/api/v1/calc/ipcc/industry`
- `ipcc_ind_co2`: quantity=10, ef_co2=94.6, ef_ch4=1.0, ef_n2o=0.1, selected_factor=`CO2`
- `ipcc_ind_ch4`: quantity=10, ef_co2=94.6, ef_ch4=1.0, ef_n2o=0.1, selected_factor=`CH4`
