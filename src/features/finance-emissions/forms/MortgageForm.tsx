import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';
import { FormattedNumberInput } from "@/components/shared/finance/FormattedNumberInput";
import { FormulaConfig } from '../types/formula';
import { FIELD_INPUT, FieldGrid, FormField, InputSection } from "./InputLayout";

export interface Property {
  id: string;
  name: string;
  propertyValueAtOrigination: number;
  actualEnergyConsumption: number;
  actualEnergyConsumptionUnit: string;
  supplierSpecificEmissionFactor: number;
  supplierSpecificEmissionFactorUnit: string;
  averageEmissionFactor: number;
  averageEmissionFactorUnit: string;
  estimatedEnergyConsumptionFromLabels: number;
  estimatedEnergyConsumptionFromLabelsUnit: string;
  estimatedEnergyConsumptionFromStatistics: number;
  estimatedEnergyConsumptionFromStatisticsUnit: string;
  floorArea: number;
  totalEmission?: number;
}

interface MortgageFormProps {
  properties: Property[];
  selectedFormula: FormulaConfig | null;
  onAddProperty: () => void;
  onRemoveProperty: (id: string) => void;
  onUpdateProperty: (id: string, field: keyof Property, value: string | number) => void;
}

export const MortgageForm: React.FC<MortgageFormProps> = ({
  properties,
  selectedFormula,
  onAddProperty,
  onRemoveProperty,
  onUpdateProperty
}) => {
  return (
    <InputSection
      title="Properties"
      description={selectedFormula?.name || "Value at origination for each mortgaged property"}
      action={
        <Button type="button" variant="outline" size="sm" onClick={onAddProperty} className="h-8 border-[#E2E8F0]">
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add
        </Button>
      }
    >
      <div className="space-y-3">
        {properties.map((property, index) => (
          <div key={property.id} className="rounded-xl border border-[#E8EEF0] bg-white p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[#0F172A]">Property {index + 1}</p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onRemoveProperty(property.id)}
                disabled={properties.length === 1}
                className="h-8 w-8 text-[#94A3B8] hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <FieldGrid>
              <FormField label="Name">
                <Input
                  id={`property-name-${property.id}`}
                  value={property.name}
                  onChange={(e) => onUpdateProperty(property.id, 'name', e.target.value)}
                  placeholder="e.g. Residence A"
                  className={FIELD_INPUT}
                />
              </FormField>
              <FormField
                label="Value at origination"
                unit="PKR"
                required
                tooltip="Property value at the time of mortgage origination"
              >
                <FormattedNumberInput
                  id={`property-value-${property.id}`}
                  placeholder="0"
                  value={property.propertyValueAtOrigination || 0}
                  onChange={(value) => onUpdateProperty(property.id, 'propertyValueAtOrigination', value)}
                  className={FIELD_INPUT}
                />
              </FormField>
            </FieldGrid>
          </div>
        ))}
      </div>
    </InputSection>
  );
};
