import { reportingYearChoices } from "./reportingYear";

type Props = {
  year: number;
  onChange: (year: number) => void;
};

export function EpaReportingYearControl({ year, onChange }: Props) {
  return (
    <label className="flex items-center justify-between gap-3 text-xs text-slate-600">
      <span>Reporting year</span>
      <select
        aria-label="Reporting year"
        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800"
        value={year}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {reportingYearChoices(year).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
