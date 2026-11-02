import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  reportingYearChoices,
  writeSelectedReportingYear,
} from "@/features/emission-calculator/results/reportingYear";

const MONTHS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

export function Scope3PeriodFields({
  year,
  month,
  onYearChange,
  onMonthChange,
}: {
  year: number;
  month: string;
  onYearChange: (year: number) => void;
  onMonthChange: (month: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label>Reporting year</Label>
        <Select
          value={String(year)}
          onValueChange={(value) => {
            const next = Number(value);
            onYearChange(next);
            writeSelectedReportingYear(next);
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {reportingYearChoices(year).map((choice) => (
              <SelectItem key={choice} value={String(choice)}>
                {choice}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Month</Label>
        <Select value={month} onValueChange={onMonthChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function scope3Period(year: number, month: string): string {
  return `${year}-${month}`;
}
