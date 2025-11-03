# Climate Risk Scenario Analysis - Formulas Reference

This document explains all formulas used for calculating climate risk scenarios.
These formulas follow the standard methodology for climate-adjusted expected loss calculations.

---

## Core Formula (Common to All Scenarios)

The fundamental formula for calculating climate-adjusted expected loss is:

```
CAEL = Exposure × Adjusted PD × Adjusted LGD
```

Where:
- **CAEL** = Climate-Adjusted Expected Loss (the risk amount)
- **Exposure** = Loan/Investment amount (in currency)
- **Adjusted PD** = Probability of Default adjusted for climate risks
- **Adjusted LGD** = Loss Given Default adjusted for climate risks

---

## Scenario-Specific Formulas

### 1. **Transition Risk Scenario** (`transition`)

**Purpose**: Models risks from transitioning to a low-carbon economy (policy changes, carbon pricing, technology shifts)

**PD Multiplier Selection**:
```
PD Multiplier = transition_pd_multiplier
```

**Formulas**:
```
Step 1: Convert baseline PD to decimal
  Baseline PD (decimal) = Baseline PD (%) ÷ 100

Step 2: Adjust PD for transition risk
  Adjusted PD (decimal) = Baseline PD (decimal) × transition_pd_multiplier

Step 3: Convert LGD change to decimal
  ΔLGD_T (decimal) = lgd_change (%) ÷ 100

Step 4: Adjust LGD for transition risk (absolute addition)
  Adjusted LGD (decimal) = Baseline LGD (decimal) + ΔLGD_T
  (Capped at 1.0 = 100%)

Step 5: Calculate Climate-Adjusted Expected Loss
  CAEL = Exposure × Adjusted PD × Adjusted LGD

Step 6: Calculate Baseline Expected Loss (for comparison)
  Baseline EL = Exposure × Baseline PD (decimal) × Baseline LGD (decimal)

Step 7: Calculate Loss Increase
  Loss Increase = CAEL - Baseline EL
  Loss Increase % = (Loss Increase ÷ Baseline EL) × 100
```

**Example**:
- Exposure: ₹1,000,000
- Sector: Steel & Iron
- Baseline PD: 2%
- Baseline LGD: 50%
- transition_pd_multiplier: 1.4
- lgd_change: +12%

```
Baseline PD (decimal) = 2% ÷ 100 = 0.02
Adjusted PD = 0.02 × 1.4 = 0.028 (2.8%)
ΔLGD_T (decimal) = 12% ÷ 100 = 0.12
Adjusted LGD = 0.50 + 0.12 = 0.62 (62%)

CAEL = 1,000,000 × 0.028 × 0.62 = ₹17,360
Baseline EL = 1,000,000 × 0.02 × 0.50 = ₹10,000

Loss Increase = 17,360 - 10,000 = ₹7,360
Loss Increase % = (7,360 ÷ 10,000) × 100 = 73.6%
```

---

### 2. **Physical Risk Scenario** (`physical`)

**Purpose**: Models risks from direct climate impacts (extreme weather, floods, droughts, sea-level rise)

**PD Multiplier Selection**:
```
PD Multiplier = physical_pd_multiplier
```

**Formulas**:
```
Step 1: Convert baseline PD to decimal
  Baseline PD (decimal) = Baseline PD (%) ÷ 100

Step 2: Adjust PD for physical risk
  Adjusted PD (decimal) = Baseline PD (decimal) × physical_pd_multiplier

Step 3: Convert LGD change to decimal
  ΔLGD_P (decimal) = lgd_change (%) ÷ 100

Step 4: Adjust LGD for physical risk (absolute addition)
  Adjusted LGD (decimal) = Baseline LGD (decimal) + ΔLGD_P
  (Capped at 1.0 = 100%)

Step 5: Calculate Climate-Adjusted Expected Loss
  CAEL = Exposure × Adjusted PD × Adjusted LGD

Step 6: Calculate Baseline Expected Loss (for comparison)
  Baseline EL = Exposure × Baseline PD (decimal) × Baseline LGD (decimal)

Step 7: Calculate Loss Increase
  Loss Increase = CAEL - Baseline EL
  Loss Increase % = (Loss Increase ÷ Baseline EL) × 100
```

