import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormulaConfig } from '@/types/formula';
import { FieldTooltip } from '../components/FieldTooltip';

interface MotorVehicleLoanFormProps {
  selectedFormula: FormulaConfig | null;
  formData: Record<string, any>;
  onUpdateFormData: (field: string, value: any) => void;
}

export const MotorVehicleLoanForm: React.FC<MotorVehicleLoanFormProps> = ({
  selectedFormula,
  formData,
  onUpdateFormData
}) => {
  // Fields that are already captured in the Financial Information section
  const duplicateFields = ['outstanding_amount'];

  const filteredInputs = selectedFormula?.inputs.filter(input => !duplicateFields.includes(input.name)) || [];

  if (filteredInputs.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vehicle Information & Emissions Data</CardTitle>
        <CardDescription>
          Enter the vehicle-specific data required for {selectedFormula?.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Dynamic Fields Based on Selected Formula - Only Required Fields */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Required Data for {selectedFormula?.name}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredInputs.map((input) => {
              const fieldName = input.name;
              const fieldValue = formData[fieldName] || '';
              const unitFieldName = `${fieldName}Unit`;
              const unitValue = formData[unitFieldName] || input.unit || '';

              return (
                <div key={input.name} className="space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={input.name}>
                          {input.label} {input.required && <span className="text-red-500">*</span>}
                        </Label>
                        {input.description && (
                          <FieldTooltip content={input.description} />
                        )}
                      </div>
                      <Input
                        id={input.name}
                        type="number"
                        placeholder="0"
                        value={fieldValue}
                        onChange={(e) => onUpdateFormData(fieldName, parseFloat(e.target.value) || 0)}
                        className="mt-1"
                        required={input.required}
                      />
                    </div>
                    {input.unitOptions && (
                      <div className="w-48">
                        <Label htmlFor={unitFieldName}>Unit</Label>
                        <Select value={String(unitValue)} onValueChange={(value) => onUpdateFormData(unitFieldName, value)}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                          <SelectContent>
                            {input.unitOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
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
