import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { FieldTooltip } from '../components/FieldTooltip';
import { FormulaConfig } from '@/types/formula';

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
  // Render dynamic property fields based on selected formula
  const renderPropertyFields = (property: Property) => {
    if (!selectedFormula) return null;
    
    // Fields that are always shown for properties
    const commonFields = ['property_value_at_origination'];
    
    // Get formula-specific fields (excluding outstanding_amount and common fields)
    const formulaFields = selectedFormula.inputs
      .filter(input => !['outstanding_amount', ...commonFields].includes(input.name))
      .map(input => input.name);

    const allFields = [...commonFields, ...formulaFields];

    return allFields.map(fieldName => {
      const input = selectedFormula.inputs.find(i => i.name === fieldName);
      if (!input) return null;

      // Map formula field names to Property interface field names
      const propertyFieldMap: Record<string, keyof Property> = {
        'property_value_at_origination': 'propertyValueAtOrigination',
        'actual_energy_consumption': 'actualEnergyConsumption',
        'supplier_specific_emission_factor': 'supplierSpecificEmissionFactor',
        'average_emission_factor': 'averageEmissionFactor',
        'estimated_energy_consumption_from_labels': 'estimatedEnergyConsumptionFromLabels',
        'estimated_energy_consumption_from_statistics': 'estimatedEnergyConsumptionFromStatistics',
        'floor_area': 'floorArea'
      };

      const propertyFieldName = propertyFieldMap[fieldName] || fieldName as keyof Property;
      const fieldValue = property[propertyFieldName] || '';
      const fieldId = `${fieldName}-${property.id}`;

      // Check if this field has unit options
      const hasUnitOptions = input.unitOptions && input.unitOptions.length > 0;
      const unitFieldName = `${propertyFieldName}Unit` as keyof Property;
      const unitValue = property[unitFieldName] || input.unit || '';

      return (
        <div key={fieldName} className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Label htmlFor={fieldId}>
                  {input.label} {input.required && <span className="text-red-500">*</span>}
                </Label>
                {input.description && (
                  <FieldTooltip content={input.description} />
                )}
              </div>
              <Input
                id={fieldId}
                type="number"
                placeholder="0"
                value={fieldValue}
                onChange={(e) => onUpdateProperty(property.id, propertyFieldName, parseFloat(e.target.value) || 0)}
                className="mt-1"
                required={input.required}
              />
            </div>
            {hasUnitOptions && (
              <div className="w-48">
                <Label htmlFor={`${fieldId}-unit`}>Unit</Label>
                <Select 
                  value={String(unitValue)} 
                  onValueChange={(value) => onUpdateProperty(property.id, unitFieldName, value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {input.unitOptions!.map((option) => (
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
    }).filter(Boolean);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Properties & Energy Data</CardTitle>
        <CardDescription>
          Add properties and their energy consumption data for mortgage calculations
        </CardDescription>
        {selectedFormula && (
          <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
            <strong>Selected Formula:</strong> {selectedFormula.name}
            <br />
            <strong>Required Fields:</strong> {selectedFormula.inputs.filter(i => i.name !== 'outstanding_amount').map(i => i.label).join(', ')}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Properties List */}
        {properties.map((property, index) => (
          <div key={property.id} className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Property {index + 1}</h4>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => onRemoveProperty(property.id)}
                disabled={properties.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`property-name-${property.id}`}>Property Name</Label>
                <Input
                  id={`property-name-${property.id}`}
                  value={property.name}
                  onChange={(e) => onUpdateProperty(property.id, 'name', e.target.value)}
                  placeholder="e.g., Office Building A"
                  className="mt-1"
                />
              </div>
              
              {/* Dynamic fields based on selected formula */}
              {renderPropertyFields(property)}
            </div>
          </div>
        ))}
        
        <Button
          type="button"
          variant="outline"
          onClick={onAddProperty}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Property
        </Button>
      </CardContent>
    </Card>
  );
};
