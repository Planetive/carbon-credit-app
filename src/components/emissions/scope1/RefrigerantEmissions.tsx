import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Save, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  RefrigerantRow
} from "../shared/types";
import { 
  REFRIGERANT_FACTORS
} from "../shared/EmissionFactors";
import { 
  newRefrigerantRow,
  refrigerantRowChanged
} from "../shared/utils";

interface RefrigerantEmissionsProps {
  onDataChange: (data: RefrigerantRow[]) => void;
  companyContext?: boolean; // Add company context prop
  onSaveAndNext?: () => void;
}

const RefrigerantEmissions: React.FC<RefrigerantEmissionsProps> = ({ onDataChange, companyContext = false, onSaveAndNext }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const userId = user?.id || null;
  const [rows, setRows] = useState<RefrigerantRow[]>([]);
  const [existingEntries, setExistingEntries] = useState<RefrigerantRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingRows, setDeletingRows] = useState<Set<string>>(new Set());
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const hasRestoredDraftRef = useRef(false);

  const getDraftKey = () => {
    if (userId) return `refrigerantDraft:user:${userId}`;
    return "refrigerantDraft:anon";
  };

  // Computed values
  const refrigerantTypes = Object.keys(REFRIGERANT_FACTORS);

  // Load existing entries
  useEffect(() => {
    const loadExistingEntries = async () => {
      if (!userId) return;

      // Skip loading data when in company context - start with blank form
      if (companyContext) {
        console.log('Company context detected - starting with blank refrigerant form');
        setRows([]);
        setExistingEntries([]);
        onDataChange([]);
        setIsInitialLoad(false);
        return;
      }

      try {
        const { data: refrigerantData, error: refrigerantError } = await supabase
          .from('scope1_refrigerant_entries')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (refrigerantError) throw refrigerantError;

        const existingRefrigerantRows = (refrigerantData || []).map(entry => ({
          id: crypto.randomUUID(),
          dbId: entry.id,
          refrigerantType: entry.refrigerant_type,
          quantity: entry.quantity,
          factor: entry.emission_factor,
          emissions: entry.emissions,
          isExisting: true,
        }));

        setExistingEntries(existingRefrigerantRows);
        setRows(existingRefrigerantRows.length > 0 ? existingRefrigerantRows : []);

        setIsInitialLoad(false);
      } catch (error: any) {
        console.error('Error loading existing entries:', error);
        toast({ 
          title: "Error", 
          description: "Failed to load existing entries", 
          variant: "destructive" 
        });
      }
    };

    loadExistingEntries();
  }, [userId, toast, companyContext]);

  // Notify parent of data changes
  useEffect(() => {
    if (!isInitialLoad) {
      onDataChange(rows);
    }
  }, [rows, isInitialLoad, onDataChange]);

  // Restore unsaved draft rows from sessionStorage after initial DB load
  useEffect(() => {
    if (isInitialLoad || hasRestoredDraftRef.current) return;

    try {
      const key = getDraftKey();
      const raw = sessionStorage.getItem(key);
      if (!raw) {
        hasRestoredDraftRef.current = true;
        return;
      }

      const parsed = JSON.parse(raw);
      const recentEnough =
        typeof parsed?.ts === "number" ? Date.now() - parsed.ts < 1000 * 60 * 60 * 24 : true;

      if (!recentEnough) {
        sessionStorage.removeItem(key);
        hasRestoredDraftRef.current = true;
        return;
      }

      const draftRows = Array.isArray(parsed.rows) ? parsed.rows : [];
      if (draftRows.length > 0) {
        setRows(prev => {
          const existingIds = new Set(prev.map(r => r.id));
          const mergedDraft = draftRows
            .filter((r: any) => r && r.id && !existingIds.has(r.id))
            .map((r: any) => ({
              ...r,
              isExisting: false,
            }));
          return mergedDraft.length > 0 ? [...prev, ...mergedDraft] : prev;
        });
      }
    } catch (e) {
      console.warn("Failed to restore RefrigerantEmissions draft from sessionStorage:", e);
    } finally {
      hasRestoredDraftRef.current = true;
    }
  }, [isInitialLoad, userId]);

  // Persist unsaved draft rows (non-existing rows) to sessionStorage
  useEffect(() => {
    if (isInitialLoad || !hasRestoredDraftRef.current) return;

    try {
      const key = getDraftKey();
      const draftRows = rows.filter(r => !r.isExisting);
      if (draftRows.length === 0) {
        sessionStorage.removeItem(key);
        return;
      }

      const payload = {
        rows: draftRows,
        ts: Date.now(),
      };
      sessionStorage.setItem(key, JSON.stringify(payload));
    } catch (e) {
      console.warn("Failed to persist RefrigerantEmissions draft to sessionStorage:", e);
    }
  }, [rows, isInitialLoad, userId]);

  // Row management functions
  const addRow = () => setRows(prev => [...prev, newRefrigerantRow()]);
  const removeRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id));

  // Update functions
  const updateRow = (id: string, patch: Partial<RefrigerantRow>) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const next: RefrigerantRow = { ...r, ...patch };
      if (next.refrigerantType) {
        const factor = REFRIGERANT_FACTORS[next.refrigerantType];
        next.factor = typeof factor === 'number' ? factor : undefined;
      } else {
        next.factor = undefined;
      }
      if (typeof next.quantity === 'number' && typeof next.factor === 'number') {
        next.emissions = Number((next.quantity * next.factor).toFixed(6));
      } else {
        next.emissions = undefined;
      }
      return next;
    }));
  };

  // Delete functions
  const deleteExistingRow = async (id: string) => {
    const row = rows.find(r => r.id === id);
    if (!row || !row.dbId) return;

    if (!confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      return;
    }

    setDeletingRows(prev => new Set(prev).add(id));
    try {
      const { error } = await supabase
        .from('scope1_refrigerant_entries')
        .delete()
        .eq('id', row.dbId);

      if (error) throw error;

      toast({ title: "Deleted", description: "Entry deleted successfully." });
      
      setRows(prev => prev.filter(r => r.id !== id));
      setExistingEntries(prev => prev.filter(r => r.id !== id));
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete entry", variant: "destructive" });
    } finally {
      setDeletingRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  // Save functions
  const saveRefrigerantEntries = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please log in to save.", variant: "destructive" });
      return;
    }

    const newEntries = rows.filter(r => 
      r.refrigerantType && 
      typeof r.quantity === 'number' && 
      typeof r.factor === 'number' && 
      !r.isExisting
    );

    const changedExisting = rows.filter(r => r.isExisting && r.dbId && refrigerantRowChanged(r, existingEntries));

    if (newEntries.length === 0 && changedExisting.length === 0) {
      toast({ title: "Nothing to save", description: "No new or changed refrigerant entries." });
      return;
    }

    setSaving(true);
    try {
      const payload = newEntries.map(v => ({
        user_id: user.id,
        refrigerant_type: v.refrigerantType!,
        quantity: v.quantity!,
        emission_factor: v.factor!,
        emissions: v.emissions!,
      }));

      if (payload.length > 0) {
        const { error } = await supabase.from('scope1_refrigerant_entries').insert(payload);
        if (error) throw error;
      }

      if (changedExisting.length > 0) {
        const updates = changedExisting.map(v => (
          supabase
            .from('scope1_refrigerant_entries')
            .update({
              refrigerant_type: v.refrigerantType!,
              quantity: v.quantity!,
              emission_factor: v.factor!,
              emissions: v.emissions!,
            })
            .eq('id', v.dbId!)
        ));
        const results = await Promise.all(updates);
        const updateError = results.find(r => (r as any).error)?.error;
        if (updateError) throw updateError;
      }

      toast({ 
        title: "Saved", 
        description: `Saved ${newEntries.length} new and updated ${changedExisting.length} entries.` 
      });

      // Clear draft now that rows are saved
      try {
        const key = getDraftKey();
        sessionStorage.removeItem(key);
      } catch {}

      // Reload data
      const { data: newData } = await supabase
        .from('scope1_refrigerant_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (newData) {
        const updatedExistingRows = newData.map(entry => ({
          id: crypto.randomUUID(),
          dbId: String(entry.id),
          refrigerantType: entry.refrigerant_type,
          quantity: entry.quantity,
          factor: entry.emission_factor,
          emissions: entry.emissions,
          isExisting: true,
        }));
        setExistingEntries(updatedExistingRows);
        setRows(updatedExistingRows);
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Calculate totals
  const totalEmissions = rows.reduce((sum, r) => sum + (r.emissions || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">Refrigerant Entries</h4>
          <p className="text-sm text-gray-600">Add your organization's refrigerant usage data</p>
        </div>
        <Button onClick={addRow} className="bg-teal-600 hover:bg-teal-700 text-white">
          <Plus className="h-4 w-4 mr-2" />Add New Entry
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Label className="md:col-span-1 text-gray-500">Refrigerant Type</Label>
        <Label className="md:col-span-1 text-gray-500">Quantity (kg)</Label>
        <div />
      </div>

      <div className="space-y-3">
        {rows.map((r) => {
          const isDeleting = deletingRows.has(r.id);
          
          return (
            <div key={r.id} className={`grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-3 rounded-lg bg-gray-50`}>
              <Select 
                value={r.refrigerantType} 
                onValueChange={(v) => updateRow(r.id, { refrigerantType: v })}
                disabled={false}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select refrigerant type" />
                </SelectTrigger>
                <SelectContent>
                  {refrigerantTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Input 
                  type="number" 
                  step="any" 
                  min="0"
                  max="999999999999.999999"
                  value={r.quantity ?? ''} 
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      updateRow(r.id, { quantity: undefined });
                    } else {
                      const numValue = Number(value);
                      if (numValue >= 0 && numValue <= 999999999999.999999) {
                        updateRow(r.id, { quantity: numValue });
                      }
                    }
                  }} 
                  placeholder="Enter quantity"
                  disabled={false}
                />
                {r.isExisting ? (
                  <Button size="sm" variant="outline" onClick={() => deleteExistingRow(r.id)} disabled={isDeleting} className="text-red-600 hover:text-red-700" aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button variant="ghost" className="text-red-600" onClick={() => removeRow(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-gray-700 font-medium">
          Total Refrigerant Emissions: <span className="font-semibold">{totalEmissions.toFixed(6)} kg CO2e</span>
        </div>
        {(() => {
          const pendingNew = rows.filter(r => !r.isExisting).length;
          const pendingUpdates = rows.filter(r => r.isExisting && refrigerantRowChanged(r, existingEntries)).length;
          const totalPending = pendingNew + pendingUpdates;
          return (
            <div className="flex items-center gap-2">
              <Button
                onClick={saveRefrigerantEntries}
                disabled={saving || totalPending === 0}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : `Save (${totalPending})`}
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

export default RefrigerantEmissions;
