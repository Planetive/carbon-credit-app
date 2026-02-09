import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Save, Trash2, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEmissionSync } from "../hooks/useEmissionSync";
import type { InvestmentRow } from "../types/scope3Types";
import type { EmissionData } from "@/components/emissions/shared/types";

interface InvestmentsSectionProps {
  user: { id: string };
  companyContext?: boolean;
  counterpartyId?: string;
  setEmissionData: React.Dispatch<React.SetStateAction<EmissionData>>;
  onSaveAndNext?: () => void;
}

export const InvestmentsSection: React.FC<InvestmentsSectionProps> = ({
  user,
  companyContext,
  counterpartyId,
  setEmissionData,
  onSaveAndNext,
}) => {
  const { toast } = useToast();
  
  // State
  const [investmentRows, setInvestmentRows] = useState<InvestmentRow[]>([]);
  const [existingInvestments, setExistingInvestments] = useState<InvestmentRow[]>([]);
  const [savingInvestments, setSavingInvestments] = useState(false);
  const [deletingInvestments, setDeletingInvestments] = useState<Set<string>>(new Set());
  const [isInitialLoadInvestments, setIsInitialLoadInvestments] = useState(true);

  // Helper functions
  const newInvestmentRow = (): InvestmentRow => ({
    id: `inv-${Date.now()}-${Math.random()}`,
    companyName: '',
    emissions: undefined,
    percentage: undefined,
    calculatedEmissions: undefined,
  });
  
  const addInvestmentRow = () => setInvestmentRows(prev => [...prev, newInvestmentRow()]);
  const removeInvestmentRow = (id: string) => setInvestmentRows(prev => prev.filter(r => r.id !== id));
  
  const updateInvestmentRow = (id: string, patch: Partial<InvestmentRow>) => {
    setInvestmentRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, ...patch };
      // Calculate emissions based on ownership percentage
      if (typeof updated.emissions === 'number' && updated.emissions >= 0 && 
          typeof updated.percentage === 'number' && updated.percentage >= 0 && updated.percentage <= 100) {
        updated.calculatedEmissions = (updated.emissions * updated.percentage) / 100;
      } else {
        updated.calculatedEmissions = undefined;
      }
      return updated;
    }));
  };

  // Load existing Investments entries
  useEffect(() => {
    const loadInvestments = async () => {
      if (!user) return;

      if (companyContext && !counterpartyId) {
        setInvestmentRows([]);
        setExistingInvestments([]);
        setIsInitialLoadInvestments(false);
        return;
      }

      try {
        let query = supabase
          .from('scope3_investments')
          .select('*')
          .eq('user_id', user.id);

        if (companyContext && counterpartyId) {
          query = query.eq('counterparty_id', counterpartyId);
        } else {
          query = query.is('counterparty_id', null);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        const loadedRows = (data || []).map(entry => ({
          id: crypto.randomUUID(),
          dbId: entry.id,
          isExisting: true,
          companyName: entry.company_name || '',
          emissions: entry.total_emissions,
          percentage: entry.ownership_percentage,
          calculatedEmissions: entry.calculated_emissions,
        }));

        setExistingInvestments(loadedRows);
        setInvestmentRows(loadedRows.length > 0 ? loadedRows : []);
      } catch (error: any) {
        console.error('Error loading investments:', error);
        toast({ title: "Error", description: "Failed to load investments entries", variant: "destructive" });
      } finally {
        setIsInitialLoadInvestments(false);
      }
    };

    loadInvestments();
  }, [user, companyContext, counterpartyId, toast]);

  // Sync investments rows to emissionData
  useEmissionSync({
    category: "investments",
    rows: investmentRows,
    isInitialLoad: isInitialLoadInvestments,
    mapRowToEntry: (r) => {
      if (!r.companyName || typeof r.emissions !== "number" || r.emissions < 0 || 
          typeof r.percentage !== "number" || r.percentage < 0 || r.percentage > 100) {
        return null;
      }
      return {
        id: r.id,
        category: "investments",
        activity: `${r.companyName} (${r.percentage}% owned)`,
        unit: "tCO₂e",
        quantity: r.percentage,
        factor: r.emissions,
        emissions: r.calculatedEmissions || 0,
      };
    },
    setEmissionData,
  });

  // Save Investments
  const saveInvestments = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please log in to save.", variant: "destructive" });
      return;
    }

    const newEntries = investmentRows.filter(r => 
      r.companyName && typeof r.emissions === 'number' && r.emissions >= 0 && 
      typeof r.percentage === 'number' && r.percentage >= 0 && r.percentage <= 100 && !r.isExisting
    );

    const changedExisting = investmentRows.filter(r => {
      if (!r.isExisting || !r.dbId) return false;
      const existing = existingInvestments.find(e => e.dbId === r.dbId);
      if (!existing) return false;
      return existing.companyName !== r.companyName || 
             existing.emissions !== r.emissions ||
             existing.percentage !== r.percentage ||
             Math.abs((existing.calculatedEmissions || 0) - (r.calculatedEmissions || 0)) > 0.01;
    });

    if (newEntries.length === 0 && changedExisting.length === 0) {
      toast({ title: "Nothing to save", description: "No new or changed investment entries." });
      return;
    }

    setSavingInvestments(true);
    try {
      if (newEntries.length > 0) {
        const payload = newEntries.map(r => ({
          user_id: user.id,
          counterparty_id: companyContext && counterpartyId ? counterpartyId : null,
          company_name: r.companyName,
          total_emissions: r.emissions!,
          ownership_percentage: r.percentage!,
          calculated_emissions: r.calculatedEmissions!,
        }));

        const { error } = await supabase.from('scope3_investments').insert(payload);
        if (error) throw error;
      }

      if (changedExisting.length > 0) {
        const updates = changedExisting.map(r => (
          supabase
            .from('scope3_investments')
            .update({
              company_name: r.companyName,
              total_emissions: r.emissions!,
              ownership_percentage: r.percentage!,
              calculated_emissions: r.calculatedEmissions!,
            })
            .eq('id', r.dbId!)
        ));
        const results = await Promise.all(updates);
        const updateError = results.find(r => (r as any).error)?.error;
        if (updateError) throw updateError;
      }

      toast({ 
        title: "Saved", 
        description: `Saved ${newEntries.length} new and updated ${changedExisting.length} entries.` 
      });

      const { data: newData } = await supabase
        .from('scope3_investments')
        .select('*')
        .eq('user_id', user.id)
        .is('counterparty_id', companyContext && counterpartyId ? counterpartyId : null)
        .order('created_at', { ascending: false });

      if (newData) {
        const updatedRows = newData.map(entry => ({
          id: crypto.randomUUID(),
          dbId: entry.id,
          isExisting: true,
          companyName: entry.company_name || '',
          emissions: entry.total_emissions,
          percentage: entry.ownership_percentage,
          calculatedEmissions: entry.calculated_emissions,
        }));
        setExistingInvestments(updatedRows);
        setInvestmentRows(updatedRows);
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save", variant: "destructive" });
    } finally {
      setSavingInvestments(false);
    }
  };

  // Delete Investments entry
  const deleteInvestmentRow = async (id: string) => {
    const row = investmentRows.find(r => r.id === id);
    if (!row || !row.dbId) {
      removeInvestmentRow(id);
      return;
    }

    if (!confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      return;
    }

    setDeletingInvestments(prev => new Set(prev).add(id));
    try {
      const { error } = await supabase
        .from('scope3_investments')
        .delete()
        .eq('id', row.dbId);

      if (error) throw error;

      toast({ title: "Deleted", description: "Entry deleted successfully." });
      
      setInvestmentRows(prev => prev.filter(r => r.id !== id));
      setExistingInvestments(prev => prev.filter(r => r.id !== id));
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete entry", variant: "destructive" });
    } finally {
      setDeletingInvestments(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  // UI
  const totalEmissions = investmentRows.reduce((sum, r) => sum + (r.calculatedEmissions || 0), 0);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">Investments</h4>
          <p className="text-sm text-gray-600">Investment portfolio and investee emissions</p>
        </div>
        <Button onClick={addInvestmentRow} className="bg-teal-600 hover:bg-teal-700 text-white">
          <Plus className="h-4 w-4 mr-2" />Add New Entry
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center mb-4">
        <Label className="text-gray-500 font-medium">Investee Company Name</Label>
        <Label className="text-gray-500 font-medium">Emissions Data (tCO₂e)</Label>
        <Label className="text-gray-500 font-medium">Ownership (%)</Label>
        <Label className="text-gray-500 font-medium">Calculated Emissions</Label>
      </div>

      <div className="space-y-4">
        {investmentRows.map((r) => (
          <div key={r.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-4 rounded-lg bg-gray-50 border border-gray-200">
            <div className="w-full">
              <Input
                value={r.companyName}
                onChange={(e) => updateInvestmentRow(r.id, { companyName: e.target.value })}
                placeholder="Enter company name"
                className="w-full"
              />
            </div>
            <div className="w-full">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={r.emissions ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    updateInvestmentRow(r.id, { emissions: undefined });
                  } else {
                    const numValue = Number(value);
                    if (numValue >= 0) {
                      updateInvestmentRow(r.id, { emissions: numValue });
                    }
                  }
                }}
                placeholder="Enter emissions"
                className="w-full"
              />
            </div>
            <div className="w-full">
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={r.percentage ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    updateInvestmentRow(r.id, { percentage: undefined });
                  } else {
                    const numValue = Number(value);
                    if (numValue >= 0 && numValue <= 100) {
                      updateInvestmentRow(r.id, { percentage: numValue });
                    }
                  }
                }}
                placeholder="Enter percentage"
                className="w-full"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-700 font-medium flex-1">
                {r.calculatedEmissions !== undefined ? `${r.calculatedEmissions.toFixed(2)} tCO₂e` : '-'}
              </div>
              {r.isExisting ? (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-red-600 hover:text-red-700 hover:bg-red-50" 
                    onClick={() => deleteInvestmentRow(r.id)} 
                    disabled={deletingInvestments.has(r.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => removeInvestmentRow(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-gray-700 font-medium">
          Total Emissions: <span className="font-semibold">{totalEmissions.toFixed(2)} tCO₂e</span>
        </div>
        {(() => {
          const pendingNew = investmentRows.filter(r => !r.isExisting && r.companyName && typeof r.emissions === 'number' && r.emissions >= 0 && typeof r.percentage === 'number' && r.percentage >= 0 && r.percentage <= 100).length;
          const pendingUpdates = investmentRows.filter(r => {
            if (!r.isExisting || !r.dbId) return false;
            const existing = existingInvestments.find(e => e.dbId === r.dbId);
            if (!existing) return false;
            return existing.companyName !== r.companyName || 
                   existing.emissions !== r.emissions ||
                   existing.percentage !== r.percentage ||
                   Math.abs((existing.calculatedEmissions || 0) - (r.calculatedEmissions || 0)) > 0.01;
          }).length;
          const totalPending = pendingNew + pendingUpdates;
          return (
            <div className="flex items-center gap-2">
              <Button
                onClick={saveInvestments}
                disabled={savingInvestments || totalPending === 0}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {savingInvestments ? "Saving..." : `Save (${totalPending})`}
              </Button>
              {onSaveAndNext && (
                <Button variant="outline" onClick={onSaveAndNext} className="border-teal-600 text-teal-600 hover:bg-teal-50">
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
};

