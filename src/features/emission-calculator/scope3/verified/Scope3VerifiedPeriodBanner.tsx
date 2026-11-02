import React from "react";
import {
  Scope3PeriodFields,
} from "@/features/emission-calculator/scope3/verified/Scope3PeriodFields";

/** Shared reporting-period controls + factor error for verified Scope 3 forms. */
export function Scope3VerifiedPeriodBanner({
  year,
  month,
  onYearChange,
  onMonthChange,
  factorError,
  note,
}: {
  year: number;
  month: string;
  onYearChange: (year: number) => void;
  onMonthChange: (month: string) => void;
  factorError?: string | null;
  note?: string;
}) {
  return (
    <div className="space-y-3">
      {note ? <p className="text-sm text-gray-600">{note}</p> : null}
      <Scope3PeriodFields
        year={year}
        month={month}
        onYearChange={onYearChange}
        onMonthChange={onMonthChange}
      />
      {factorError ? (
        <p className="text-sm text-red-600" role="alert">
          {factorError}
        </p>
      ) : null}
    </div>
  );
}
