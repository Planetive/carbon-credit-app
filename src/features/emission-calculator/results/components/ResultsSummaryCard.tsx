import { CheckCircle2, ChevronDown, Download, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatTonnes } from "./formatters";

type ResultsSummaryCardProps = {
  grandTotalKg: number;
  categoriesCalculated: number;
  submittedAt: string;
  methodologyLabel?: string;
  onEditAssessment?: () => void;
  onExportPdf?: () => void;
  onExportExcel?: () => void;
  isGeneratingPdf?: boolean;
};

const ResultsSummaryCard = ({
  grandTotalKg,
  categoriesCalculated,
  submittedAt,
  methodologyLabel = "GHG Protocol",
  onEditAssessment,
  onExportPdf,
  onExportExcel,
  isGeneratingPdf = false,
}: ResultsSummaryCardProps) => {
  const submitted = new Date(submittedAt);
  const reportingYear = `FY${submitted.getFullYear()}`;

  const submittedLabel = submitted.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const updatedLabel = submitted.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
      <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl sm:text-[26px] font-bold tracking-[-0.02em] text-[#0F172A]">
            Carbon Footprint Assessment
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF7F1] px-2.5 py-1 text-xs font-semibold text-[#0F6E56]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Completed
          </span>
        </div>
        <p className="mt-1.5 text-sm text-slate-500">
          Reporting Year: {reportingYear}
          <span className="mx-1.5 text-slate-300">•</span>
          Submitted on {submittedLabel}
        </p>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.15fr)]">
        <div className="px-5 sm:px-6 py-5 border-b lg:border-b-0 lg:border-r border-slate-100 flex flex-col min-h-[160px] sm:min-h-[180px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
            Total Emissions
          </p>
          <div className="flex-1 flex items-center py-2">
            <p className="text-5xl sm:text-[60px] leading-none font-bold tracking-[-0.03em] text-[#0F172A] tabular-nums">
              {formatTonnes(grandTotalKg)}
              <span className="ml-2.5 text-2xl sm:text-[30px] font-bold text-[#0F172A]">tCO₂e</span>
            </p>
          </div>
          <p className="text-sm text-slate-500 max-w-md">
            This is your total calculated emissions across all scopes.
          </p>
        </div>

        <div className="px-5 sm:px-6 py-5">
          <p className="text-base font-semibold text-[#0F172A] mb-3">Assessment Overview</p>

          <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm flex-1 min-w-0">
              <div>
                <dt className="text-slate-500 mb-0.5">Reporting Year</dt>
                <dd className="font-semibold text-[#0F172A]">{reportingYear}</dd>
              </div>
              <div>
                <dt className="text-slate-500 mb-0.5">Methodology</dt>
                <dd className="font-semibold text-[#0F172A]">{methodologyLabel}</dd>
              </div>
              <div>
                <dt className="text-slate-500 mb-0.5">Categories Calculated</dt>
                <dd className="font-semibold text-[#0F172A] tabular-nums">{categoriesCalculated}</dd>
              </div>
              <div>
                <dt className="text-slate-500 mb-0.5">Last Updated</dt>
                <dd className="font-semibold text-[#0F172A]">{updatedLabel}</dd>
              </div>
            </dl>

            <div className="flex flex-col gap-2 shrink-0 w-full sm:w-[168px]">
              {(onExportPdf || onExportExcel) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      className="bg-[#1D9E75] hover:bg-[#178A66] text-white h-9 w-full"
                      disabled={isGeneratingPdf}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {isGeneratingPdf ? "Generating…" : "Export"}
                      <ChevronDown className="h-4 w-4 ml-auto opacity-80" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    {onExportPdf && (
                      <DropdownMenuItem onClick={onExportPdf} disabled={isGeneratingPdf}>
                        Export PDF
                      </DropdownMenuItem>
                    )}
                    {onExportExcel && (
                      <DropdownMenuItem onClick={onExportExcel}>Export Excel</DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {onEditAssessment && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onEditAssessment}
                  className="border-slate-200 text-slate-800 hover:bg-slate-50 h-9 w-full"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Assessment
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ResultsSummaryCard;