**Example**:
- Exposure: ₹1,000,000
- Sector: Agriculture
- Baseline PD: 2%
- Baseline LGD: 50%
- physical_pd_multiplier: 1.4
- lgd_change: +20%

```
Baseline PD (decimal) = 2% ÷ 100 = 0.02
Adjusted PD = 0.02 × 1.4 = 0.028 (2.8%)
ΔLGD_P (decimal) = 20% ÷ 100 = 0.20
Adjusted LGD = 0.50 + 0.20 = 0.70 (70%)

CAEL = 1,000,000 × 0.028 × 0.70 = ₹19,600
Baseline EL = 1,000,000 × 0.02 × 0.50 = ₹10,000

Loss Increase = 19,600 - 10,000 = ₹9,600
Loss Increase % = (9,600 ÷ 10,000) × 100 = 96%
```

---

### 3. **Combined Risk Scenario** (`combined`)

**Purpose**: Models both transition and physical risks simultaneously (worst-case scenario)

**PD Multiplier Selection**:
```
PD Multiplier = transition_pd_multiplier × physical_pd_multiplier
```

**Formulas**:
```
Step 1: Convert baseline PD to decimal
  Baseline PD (decimal) = Baseline PD (%) ÷ 100

Step 2: Calculate combined PD multiplier
  PD Multiplier = transition_pd_multiplier × physical_pd_multiplier

Step 3: Adjust PD for combined risk
  Adjusted PD (decimal) = Baseline PD (decimal) × PD Multiplier

Step 4: Convert LGD changes to decimals
  ΔLGD_T (decimal) = lgd_change (%) ÷ 100 (transition LGD change)
  ΔLGD_P (decimal) = lgd_change (%) ÷ 100 (physical LGD change)

Step 5: Adjust LGD for combined risk (sum of both changes)
  Adjusted LGD (decimal) = Baseline LGD (decimal) + ΔLGD_T + ΔLGD_P
  (Capped at 1.0 = 100%)

Step 6: Calculate Climate-Adjusted Expected Loss
  CAEL = Exposure × Adjusted PD × Adjusted LGD

Step 7: Calculate Baseline Expected Loss (for comparison)
  Baseline EL = Exposure × Baseline PD (decimal) × Baseline LGD (decimal)

Step 8: Calculate Loss Increase
  Loss Increase = CAEL - Baseline EL
  Loss Increase % = (Loss Increase ÷ Baseline EL) × 100
```

**Example**:
- Exposure: ₹1,000,000
- Sector: Steel & Iron
- Baseline PD: 2%
- Baseline LGD: 50%
- transition_pd_multiplier: 1.4
- physical_pd_multiplier: 1.2
- lgd_change: +12%

```
Baseline PD (decimal) = 2% ÷ 100 = 0.02
PD Multiplier (m_C) = 1.4 × 1.2 = 1.68
Adjusted PD (PD_C) = 0.02 × 1.68 = 0.0336 (3.36%)
ΔLGD_T (decimal) = 12% ÷ 100 = 0.12
ΔLGD_P (decimal) = 12% ÷ 100 = 0.12
Adjusted LGD (LGD_C) = 0.50 + 0.12 + 0.12 = 0.74 (74%)

CAEL = 1,000,000 × 0.0336 × 0.74 = ₹24,864
Baseline EL = 1,000,000 × 0.02 × 0.50 = ₹10,000

Loss Increase = 24,864 - 10,000 = ₹14,864
Loss Increase % = (14,864 ÷ 10,000) × 100 = 148.64%
```

---

## Portfolio-Level Aggregation Formulas

After calculating individual loan risks, portfolio-level metrics are calculated:

