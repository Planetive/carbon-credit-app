# ESG Automated Scoring System - Technical Documentation

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Scoring Methodology](#scoring-methodology)
4. [Question-Level Scoring Logic](#question-level-scoring-logic)
5. [Section Score Calculation](#section-score-calculation)
6. [Recommendation Generation](#recommendation-generation)
7. [Configuration](#configuration)
8. [Integration](#integration)
9. [Data Flow](#data-flow)
10. [Examples](#examples)

---

## Overview

The ESG Automated Scoring System replaces manual admin scoring with an intelligent, rule-based engine that automatically evaluates ESG assessments and generates scores, recommendations, and insights.

### Key Features
- **Automatic Scoring**: Calculates scores for all 26 questions (7 Environmental, 12 Social, 7 Governance)
- **Data-Driven Analysis**: Generates contextual recommendations based on actual response data
- **Weighted Calculations**: Uses industry-standard weightages for section and overall scores
- **Empty Field Handling**: Only scores questions with provided data
- **Instant Results**: Scores are calculated and saved immediately upon assessment submission

### Benefits
- ✅ Eliminates manual admin intervention
- ✅ Consistent scoring across all assessments
- ✅ Transparent and auditable scoring logic
- ✅ Instant feedback for users
- ✅ Configurable thresholds and benchmarks

---

## System Architecture

### Components

```
┌─────────────────────────────────────────────────────────┐
│                    User Submits Assessment              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│         ESGHealthCheck.tsx (saveToDatabase)            │
│  - Validates data                                        │
│  - Saves to esg_assessments table                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│         calculateESGScore() Function                    │
│  - Converts form data to ESGAssessmentData              │
│  - Calls scoring engine                                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│         esgScoringEngine.ts                             │
│  ┌──────────────────────────────────────────────┐     │
│  │  Question-Level Scoring Functions             │     │
│  │  - scoreEnvironmentalQ1-Q7()                   │     │
│  │  - scoreSocialQ1-Q12()                        │     │
│  │  - scoreGovernanceQ1-Q7()                     │     │
│  └──────────────────────────────────────────────┘     │
│  ┌──────────────────────────────────────────────┐     │
│  │  Section Score Calculation                    │     │
│  │  - calculateSectionScore()                    │     │
│  └──────────────────────────────────────────────┘     │
│  ┌──────────────────────────────────────────────┐     │
│  │  Recommendation Generation                    │     │
│  │  - generateRecommendations()                 │     │
│  └──────────────────────────────────────────────┘     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│         Save to esg_scores Table                       │
│  - Question scores (e_q1_score, s_q1_score, etc.)      │
│  - Section totals (environmental_total_score, etc.)    │
│  - Overall score                                        │
│  - Recommendations                                      │
└─────────────────────────────────────────────────────────┘
```

### File Structure

```
src/
├── utils/
│   ├── esgScoringEngine.ts          # Main scoring engine
│   └── esgScoringConfig.ts           # Configurable thresholds
├── pages/
│   ├── ESGHealthCheck.tsx           # Assessment form
│   └── ESGResults.tsx               # Results display
└── supabase/
    └── migrations/
        └── 20250725_create_esg_scores_table.sql
```

---

## Scoring Methodology

### Scoring Scale

Each question is scored on a **1-3 scale**:
- **1**: Below average / Needs improvement
- **2**: Average / Meets basic requirements  
- **3**: Above average / Best practice

### Section Weightages

The overall ESG score uses weighted averages:

| Section | Weight | Questions | Total Question Weight |
|---------|--------|-----------|---------------------|
| Environmental | 30% | 7 | 30% |
| Social | 35% | 12 | 35% |
| Governance | 35% | 7 | 35% |

### Question Weightages Within Sections

**Environmental (30% total):**
- Q1: 5% (GHG Emissions)
- Q2: 4% (Energy Efficiency)
- Q3: 4% (Water Management)
- Q4: 4% (Waste Management)
- Q5: 4% (Environmental Operations)
- Q6: 5% (Environmental Oversight)
- Q7: 4% (Sustainable Sourcing)

**Social (35% total):**
- Q1-Q11: 3% each
- Q12: 2%

**Governance (35% total):**
- Q1-Q7: 5% each

### Empty Field Handling

- Questions with **no data** return `null` (not scored)
- Section scores only include answered questions
- Empty sections return **0%** (not a calculated percentage)
- Overall score adjusts based on completed sections

---

## Question-Level Scoring Logic

### Environmental Questions

#### E-Q1: GHG Emissions
**Scoring Logic:**
```typescript
- Has baseline + reduction initiatives + emissions data = 3
- Has baseline + (reduction OR emissions) = 2
- Has baseline OR emissions OR reduction = 2
- No data = null
```

**Data Check:** `ghg_baseline`, `ghg_emissions`, `ghg_reduction_initiatives`

#### E-Q2: Energy Efficiency
**Scoring Logic:**
```typescript
- No energy visibility = 1
- Renewable ≥50% AND fossil ≤20% = 3
- Renewable ≥25% AND fossil ≤40% = 2
- Has visibility = 2
```

**Thresholds:**
- Excellent: ≥50% renewable, ≤20% fossil
- Good: ≥25% renewable, ≤40% fossil

#### E-Q3: Water Management
**Scoring Logic:**
```typescript
- Reclamation rate ≥50% = 3
- Reclamation rate ≥25% = 2
- Reclamation rate <25% = 1
- No data = null
```

**Calculation:** `(water_reclaimed / water_withdrawal) × 100`

#### E-Q4: Waste Management
**Scoring Logic:**
```typescript
- Waste treatment ≥80% = 3
- Waste treatment ≥50% = 2
- Waste treatment <50% = 1
- No data = null
```

#### E-Q5: Environmental Operations
**Scoring Logic:**
```typescript
- 4+ policies = 3
- 2-3 policies = 2
- 1 policy = 2
- 0 policies = 1
```

**Policies Counted:**
- Environmental Policy
- Waste Management Policy
- Energy Management Policy
- Water Management Policy
- Recycling Policy

#### E-Q6: Environmental Oversight
**Scoring Logic:**
```typescript
- Board AND management oversight = 3
- Board OR management oversight = 2
- No oversight = 1
```

#### E-Q7: Sustainable Sourcing
**Scoring Logic:**
```typescript
- Has policy = 3
- No policy = 1
- No data = null
```

---

### Social Questions

#### S-Q1: Pay Ratios (Gender Equity)
**Scoring Logic:**
```typescript
- Female/Male ratio ≥95% = 3 (within 5% is excellent)
- Female/Male ratio ≥85% = 2 (within 15% is acceptable)
- Female/Male ratio <85% = 1
- No data = null
```

**Calculation:** `(median_female_compensation / median_male_compensation) × 100`

#### S-Q2: CEO Pay Ratio
**Scoring Logic:**
```typescript
- Ratio ≤20:1 = 3 (more equitable)
- Ratio ≤50:1 = 2
- Ratio >50:1 = 1
- Reports ratio = +1 bonus (max 3)
```

#### S-Q3: Turnover
**Scoring Logic:**
```typescript
- Average turnover ≤10% = 3 (excellent retention)
- Average turnover ≤20% = 2 (good retention)
- Average turnover >20% = 1
- No data = 1
```

**Calculation:** Average of full-time, part-time, and consultant turnover rates

#### S-Q4: Gender Diversity and Inclusion
**Scoring Logic:**
```typescript
- Has policy = required
- Senior women ≥40% = 3
- Senior women ≥30% = 2
- Overall 40-60% women = 3
- Overall 30-70% women = 2
- Has differently abled workforce = +1 bonus
- No policy = 1
```

#### S-Q5: Temporary Workers Ratio
**Scoring Logic:**
```typescript
- Temporary workers ≤10% = 3
- Temporary workers ≤25% = 2
- Temporary workers >25% = 1
```

**Calculation:** `((temporary_workers + consultants) / total_headcount) × 100`

#### S-Q6: Harassment, Discrimination and Grievance
**Scoring Logic:**
```typescript
- Has policy AND grievance mechanism = 2 (base)
- Resolution rate ≥90% = 3
- Resolution rate ≥70% = 2
- No policy AND no grievance = 1
```

#### S-Q7: Health and Safety
**Scoring Logic:**
```typescript
- Has policy AND HSE system = 3 (base)
- TRIR ≤1.0 = 3
- TRIR ≤3.0 = 2
- Fatalities >0 = 1 (critical)
- LTIs >0 = max 2
- No policy = 1
```

#### S-Q8: Child and Forced Labor
**Scoring Logic:**
```typescript
- Has policy = 3
- No policy = 1
- No data = null
```

#### S-Q9: Human Rights
**Scoring Logic:**
```typescript
- Has policy = 3
- No policy = 1
- No data = null
```

#### S-Q10: Employee Training and Succession Planning
**Scoring Logic:**
```typescript
- Personnel trained >0 = 2 (base)
- Women promotion 40-60% = 3
- Women promotion ≥30% = 2
- No training = 1
```

#### S-Q11: CSR
**Scoring Logic:**
```typescript
- CSR spending ≥2% = 3
- CSR spending ≥1% = 2
- CSR spending <1% = 1
- No data = 1
```

#### S-Q12: Marketing
**Scoring Logic:**
```typescript
- Has policy = 3
- No policy = 1
- No data = null
```

---

### Governance Questions

#### G-Q1: Board Diversification, Independence and Competence
**Scoring Logic:**
```typescript
- Independence ≥50% = 3
- Independence ≥30% = 2
- Women ≥30% = 3
- Women ≥20% = 2
- Has ESG certified members = +1 bonus
- CEO prohibited from board = +1 bonus
- Max score = 3
```

#### G-Q2: ESG Performance Incentivization
**Scoring Logic:**
```typescript
- Executives incentivized = 3
- Not incentivized = 1
- No data = null
```

#### G-Q3: Voice of Employees
**Scoring Logic:**
```typescript
- Has workers union = 3
- No union = 1
- No data = null
```

#### G-Q4: Supplier Code of Conduct
**Scoring Logic:**
```typescript
- Has code = required
- Compliance ≥80% = 3
- Compliance ≥50% = 2
- Compliance <50% = 1
- No code = 1
```

#### G-Q5: Sustainability Disclosures
**Scoring Logic:**
```typescript
- 4+ disclosure practices = 3
- 2-3 practices = 2
- 1 practice = 2
- 0 practices = 1
```

**Practices Counted:**
- UN SDGs focus
- Sustainability report
- Reporting framework
- Regulatory filing
- Third-party assurance

#### G-Q6: Ethics and Anti-Corruption Governance
**Scoring Logic:**
```typescript
- Has policy AND regular review = 3
- Has policy = 2
- No policy = 1
```

#### G-Q7: Data Privacy
**Scoring Logic:**
```typescript
- Has policy = 3
- No policy = 1
- No data = null
```

---

## Section Score Calculation

### Formula

For each section (Environmental, Social, Governance):

```typescript
calculateSectionScore(scores, questionPercentages, sectionWeight) {
  totalWeightedScore = 0
  totalWeight = 0
  
  for each question:
    if score !== null:  // Only count answered questions
      totalWeightedScore += score × questionPercentage
      totalWeight += questionPercentage
  
  if totalWeight === 0:
    return 0  // No questions answered
  
  // Calculate percentage: weighted score / (total weight × 3)
  return (totalWeightedScore / (totalWeight × 3)) × 100
}
```

### Example Calculation

**Environmental Section:**
- Q1 scored: 3 (weight: 5%)
- Q2 scored: 2 (weight: 4%)
- Q3-Q7: null (not answered)

```
totalWeightedScore = (3 × 0.05) + (2 × 0.04) = 0.15 + 0.08 = 0.23
totalWeight = 0.05 + 0.04 = 0.09
score = 0.23 / (0.09 × 3) = 0.23 / 0.27 = 0.852 = 85.2%
```

### Overall Score Calculation

```typescript
overallScore = (Environmental × 0.30) + (Social × 0.35) + (Governance × 0.35)
```

---

## Recommendation Generation

### Data-Driven Analysis

The recommendation engine analyzes actual response values to generate contextual insights:

#### Strengths Identification
- Highlights specific achievements with metrics
- Example: "Excellent renewable energy adoption: 65% from renewable sources"
- Example: "Strong gender pay equity: 97% pay ratio"

#### Improvement Areas
- Provides actionable, measurable recommendations
- Example: "Increase renewable energy usage - aim for at least 25% renewable energy"
- Example: "Address gender pay gaps - aim for at least 95% pay equity between genders"

#### Empty Section Handling
- Detects incomplete sections
- Provides specific guidance: "Complete the governance section of the assessment to receive specific recommendations"

### Recommendation Categories

1. **Environmental Recommendations**
   - GHG emissions tracking and reduction
   - Energy efficiency and renewable adoption
   - Water and waste management
   - Policy framework development

2. **Social Recommendations**
   - Pay equity and compensation
   - Diversity and inclusion
   - Health and safety
   - Employee relations

3. **Governance Recommendations**
   - Board composition and independence
   - ESG incentivization
   - Sustainability reporting
   - Ethics and compliance

4. **Overall Recommendations**
   - Section prioritization
   - Completion status
   - Performance benchmarking

---

## Configuration

### Thresholds Configuration

All scoring thresholds are configurable in `src/utils/esgScoringConfig.ts`:

```typescript
export const ESGScoringConfig = {
  environmental: {
    renewableEnergy: {
      excellent: 50,  // ≥50% = score 3
      good: 25,       // ≥25% = score 2
    },
    fossilFuel: {
      excellent: 20,  // ≤20% = score 3
      good: 40,       // ≤40% = score 2
    },
    waterReclamation: {
      excellent: 50,
      good: 25,
    },
    wasteTreatment: {
      excellent: 80,
      good: 50,
    },
    // ... more thresholds
  },
  social: {
    payEquity: {
      excellent: 95,  // ≥95% = score 3
      good: 85,       // ≥85% = score 2
    },
    // ... more thresholds
  },
  governance: {
    boardIndependence: {
      excellent: 50,
      good: 30,
    },
    // ... more thresholds
  }
}
```

### Adjusting Thresholds

To modify scoring criteria:

1. Open `src/utils/esgScoringConfig.ts`
2. Update threshold values
3. Changes apply to all new assessments automatically

---

## Integration

### Assessment Submission Flow

```typescript
// In ESGHealthCheck.tsx

const handleSubmitFinal = async () => {
  const success = await saveToDatabase(false);
  if (success) {
    setTimeout(() => navigate('/esg-results'), 500);
  }
};

const saveToDatabase = async (isDraft: boolean) => {
  // 1. Save assessment data
  const result = await supabase
    .from('esg_assessments')
    .insert([assessmentData])
    .select()
    .single();
  
  // 2. If submitting (not draft), calculate scores
  if (!isDraft && assessmentId) {
    // Convert form data to scoring format
    const assessmentDataForScoring: ESGAssessmentData = { /* ... */ };
    
    // 3. Calculate scores automatically
    const scoringResult = calculateESGScore(assessmentDataForScoring);
    
    // 4. Save scores to database
    await supabase
      .from('esg_scores')
      .upsert({
        user_id: user.id,
        assessment_id: assessmentId,
        ...scoringResult,
        scored_by: 'Automated System',
        scored_at: new Date().toISOString()
      });
  }
};
```

### Database Schema

**esg_scores Table:**
```sql
- Question scores: e_q1_score through g_q7_score (INTEGER, 1-3 or NULL)
- Section totals: environmental_total_score, social_total_score, 
  governance_total_score (DECIMAL 0-100)
- Overall score: overall_score (DECIMAL 0-100)
- Recommendations: environmental_strengths, environmental_improvements, etc. (TEXT)
- Metadata: scored_by, scored_at, updated_at
```

---

## Data Flow

### Complete Flow Diagram

```
1. User fills assessment form
   ↓
2. User clicks "Submit Assessment"
   ↓
3. saveToDatabase(false) called
   ↓
4. Assessment saved to esg_assessments table
   │   - status = 'submitted'
   │   - submitted_at = current timestamp
   ↓
5. Form data converted to ESGAssessmentData format
   ↓
6. calculateESGScore() called
   │   ├─ Score each question (1-3 or null)
   │   ├─ Calculate section scores (0-100%)
   │   ├─ Calculate overall score (0-100%)
   │   └─ Generate recommendations
   ↓
7. Scores saved to esg_scores table
   │   - All question scores
   │   - Section totals
   │   - Overall score
   │   - Recommendations
   │   - scored_by = 'Automated System'
   ↓
8. User redirected to /esg-results
   ↓
9. Results page displays scores and recommendations
```

---

## Examples

### Example 1: Complete Assessment

**Input Data:**
- GHG baseline: Yes
- GHG emissions: 1,500 tCO2e
- Reduction initiatives: Yes
- Renewable energy: 60%
- Waste treatment: 85%
- 5 environmental policies

**Scoring:**
- E-Q1: 3 (has baseline, emissions, reduction)
- E-Q2: 3 (60% renewable > 50% threshold)
- E-Q4: 3 (85% treatment > 80% threshold)
- E-Q5: 3 (5 policies ≥ 4)

**Result:**
- Environmental Score: ~85%
- Recommendation: "Excellent renewable energy adoption: 60% from renewable sources"

### Example 2: Partial Assessment (Empty Governance)

**Input Data:**
- Environmental: Fully completed
- Social: Fully completed
- Governance: Empty (no data)

**Scoring:**
- Environmental: 75%
- Social: 68%
- Governance: 0% (no questions answered)

**Result:**
- Overall Score: 48% (weighted average of E and S only)
- Governance Recommendation: "Complete the governance section of the assessment to receive specific recommendations"

### Example 3: Low Performance Areas

**Input Data:**
- Renewable energy: 10%
- Gender pay ratio: 75%
- Board independence: 20%

**Scoring:**
- E-Q2: 1 (10% < 25% threshold)
- S-Q1: 1 (75% < 85% threshold)
- G-Q1: 1 (20% < 30% threshold)

**Recommendations:**
- "Increase renewable energy usage - aim for at least 25% renewable energy"
- "Address gender pay gaps - aim for at least 95% pay equity between genders"
- "Increase board independence (currently 20% - aim for 50%+)"

---

## Technical Details

### Helper Functions

**parseNumber(value):**
- Converts string to number
- Returns null if empty or invalid

**parseYesNo(value):**
- Converts "yes"/"no" to boolean
- Returns null if empty

**hasData(...values):**
- Checks if any value has data
- Used to determine if question should be scored

**scorePercentage(value, thresholds):**
- Scores percentage values
- Returns 3 if ≥ excellent threshold
- Returns 2 if ≥ good threshold
- Returns 1 otherwise

**scoreReversePercentage(value, thresholds):**
- For metrics where lower is better (e.g., turnover)
- Returns 3 if ≤ excellent threshold
- Returns 2 if ≤ good threshold
- Returns 1 otherwise

**countPolicies(...policies):**
- Counts number of "yes" values
- Used for policy-based scoring

---

## Maintenance and Updates

### Adding New Questions

1. Add question to `ESGAssessmentData` interface
2. Create scoring function: `scoreEnvironmentalQ8()` or similar
3. Add to scoring array in `calculateESGScore()`
4. Update question weightages array
5. Add to recommendation generation if needed

### Modifying Scoring Logic

1. Locate question scoring function
2. Update logic and thresholds
3. Test with sample data
4. Update documentation

### Adjusting Weightages

1. Modify question percentages in `calculateESGScore()`
2. Ensure section totals still equal section weight (30%, 35%, 35%)
3. Update documentation

---

## Testing

### Test Cases

1. **Complete Assessment**
   - All questions answered
   - Verify all scores calculated
   - Verify recommendations generated

2. **Partial Assessment**
   - Some sections empty
   - Verify null scores for empty questions
   - Verify 0% for empty sections

3. **Edge Cases**
   - All "No" answers
   - All "Yes" answers
   - Extreme values (0%, 100%)
   - Missing required data

4. **Score Validation**
   - Scores between 1-3 or null
   - Section scores between 0-100
   - Overall score between 0-100

---

## Troubleshooting

### Common Issues

**Issue:** Scores showing 33% for empty section
- **Cause:** Old scoring logic defaulting to score 1
- **Fix:** Updated to return null for empty questions

**Issue:** Recommendations not showing
- **Cause:** Scores not saved to database
- **Fix:** Check database permissions and scoring execution

**Issue:** Incorrect section scores
- **Cause:** Weightages mismatch
- **Fix:** Verify question percentages sum to section weight

---

## Future Enhancements

### Potential Improvements

1. **Industry-Specific Scoring**
   - Different thresholds by industry
   - Sector-specific benchmarks

2. **Machine Learning Integration**
   - Learn from admin overrides
   - Improve scoring accuracy over time

3. **Benchmarking**
   - Compare against industry averages
   - Peer group analysis

4. **Historical Tracking**
   - Track score improvements over time
   - Trend analysis

5. **Custom Weightages**
   - Allow organizations to customize weights
   - Industry-specific configurations

---

## Conclusion

The ESG Automated Scoring System provides a robust, transparent, and configurable solution for evaluating ESG assessments. It eliminates manual intervention while maintaining accuracy and providing actionable insights.

For questions or support, refer to the codebase or contact the development team.

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Maintained By:** Development Team

