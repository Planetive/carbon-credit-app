# Farhan Calculation Verification

## Input Data
- **Company**: Farhan
- **Sector**: Banking / Financial Services
- **Exposure Amount**: Rs 1,221
- **Scenario**: Combined (Dual Stress)

## Sector Multipliers for "Banking / Financial Services"
- **transition_pd_multiplier**: 1.0
- **physical_pd_multiplier**: 1.0
- **lgd_change**: 0.0

## Combined Scenario Calculation

### Step 1: Calculate PD Multiplier
```
m_C = m_T × m_P
m_C = 1.0 × 1.0 = 1.0
```

### Step 2: Calculate Adjusted PD
```
PD_C = PD₀ × m_C
PD_C = PD₀ × 1.0 = PD₀ (no change)
```

### Step 3: Calculate Adjusted LGD
```
LGD_C = LGD₀ + ΔLGD_T + ΔLGD_P
LGD_C = LGD₀ + 0.0 + 0.0 = LGD₀ (no change)
```

### Step 4: Calculate Expected Loss
```
EL_C = Exposure × PD_C × LGD_C
EL_C = 1,221 × PD₀ × LGD₀
```

## Verification

If Expected Loss = Rs 1, then:
```
1 = 1,221 × PD₀ × LGD₀
PD₀ × LGD₀ = 1 / 1,221 = 0.0008185
```

## Possible PD and LGD Combinations

| PD₀ | LGD₀ | PD × LGD | Expected Loss |
|-----|------|----------|---------------|
| 0.082% | 100% | 0.00082 | Rs 1.00 |
| 0.10% | 82% | 0.00082 | Rs 1.00 |
| 0.164% | 50% | 0.00082 | Rs 1.00 |
| 0.082% | 50% | 0.00041 | Rs 0.50 |

## Key Observation

**Banking / Financial Services sector has NO climate risk impact:**
- All multipliers = 1.0 (no PD increase)
- LGD change = 0.0 (no LGD increase)

**Therefore:**
- Climate-Adjusted Expected Loss = Baseline Expected Loss
- For Banking sector, scenario analysis shows baseline risk only
- No additional climate risk is applied

## Conclusion

If Farhan's Expected Loss = Rs 1, this means:
- Baseline Expected Loss = Rs 1
- Climate-Adjusted Expected Loss = Rs 1 (no change)
- PD₀ × LGD₀ ≈ 0.00082 (approximately 0.082% PD with 100% LGD, or other combinations)

**The calculation is CORRECT** - Banking sector has no climate multipliers, so the result equals baseline expected loss.

