import React from "react";
import { useEmissionSync } from "@/components/emissions/scope3/hooks/useEmissionSync";
import type { EmissionData } from "@/components/emissions/shared/types";
import { ProcessingProductTypeSelector } from "./ProcessingProductTypeSelector";
import { ProcessingSoldProductsSection } from "./ProcessingSoldProductsSection";
import { UseOfSoldProductsSection } from "./UseOfSoldProductsSection";
import {
  mapProcessingSoldProductsRowToEntry,
  mapUseOfSoldProductsRowToEntry,
} from "./helpers/syncMappers";
import { useProcessingSoldProducts } from "./hooks/useProcessingSoldProducts";
import { useSoldProductsFactorData } from "./hooks/useSoldProductsFactorData";
import { useSoldProductsSelection } from "./hooks/useSoldProductsSelection";
import { useUseOfSoldProducts } from "./hooks/useUseOfSoldProducts";

type Props = {
  setEmissionData: React.Dispatch<React.SetStateAction<EmissionData>>;
  onSaveAndNext?: () => void;
  companyContext?: boolean;
  counterpartyId?: string;
};

export const ProcessingUseSoldProductsShell: React.FC<Props> = ({
  setEmissionData,
  onSaveAndNext,
  companyContext = false,
  counterpartyId,
}) => {
  const {
    productType,
    isAnimating,
    onSelectIntermediate,
    onSelectFinal,
    onBackToSelection,
  } = useSoldProductsSelection();
  const factorData = useSoldProductsFactorData();
  const processing = useProcessingSoldProducts({
    enabled: productType === "intermediate",
    companyContext,
    counterpartyId,
  });
  const useSoldProducts = useUseOfSoldProducts({
    enabled: productType === "final",
    companyContext,
    counterpartyId,
  });

  useEmissionSync({
    category: "processing_sold_products",
    rows: processing.rows,
    enabled: productType === "intermediate",
    mapRowToEntry: mapProcessingSoldProductsRowToEntry,
    setEmissionData,
  });

  useEmissionSync({
    category: "use_of_sold_products",
    rows: useSoldProducts.rows,
    enabled: productType === "final",
    mapRowToEntry: mapUseOfSoldProductsRowToEntry,
    setEmissionData,
  });

  if (!productType) {
    return (
      <ProcessingProductTypeSelector
        isAnimating={isAnimating}
        onSelectIntermediate={onSelectIntermediate}
        onSelectFinal={onSelectFinal}
      />
    );
  }

  if (productType === "intermediate") {
    return (
      <ProcessingSoldProductsSection
        isAnimating={isAnimating}
        rows={processing.rows}
        totalEmissions={processing.totalEmissions}
        saving={processing.saving}
        stationaryCombustionData={factorData.stationaryCombustionData}
        mobileCombustionData={factorData.mobileCombustionData}
        heatSteamDataUK={factorData.heatSteamDataUK}
        heatSteamDataEBT={factorData.heatSteamDataEBT}
        onBack={onBackToSelection}
        onAddRow={processing.addRow}
        onRemoveRow={processing.removeRow}
        onUpdateRow={processing.updateRow}
        onUpdateOtherSourceRow={processing.updateOtherSourceRow}
        onAddOtherSourceRow={processing.addOtherSourceRow}
        onRemoveOtherSourceRow={processing.removeOtherSourceRow}
        onSave={processing.save}
        onSaveAndNext={onSaveAndNext}
      />
    );
  }

  return (
    <UseOfSoldProductsSection
      isAnimating={isAnimating}
      rows={useSoldProducts.rows}
      totalEmissions={useSoldProducts.totalEmissions}
      saving={useSoldProducts.saving}
      stationaryCombustionData={factorData.stationaryCombustionData}
      mobileCombustionData={factorData.mobileCombustionData}
      onBack={onBackToSelection}
      onAddRow={useSoldProducts.addRow}
      onRemoveRow={useSoldProducts.removeRow}
      onUpdateRow={useSoldProducts.updateRow}
      onUpdateHybridOtherSourceRow={useSoldProducts.updateHybridOtherSourceRow}
      onAddHybridOtherSourceRow={useSoldProducts.addHybridOtherSourceRow}
      onRemoveHybridOtherSourceRow={useSoldProducts.removeHybridOtherSourceRow}
      onUpdateElectricityOtherSourceRow={
        useSoldProducts.updateElectricityOtherSourceRow
      }
      onAddElectricityOtherSourceRow={useSoldProducts.addElectricityOtherSourceRow}
      onRemoveElectricityOtherSourceRow={
        useSoldProducts.removeElectricityOtherSourceRow
      }
      onSave={useSoldProducts.save}
      onSaveAndNext={onSaveAndNext}
    />
  );
};
