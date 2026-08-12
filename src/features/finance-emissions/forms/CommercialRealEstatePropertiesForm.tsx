import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';
import { ComputedBox, FIELD_INPUT, FieldGrid, FormField, InputSection } from "./InputLayout";

export interface CommercialRealEstateProperty {
  id: string;
  name: string;
  propertyValueAtOrigination: number;
}

interface CommercialRealEstatePropertiesFormProps {
  properties: CommercialRealEstateProperty[];
  totalEmission: number;
  showTotalEmission?: boolean;
  onAddProperty: () => void;
  onRemoveProperty: (id: string) => void;
  onUpdateProperty: (id: string, field: keyof CommercialRealEstateProperty, value: string | number) => void;
}

export const CommercialRealEstatePropertiesForm: React.FC<CommercialRealEstatePropertiesFormProps> = ({
  properties,
  totalEmission,
  showTotalEmission = true,
  onAddProperty,
  onRemoveProperty,
  onUpdateProperty
}) => {
  const totalPropertyValue = properties.reduce((sum, p) => sum + p.propertyValueAtOrigination, 0);

  return (
    <InputSection
      title="Properties"
      description="Value at origination for each financed building"
      action={
        <Button type="button" variant="outline" size="sm" onClick={onAddProperty} className="h-8 border-[#E2E8F0]">
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add
        </Button>
      }
    >
      <div className="space-y-3">
        {showTotalEmission && (
          <ComputedBox
            label="Total emission"
            value={`${totalEmission.toLocaleString(undefined, { maximumFractionDigits: 2 })} tCO₂e`}
            hint="From the company GHG step"
          />
        )}

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
              <FormField label="Name" required>
                <Input
                  id={`property-name-${property.id}`}
                  value={property.name}
                  onChange={(e) => onUpdateProperty(property.id, 'name', e.target.value)}
                  placeholder="e.g. Office Building A"
                  className={FIELD_INPUT}
                />
              </FormField>
              <FormField label="Value at origination" unit="PKR" required>
                <Input
                  id={`property-value-${property.id}`}
                  type="number"
                  value={property.propertyValueAtOrigination || ''}
                  onChange={(e) => onUpdateProperty(property.id, 'propertyValueAtOrigination', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className={FIELD_INPUT}
                />
              </FormField>
            </FieldGrid>
          </div>
        ))}

        {properties.length > 0 && (
          <ComputedBox
            label="Total property value"
            value={`${totalPropertyValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} PKR`}
          />
        )}
      </div>
    </InputSection>
  );
};
