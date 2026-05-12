import type { AssetSnapshotRow } from "./boundaryTypes";
import type { OrgBoundaryMethod } from "./orgBoundaryMethod";

/** User-facing validation copy for asset rows (no internal spec codes). */
export function assetFieldValidationMessage(a: AssetSnapshotRow, method: OrgBoundaryMethod): string | null {
  if (!a.asset_name.trim()) return "Each site or asset needs a name.";
  if (!a.asset_type.trim()) return `“${a.asset_name || "Unnamed"}”: choose an asset type.`;
  if (!a.country.trim()) return `“${a.asset_name}”: enter a country.`;
  if (!a.ownership_type.trim()) return `“${a.asset_name}”: choose an ownership type.`;
  if (!a.operator_name.trim()) return `“${a.asset_name}”: enter the operator name.`;
  if (method === "equity_share") {
    const p = Number(a.ownership_percentage);
    if (!Number.isFinite(p) || p < 0 || p > 100) {
      return `“${a.asset_name}”: enter ownership between 0 and 100% (equity share).`;
    }
  }
  return null;
}
