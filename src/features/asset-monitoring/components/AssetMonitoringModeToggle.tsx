import { cn } from "@/lib/utils";
import type { AssetMonitoringUiMode } from "@/features/asset-monitoring/mrvCatalog";

interface AssetMonitoringModeToggleProps {
  mode: AssetMonitoringUiMode;
  onModeChange: (mode: AssetMonitoringUiMode) => void;
}

const AssetMonitoringModeToggle = ({ mode, onModeChange }: AssetMonitoringModeToggleProps) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Test UI</span>
      <div
        className="inline-flex rounded-lg border border-gray-200 bg-gray-50/80 p-1"
        role="tablist"
        aria-label="Asset Monitoring UI mode"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "questionnaire"}
          onClick={() => onModeChange("questionnaire")}
          className={cn(
            "px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors",
            mode === "questionnaire"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          Needs questionnaire
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "catalog"}
          onClick={() => onModeChange("catalog")}
          className={cn(
            "px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors",
            mode === "catalog"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          MRV modules
        </button>
      </div>
    </div>
  );
};

export default AssetMonitoringModeToggle;
