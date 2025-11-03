# Climate Risk Scenario Analysis - Calculation Guide

## Overview

Climate Risk Scenario Analysis is a TCFD-compliant stress testing tool that helps banks understand how climate risks could impact their loan portfolio under different climate scenarios.

---

## Key Concepts

### 1. **Climate Scenarios**
The system supports three types of climate scenarios:

- **Transition Risk** (`transition`): Risks from transitioning to a low-carbon economy
  - Example: Increased regulations, carbon pricing, shift away from fossil fuels
  
- **Physical Risk** (`physical`): Risks from direct climate impacts
  - Example: Extreme weather events, floods, droughts, sea-level rise
  
- **Combined Risk** (`combined`): Both transition and physical risks together
  - This multiplies both risk multipliers

### 2. **Sector-Specific Multipliers**
Each sector has different vulnerability to climate risks:

| Sector Type | Transition Risk | Physical Risk | Example |
|------------|----------------|---------------|---------|
| Fossil Fuel Energy | High (1.6x) | Medium (1.1x) | Coal power plants |
| Renewable Energy | Low (0.9x) | Low (1.0x) | Solar, wind farms |
| Agriculture | Medium (1.2x) | High (1.4x) | Vulnerable to droughts |
| Financial Services | None (1.0x) | None (1.0x) | Less directly exposed |

---

## Core Metrics Explained

### 1. **Total Portfolio Value**
**What it is**: Sum of all loan/exposure amounts in your portfolio

**Formula**: 
```
Total Portfolio Value = Σ(Exposure Amount) for all entries
```

**Meaning**: Total amount of money you've lent out

---

### 2. **Baseline Risk (%)**
**What it is**: Current expected loss rate based on existing credit risk (PD × LGD)

**Formula**:
```
Baseline Expected Loss = Exposure × (PD / 100) × (LGD / 100)
Baseline Risk = (Baseline Expected Loss / Total Exposure) × 100
```

**Where**:
- `PD` = Probability of Default (from your portfolio data)
- `LGD` = Loss Given Default (from your portfolio data)

**Meaning**: Under normal conditions, what percentage of your portfolio do you expect to lose?

**Example**:
- Loan: ₹1,000,000
- PD: 2% (2% chance of default)
- LGD: 50% (if default happens, lose 50% of amount)
- Baseline Expected Loss = 1,000,000 × 0.02 × 0.50 = ₹10,000
- If total portfolio = ₹10,000,000
- Baseline Risk = (10,000 / 10,000,000) × 100 = **0.1%**

---

### 3. **Scenario Risk (%)**
**What it is**: Expected loss rate under climate stress conditions

**Formula**:
```
Step 1: Adjust PD for climate
  Adjusted PD = Baseline PD × PD Multiplier

Step 2: Adjust LGD for climate
  Adjusted LGD = Baseline LGD + LGD Change
  (capped at 100%)

Step 3: Calculate climate-adjusted expected loss
  Climate Adjusted Expected Loss = Exposure × (Adjusted PD / 100) × (Adjusted LGD / 100)

Step 4: Calculate scenario risk
  Scenario Risk = (Total Climate Adjusted Expected Loss / Total Exposure) × 100
```

**Where**:
- `PD Multiplier` = Sector-specific multiplier (e.g., 1.6 for fossil fuels in transition scenario)
- `LGD Change` = Additional LGD percentage from climate risks (e.g., +10% for agriculture)

**Meaning**: Under climate stress, what percentage of your portfolio might you lose?

**Example**:
- Same loan: ₹1,000,000, PD: 2%, LGD: 50%
- Sector: Fossil Fuel Energy
- Scenario: Transition Risk
- PD Multiplier: 1.6
- LGD Change: +10%

- Adjusted PD = 2% × 1.6 = **3.2%**
- Adjusted LGD = 50% + 10% = **60%**
- Climate Adjusted Expected Loss = 1,000,000 × 0.032 × 0.60 = ₹19,200
- If total portfolio = ₹10,000,000 and total climate loss = ₹192,000
- Scenario Risk = (192,000 / 10,000,000) × 100 = **1.92%**

