import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EmissionData } from "@/components/emissions/shared/types";

type Props = {
  activeCategory: string;
  emissionData: EmissionData;
  setEmissionData: React.Dispatch<React.SetStateAction<EmissionData>>;
};

export const Scope3Section: React.FC<Props> = ({ activeCategory, emissionData, setEmissionData }) => {
  const { toast } = useToast();

  const removeScope3Row = (rowId: string) => {
    setEmissionData(prev => ({
      ...prev,
      scope3: prev.scope3.filter(r => r.id !== rowId)
    }));
  };

  // Purchased Goods & Services
  if (activeCategory === 'purchasedGoods') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Purchased Goods & Services Entries</h3>
            <p className="text-sm text-gray-600">Add your organization's purchased goods data</p>
          </div>
          <Button
            variant="default"
            className="bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => (document.getElementById('pgs-supplier') as HTMLInputElement)?.focus()}
          >
            <Plus className="h-4 w-4 mr-2" /> Add New Entry
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <Label htmlFor="pgs-supplier">Supplier</Label>
            <Input id="pgs-supplier" placeholder="e.g., ABC Supplies" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
          <div>
            <Label htmlFor="pgs-quantity">Quantity (tonnes)</Label>
            <Input id="pgs-quantity" type="number" min={0} step={0.01} placeholder="0" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
          <div>
            <Label>Transport Method</Label>
            <Select onValueChange={(v) => ((document.getElementById('pgs-transport') as any)._value = v)}>
              <SelectTrigger id="pgs-transport">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sea">Sea</SelectItem>
                <SelectItem value="air">Air</SelectItem>
                <SelectItem value="truck">Truck</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="pgs-score">Sustainability Score</Label>
            <Input id="pgs-score" type="number" min={0} max={100} step={1} placeholder="0-100" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
        </div>

        <div className="flex items-center justify-end mt-2">
          <Button
            className="bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => {
              const supplier = (document.getElementById('pgs-supplier') as any)?._value || (document.getElementById('pgs-supplier') as HTMLInputElement)?.value || '';
              const qtyStr = (document.getElementById('pgs-quantity') as any)?._value || (document.getElementById('pgs-quantity') as HTMLInputElement)?.value || '0';
              const transport = (document.getElementById('pgs-transport') as any)?._value || '';
              const scoreStr = (document.getElementById('pgs-score') as any)?._value || (document.getElementById('pgs-score') as HTMLInputElement)?.value || '';

              const materialTonnes = parseFloat(qtyStr) || 0;
              const supplierScore = scoreStr === '' ? undefined : Number(scoreStr);
              if (!supplier || !transport || materialTonnes <= 0) {
                toast({ title: 'Missing info', description: 'Enter supplier, transport method, and positive quantity.' });
                return;
              }

              setEmissionData(prev => ({
                ...prev,
                scope3: [
                  ...prev.scope3,
                  { id: `pgs-${Date.now()}`, category: 'purchased_goods_services', activity: `${supplier} | ${transport}`, unit: 'tonnes', quantity: materialTonnes, emissions: 0 }
                ]
              }));

              const s = document.getElementById('pgs-supplier') as HTMLInputElement;
              const q = document.getElementById('pgs-quantity') as HTMLInputElement;
              const sc = document.getElementById('pgs-score') as HTMLInputElement;
              if (s) s.value = '';
              if (q) q.value = '';
              if (sc) sc.value = '';
              const t = document.getElementById('pgs-transport') as any; if (t) t._value = '';
            }}
          >
            Add Entry
          </Button>
        </div>

        {emissionData.scope3.filter(r => r.category === 'purchased_goods_services').length > 0 && (
          <div className="space-y-2">
            {emissionData.scope3.filter(r => r.category === 'purchased_goods_services').map(row => (
              <div key={row.id} className="flex items-center gap-3 p-3 border rounded-md bg-white">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{row.activity}</div>
                  <div className="text-xs text-gray-600">{row.quantity} tonnes</div>
                </div>
                <Button variant="outline" size="icon" onClick={() => removeScope3Row(row.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 border-t">
          {(() => {
            const rows = emissionData.scope3.filter(r => r.category === 'purchased_goods_services');
            const totalTonnes = rows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
            const totalPending = rows.length;
            return (
              <div className="flex items-center justify-between">
                <div className="text-gray-700 font-medium">Total Purchased Goods: <span className="font-semibold">{totalTonnes.toFixed(6)} tonnes</span></div>
                <Button onClick={() => toast({ title: 'Saved', description: 'Entries saved (frontend only for now).' })} disabled={totalPending === 0} className="bg-teal-600 hover:bg-teal-700 text-white">
                  <Save className="h-4 w-4 mr-2" />
                  {`Save Changes (${totalPending})`}
                </Button>
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  // Capital Goods
  if (activeCategory === 'capitalGoods') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Capital Goods Entries</h3>
            <p className="text-sm text-gray-600">Record details for purchased capital goods</p>
          </div>
          <Button
            variant="default"
            className="bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => (document.getElementById('capg-equipment') as HTMLInputElement)?.focus()}
          >
            <Plus className="h-4 w-4 mr-2" /> Add New Entry
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <Label htmlFor="capg-equipment">Equipment Specifications</Label>
            <Input id="capg-equipment" placeholder="Purchased equipment/asset" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
          <div>
            <Label>Manufacturing Location</Label>
            <Select onValueChange={(v) => ((document.getElementById('capg-country') as any)._value = v)}>
              <SelectTrigger id="capg-country">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pakistan">Pakistan</SelectItem>
                <SelectItem value="United States">United States</SelectItem>
                <SelectItem value="China">China</SelectItem>
                <SelectItem value="India">India</SelectItem>
                <SelectItem value="Germany">Germany</SelectItem>
                <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Material Composition</Label>
            <Select onValueChange={(v) => ((document.getElementById('capg-materials') as any)._value = v)}>
              <SelectTrigger id="capg-materials">
                <SelectValue placeholder="Select material" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Steel">Steel</SelectItem>
                <SelectItem value="Aluminum">Aluminum</SelectItem>
                <SelectItem value="Plastic">Plastic</SelectItem>
                <SelectItem value="Copper">Copper</SelectItem>
                <SelectItem value="Glass">Glass</SelectItem>
                <SelectItem value="Concrete">Concrete</SelectItem>
                <SelectItem value="Wood">Wood</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-end mt-2">
          <Button
            className="bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => {
              const equipmentSpecs = (document.getElementById('capg-equipment') as any)?._value || (document.getElementById('capg-equipment') as HTMLInputElement)?.value || '';
              const country = (document.getElementById('capg-country') as any)?._value || '';
              const materials = (document.getElementById('capg-materials') as any)?._value || '';

              if (!equipmentSpecs || !country || !materials) {
                toast({ title: 'Missing info', description: 'Fill all Capital Goods fields before adding.' });
                return;
              }

              setEmissionData(prev => ({
                ...prev,
                scope3: [
                  ...prev.scope3,
                  { id: `capg-${Date.now()}`, category: 'capital_goods', activity: `${equipmentSpecs} | ${country}`, unit: 'item', quantity: 1, emissions: 0 }
                ]
              }));

              const e1 = document.getElementById('capg-equipment') as HTMLInputElement;
              if (e1) e1.value = '';
              const ids = ['capg-country','capg-materials'];
              ids.forEach(id => { const el = document.getElementById(id) as any; if (el) el._value = ''; });
            }}
          >
            Add Entry
          </Button>
        </div>

        {emissionData.scope3.filter(r => r.category === 'capital_goods').length > 0 && (
          <div className="space-y-2">
            {emissionData.scope3.filter(r => r.category === 'capital_goods').map(row => (
              <div key={row.id} className="flex items-center gap-3 p-3 border rounded-md bg-white">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{row.activity}</div>
                  <div className="text-xs text-gray-600">1 item</div>
                </div>
                <Button variant="outline" size="icon" onClick={() => removeScope3Row(row.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 border-t">
          {(() => {
            const rows = emissionData.scope3.filter(r => r.category === 'capital_goods');
            const totalItems = rows.length;
            return (
              <div className="flex items-center justify-between">
                <div className="text-gray-700 font-medium">Total Capital Goods: <span className="font-semibold">{totalItems}</span></div>
                <Button onClick={() => toast({ title: 'Saved', description: 'Capital goods saved (frontend only for now).' })} disabled={totalItems === 0} className="bg-teal-600 hover:bg-teal-700 text-white">
                  <Save className="h-4 w-4 mr-2" />
                  {`Save Changes (${totalItems})`}
                </Button>
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  // Fuel & Energy Related Activities
  if (activeCategory === 'fuelEnergyActivities') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Fuel & Energy Related Activities</h3>
            <p className="text-sm text-gray-600">Capture upstream fuel and energy details</p>
          </div>
          <Button variant="default" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => (document.getElementById('fera-upstream') as HTMLInputElement)?.focus()}>
            <Plus className="h-4 w-4 mr-2" /> Add New Entry
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <Label>Upstream Emissions Data</Label>
            <Select onValueChange={(v) => ((document.getElementById('fera-upstream') as any)._value = v)}>
              <SelectTrigger id="fera-upstream">
                <SelectValue placeholder="Yes/No" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="fera-extraction">Extraction Methods</Label>
            <Input id="fera-extraction" placeholder="e.g., drilling, mining" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
          <div>
            <Label htmlFor="fera-distance">Transportation Distance (km)</Label>
            <Input id="fera-distance" type="number" min={0} step={0.1} placeholder="0" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
          <div>
            <Label htmlFor="fera-refining">Refining Processes</Label>
            <Input id="fera-refining" placeholder="Methods used to refine fuel" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
        </div>
        <div className="flex items-center justify-end mt-2">
          <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => {
            const upstream = (document.getElementById('fera-upstream') as any)?._value || '';
            const extraction = (document.getElementById('fera-extraction') as any)?._value || (document.getElementById('fera-extraction') as HTMLInputElement)?.value || '';
            const distanceStr = (document.getElementById('fera-distance') as any)?._value || (document.getElementById('fera-distance') as HTMLInputElement)?.value || '0';
            const refining = (document.getElementById('fera-refining') as any)?._value || (document.getElementById('fera-refining') as HTMLInputElement)?.value || '';
            const distanceKm = parseFloat(distanceStr) || 0;
            if (!upstream || !extraction || !refining || distanceKm < 0) {
              toast({ title: 'Missing info', description: 'Fill all fields and provide a non-negative distance.' });
              return;
            }
            setEmissionData(prev => ({
              ...prev,
              scope3: [...prev.scope3, { id: `fera-${Date.now()}`, category: 'fuel_energy_activities', activity: `${upstream === 'yes' ? 'Upstream data: Yes' : 'Upstream data: No'} | ${extraction}`, unit: 'km', quantity: distanceKm, emissions: 0 }]
            }));
            ['fera-upstream','fera-extraction','fera-distance','fera-refining'].forEach(id => {
              const el = document.getElementById(id) as any; if (!el) return; if (id === 'fera-distance') el.value = ''; else el._value = '';
            });
          }}>Add Entry</Button>
        </div>
        {emissionData.scope3.filter(r => r.category === 'fuel_energy_activities').length > 0 && (
          <div className="space-y-2">
            {emissionData.scope3.filter(r => r.category === 'fuel_energy_activities').map(row => (
              <div key={row.id} className="flex items-center gap-3 p-3 border rounded-md bg-white">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{row.activity}</div>
                  <div className="text-xs text-gray-600">{row.quantity} km</div>
                </div>
                <Button variant="outline" size="icon" onClick={() => removeScope3Row(row.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
        <div className="pt-4 border-t">
          {(() => {
            const rows = emissionData.scope3.filter(r => r.category === 'fuel_energy_activities');
            const totalKm = rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
            const totalPending = rows.length;
            return (
              <div className="flex items-center justify-between">
                <div className="text-gray-700 font-medium">Total Transport Distance: <span className="font-semibold">{totalKm.toFixed(1)} km</span></div>
                <Button onClick={() => toast({ title: 'Saved', description: 'Fuel & Energy activities saved (frontend only for now).' })} disabled={totalPending === 0} className="bg-teal-600 hover:bg-teal-700 text-white"><Save className="h-4 w-4 mr-2" />{`Save Changes (${totalPending})`}</Button>
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  // Upstream Transportation
  if (activeCategory === 'upstreamTransportation') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Upstream Transportation</h3>
            <p className="text-sm text-gray-600">Transport modes, distances, vehicle types, fuel use</p>
          </div>
          <Button variant="default" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => (document.getElementById('ut-mode') as HTMLInputElement)?.focus()}>
            <Plus className="h-4 w-4 mr-2" /> Add New Entry
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <Label>Transportation Mode</Label>
            <Select onValueChange={(v) => ((document.getElementById('ut-mode') as any)._value = v)}>
              <SelectTrigger id="ut-mode"><SelectValue placeholder="Select mode" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="truck">Truck</SelectItem>
                <SelectItem value="rail">Rail</SelectItem>
                <SelectItem value="ship">Ship</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="ut-distance">Distance (km)</Label>
            <Input id="ut-distance" type="number" min={0} step={0.1} placeholder="0" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
          <div>
            <Label>Vehicle Type</Label>
            <Select onValueChange={(v) => ((document.getElementById('ut-vehicle') as any)._value = v)}>
              <SelectTrigger id="ut-vehicle"><SelectValue placeholder="Select vehicle" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semi-truck">Semi-truck</SelectItem>
                <SelectItem value="electric-van">Electric van</SelectItem>
                <SelectItem value="diesel-truck">Diesel truck</SelectItem>
                <SelectItem value="rail-freight">Rail freight</SelectItem>
                <SelectItem value="container-ship">Container ship</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="ut-fuel">Fuel Consumption</Label>
            <Input id="ut-fuel" placeholder="e.g., 120 L or kWh" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
        </div>
        <div className="flex items-center justify-end mt-2">
          <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => {
            const mode = (document.getElementById('ut-mode') as any)?._value || '';
            const distStr = (document.getElementById('ut-distance') as any)?._value || (document.getElementById('ut-distance') as HTMLInputElement)?.value || '0';
            const vehicle = (document.getElementById('ut-vehicle') as any)?._value || '';
            const fuel = (document.getElementById('ut-fuel') as any)?._value || (document.getElementById('ut-fuel') as HTMLInputElement)?.value || '';
            const km = parseFloat(distStr) || 0;
            if (!mode || !vehicle || !fuel || km < 0) { toast({ title: 'Missing info', description: 'Select mode, vehicle, enter non-negative distance and fuel.' }); return; }
            setEmissionData(prev => ({ ...prev, scope3: [...prev.scope3, { id: `ut-${Date.now()}`, category: 'upstream_transportation', activity: `${mode} | ${vehicle} | Fuel: ${fuel}`, unit: 'km', quantity: km, emissions: 0 }] }));
            ['ut-mode','ut-distance','ut-vehicle','ut-fuel'].forEach(id => { const el = document.getElementById(id) as any; if (!el) return; if (id === 'ut-distance' || id==='ut-fuel') el.value=''; else el._value=''; });
          }}>Add Entry</Button>
        </div>
        {emissionData.scope3.filter(r => r.category === 'upstream_transportation').length > 0 && (
          <div className="space-y-2">
            {emissionData.scope3.filter(r => r.category === 'upstream_transportation').map(row => (
              <div key={row.id} className="flex items-center gap-3 p-3 border rounded-md bg-white">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{row.activity}</div>
                  <div className="text-xs text-gray-600">{row.quantity} km</div>
                </div>
                <Button variant="outline" size="icon" onClick={() => removeScope3Row(row.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
        <div className="pt-4 border-t">
          {(() => {
            const rows = emissionData.scope3.filter(r => r.category === 'upstream_transportation');
            const totalKm = rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
            const totalPending = rows.length;
            return (
              <div className="flex items-center justify-between">
                <div className="text-gray-700 font-medium">Total Distance: <span className="font-semibold">{totalKm.toFixed(1)} km</span></div>
                <Button onClick={() => toast({ title: 'Saved', description: 'Upstream transportation saved (frontend only for now).' })} disabled={totalPending === 0} className="bg-teal-600 hover:bg-teal-700 text-white"><Save className="h-4 w-4 mr-2" />{`Save Changes (${totalPending})`}</Button>
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  // Waste Generated
  if (activeCategory === 'wasteGenerated') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Waste Generated</h3>
            <p className="text-sm text-gray-600">Record waste types, volumes, and disposal methods</p>
          </div>
          <Button variant="default" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => (document.getElementById('wg-type') as HTMLInputElement)?.focus()}>
            <Plus className="h-4 w-4 mr-2" /> Add New Entry
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <Label>Waste Type</Label>
            <Select onValueChange={(v) => ((document.getElementById('wg-type') as any)._value = v)}>
              <SelectTrigger id="wg-type"><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Solid</SelectItem>
                <SelectItem value="hazardous">Hazardous</SelectItem>
                <SelectItem value="recyclables">Recyclables</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="wg-volume">Total Waste Volume (tonnes)</Label>
            <Input id="wg-volume" type="number" min={0} step={0.01} placeholder="0" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
          <div>
            <Label>Disposal Method</Label>
            <Select onValueChange={(v) => ((document.getElementById('wg-disposal') as any)._value = v)}>
              <SelectTrigger id="wg-disposal"><SelectValue placeholder="Select method" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="landfill">Landfill</SelectItem>
                <SelectItem value="incineration">Incineration</SelectItem>
                <SelectItem value="composting">Composting</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="wg-recycling">Recycling Rate (%)</Label>
            <Input id="wg-recycling" type="number" min={0} max={100} step={0.1} placeholder="0" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
        </div>
        <div className="flex items-center justify-end mt-2">
          <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => {
            const type = (document.getElementById('wg-type') as any)?._value || '';
            const volumeStr = (document.getElementById('wg-volume') as any)?._value || (document.getElementById('wg-volume') as HTMLInputElement)?.value || '0';
            const disposal = (document.getElementById('wg-disposal') as any)?._value || '';
            const rateStr = (document.getElementById('wg-recycling') as any)?._value || (document.getElementById('wg-recycling') as HTMLInputElement)?.value || '0';
            const volumeTonnes = parseFloat(volumeStr) || 0; const recyclingRate = parseFloat(rateStr) || 0;
            if (!type || !disposal || volumeTonnes < 0 || recyclingRate < 0 || recyclingRate > 100) { toast({ title: 'Missing/invalid info', description: 'Select type, disposal, non-negative volume, and 0–100% recycling rate.' }); return; }
            setEmissionData(prev => ({ ...prev, scope3: [...prev.scope3, { id: `wg-${Date.now()}`, category: 'waste_generated', activity: `${type} | ${disposal} | Recycle: ${recyclingRate}%`, unit: 'tonnes', quantity: volumeTonnes, emissions: 0 }] }));
            ['wg-type','wg-volume','wg-disposal','wg-recycling'].forEach(id => { const el = document.getElementById(id) as any; if (!el) return; if (id==='wg-volume' || id==='wg-recycling') el.value=''; else el._value=''; });
          }}>Add Entry</Button>
        </div>
        {emissionData.scope3.filter(r => r.category === 'waste_generated').length > 0 && (
          <div className="space-y-2">
            {emissionData.scope3.filter(r => r.category === 'waste_generated').map(row => (
              <div key={row.id} className="flex items-center gap-3 p-3 border rounded-md bg-white">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{row.activity}</div>
                  <div className="text-xs text-gray-600">{row.quantity} tonnes</div>
                </div>
                <Button variant="outline" size="icon" onClick={() => removeScope3Row(row.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
        <div className="pt-4 border-t">
          {(() => {
            const rows = emissionData.scope3.filter(r => r.category === 'waste_generated');
            const totalTonnes = rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
            const totalPending = rows.length;
            return (
              <div className="flex items-center justify-between">
                <div className="text-gray-700 font-medium">Total Waste: <span className="font-semibold">{totalTonnes.toFixed(2)} tonnes</span></div>
                <Button onClick={() => toast({ title: 'Saved', description: 'Waste entries saved (frontend only for now).' })} disabled={totalPending === 0} className="bg-teal-600 hover:bg-teal-700 text-white"><Save className="h-4 w-4 mr-2" />{`Save Changes (${totalPending})`}</Button>
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  // Business Travel
  if (activeCategory === 'businessTravel') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Business Travel</h3>
            <p className="text-sm text-gray-600">Travel modes, distance, nights, and commute data</p>
          </div>
          <Button variant="default" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => (document.getElementById('bt-mode') as HTMLInputElement)?.focus()}>
            <Plus className="h-4 w-4 mr-2" /> Add New Entry
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <Label>Travel Mode</Label>
            <Select onValueChange={(v) => ((document.getElementById('bt-mode') as any)._value = v)}>
              <SelectTrigger id="bt-mode"><SelectValue placeholder="Select mode" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="air">Air</SelectItem>
                <SelectItem value="rail">Rail</SelectItem>
                <SelectItem value="rental-car">Rental car</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="bt-distance">Distance (km)</Label>
            <Input id="bt-distance" type="number" min={0} step={0.1} placeholder="0" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
          <div>
            <Label htmlFor="bt-nights">Accommodation Nights</Label>
            <Input id="bt-nights" type="number" min={0} step={1} placeholder="0" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
          <div>
            <Label>Employee Commute Data</Label>
            <Select onValueChange={(v) => ((document.getElementById('bt-commute') as any)._value = v)}>
              <SelectTrigger id="bt-commute"><SelectValue placeholder="Yes/No" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-end mt-2">
          <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => {
            const mode = (document.getElementById('bt-mode') as any)?._value || '';
            const distStr = (document.getElementById('bt-distance') as any)?._value || (document.getElementById('bt-distance') as HTMLInputElement)?.value || '0';
            const nightsStr = (document.getElementById('bt-nights') as any)?._value || (document.getElementById('bt-nights') as HTMLInputElement)?.value || '0';
            const commute = (document.getElementById('bt-commute') as any)?._value || '';
            const km = parseFloat(distStr) || 0; const nights = parseInt(nightsStr || '0', 10) || 0;
            if (!mode || !commute || km < 0 || nights < 0) { toast({ title: 'Missing/invalid info', description: 'Select travel mode, commute yes/no, non-negative distance and nights.' }); return; }
            setEmissionData(prev => ({ ...prev, scope3: [...prev.scope3, { id: `bt-${Date.now()}`, category: 'business_travel', activity: `${mode} | Nights: ${nights} | Commute: ${commute}`, unit: 'km', quantity: km, emissions: 0 }] }));
            ['bt-mode','bt-distance','bt-nights','bt-commute'].forEach(id => { const el = document.getElementById(id) as any; if (!el) return; if (id==='bt-distance' || id==='bt-nights') el.value=''; else el._value=''; });
          }}>Add Entry</Button>
        </div>
        {emissionData.scope3.filter(r => r.category === 'business_travel').length > 0 && (
          <div className="space-y-2">
            {emissionData.scope3.filter(r => r.category === 'business_travel').map(row => (
              <div key={row.id} className="flex items-center gap-3 p-3 border rounded-md bg-white">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{row.activity}</div>
                  <div className="text-xs text-gray-600">{row.quantity} km</div>
                </div>
                <Button variant="outline" size="icon" onClick={() => removeScope3Row(row.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
        <div className="pt-4 border-t">
          {(() => {
            const rows = emissionData.scope3.filter(r => r.category === 'business_travel');
            const totalKm = rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
            const totalPending = rows.length;
            return (
              <div className="flex items-center justify-between">
                <div className="text-gray-700 font-medium">Total Distance: <span className="font-semibold">{totalKm.toFixed(1)} km</span></div>
                <Button onClick={() => toast({ title: 'Saved', description: 'Business travel entries saved (frontend only for now).' })} disabled={totalPending === 0} className="bg-teal-600 hover:bg-teal-700 text-white"><Save className="h-4 w-4 mr-2" />{`Save Changes (${totalPending})`}</Button>
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  // Employee Commuting
  if (activeCategory === 'employeeCommuting') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Employee Commuting</h3>
            <p className="text-sm text-gray-600">Modes, distance, WFH %, employees, carpooling</p>
          </div>
          <Button variant="default" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => (document.getElementById('ec-mode') as HTMLInputElement)?.focus()}>
            <Plus className="h-4 w-4 mr-2" /> Add New Entry
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <Label>Transportation Mode</Label>
            <Select onValueChange={(v) => ((document.getElementById('ec-mode') as any)._value = v)}>
              <SelectTrigger id="ec-mode"><SelectValue placeholder="Select mode" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="car">Car</SelectItem>
                <SelectItem value="bus">Bus</SelectItem>
                <SelectItem value="train">Train</SelectItem>
                <SelectItem value="bicycle">Bicycle</SelectItem>
                <SelectItem value="walk">Walk</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="ec-distance">Distance Traveled (km)</Label>
            <Input id="ec-distance" type="number" min={0} step={0.1} placeholder="0" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
          <div>
            <Label htmlFor="ec-wfh">Work-from-home (%)</Label>
            <Input id="ec-wfh" type="number" min={0} max={100} step={0.1} placeholder="0" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
          <div>
            <Label htmlFor="ec-employees">No. of Employees</Label>
            <Input id="ec-employees" type="number" min={0} step={1} placeholder="0" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
          <div>
            <Label htmlFor="ec-carpool">Carpooling Rate (%)</Label>
            <Input id="ec-carpool" type="number" min={0} max={100} step={0.1} placeholder="0" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
        </div>
        <div className="flex items-center justify-end mt-2">
          <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => {
            const mode = (document.getElementById('ec-mode') as any)?._value || '';
            const distStr = (document.getElementById('ec-distance') as any)?._value || (document.getElementById('ec-distance') as HTMLInputElement)?.value || '0';
            const wfhStr = (document.getElementById('ec-wfh') as any)?._value || (document.getElementById('ec-wfh') as HTMLInputElement)?.value || '0';
            const empStr = (document.getElementById('ec-employees') as any)?._value || (document.getElementById('ec-employees') as HTMLInputElement)?.value || '0';
            const carpoolStr = (document.getElementById('ec-carpool') as any)?._value || (document.getElementById('ec-carpool') as HTMLInputElement)?.value || '0';
            const km = parseFloat(distStr) || 0; const wfh = parseFloat(wfhStr) || 0; const employees = parseInt(empStr || '0', 10) || 0; const carpool = parseFloat(carpoolStr) || 0;
            if (!mode || km < 0 || wfh < 0 || wfh > 100 || employees < 0 || carpool < 0 || carpool > 100) { toast({ title: 'Missing/invalid info', description: 'Select mode and enter valid non-negative numbers; percentages between 0–100.' }); return; }
            setEmissionData(prev => ({ ...prev, scope3: [...prev.scope3, { id: `ec-${Date.now()}`, category: 'employee_commuting', activity: `${mode} | WFH: ${wfh}% | Emp: ${employees} | Carpool: ${carpool}%`, unit: 'km', quantity: km, emissions: 0 }] }));
            ['ec-mode','ec-distance','ec-wfh','ec-employees','ec-carpool'].forEach(id => { const el = document.getElementById(id) as any; if (!el) return; if (['ec-distance','ec-wfh','ec-employees','ec-carpool'].includes(id)) el.value=''; else el._value=''; });
          }}>Add Entry</Button>
        </div>
        {emissionData.scope3.filter(r => r.category === 'employee_commuting').length > 0 && (
          <div className="space-y-2">
            {emissionData.scope3.filter(r => r.category === 'employee_commuting').map(row => (
              <div key={row.id} className="flex items-center gap-3 p-3 border rounded-md bg-white">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{row.activity}</div>
                  <div className="text-xs text-gray-600">{row.quantity} km</div>
                </div>
                <Button variant="outline" size="icon" onClick={() => removeScope3Row(row.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
        <div className="pt-4 border-t">
          {(() => {
            const rows = emissionData.scope3.filter(r => r.category === 'employee_commuting');
            const totalKm = rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
            const totalPending = rows.length;
            return (
              <div className="flex items-center justify-between">
                <div className="text-gray-700 font-medium">Total Commute Distance: <span className="font-semibold">{totalKm.toFixed(1)} km</span></div>
                <Button onClick={() => toast({ title: 'Saved', description: 'Employee commuting entries saved (frontend only for now).' })} disabled={totalPending === 0} className="bg-teal-600 hover:bg-teal-700 text-white"><Save className="h-4 w-4 mr-2" />{`Save Changes (${totalPending})`}</Button>
              </div>
            );
          })()}
        </div>
      </div>
    );
  }
  // Upstream Leased Assets
  if (activeCategory === 'upstreamLeasedAssets') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Upstream Leased Assets</h3>
            <p className="text-sm text-gray-600">Asset types, lease duration, energy, maintenance</p>
          </div>
          <Button variant="default" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => (document.getElementById('ula-asset') as HTMLInputElement)?.focus()}>
            <Plus className="h-4 w-4 mr-2" /> Add New Entry
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <Label>Asset Type</Label>
            <Select onValueChange={(v) => ((document.getElementById('ula-asset') as any)._value = v)}>
              <SelectTrigger id="ula-asset"><SelectValue placeholder="Select asset" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="office">Office</SelectItem>
                <SelectItem value="warehouse">Warehouse</SelectItem>
                <SelectItem value="heavy-machinery">Heavy machinery</SelectItem>
                <SelectItem value="vehicle-fleet">Vehicle fleet</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="ula-duration">Lease Duration</Label>
            <Input id="ula-duration" placeholder="e.g., 24 months" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
          <div>
            <Label htmlFor="ula-energy">Energy Consumption</Label>
            <Input id="ula-energy" placeholder="e.g., 12,000 kWh/year" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
          <div>
            <Label htmlFor="ula-maintenance">Maintenance Practices</Label>
            <Input id="ula-maintenance" placeholder="" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
        </div>
        <div className="flex items-center justify-end mt-2">
          <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => {
            const asset = (document.getElementById('ula-asset') as any)?._value || '';
            const duration = (document.getElementById('ula-duration') as any)?._value || (document.getElementById('ula-duration') as HTMLInputElement)?.value || '';
            const energy = (document.getElementById('ula-energy') as any)?._value || (document.getElementById('ula-energy') as HTMLInputElement)?.value || '';
            const maintenance = (document.getElementById('ula-maintenance') as any)?._value || (document.getElementById('ula-maintenance') as HTMLInputElement)?.value || '';
            if (!asset || !duration || !energy || !maintenance) { toast({ title: 'Missing info', description: 'Fill all leased asset fields before adding.' }); return; }
            setEmissionData(prev => ({ ...prev, scope3: [...prev.scope3, { id: `ula-${Date.now()}`, category: 'upstream_leased_assets', activity: `${asset} | ${duration} | ${energy}`, unit: 'asset', quantity: 1, emissions: 0 }] }));
            ['ula-asset','ula-duration','ula-energy','ula-maintenance'].forEach(id => { const el = document.getElementById(id) as any; if (!el) return; if (['ula-duration','ula-energy','ula-maintenance'].includes(id)) el.value=''; else el._value=''; });
          }}>Add Entry</Button>
        </div>
        {emissionData.scope3.filter(r => r.category === 'upstream_leased_assets').length > 0 && (
          <div className="space-y-2">
            {emissionData.scope3.filter(r => r.category === 'upstream_leased_assets').map(row => (
              <div key={row.id} className="flex items-center gap-3 p-3 border rounded-md bg-white">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{row.activity}</div>
                  <div className="text-xs text-gray-600">1 asset</div>
                </div>
                <Button variant="outline" size="icon" onClick={() => removeScope3Row(row.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
        <div className="pt-4 border-t">
          {(() => {
            const rows = emissionData.scope3.filter(r => r.category === 'upstream_leased_assets');
            const totalItems = rows.length;
            return (
              <div className="flex items-center justify-between">
                <div className="text-gray-700 font-medium">Total Leased Assets: <span className="font-semibold">{totalItems}</span></div>
                <Button onClick={() => toast({ title: 'Saved', description: 'Upstream leased assets saved (frontend only for now).' })} disabled={totalItems === 0} className="bg-teal-600 hover:bg-teal-700 text-white"><Save className="h-4 w-4 mr-2" />{`Save Changes (${totalItems})`}</Button>
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  // Investments
  if (activeCategory === 'investments') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Investments</h3>
            <p className="text-sm text-gray-600">Investment portfolio and investee emissions</p>
          </div>
          <Button variant="default" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => (document.getElementById('inv-portfolio') as HTMLInputElement)?.focus()}>
            <Plus className="h-4 w-4 mr-2" /> Add New Entry
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <Label htmlFor="inv-portfolio">Investment Portfolio</Label>
            <Input id="inv-portfolio" placeholder="Enter portfolio details" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
          <div>
            <Label htmlFor="inv-emissions">Investee Company Emissions Data</Label>
            <Input id="inv-emissions" placeholder="Enter reported emissions data" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
        </div>
        <div className="flex items-center justify-end mt-2">
          <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => {
            const portfolio = (document.getElementById('inv-portfolio') as any)?._value || (document.getElementById('inv-portfolio') as HTMLInputElement)?.value || '';
            const emissions = (document.getElementById('inv-emissions') as any)?._value || (document.getElementById('inv-emissions') as HTMLInputElement)?.value || '';
            if (!portfolio || !emissions) { toast({ title: 'Missing info', description: 'Enter portfolio and investee emissions data.' }); return; }
            setEmissionData(prev => ({ ...prev, scope3: [...prev.scope3, { id: `inv-${Date.now()}`, category: 'investments', activity: `${portfolio}`, unit: 'entry', quantity: 1, emissions: 0 }] }));
            ['inv-portfolio','inv-emissions'].forEach(id => { const el = document.getElementById(id) as HTMLInputElement; if (el) el.value=''; });
          }}>Add Entry</Button>
        </div>
        {emissionData.scope3.filter(r => r.category === 'investments').length > 0 && (
          <div className="space-y-2">
            {emissionData.scope3.filter(r => r.category === 'investments').map(row => (
              <div key={row.id} className="flex items-center gap-3 p-3 border rounded-md bg-white">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{row.activity}</div>
                  <div className="text-xs text-gray-600">Investee emissions recorded</div>
                </div>
                <Button variant="outline" size="icon" onClick={() => removeScope3Row(row.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
        <div className="pt-4 border-t">
          {(() => {
            const rows = emissionData.scope3.filter(r => r.category === 'investments');
            const totalPending = rows.length;
            return (
              <div className="flex items-center justify-between">
                <div className="text-gray-700 font-medium">Total Investment Entries: <span className="font-semibold">{totalPending}</span></div>
                <Button onClick={() => toast({ title: 'Saved', description: 'Investment entries saved (frontend only for now).' })} disabled={totalPending === 0} className="bg-teal-600 hover:bg-teal-700 text-white"><Save className="h-4 w-4 mr-2" />{`Save Changes (${totalPending})`}</Button>
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  // Downstream Transportation
  if (activeCategory === 'downstreamTransportation') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Downstream Transportation</h3>
            <p className="text-sm text-gray-600">Distribution methods, distance, vehicles, packaging</p>
          </div>
          <Button variant="default" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => (document.getElementById('dt-method') as HTMLInputElement)?.focus()}>
            <Plus className="h-4 w-4 mr-2" /> Add New Entry
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <Label>Product Distribution Method</Label>
            <Select onValueChange={(v) => ((document.getElementById('dt-method') as any)._value = v)}>
              <SelectTrigger id="dt-method"><SelectValue placeholder="Select method" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="logistics">Logistics provider</SelectItem>
                <SelectItem value="direct-shipment">Direct shipment</SelectItem>
                <SelectItem value="third-party">Third-party distribution</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="dt-distance">Transportation Distance (km)</Label>
            <Input id="dt-distance" type="number" min={0} step={0.1} placeholder="0" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
          <div>
            <Label>Vehicle Type</Label>
            <Select onValueChange={(v) => ((document.getElementById('dt-vehicle') as any)._value = v)}>
              <SelectTrigger id="dt-vehicle"><SelectValue placeholder="Select vehicle" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="truck">Truck</SelectItem>
                <SelectItem value="van">Van</SelectItem>
                <SelectItem value="electric-truck">Electric truck</SelectItem>
                <SelectItem value="ship">Ship</SelectItem>
                <SelectItem value="rail">Rail</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Packaging Materials</Label>
            <Select onValueChange={(v) => ((document.getElementById('dt-packaging') as any)._value = v)}>
              <SelectTrigger id="dt-packaging"><SelectValue placeholder="Select material" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cardboard">Cardboard</SelectItem>
                <SelectItem value="plastic">Plastic</SelectItem>
                <SelectItem value="paper">Paper</SelectItem>
                <SelectItem value="wood">Wood</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-end mt-2">
          <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => {
            const method = (document.getElementById('dt-method') as any)?._value || '';
            const distStr = (document.getElementById('dt-distance') as any)?._value || (document.getElementById('dt-distance') as HTMLInputElement)?.value || '0';
            const vehicle = (document.getElementById('dt-vehicle') as any)?._value || '';
            const packaging = (document.getElementById('dt-packaging') as any)?._value || '';
            const km = parseFloat(distStr) || 0;
            if (!method || !vehicle || !packaging || km < 0) { toast({ title: 'Missing/invalid info', description: 'Select method, vehicle, packaging and non-negative distance.' }); return; }
            setEmissionData(prev => ({ ...prev, scope3: [...prev.scope3, { id: `dt-${Date.now()}`, category: 'downstream_transportation', activity: `${method} | ${vehicle} | ${packaging}`, unit: 'km', quantity: km, emissions: 0 }] }));
            ['dt-method','dt-distance','dt-vehicle','dt-packaging'].forEach(id => { const el = document.getElementById(id) as any; if (!el) return; if (id==='dt-distance') el.value=''; else el._value=''; });
          }}>Add Entry</Button>
        </div>
        {emissionData.scope3.filter(r => r.category === 'downstream_transportation').length > 0 && (
          <div className="space-y-2">
            {emissionData.scope3.filter(r => r.category === 'downstream_transportation').map(row => (
              <div key={row.id} className="flex items-center gap-3 p-3 border rounded-md bg-white">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{row.activity}</div>
                  <div className="text-xs text-gray-600">{row.quantity} km</div>
                </div>
                <Button variant="outline" size="icon" onClick={() => removeScope3Row(row.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
        <div className="pt-4 border-t">
          {(() => {
            const rows = emissionData.scope3.filter(r => r.category === 'downstream_transportation');
            const totalKm = rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
            const totalPending = rows.length;
            return (
              <div className="flex items-center justify-between">
                <div className="text-gray-700 font-medium">Total Distance: <span className="font-semibold">{totalKm.toFixed(1)} km</span></div>
                <Button onClick={() => toast({ title: 'Saved', description: 'Downstream transportation saved (frontend only for now).' })} disabled={totalPending === 0} className="bg-teal-600 hover:bg-teal-700 text-white"><Save className="h-4 w-4 mr-2" />{`Save Changes (${totalPending})`}</Button>
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  // Processing of Sold Products
  if (activeCategory === 'processingSoldProducts') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Processing of Sold Products</h3>
            <p className="text-sm text-gray-600">Lifecycle data, transformations, and energy use</p>
          </div>
          <Button variant="default" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => (document.getElementById('psp-lifecycle') as HTMLInputElement)?.focus()}>
            <Plus className="h-4 w-4 mr-2" /> Add New Entry
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <Label>Product Lifecycle Data</Label>
            <Select onValueChange={(v) => ((document.getElementById('psp-lifecycle') as any)._value = v)}>
              <SelectTrigger id="psp-lifecycle"><SelectValue placeholder="Yes/No" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="psp-transform">Material Transformations</Label>
            <Input id="psp-transform" placeholder="Describe transformations" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
          <div>
            <Label htmlFor="psp-energy">Energy Consumption</Label>
            <Input id="psp-energy" placeholder="e.g., kWh or fuel usage" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
        </div>
        <div className="flex items-center justify-end mt-2">
          <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => {
            const lifecycle = (document.getElementById('psp-lifecycle') as any)?._value || '';
            const transform = (document.getElementById('psp-transform') as any)?._value || (document.getElementById('psp-transform') as HTMLInputElement)?.value || '';
            const energy = (document.getElementById('psp-energy') as any)?._value || (document.getElementById('psp-energy') as HTMLInputElement)?.value || '';
            if (!lifecycle || !transform || !energy) { toast({ title: 'Missing info', description: 'Select lifecycle and enter transformations and energy.' }); return; }
            setEmissionData(prev => ({ ...prev, scope3: [...prev.scope3, { id: `psp-${Date.now()}`, category: 'processing_sold_products', activity: `Lifecycle: ${lifecycle} | ${transform}`, unit: 'entry', quantity: 1, emissions: 0 }] }));
            ['psp-lifecycle','psp-transform','psp-energy'].forEach(id => { const el = document.getElementById(id) as any; if (!el) return; if (['psp-transform','psp-energy'].includes(id)) el.value=''; else el._value=''; });
          }}>Add Entry</Button>
        </div>
        {emissionData.scope3.filter(r => r.category === 'processing_sold_products').length > 0 && (
          <div className="space-y-2">
            {emissionData.scope3.filter(r => r.category === 'processing_sold_products').map(row => (
              <div key={row.id} className="flex items-center gap-3 p-3 border rounded-md bg-white">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{row.activity}</div>
                  <div className="text-xs text-gray-600">Energy captured</div>
                </div>
                <Button variant="outline" size="icon" onClick={() => removeScope3Row(row.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
        <div className="pt-4 border-t">
          {(() => {
            const rows = emissionData.scope3.filter(r => r.category === 'processing_sold_products');
            const totalPending = rows.length;
            return (
              <div className="flex items-center justify-between">
                <div className="text-gray-700 font-medium">Total Processing Entries: <span className="font-semibold">{totalPending}</span></div>
                <Button onClick={() => toast({ title: 'Saved', description: 'Processing of sold products saved (frontend only for now).' })} disabled={totalPending === 0} className="bg-teal-600 hover:bg-teal-700 text-white"><Save className="h-4 w-4 mr-2" />{`Save Changes (${totalPending})`}</Button>
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  // Use of Sold Products
  if (activeCategory === 'useOfSoldProducts') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Use of Sold Products</h3>
            <p className="text-sm text-gray-600">Usage specs and energy during use</p>
          </div>
          <Button variant="default" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => (document.getElementById('usp-specs') as HTMLInputElement)?.focus()}>
            <Plus className="h-4 w-4 mr-2" /> Add New Entry
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <Label htmlFor="usp-specs">Product Specifications</Label>
            <Input id="usp-specs" placeholder="Enter specifications" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
          <div>
            <Label htmlFor="usp-usage">Expected Usage Patterns</Label>
            <Input id="usp-usage" placeholder="e.g., hours/day or cycles" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
          <div>
            <Label htmlFor="usp-energy">Energy Consumption During Use</Label>
            <Input id="usp-energy" placeholder="e.g., kWh/year" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
        </div>
        <div className="flex items-center justify-end mt-2">
          <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => {
            const specs = (document.getElementById('usp-specs') as any)?._value || (document.getElementById('usp-specs') as HTMLInputElement)?.value || '';
            const usage = (document.getElementById('usp-usage') as any)?._value || (document.getElementById('usp-usage') as HTMLInputElement)?.value || '';
            const energy = (document.getElementById('usp-energy') as any)?._value || (document.getElementById('usp-energy') as HTMLInputElement)?.value || '';
            if (!specs || !usage || !energy) { toast({ title: 'Missing info', description: 'Enter product specs, usage patterns, and energy consumption.' }); return; }
            setEmissionData(prev => ({ ...prev, scope3: [...prev.scope3, { id: `usp-${Date.now()}`, category: 'use_of_sold_products', activity: `${specs} | Usage: ${usage}`, unit: 'entry', quantity: 1, emissions: 0 }] }));
            ['usp-specs','usp-usage','usp-energy'].forEach(id => { const el = document.getElementById(id) as HTMLInputElement; if (el) el.value=''; });
          }}>Add Entry</Button>
        </div>
        {emissionData.scope3.filter(r => r.category === 'use_of_sold_products').length > 0 && (
          <div className="space-y-2">
            {emissionData.scope3.filter(r => r.category === 'use_of_sold_products').map(row => (
              <div key={row.id} className="flex items-center gap-3 p-3 border rounded-md bg-white">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{row.activity}</div>
                  <div className="text-xs text-gray-600">Energy during use recorded</div>
                </div>
                <Button variant="outline" size="icon" onClick={() => removeScope3Row(row.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
        <div className="pt-4 border-t">
          {(() => {
            const rows = emissionData.scope3.filter(r => r.category === 'use_of_sold_products');
            const totalPending = rows.length;
            return (
              <div className="flex items-center justify-between">
                <div className="text-gray-700 font-medium">Total Use Entries: <span className="font-semibold">{totalPending}</span></div>
                <Button onClick={() => toast({ title: 'Saved', description: 'Use of sold products saved (frontend only for now).' })} disabled={totalPending === 0} className="bg-teal-600 hover:bg-teal-700 text-white"><Save className="h-4 w-4 mr-2" />{`Save Changes (${totalPending})`}</Button>
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  // End-of-Life Treatment
  if (activeCategory === 'endOfLifeTreatment') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-base font-semibold text-gray-900">End-of-Life Treatment</h3>
            <p className="text-sm text-gray-600">Disposal methods, recycling potential, materials</p>
          </div>
          <Button variant="default" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => (document.getElementById('eol-method') as HTMLInputElement)?.focus()}>
            <Plus className="h-4 w-4 mr-2" /> Add New Entry
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <Label>Product Disposal Method</Label>
            <Select onValueChange={(v) => ((document.getElementById('eol-method') as any)._value = v)}>
              <SelectTrigger id="eol-method"><SelectValue placeholder="Select method" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="landfill">Landfill</SelectItem>
                <SelectItem value="incineration">Incineration</SelectItem>
                <SelectItem value="recycling">Recycling</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="eol-recycle">Recycling Potential (%)</Label>
            <Input id="eol-recycle" type="number" min={0} max={100} step={0.1} placeholder="0" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
          <div>
            <Label htmlFor="eol-materials">Material Composition</Label>
            <Input id="eol-materials" placeholder="Enter materials" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
        </div>
        <div className="flex items-center justify-end mt-2">
          <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => {
            const method = (document.getElementById('eol-method') as any)?._value || '';
            const recycleStr = (document.getElementById('eol-recycle') as any)?._value || (document.getElementById('eol-recycle') as HTMLInputElement)?.value || '0';
            const materials = (document.getElementById('eol-materials') as any)?._value || (document.getElementById('eol-materials') as HTMLInputElement)?.value || '';
            const recycle = parseFloat(recycleStr) || 0;
            if (!method || !materials || recycle < 0 || recycle > 100) { toast({ title: 'Missing/invalid info', description: 'Select disposal method, enter materials and 0–100% recycling potential.' }); return; }
            setEmissionData(prev => ({ ...prev, scope3: [...prev.scope3, { id: `eol-${Date.now()}`, category: 'end_of_life_treatment', activity: `${method} | Recycle: ${recycle}% | ${materials}`, unit: 'entry', quantity: 1, emissions: 0 }] }));
            ['eol-method','eol-recycle','eol-materials'].forEach(id => { const el = document.getElementById(id) as any; if (!el) return; if (['eol-recycle','eol-materials'].includes(id)) el.value=''; else el._value=''; });
          }}>Add Entry</Button>
        </div>
        {emissionData.scope3.filter(r => r.category === 'end_of_life_treatment').length > 0 && (
          <div className="space-y-2">
            {emissionData.scope3.filter(r => r.category === 'end_of_life_treatment').map(row => (
              <div key={row.id} className="flex items-center gap-3 p-3 border rounded-md bg-white">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{row.activity}</div>
                  <div className="text-xs text-gray-600">Recorded end-of-life treatment</div>
                </div>
                <Button variant="outline" size="icon" onClick={() => removeScope3Row(row.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
        <div className="pt-4 border-t">
          {(() => {
            const rows = emissionData.scope3.filter(r => r.category === 'end_of_life_treatment');
            const totalPending = rows.length;
            return (
              <div className="flex items-center justify-between">
                <div className="text-gray-700 font-medium">Total EoL Entries: <span className="font-semibold">{totalPending}</span></div>
                <Button onClick={() => toast({ title: 'Saved', description: 'End-of-life entries saved (frontend only for now).' })} disabled={totalPending === 0} className="bg-teal-600 hover:bg-teal-700 text-white"><Save className="h-4 w-4 mr-2" />{`Save Changes (${totalPending})`}</Button>
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  // Downstream Leased Assets
  if (activeCategory === 'downstreamLeasedAssets') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Downstream Leased Assets</h3>
            <p className="text-sm text-gray-600">Asset types, energy consumption, tenant activities</p>
          </div>
          <Button variant="default" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => (document.getElementById('dla-asset') as HTMLInputElement)?.focus()}>
            <Plus className="h-4 w-4 mr-2" /> Add New Entry
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <Label htmlFor="dla-asset">Asset Types</Label>
            <Input id="dla-asset" placeholder="Enter asset types" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
          <div>
            <Label htmlFor="dla-energy">Energy Consumption</Label>
            <Input id="dla-energy" placeholder="e.g., kWh/year" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
          <div>
            <Label htmlFor="dla-tenant">Tenant Activities</Label>
            <Input id="dla-tenant" placeholder="Enter tenant activities" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
        </div>
        <div className="flex items-center justify-end mt-2">
          <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => {
            const asset = (document.getElementById('dla-asset') as any)?._value || (document.getElementById('dla-asset') as HTMLInputElement)?.value || '';
            const energy = (document.getElementById('dla-energy') as any)?._value || (document.getElementById('dla-energy') as HTMLInputElement)?.value || '';
            const tenant = (document.getElementById('dla-tenant') as any)?._value || (document.getElementById('dla-tenant') as HTMLInputElement)?.value || '';
            if (!asset || !energy || !tenant) { toast({ title: 'Missing info', description: 'Enter asset types, energy consumption, and tenant activities.' }); return; }
            setEmissionData(prev => ({ ...prev, scope3: [...prev.scope3, { id: `dla-${Date.now()}`, category: 'downstream_leased_assets', activity: `${asset} | ${energy} | ${tenant}`, unit: 'asset', quantity: 1, emissions: 0 }] }));
            ['dla-asset','dla-energy','dla-tenant'].forEach(id => { const el = document.getElementById(id) as HTMLInputElement; if (el) el.value=''; });
          }}>Add Entry</Button>
        </div>
        {emissionData.scope3.filter(r => r.category === 'downstream_leased_assets').length > 0 && (
          <div className="space-y-2">
            {emissionData.scope3.filter(r => r.category === 'downstream_leased_assets').map(row => (
              <div key={row.id} className="flex items-center gap-3 p-3 border rounded-md bg-white">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{row.activity}</div>
                  <div className="text-xs text-gray-600">1 asset</div>
                </div>
                <Button variant="outline" size="icon" onClick={() => removeScope3Row(row.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
        <div className="pt-4 border-t">
          {(() => {
            const rows = emissionData.scope3.filter(r => r.category === 'downstream_leased_assets');
            const totalItems = rows.length;
            return (
              <div className="flex items-center justify-between">
                <div className="text-gray-700 font-medium">Total Downstream Leased Assets: <span className="font-semibold">{totalItems}</span></div>
                <Button onClick={() => toast({ title: 'Saved', description: 'Downstream leased assets saved (frontend only for now).' })} disabled={totalItems === 0} className="bg-teal-600 hover:bg-teal-700 text-white"><Save className="h-4 w-4 mr-2" />{`Save Changes (${totalItems})`}</Button>
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  // Franchises
  if (activeCategory === 'franchises') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Franchises</h3>
            <p className="text-sm text-gray-600">Franchise details, operations, and energy use</p>
          </div>
          <Button variant="default" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => (document.getElementById('fr-details') as HTMLInputElement)?.focus()}>
            <Plus className="h-4 w-4 mr-2" /> Add New Entry
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <Label htmlFor="fr-details">Franchise Details</Label>
            <Input id="fr-details" placeholder="Enter franchise info" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
          <div>
            <Label htmlFor="fr-ops">Operational Practices</Label>
            <Input id="fr-ops" placeholder="Describe ops practices" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
          <div>
            <Label htmlFor="fr-energy">Energy Consumption</Label>
            <Input id="fr-energy" placeholder="e.g., kWh/year" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
        </div>
        <div className="flex items-center justify-end mt-2">
          <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => {
            const details = (document.getElementById('fr-details') as any)?._value || (document.getElementById('fr-details') as HTMLInputElement)?.value || '';
            const ops = (document.getElementById('fr-ops') as any)?._value || (document.getElementById('fr-ops') as HTMLInputElement)?.value || '';
            const energy = (document.getElementById('fr-energy') as any)?._value || (document.getElementById('fr-energy') as HTMLInputElement)?.value || '';
            if (!details || !ops || !energy) { toast({ title: 'Missing info', description: 'Enter franchise details, operational practices, and energy consumption.' }); return; }
            setEmissionData(prev => ({ ...prev, scope3: [...prev.scope3, { id: `fr-${Date.now()}`, category: 'franchises', activity: `${details} | ${ops}`, unit: 'entry', quantity: 1, emissions: 0 }] }));
            ['fr-details','fr-ops','fr-energy'].forEach(id => { const el = document.getElementById(id) as HTMLInputElement; if (el) el.value=''; });
          }}>Add Entry</Button>
        </div>
        {emissionData.scope3.filter(r => r.category === 'franchises').length > 0 && (
          <div className="space-y-2">
            {emissionData.scope3.filter(r => r.category === 'franchises').map(row => (
              <div key={row.id} className="flex items-center gap-3 p-3 border rounded-md bg-white">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{row.activity}</div>
                  <div className="text-xs text-gray-600">Energy captured</div>
                </div>
                <Button variant="outline" size="icon" onClick={() => removeScope3Row(row.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
        <div className="pt-4 border-t">
          {(() => {
            const rows = emissionData.scope3.filter(r => r.category === 'franchises');
            const totalPending = rows.length;
            return (
              <div className="flex items-center justify-between">
                <div className="text-gray-700 font-medium">Total Franchise Entries: <span className="font-semibold">{totalPending}</span></div>
                <Button onClick={() => toast({ title: 'Saved', description: 'Franchise entries saved (frontend only for now).' })} disabled={totalPending === 0} className="bg-teal-600 hover:bg-teal-700 text-white"><Save className="h-4 w-4 mr-2" />{`Save Changes (${totalPending})`}</Button>
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  return null;
};

export default Scope3Section;