### Total Exposure
```
Total Exposure = Σ(Exposure) for all portfolio entries
```

### Total Baseline Expected Loss
```
Total Baseline EL = Σ(Baseline EL) for all portfolio entries
```

### Total Climate-Adjusted Expected Loss
```
Total CAEL = Σ(CAEL) for all portfolio entries
```

### Portfolio-Level Risk Metrics

**Baseline Risk**:
```
Baseline Risk (%) = (Total Baseline EL ÷ Total Exposure) × 100
```

**Scenario Risk**:
```
Scenario Risk (%) = (Total CAEL ÷ Total Exposure) × 100
```

**Total Loss Increase**:
```
Total Loss Increase = Total CAEL - Total Baseline EL
Total Loss Increase % = (Total Loss Increase ÷ Total Baseline EL) × 100
```

**Risk Increase**:
```
Risk Increase (%) = ((Scenario Risk - Baseline Risk) ÷ Baseline Risk) × 100
```

**Loss Percentage**:
```
Loss Percentage (%) = (Total CAEL ÷ Total Exposure) × 100
```

---

## Formula Summary Table

| Component | Transition | Physical | Combined |
|-----------|-----------|----------|----------|
| **PD Multiplier** | `transition_pd_multiplier` | `physical_pd_multiplier` | `transition_pd_multiplier × physical_pd_multiplier` |
| **Adjusted PD** | `Baseline PD × transition_mult` | `Baseline PD × physical_mult` | `Baseline PD × (trans_mult × phys_mult)` |
| **Adjusted LGD** | `Baseline LGD + ΔLGD_T` | `Baseline LGD + ΔLGD_P` | `Baseline LGD + ΔLGD_T + ΔLGD_P` |
| **LGD Cap** | `min(Adjusted LGD, 1.0)` | `min(Adjusted LGD, 1.0)` | `min(Adjusted LGD, 1.0)` |
| **CAEL Formula** | `Exposure × Adj PD × Adj LGD` | `Exposure × Adj PD × Adj LGD` | `Exposure × Adj PD × Adj LGD` |

---

## Sector-Specific Parameters

Each sector has three parameters stored in `sector_multipliers`:

1. **`transition_pd_multiplier`**: Multiplier for transition risk (typically 0.9 to 1.6)
2. **`physical_pd_multiplier`**: Multiplier for physical risk (typically 1.0 to 1.4)
3. **`lgd_change`**: Additional LGD percentage points (typically 0% to 20%)

### Example Sector Multipliers

| Sector | Transition Mult | Physical Mult | LGD Change |
|--------|----------------|---------------|-------------|
| Fossil Fuel Energy | 1.6 | 1.1 | +10% |
| Renewable Energy | 0.9 | 1.0 | 0% |
| Agriculture | 1.2 | 1.4 | +20% |
| Financial Services | 1.0 | 1.0 | 0% |
| Steel & Iron | 1.4 | 1.2 | +12% |

---

## Important Notes

### 1. **LGD Capping**
Adjusted LGD is capped at 100% (1.0 decimal):
```
Transition: Adjusted LGD = min(LGD₀ + ΔLGD_T, 1.0)
Physical: Adjusted LGD = min(LGD₀ + ΔLGD_P, 1.0)
Combined: Adjusted LGD = min(LGD₀ + ΔLGD_T + ΔLGD_P, 1.0)
```

This ensures you can't lose more than the full loan amount.

**Note**: LGD changes are **absolute additions**, not percentage increases.
- Example: 40% LGD with +10% (0.10) change → 0.40 + 0.10 = 0.50 (50%)
- For combined scenario: 40% + 0.10 + 0.10 = 0.60 (60%)

### 2. **Percentage Conversions**
- Input PD and LGD are percentages (e.g., 2% = 2.0)
- Calculations use decimals (e.g., 2% = 0.02)
- Final outputs are converted back to percentages for display

### 3. **Combined Scenario**
The combined scenario multiplies both PD multipliers, making it more severe than either individual scenario:
```
Combined PD Multiplier ≥ max(Transition, Physical)
```

