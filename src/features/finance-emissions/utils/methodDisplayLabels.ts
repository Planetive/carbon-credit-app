/** Plain user-facing method labels (Score 1–5 + title). No option codes like 1a / 2b. */

type MethodMeta = { id: string; title: string; score: string };

const VEHICLE: MethodMeta[] = [
  { id: '1a', title: 'I have fuel use data', score: 'Score 1' },
  { id: '1b', title: 'I have kilometres and make/model', score: 'Score 1' },
  { id: '2a', title: 'Local average distance', score: 'Score 2' },
  { id: '2b', title: 'Regional average distance', score: 'Score 3' },
  { id: '3a', title: 'Vehicle type only', score: 'Score 4' },
  { id: '3b', title: 'Engine size estimate', score: 'Score 5' },
];

const PROPERTY: MethodMeta[] = [
  { id: '1a', title: 'Measured energy — your supplier’s rate', score: 'Score 1' },
  { id: '1b', title: 'Measured energy — our average rate', score: 'Score 2' },
  { id: '2a', title: 'Energy label estimate', score: 'Score 3' },
  { id: '2b', title: 'Building type by floor area', score: 'Score 4' },
  { id: '3', title: 'Building type by number of buildings', score: 'Score 5' },
];

const SOVEREIGN: MethodMeta[] = [
  { id: '1a', title: 'Verified country emissions', score: 'Score 1' },
  { id: '1b', title: 'Country emissions you enter', score: 'Score 2' },
  { id: '2a', title: 'Country energy use', score: 'Score 3' },
  { id: '3a', title: 'Sector revenue estimate', score: 'Score 4' },
  { id: '3b', title: 'Similar-country estimate', score: 'Score 5' },
];

const BOND: MethodMeta[] = [
  { id: '2a', title: 'Energy or fuel use', score: 'Score 2' },
  { id: '2b', title: 'Production volume', score: 'Score 3' },
  { id: '3a', title: 'Company revenue', score: 'Score 4' },
  { id: '3c', title: 'Asset turnover estimate', score: 'Score 5' },
  { id: '1a', title: 'Verified company emissions', score: 'Score 1' },
  { id: '1b', title: 'Company emissions you enter', score: 'Score 2' },
];

const FACILITATED: MethodMeta[] = [
  { id: '2a', title: 'Energy or fuel use', score: 'Score 2' },
  { id: '2b', title: 'Production volume', score: 'Score 3' },
  { id: '3a', title: 'Company revenue', score: 'Score 4' },
  { id: '3c', title: 'Asset turnover estimate', score: 'Score 5' },
  { id: '1a', title: 'Verified company emissions', score: 'Score 1' },
  { id: '1b', title: 'Company emissions you enter', score: 'Score 2' },
];

function familyForLoanType(loanType?: string): MethodMeta[] {
  switch (loanType) {
    case 'motor-vehicle-loan':
      return VEHICLE;
    case 'commercial-real-estate':
    case 'mortgage':
      return PROPERTY;
    case 'sovereign-debt':
      return SOVEREIGN;
    case 'facilitated-emission':
      return FACILITATED;
    default:
      return BOND;
  }
}

/** e.g. "Score 2 — Energy or fuel use" — never raw "2A" / "1B". */
export function methodDisplayLabel(methodId: string, loanType?: string): string {
  if (!methodId) return '';
  const id = methodId.includes('-') ? methodId.split('-')[0] : methodId;
  const family = familyForLoanType(loanType);
  const hit =
    family.find((m) => m.id === id) ||
    [...VEHICLE, ...PROPERTY, ...SOVEREIGN, ...BOND, ...FACILITATED].find((m) => m.id === id);
  return hit ? `${hit.score.replace(/^Score\s+/i, 'Quality ')} — ${hit.title}` : methodId;
}
