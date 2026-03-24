import { Gauge, ListChecks, Cpu } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type Scope3Mode = "tier1" | "tier2" | "tier3";

type Scope3ModeOption = {
  id: Scope3Mode;
  title: string;
  tierLabel: string;
  description: string;
  icon: typeof Gauge;
};

const MODE_OPTIONS: Scope3ModeOption[] = [
  {
    id: "tier1",
    title: "Quick Estimate",
    tierLabel: "Tier 1",
    description: "Use default IPCC factors for a fast, high-level Scope 3 estimate.",
    icon: Gauge,
  },
  {
    id: "tier2",
    title: "Detailed",
    tierLabel: "Tier 2",
    description: "Use region- or activity-specific factors for improved accuracy.",
    icon: ListChecks,
  },
  {
    id: "tier3",
    title: "Advanced",
    tierLabel: "Tier 3",
    description: "Use organization-specific models and granular data for maximum precision.",
    icon: Cpu,
  },
];

interface Scope3ModeSelectorProps {
  selectedMode: Scope3Mode | null;
  onModeSelect: (mode: Scope3Mode) => void;
}

const Scope3ModeSelector = ({ selectedMode, onModeSelect }: Scope3ModeSelectorProps) => {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-100 p-5 sm:p-6">
        <p className="text-sm text-emerald-700 font-medium uppercase tracking-wide">Scope 3 Questionnaire</p>
        <h3 className="mt-2 text-xl sm:text-2xl font-semibold text-gray-900">
          Which assessment mode would you like to use for Scope 3?
        </h3>
        <p className="mt-2 text-sm sm:text-base text-gray-600 max-w-3xl">
          Choose the level of detail that best matches your available data and reporting goals. You can switch
          methods later if needed.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {MODE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedMode === option.id;
          return (
            <Card
              key={option.id}
              className={`transition-all duration-200 border ${
                isSelected
                  ? "border-teal-400 shadow-lg shadow-teal-100 bg-teal-50/40"
                  : "border-gray-200 hover:border-teal-300 hover:shadow-md"
              }`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-teal-600" />
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                    {option.tierLabel}
                  </span>
                </div>
                <h4 className="mt-4 text-lg font-semibold text-gray-900">{option.title}</h4>
                <p className="mt-2 text-sm text-gray-600 min-h-[48px]">{option.description}</p>
                <Button
                  className={`mt-5 w-full ${
                    isSelected ? "bg-teal-700 hover:bg-teal-800 text-white" : "bg-white text-gray-900 border border-gray-300 hover:bg-gray-50"
                  }`}
                  onClick={() => onModeSelect(option.id)}
                >
                  {isSelected ? "Selected" : "Choose This Mode"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Scope3ModeSelector;
