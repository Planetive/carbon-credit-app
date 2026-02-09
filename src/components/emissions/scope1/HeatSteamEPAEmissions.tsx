import React from "react";
import HeatSteamEmissions from "@/components/emissions/scope2/HeatSteamEmissions";

interface Props {
  onTotalChange?: (total: number) => void;
  onSaveAndNext?: () => void;
}

/**
 * Scope 1 (EPA calculator) wrapper:
 * reuse Heat & Steam UI but lock it to EPA/EBT standard.
 */
const HeatSteamEPAEmissions: React.FC<Props> = (props) => {
  return <HeatSteamEmissions {...props} forcedStandard="EBT" storageVariant="epa" />;
};

export default HeatSteamEPAEmissions;

