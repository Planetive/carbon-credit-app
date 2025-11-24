import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormulaConfig } from '../types/formula';
import { FieldTooltip } from '../components/FieldTooltip';

interface SovereignDebtFormProps {
  selectedFormula: FormulaConfig | null;
  formData: Record<string, any>;
  onUpdateFormData: (field: string, value: any) => void;
  totalEmission?: number; // Auto-filled from questionnaire (Scope 1 + Scope 2 + Scope 3)
}

export const SovereignDebtForm: React.FC<SovereignDebtFormProps> = ({
  selectedFormula,
  formData,
  onUpdateFormData,
  totalEmission = 0
}) => {
  // Fields that are already captured in the Financial Information section
  const duplicateFields = ['outstanding_amount'];

  const filteredInputs = selectedFormula?.inputs.filter(input => !duplicateFields.includes(input.name)) || [];

  if (filteredInputs.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Country Data & Emissions Information</CardTitle>
        <CardDescription>
          Enter the country-specific data required for {selectedFormula?.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Dynamic Fields Based on Selected Formula */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Required Data</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredInputs.map((input) => {
              const fieldName = input.name;
              // For verified/unverified country emissions, use totalEmission (auto-filled from questionnaire)
              const isEmissionField = fieldName === 'verified_country_emissions' || fieldName === 'unverified_country_emissions';
              // For total_emission in Option 2a, show tooltip explaining it's Energy Consumption × Emission Factor
              const isTotalEmissionField = fieldName === 'total_emission';
              const fieldValue = isEmissionField ? totalEmission : (formData[fieldName] || '');

              // Determine tooltip content
              let tooltipContent = input.description;
              if (isEmissionField) {
                tooltipContent = "Auto-filled from questionnaire (Scope 1 + Scope 2 + Scope 3) • Unit: tCO₂e";
              } else if (isTotalEmissionField) {
                tooltipContent = "Total emission = Energy Consumption × Emission Factor • Unit: tCO₂e";
              }

              return (
                <div key={input.name} className="space-y-2">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Label htmlFor={input.name}>
                          {input.label} {input.required && <span className="text-red-500">*</span>}
                        </Label>
                        {tooltipContent && (
                          <FieldTooltip content={tooltipContent} />
                        )}
                      </div>
                      <Input
                        id={input.name}
                        type="number"
                        placeholder="0"
                        value={fieldValue}
                        onChange={(e) => onUpdateFormData(fieldName, parseFloat(e.target.value) || 0)}
                        required={input.required}
                        disabled={isEmissionField}
                        title={isEmissionField ? "Auto-filled from questionnaire (Scope 1 + Scope 2 + Scope 3) • Unit: tCO₂e" : isTotalEmissionField ? "Total emission = Energy Consumption × Emission Factor • Unit: tCO₂e" : undefined}
                      />
                      {!isEmissionField && input.unit && (
                        <p className="text-xs text-gray-500 mt-1">
                          Unit: {input.unit}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </CardContent>
    </Card>
  );
};