For example:
- Transition: 1.4x
- Physical: 1.2x
- Combined: 1.4 × 1.2 = **1.68x** (worse than either alone)

### 4. **Division by Zero Protection**
All formulas check for division by zero:
```
Loss Increase % = (Loss Increase ÷ Baseline EL) × 100  [if Baseline EL > 0]
Risk Increase = ((Scenario Risk - Baseline Risk) ÷ Baseline Risk) × 100  [if Baseline Risk > 0]
```

### 5. **Rounding and Precision**
- Intermediate calculations use full precision
- Final displayed values are rounded to 2 decimal places for percentages
- Currency values are rounded to whole numbers

---

## Calculation Flow Diagram

```
For each portfolio entry:
├── Get sector multipliers
│   ├── transition_pd_multiplier
│   ├── physical_pd_multiplier
│   └── lgd_change
│
├── Select scenario type
│   ├── transition → use transition_pd_multiplier
│   ├── physical → use physical_pd_multiplier
│   └── combined → use transition × physical
│
├── Calculate Adjusted PD
│   └── Adjusted PD = Baseline PD × PD Multiplier
│
├── Calculate Adjusted LGD
│   ├── Transition: LGD = LGD₀ + ΔLGD_T
│   ├── Physical: LGD = LGD₀ + ΔLGD_P
│   └── Combined: LGD = LGD₀ + ΔLGD_T + ΔLGD_P (capped at 100%)
│
├── Calculate Expected Losses
│   ├── Baseline EL = Exposure × Baseline PD × Baseline LGD
│   └── Climate EL = Exposure × Adjusted PD × Adjusted LGD
│
└── Calculate Metrics
    ├── Loss Increase = Climate EL - Baseline EL
    └── Loss Increase % = (Loss Increase ÷ Baseline EL) × 100

Aggregate portfolio-level:
├── Total Exposure = Σ(Exposure)
├── Total Baseline EL = Σ(Baseline EL)
├── Total Climate EL = Σ(Climate EL)
├── Baseline Risk = (Total Baseline EL ÷ Total Exposure) × 100
├── Scenario Risk = (Total Climate EL ÷ Total Exposure) × 100
└── Risk Increase = ((Scenario Risk - Baseline Risk) ÷ Baseline Risk) × 100
```

---

## Validation Examples

### Example 1: Low-Risk Sector (Financial Services)
- Exposure: ₹1,000,000
- Baseline PD: 2%, LGD: 50%
- Sector: Financial Services (multipliers: 1.0, 1.0, 0%)

**Transition Scenario**:
```
Adjusted PD = 0.02 × 1.0 = 0.02 (2%)
Adjusted LGD = 0.50 + 0.0 = 0.50 (50%)
CAEL = 1,000,000 × 0.02 × 0.50 = ₹10,000
Baseline EL = ₹10,000
Loss Increase = 0%
```
✅ **No change** - Financial services not directly exposed to climate risks

### Example 2: High-Risk Sector (Fossil Fuels)
- Exposure: ₹1,000,000
- Baseline PD: 2%, LGD: 50%
- Sector: Fossil Fuel (multipliers: 1.6, 1.1, +10%)

**Transition Scenario**:
```
Adjusted PD = 0.02 × 1.6 = 0.032 (3.2%)
Adjusted LGD = 0.50 + 0.10 = 0.60 (60%)
CAEL = 1,000,000 × 0.032 × 0.60 = ₹19,200
Baseline EL = ₹10,000
Loss Increase = 92%
```
✅ **High increase** - Fossil fuels highly vulnerable to transition risk

---

## References

- **TCFD Guidelines**: Task Force on Climate-related Financial Disclosures
- **PCAF Methodology**: Partnership for Carbon Accounting Financials
- **Basel Framework**: Credit risk capital requirements (PD × LGD × EAD)

These formulas align with international standards for climate stress testing in financial institutions.