---

### 4. **Risk Increase (%)**
**What it is**: Percentage increase in risk from baseline to scenario

**Formula**:
```
Risk Increase = ((Scenario Risk - Baseline Risk) / Baseline Risk) × 100
```

**Meaning**: By how much does your risk increase under climate stress?

**Example**:
- Baseline Risk: 0.1%
- Scenario Risk: 1.92%
- Risk Increase = ((1.92 - 0.1) / 0.1) × 100 = **1,820%**

This means risk increases by **18.2x** under climate stress!

---

### 5. **Expected Loss (Total Portfolio Loss)**
**What it is**: Total monetary amount you might lose under the scenario

**Formula**:
```
Total Expected Loss = Σ(Climate Adjusted Expected Loss) for all entries
```

**Meaning**: In rupees/currency, how much might you lose?

**Example**:
- If you have 10 loans, each with ₹19,200 expected loss
- Total Expected Loss = ₹192,000

---

### 6. **Loss Percentage**
**What it is**: Percentage of total portfolio value that represents expected loss

**Formula**:
```
Loss Percentage = (Total Expected Loss / Total Portfolio Value) × 100
```

**Meaning**: What percentage of your total portfolio might you lose?

**Example**:
- Total Expected Loss: ₹192,000
- Total Portfolio Value: ₹10,000,000
- Loss Percentage = (192,000 / 10,000,000) × 100 = **1.92%**

---

## Detailed Calculation Flow

### Step-by-Step Process

For each loan/entry in your portfolio:

1. **Get Sector Multipliers**
   ```
   If sector = "Steel & Iron":
     transition_pd_multiplier = 1.4
     physical_pd_multiplier = 1.2
     lgd_change = +12%
   ```

2. **Select Scenario Type**
   ```
   If scenario = "transition":
     pd_multiplier = transition_pd_multiplier (1.4)
   If scenario = "physical":
     pd_multiplier = physical_pd_multiplier (1.2)
   If scenario = "combined":
     pd_multiplier = transition_pd_multiplier × physical_pd_multiplier (1.4 × 1.2 = 1.68)
   ```

3. **Calculate Adjusted PD**
   ```
   Adjusted PD = Baseline PD × PD Multiplier
   Example: 2% × 1.4 = 2.8%
   ```

4. **Calculate Adjusted LGD**
   ```
   Adjusted LGD = Baseline LGD + LGD Change
   Example: 50% + 12% = 62%
   (Capped at 100%)
   ```

5. **Calculate Climate-Adjusted Expected Loss**
   ```
   CAEL = Exposure × (Adjusted PD) × (Adjusted LGD)
   Example: ₹1,000,000 × 0.028 × 0.62 = ₹17,360
   ```

6. **Calculate Baseline Expected Loss** (for comparison)
   ```
   Baseline EL = Exposure × (Baseline PD) × (Baseline LGD)
   Example: ₹1,000,000 × 0.02 × 0.50 = ₹10,000
   ```

7. **Calculate Loss Increase**
   ```
   Loss Increase = CAEL - Baseline EL
   Example: ₹17,360 - ₹10,000 = ₹7,360
   
   Loss Increase % = (Loss Increase / Baseline EL) × 100
   Example: (7,360 / 10,000) × 100 = 73.6%
   ```

8. **Aggregate Portfolio-Level Metrics**
   ```
   Total Exposure = Sum of all exposures
   Total Baseline EL = Sum of all baseline expected losses
   Total CAEL = Sum of all climate-adjusted expected losses
   
   Baseline Risk = (Total Baseline EL / Total Exposure) × 100
   Scenario Risk = (Total CAEL / Total Exposure) × 100
   ```

---

## Results Breakdown Components

### 1. **Top Risk Exposures**
Shows individual companies/loans with highest expected losses under the scenario.

**Sorted by**: Highest estimated loss (climate-adjusted expected loss)

**Shows**:
- Company name
- Sector
- Exposure amount
- Estimated loss (under scenario)

**Use**: Identify which specific loans are most at risk

