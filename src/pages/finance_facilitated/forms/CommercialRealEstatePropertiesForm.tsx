import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';

export interface CommercialRealEstateProperty {
  id: string;
  name: string;
  propertyValueAtOrigination: number;
}

interface CommercialRealEstatePropertiesFormProps {
  properties: CommercialRealEstateProperty[];
  totalEmission: number; // Auto-filled from questionnaire
  onAddProperty: () => void;
  onRemoveProperty: (id: string) => void;
  onUpdateProperty: (id: string, field: keyof CommercialRealEstateProperty, value: string | number) => void;
}

export const CommercialRealEstatePropertiesForm: React.FC<CommercialRealEstatePropertiesFormProps> = ({
  properties,
  totalEmission,
  onAddProperty,
  onRemoveProperty,
  onUpdateProperty
}) => {
  const totalPropertyValue = properties.reduce((sum, p) => sum + p.propertyValueAtOrigination, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Properties & Emissions Data</CardTitle>
        <CardDescription>
          Add properties and their values for commercial real estate calculations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Properties List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Property Details</h3>
            <Button 
              type="button"
              onClick={onAddProperty} 
              size="sm" 
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Property
            </Button>
          </div>
          
          {/* Total Emission Display (Auto-filled from questionnaire) */}
          <div className="pb-2 border-b">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-gray-700">Total Emission</Label>
                <p className="text-xs text-gray-500 mt-0.5">
                  Auto-filled from questionnaire (Scope 1 + Scope 2 + Scope 3)
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-gray-900">
                  {totalEmission.toLocaleString(undefined, { maximumFractionDigits: 2 })} tCO₂e
                </div>
              </div>
            </div>
          </div>

          {properties.map((property, index) => (
            <div key={property.id} className="border rounded-lg p-4 space-y-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Property {index + 1}</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => onRemoveProperty(property.id)}
                  disabled={properties.length === 1}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`property-name-${property.id}`}>
                    Property Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id={`property-name-${property.id}`}
                    value={property.name}
                    onChange={(e) => onUpdateProperty(property.id, 'name', e.target.value)}
                    placeholder="e.g., Office Building A"
                    className="mt-1"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor={`property-value-${property.id}`}>
                    Property Value at Origination (PKR) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id={`property-value-${property.id}`}
                    type="number"
                    value={property.propertyValueAtOrigination || ''}
                    onChange={(e) => onUpdateProperty(property.id, 'propertyValueAtOrigination', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="mt-1"
                    required
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Total Property Value Summary */}
        {properties.length > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700">Total Property Value at Origination</Label>
              <div className="text-right">
                <div className="text-lg font-semibold text-gray-900">
                  {totalPropertyValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} PKR
                </div>
              </div>
            </div>
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={onAddProperty}
          className="w-full mt-2"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Property
        </Button>
      </CardContent>
    </Card>
  );
};