---

### 2. **Sector Risk Breakdown**
Groups all loans by sector and shows aggregated risk per sector.

**Shows**:
- Sector name
- Total exposure in that sector
- Percentage of portfolio in that sector
- Total estimated loss for that sector

**Use**: Understand which sectors pose the most risk

**Example**:
- Steel & Iron: ₹5,000,000 exposure (50% of portfolio), ₹86,800 expected loss
- Banking: ₹5,000,000 exposure (50% of portfolio), ₹10,000 expected loss

---

### 3. **Asset Class Risk Breakdown**
Groups loans by asset class (loan type: Business Loan, Corporate Bond, etc.)

**Shows**:
- Asset class name
- Total exposure in that asset class
- Percentage of portfolio
- Total estimated loss

**Use**: Understand risk by loan type

---

## Real-World Interpretation

### Example Portfolio Analysis

**Portfolio**:
- 2 loans, each ₹1,000,000
- Company A: Steel & Iron sector, PD: 2%, LGD: 50%
- Company B: Banking sector, PD: 2%, LGD: 50%

**Transition Scenario Results**:

| Metric | Company A (Steel) | Company B (Banking) | Portfolio Total |
|--------|-------------------|---------------------|-----------------|
| Baseline Risk | 0.1% | 0.1% | 0.1% |
| Scenario Risk | 0.24% | 0.1% | 0.17% |
| Risk Increase | +140% | +0% | +70% |
| Expected Loss | ₹24,000 | ₹10,000 | ₹34,000 |

**Interpretation**:
- **Steel company risk increases significantly** (140% increase) because:
  - Steel industry faces high transition risk (decarbonization, carbon pricing)
  - PD multiplier: 1.4x increases default probability
  - LGD change: +12% increases loss severity
  
- **Banking company risk stays the same** because:
  - Financial services have no climate multipliers (1.0x)
  - Less directly exposed to climate transition
  
- **Overall portfolio risk increases by 70%**
  - Weighted average of both loans
  - Most risk concentrated in the steel loan

---

## Key Takeaways

1. **Baseline Risk**: Your current risk level (business as usual)
2. **Scenario Risk**: Your risk level under climate stress
3. **Risk Increase**: How much more risky your portfolio becomes
4. **Expected Loss**: Actual money you might lose (in currency)
5. **Loss Percentage**: What % of your portfolio you might lose

### When to Worry:
- **Risk Increase > 50%**: Moderate concern
- **Risk Increase > 100%**: Significant concern
- **Risk Increase > 200%**: High concern - portfolio may need restructuring

### Action Items:
1. **Identify high-risk sectors**: Focus on sectors with high multipliers
2. **Diversify portfolio**: Reduce concentration in vulnerable sectors
3. **Improve risk management**: Increase collateral, reduce exposure
4. **Engage with borrowers**: Help them transition to low-carbon models

---

## Technical Notes

### Formula Summary
```
CAEL = Exposure × (Baseline PD × PD Multiplier / 100) × ((Baseline LGD + LGD Change) / 100)
```

### Scenario Type Logic
- **Transition**: Uses `transition_pd_multiplier`
- **Physical**: Uses `physical_pd_multiplier`
- **Combined**: Uses `transition_pd_multiplier × physical_pd_multiplier`

### LGD Cap
Adjusted LGD is capped at 100% (you can't lose more than the loan amount)

### Percentage Conversions
- PD and LGD are stored as percentages (e.g., 2% = 2.0)
- In calculations, divide by 100 to get decimal (e.g., 2% → 0.02)
- Final results are converted back to percentages for display

---

## References

This implementation follows TCFD (Task Force on Climate-related Financial Disclosures) guidelines for climate scenario analysis in financial institutions.

**Key TCFD Concepts**:
- **Forward-looking assessment**: Projecting future climate impacts
- **Multiple scenarios**: Testing different climate outcomes
- **Sector-specific impacts**: Recognizing different vulnerabilities
- **Quantitative metrics**: Using financial risk metrics (PD, LGD, Expected Loss)

