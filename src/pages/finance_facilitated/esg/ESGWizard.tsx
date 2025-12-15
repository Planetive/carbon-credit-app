import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight, Plus, Trash2, Building2, Users, CheckCircle, TrendingUp, BarChart3, Building, ArrowLeft, FileText, Shield, AlertCircle, Calculator, Save } from 'lucide-react';
import { FinanceEmissionCalculator } from './FinanceEmissionCalculator';
import { FormattedNumberInput } from '../components/FormattedNumberInput';
import { PortfolioClient } from '@/integrations/supabase/portfolioClient';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export const ESGWizard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const mode: 'finance' | 'facilitated' = (location.state as any)?.mode || 'finance';
  const counterpartyId: string | undefined = (location.state as any)?.counterpartyId || (location.state as any)?.counterparty || (location.state as any)?.id || new URLSearchParams(window.location.search).get('counterpartyId') || undefined;
  const startFresh: boolean = (location.state as any)?.startFresh === true;
  const returnUrl: string | undefined = (location.state as any)?.returnUrl;
  
  // Debug logging to see what we're receiving
  useEffect(() => {
    console.log('ESGWizard - location.state:', location.state);
    console.log('ESGWizard - counterpartyId:', counterpartyId);
    console.log('ESGWizard - startFresh:', startFresh);
  }, [location.state, counterpartyId, startFresh]);

  // Reset form data when startFresh is true
  useEffect(() => {
    if (startFresh) {
      console.log('ESGWizard - startFresh flag is true, resetting form data');
      setFormData({
        corporateStructure: '',
        loanTypes: [],
        hasEmissions: '',
        verificationStatus: '',
        calculationMethod: '',
        score: 0,
        scope1Emissions: 0,
        scope2Emissions: 0,
        scope3Emissions: 0,
        verifierName: '',
        verified_emissions: 0,
        unverified_emissions: 0
      });
      setResults([]);
      setCurrentStep(0);
    }
  }, [startFresh]);

  // Load existing questionnaire data when counterpartyId is provided (unless startFresh is true)
  useEffect(() => {
    const loadExistingQuestionnaire = async () => {
      if (!counterpartyId) return;
      if (startFresh) {
        console.log('ESGWizard - startFresh flag is true, skipping existing questionnaire load and clearing sessionStorage');
        // Clear any session storage when starting fresh
        try {
          sessionStorage.removeItem('esgWizardState');
          console.log('Cleared sessionStorage');
        } catch (e) {
          console.warn('Failed to clear sessionStorage:', e);
        }
        return;
      }

      // IMPORTANT: Check if sessionStorage has data for a different mode and clear it
      try {
        const saved = sessionStorage.getItem('esgWizardState');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.mode && parsed.mode !== mode) {
            console.log('ESGWizard - Clearing sessionStorage: previous mode was', parsed.mode, 'current mode is', mode);
            sessionStorage.removeItem('esgWizardState');
          }
        }
      } catch (e) {
        console.warn('Error checking sessionStorage mode:', e);
      }

      try {
        console.log('Loading existing questionnaire for counterpartyId:', counterpartyId);
        const questionnaire = await PortfolioClient.getQuestionnaire(counterpartyId);
        
        if (questionnaire) {
          console.log('Found existing questionnaire:', questionnaire);
          
          // Load loan types from emission calculations for this counterparty (only for finance mode)
          let loanTypes: Array<{ type: string; quantity: number }> = [];
          if (mode === 'finance') {
            const { data: emissionCalculations } = await supabase
              .from('emission_calculations')
              .select('formula_id, inputs')
              .eq('counterparty_id', counterpartyId)
              .eq('calculation_type', mode);
            
            // Extract loan types from emission calculations (only for finance mode)
            if (emissionCalculations) {
              const loanTypeMap = new Map<string, number>();
              emissionCalculations.forEach(calc => {
                if (calc.inputs && typeof calc.inputs === 'object') {
                  const inputs = calc.inputs as any;
                  if (inputs.loanType) {
                    const count = loanTypeMap.get(inputs.loanType) || 0;
                    loanTypeMap.set(inputs.loanType, count + 1);
                  }
                }
              });
              
              loanTypeMap.forEach((quantity, type) => {
                loanTypes.push({ type, quantity });
              });
            }
          }
          // For facilitated mode, loanTypes should always be empty array
          
          // Auto-calculate verified/unverified emissions when scope emissions change
          const totalEmissions = (questionnaire.scope1_emissions || 0) + (questionnaire.scope2_emissions || 0) + (questionnaire.scope3_emissions || 0);
          let verified_emissions = 0;
          let unverified_emissions = 0;
          
          if (questionnaire.verification_status === 'verified') {
            verified_emissions = totalEmissions;
            unverified_emissions = 0;
          } else if (questionnaire.verification_status === 'unverified') {
            unverified_emissions = totalEmissions;
            verified_emissions = 0;
          }

          setFormData({
            corporateStructure: questionnaire.corporate_structure || '',
            loanTypes: loanTypes,
            hasEmissions: questionnaire.has_emissions ? 'yes' : 'no',
            verificationStatus: questionnaire.verification_status || '',
            calculationMethod: '',
            score: 0,
            scope1Emissions: questionnaire.scope1_emissions || 0,
            scope2Emissions: questionnaire.scope2_emissions || 0,
            scope3Emissions: questionnaire.scope3_emissions || 0,
            verifierName: questionnaire.verifier_name || '',
            verified_emissions,
            unverified_emissions
          });

          console.log('Loaded questionnaire data into form:', {
            corporateStructure: questionnaire.corporate_structure,
            loanTypes: loanTypes,
            hasEmissions: questionnaire.has_emissions,
            verificationStatus: questionnaire.verification_status,
            scope1Emissions: questionnaire.scope1_emissions,
            scope2Emissions: questionnaire.scope2_emissions,
            scope3Emissions: questionnaire.scope3_emissions,
            verified_emissions,
            unverified_emissions
          });

          // Only skip to emission calculation step if we're resuming from emission calculator
          // Don't auto-skip for facilitated mode - user should see the questionnaire steps
          // This allows users to see and potentially modify their selections
          // Only do this if we haven't already restored (handled by the other useEffect)
          // AND we're not already on the results step (don't override results page)
          if (!hasRestoredRef.current && steps[currentStep]?.id !== 'results') {
            try {
              const saved = sessionStorage.getItem('esgWizardState');
              if (saved) {
                const parsed = JSON.parse(saved);
                // Only skip if resumeAtCalculation is true AND mode matches AND we haven't restored yet
                if (parsed.resumeAtCalculation === true && parsed.mode === mode) {
                  const hasRequiredData = mode === 'finance' 
                    ? (questionnaire.corporate_structure && loanTypes.length > 0 && questionnaire.has_emissions !== null)
                    : (questionnaire.corporate_structure && questionnaire.has_emissions !== null);
                  
                  if (hasRequiredData) {
                    const emissionStepIndex = steps.findIndex(s => s.id === 'emission-calculation');
                    if (emissionStepIndex >= 0 && currentStep !== emissionStepIndex) {
                      setCurrentStep(emissionStepIndex);
                    }
                  }
                }
              }
            } catch (e) {
              // If no sessionStorage or error, don't skip - start from beginning
              console.log('Not skipping to calculation step - no resume flag');
            }
          }
        } else {
          console.log('No existing questionnaire found for counterpartyId:', counterpartyId);
        }
      } catch (error) {
        console.error('Error loading existing questionnaire:', error);
        toast({
          title: "Unable to Load Previous Data",
          description: error instanceof Error 
            ? `Could not load your previous responses: ${error.message}. You can start fresh or try again.`
            : "Could not load your previous responses. You can start fresh or try again.",
          variant: "destructive"
        });
      }
    };

    loadExistingQuestionnaire();
  }, [counterpartyId, toast]);

  // Shared answers cache (frontend-only for now)
  type SharedAnswers = {
    corporateStructure?: string;
    hasEmissions?: string;
    scope1Emissions?: number;
    scope2Emissions?: number;
    scope3Emissions?: number;
    verificationStatus?: string;
  };

  const sharedKey = counterpartyId ? `esgSharedAnswers:${counterpartyId}` : undefined;
  const loadSharedAnswers = (): SharedAnswers | null => {
    if (!sharedKey) return null;
    try {
      const raw = localStorage.getItem(sharedKey);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };
  const saveSharedAnswers = (data: SharedAnswers) => {
    if (!sharedKey) return;
    try { localStorage.setItem(sharedKey, JSON.stringify(data)); } catch {}
  };

  const sharedPrefill = loadSharedAnswers();

  // Build steps dynamically: remove 'loan-type' for facilitated mode
  // Always show all steps - no skipping logic
  const baseStepsFinance: WizardStep[] = [
    { id: 'corporate-structure', title: 'Corporate Structure', description: 'Is the company listed or unlisted?', icon: Building2 },
    { id: 'loan-type', title: 'Loan Type', description: 'Select your loan classification', icon: FileText },
    { id: 'emission-status', title: 'Emission Status', description: 'Do you have emissions calculated?', icon: AlertCircle },
    { id: 'verification', title: 'Verification', description: 'Verification details', icon: Shield },
    { id: 'emission-calculation', title: 'Finance Emission', description: 'Calculate your finance emissions', icon: Calculator },
    { id: 'results', title: 'Results', description: 'Per-loan emission results', icon: CheckCircle }
  ];
  const baseStepsFacilitated: WizardStep[] = [
    { id: 'corporate-structure', title: 'Corporate Structure', description: 'Is the company listed or unlisted?', icon: Building2 },
    { id: 'emission-status', title: 'Emission Status', description: 'Do you have emissions calculated?', icon: AlertCircle },
    { id: 'verification', title: 'Verification', description: 'Verification details', icon: Shield },
    { id: 'emission-calculation', title: 'Facilitated Emission', description: 'Calculate your facilitated emissions', icon: Calculator },
    { id: 'results', title: 'Results', description: 'Per-loan emission results', icon: CheckCircle }
  ];

  const steps: WizardStep[] = mode === 'finance' ? baseStepsFinance : baseStepsFacilitated;
  
  const [currentStep, setCurrentStep] = useState(0);

  // Check if we should resume at calculation step (coming back from emission calculator)
  // Use ref to track if we've already restored to prevent infinite loops
  const hasRestoredRef = useRef(false);
  
  useEffect(() => {
    if (startFresh) {
      hasRestoredRef.current = false; // Reset flag when starting fresh
      return; // Don't resume if starting fresh
    }
    
    // Only run once per component mount/mode change
    if (hasRestoredRef.current) return;
    
    try {
      const saved = sessionStorage.getItem('esgWizardState');
      if (saved) {
        const parsed = JSON.parse(saved);
        // IMPORTANT: Only restore if the mode matches! Don't use finance data for facilitated mode
        if (parsed.resumeAtCalculation === true && parsed.mode === mode) {
          hasRestoredRef.current = true; // Mark as restored to prevent re-runs
          
          // Restore form data from sessionStorage
          if (parsed.formData) {
            setFormData(prev => ({
              ...prev,
              ...parsed.formData,
              // For facilitated mode, ensure loanTypes is empty (facilitated doesn't have loan types)
              loanTypes: mode === 'facilitated' ? [] : (parsed.formData.loanTypes || []),
              // Preserve scope emissions that might have been updated
              scope1Emissions: parsed.scope1Emissions ?? parsed.formData.scope1Emissions ?? prev.scope1Emissions,
              scope2Emissions: parsed.scope2Emissions ?? parsed.formData.scope2Emissions ?? prev.scope2Emissions,
              scope3Emissions: parsed.scope3Emissions ?? parsed.formData.scope3Emissions ?? prev.scope3Emissions,
              verified_emissions: parsed.verified_emissions ?? parsed.formData.verified_emissions ?? prev.verified_emissions,
              unverified_emissions: parsed.unverified_emissions ?? parsed.formData.unverified_emissions ?? prev.unverified_emissions
            }));
            console.log('ESGWizard - Restored form data from sessionStorage for mode:', mode, parsed.formData);
          }
          
          // Navigate to emission-calculation step (only if not already on results step)
          const currentStepId = steps[currentStep]?.id;
          if (currentStepId !== 'results') {
            const emissionStepIndex = steps.findIndex(s => s.id === 'emission-calculation');
            if (emissionStepIndex >= 0 && currentStep !== emissionStepIndex) {
              setCurrentStep(emissionStepIndex);
              console.log('ESGWizard - Resuming at emission-calculation step for mode:', mode);
            }
          } else {
            console.log('ESGWizard - Already on results step, not overriding');
          }
          
          // Clear sessionStorage after restoring to prevent it from running again
          sessionStorage.removeItem('esgWizardState');
        } else if (parsed.mode && parsed.mode !== mode) {
          // Different mode detected - clear the sessionStorage to avoid confusion
          console.log('ESGWizard - Different mode detected, clearing sessionStorage. Previous:', parsed.mode, 'Current:', mode);
          sessionStorage.removeItem('esgWizardState');
          hasRestoredRef.current = true; // Mark as handled
        }
      } else {
        hasRestoredRef.current = true; // Mark as handled even if no saved state
      }
    } catch (error) {
      console.error('Error checking resumeAtCalculation:', error);
      hasRestoredRef.current = true; // Mark as handled to prevent retry loops
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startFresh, mode]); // Removed 'steps' from dependencies to prevent infinite loops

  // Safety check: ensure currentStep is within bounds
  useEffect(() => {
    if (currentStep >= steps.length && steps.length > 0) {
      setCurrentStep(0);
    }
  }, [steps.length, currentStep]);
  const [formData, setFormData] = useState({
    corporateStructure: '', // 'listed' or 'unlisted'
    loanTypes: [], // Array of loan type objects with quantity
    hasEmissions: '',
    verificationStatus: '',
    calculationMethod: '',
    score: 0,
    // Emission scopes (tCO2e)
    scope1Emissions: 0,
    scope2Emissions: 0,
    scope3Emissions: 0,
    // Verification details
    verifierName: '',
    // Auto-calculated emissions
    verified_emissions: 0,
    unverified_emissions: 0
  });

  // Track completed steps for visual indicators
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  
  // Track validation errors for inline display
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Auto-save state
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [results, setResults] = useState<Array<{ type: string; label: string; attributionFactor: number; financedEmissions: number; denominatorLabel: string; denominatorValue: number }>>([]);

  // Track per-loan-type quantity inputs before adding
  const [pendingQuantities, setPendingQuantities] = useState<Record<string, number>>({});

  // Helper function to sanitize numeric values for database storage
  const sanitizeNumericValue = (value: number | null): number | null => {
    if (value === null || value === undefined) return null;
    if (!isFinite(value)) return null; // Convert Infinity/NaN to null
    return value;
  };

  // Save questionnaire data to database
  const saveQuestionnaireData = async () => {
    if (!counterpartyId) {
      console.warn('No counterparty ID available for saving questionnaire data');
      return;
    }

    // Validate that counterpartyId is a UUID (not a string code)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(counterpartyId)) {
      console.error('Invalid counterparty ID format (not a UUID):', counterpartyId);
      toast({
        title: "Invalid Company ID",
        description: "The company ID format is invalid. Please try again.",
        variant: "destructive"
      });
      return;
    }

    // Convert form data to match database schema
    const questionnaireData = {
      counterparty_id: counterpartyId,
      corporate_structure: formData.corporateStructure || 'unlisted',
      has_emissions: formData.hasEmissions === 'yes',
      scope1_emissions: formData.scope1Emissions || null,
      scope2_emissions: formData.scope2Emissions || null,
      scope3_emissions: formData.scope3Emissions || null,
      verification_status: formData.verificationStatus || 'unverified',
      verifier_name: formData.verifierName || null,
      // These fields are not captured in the current questionnaire but are required by the schema
      evic: null,
      total_equity_plus_debt: null,
      share_price: null,
      outstanding_shares: null,
      total_debt: null,
      minority_interest: null,
      preferred_stock: null,
      total_equity: null
    };

    try {
      console.log('Saving questionnaire data to database:', {
        counterpartyId,
        questionnaireData,
        formData: {
          scope1Emissions: formData.scope1Emissions,
          scope2Emissions: formData.scope2Emissions,
          scope3Emissions: formData.scope3Emissions,
          hasEmissions: formData.hasEmissions,
          verificationStatus: formData.verificationStatus
        }
      });
      
      await PortfolioClient.upsertCounterpartyQuestionnaire(questionnaireData);

      console.log('✅ Questionnaire data saved successfully to database');
      toast({
        title: "Questionnaire Data Saved",
        description: "Successfully saved questionnaire responses to the database.",
        variant: "default"
      });
    } catch (error) {
      console.error('❌ Error saving questionnaire data:', error);
      console.error('Questionnaire data being saved:', questionnaireData);
      console.error('Counterparty ID being used:', counterpartyId);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Unable to Save Progress",
        description: `Your responses could not be saved: ${errorMessage}. Please check your internet connection and try again. Your data is safe in your browser.`,
        variant: "destructive"
      });
      throw error; // Re-throw so auto-save can handle it
    }
  };

  // Save questionnaire data to database and return the questionnaire record
  const saveQuestionnaireDataAndGetId = async () => {
    if (!counterpartyId) {
      console.warn('No counterparty ID available for saving questionnaire data');
      return null;
    }

    // Validate that counterpartyId is a UUID (not a string code)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(counterpartyId)) {
      console.error('Invalid counterparty ID format (not a UUID):', counterpartyId);
      toast({
        title: "Invalid Company ID",
        description: "The company ID format is invalid. Please go back and select a company again, or contact support if this issue persists.",
        variant: "destructive"
      });
      return null;
    }

    // Convert form data to match database schema
    const questionnaireData = {
      counterparty_id: counterpartyId,
      corporate_structure: formData.corporateStructure || 'unlisted',
      has_emissions: formData.hasEmissions === 'yes',
      scope1_emissions: formData.scope1Emissions || null,
      scope2_emissions: formData.scope2Emissions || null,
      scope3_emissions: formData.scope3Emissions || null,
      verification_status: formData.verificationStatus || 'unverified',
      verifier_name: formData.verifierName || null,
      // These fields are not captured in the current questionnaire but are required by the schema
      evic: null,
      total_equity_plus_debt: null,
      share_price: null,
      outstanding_shares: null,
      total_debt: null,
      minority_interest: null,
      preferred_stock: null,
      total_equity: null
    };

    try {
      const questionnaire = await PortfolioClient.upsertCounterpartyQuestionnaire(questionnaireData);
      return questionnaire;
    } catch (error) {
      console.error('Error saving questionnaire data:', error);
      console.error('Questionnaire data being saved:', questionnaireData);
      console.error('Counterparty ID being used:', counterpartyId);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Unable to Save Progress",
        description: `Your responses could not be saved: ${errorMessage}. Please check your internet connection and try again.`,
        variant: "destructive"
      });
      return null;
    }
  };

  // Delete ALL finance emission calculations for a counterparty and mode (used when startFresh is true)
  const deleteAllFinanceEmissionCalculations = async (counterpartyId: string, calculationMode: 'finance' | 'facilitated') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const calculationType = calculationMode === 'finance' ? 'finance_emission' : 'facilitated_emission';
      
      // Delete all records from finance_emission_calculations table
      const { error: financeError } = await supabase
        .from('finance_emission_calculations')
        .delete()
        .eq('user_id', user.id)
        .eq('counterparty_id', counterpartyId)
        .eq('calculation_type', calculationType);

      if (financeError) {
        console.warn('Error deleting all finance emission calculations:', financeError);
      } else {
        console.log('Deleted all finance emission calculations for fresh start');
      }

      // Also delete all from emission_calculations table
      const { error: emissionError } = await supabase
        .from('emission_calculations')
        .delete()
        .eq('user_id', user.id)
        .eq('counterparty_id', counterpartyId)
        .eq('calculation_type', calculationMode);

      if (emissionError) {
        console.warn('Error deleting all emission calculations:', emissionError);
      } else {
        console.log('Deleted all emission calculations for fresh start');
      }
    } catch (error) {
      console.warn('Error in deleteAllFinanceEmissionCalculations:', error);
    }
  };

  // Clean up old finance emission calculations that are no longer needed
  const cleanupOldFinanceEmissionCalculations = async (counterpartyId: string, currentResults: Array<{ type: string; label: string; attributionFactor: number; financedEmissions: number; denominatorLabel: string; denominatorValue: number }>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get current formula IDs from results
      const currentFormulaIds = currentResults.map(r => r.type);
      
      // Delete records that don't match current formula IDs from finance_emission_calculations table
      const { error: financeError } = await supabase
        .from('finance_emission_calculations')
        .delete()
        .eq('user_id', user.id)
        .eq('counterparty_id', counterpartyId)
        .eq('calculation_type', mode === 'finance' ? 'finance_emission' : 'facilitated_emission')
        .not('formula_id', 'in', `(${currentFormulaIds.map(id => `'${id}'`).join(',')})`);

      if (financeError) {
        console.warn('Error cleaning up old finance emission calculations:', financeError);
      } else {
        console.log('Cleaned up old finance emission calculations');
      }

      // Also clean up emission_calculations table
      // IMPORTANT: Don't delete the 'aggregate' record - it's the main record used by dashboard for both finance and facilitated
      const { error: emissionError } = await supabase
        .from('emission_calculations')
        .delete()
        .eq('user_id', user.id)
        .eq('counterparty_id', counterpartyId)
        .eq('calculation_type', mode)
        .neq('formula_id', 'aggregate') // Never delete the aggregate record (works for both finance and facilitated)
        .not('formula_id', 'in', `(${currentFormulaIds.map(id => `'${id}'`).join(',')})`);

      if (emissionError) {
        console.warn('Error cleaning up old emission calculations:', emissionError);
      } else {
        console.log('Cleaned up old emission calculations');
      }
    } catch (error) {
      console.warn('Error in cleanup function:', error);
    }
  };

  // Save emission calculations to database
  const saveEmissionCalculations = async (calculationResults: Array<{ type: string; label: string; attributionFactor: number; financedEmissions: number; denominatorLabel: string; denominatorValue: number }>, formData?: any) => {
    console.log('🔍 ESGWizard - saveEmissionCalculations called');
    console.log('🔍 ESGWizard - counterpartyId:', counterpartyId);
    console.log('🔍 ESGWizard - calculationResults:', calculationResults);
    console.log('🔍 ESGWizard - mode:', mode);
    
    if (!counterpartyId) {
      console.warn('❌ ESGWizard - No counterparty ID available for saving emission calculations');
      toast({
        title: "Error",
        description: "No company ID available. Please try again.",
        variant: "destructive"
      });
      return;
    }

    // Validate that counterpartyId is a UUID (not a string code)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(counterpartyId)) {
      console.error('❌ ESGWizard - Invalid counterparty ID format (not a UUID):', counterpartyId);
      toast({
        title: "Invalid Company ID",
        description: "The company ID format is invalid. Please try again.",
        variant: "destructive"
      });
      return;
    }

    console.log('✅ ESGWizard - Counterparty ID is valid UUID:', counterpartyId);

    try {
      // Save questionnaire data first and get the questionnaire ID
      const questionnaire = await saveQuestionnaireDataAndGetId();

      // If starting fresh, delete ALL old calculations for this counterparty and mode BEFORE saving new ones
      if (startFresh) {
        await deleteAllFinanceEmissionCalculations(counterpartyId, mode);
      }

      // Calculate aggregated values for all results
      const totalFinancedEmissions = calculationResults.reduce(
        (sum, r) => sum + (sanitizeNumericValue(r.financedEmissions) || 0), 
        0
      );
      const averageAttributionFactor = calculationResults.length > 0
        ? calculationResults.reduce((sum, r) => sum + (sanitizeNumericValue(r.attributionFactor) || 0), 0) / calculationResults.length
        : 0;
      const firstResult = calculationResults[0]; // Use first result for denominator (usually same for all)

      // Save individual records for each loan type (for detailed tracking)
      for (const result of calculationResults) {
        // Also save to finance_emission_calculations table for portfolio integration
        await PortfolioClient.saveFinanceEmissionCalculation({
          counterparty_id: counterpartyId,
          outstanding_amount: sanitizeNumericValue(formData?.outstandingLoan || 0),
          calculation_type: mode === 'finance' ? 'finance_emission' : 'facilitated_emission',
          formula_id: result.type,
          formula_name: result.label,
          company_type: formData?.corporateStructure || 'unlisted',
          total_assets: sanitizeNumericValue(formData?.totalAssets || 0),
          evic: sanitizeNumericValue(result.denominatorValue),
          total_equity_plus_debt: sanitizeNumericValue(result.denominatorValue),
          financed_emissions: sanitizeNumericValue(result.financedEmissions),
          attribution_factor: sanitizeNumericValue(result.attributionFactor),
          status: 'completed',
          // Additional financial data
          share_price: sanitizeNumericValue(formData?.sharePrice || 0),
          outstanding_shares: sanitizeNumericValue(formData?.outstandingShares || 0),
          total_debt: sanitizeNumericValue(formData?.totalDebt || 0),
          total_equity: sanitizeNumericValue(formData?.totalEquity || 0),
          minority_interest: sanitizeNumericValue(formData?.minorityInterest || 0),
          preferred_stock: sanitizeNumericValue(formData?.preferredStock || 0)
        });
      }

      // Save a single aggregate record to emission_calculations table (this is what the portfolio view reads from)
      // Use 'aggregate' as formula_id to ensure we have one record per calculation_type
      console.log('🔍 ESGWizard - About to save aggregate record with:');
      console.log('  - counterparty_id:', counterpartyId);
      console.log('  - calculation_type:', mode);
      console.log('  - formula_id: aggregate');
      console.log('  - totalFinancedEmissions:', totalFinancedEmissions);
      
      const savedCalculation = await PortfolioClient.upsertEmissionCalculation({
        counterparty_id: counterpartyId,
        exposure_id: null,
        questionnaire_id: questionnaire?.id || null,
        calculation_type: mode, // 'finance' or 'facilitated'
        company_type: formData?.corporateStructure || 'unlisted',
        formula_id: 'aggregate', // Always use 'aggregate' for the main record shown in Company Detail
        inputs: {
          corporateStructure: formData?.corporateStructure,
          hasEmissions: formData?.hasEmissions,
          verificationStatus: formData?.verificationStatus,
          scope1Emissions: formData?.scope1Emissions,
          scope2Emissions: formData?.scope2Emissions,
          scope3Emissions: formData?.scope3Emissions,
          verifierName: formData?.verifierName,
          outstandingLoan: formData?.outstandingLoan,
          sharePrice: formData?.sharePrice,
          outstandingShares: formData?.outstandingShares,
          totalDebt: formData?.totalDebt,
          totalEquity: formData?.totalEquity,
          minorityInterest: formData?.minorityInterest,
          preferredStock: formData?.preferredStock,
          loanTypes: calculationResults.map(r => r.type),
          loanLabels: calculationResults.map(r => r.label)
        },
        results: {
          // Aggregate all results
          allResults: calculationResults.map(r => ({
            type: r.type,
            label: r.label,
            attributionFactor: sanitizeNumericValue(r.attributionFactor),
            financedEmissions: sanitizeNumericValue(r.financedEmissions),
            denominatorLabel: r.denominatorLabel,
            denominatorValue: sanitizeNumericValue(r.denominatorValue)
          })),
          // Use first result for single values (usually same for all)
          attributionFactor: sanitizeNumericValue(averageAttributionFactor),
          financedEmissions: sanitizeNumericValue(totalFinancedEmissions),
          denominatorLabel: firstResult?.denominatorLabel || '',
          denominatorValue: sanitizeNumericValue(firstResult?.denominatorValue || 0),
          loanType: calculationResults.length === 1 ? firstResult?.type : 'multiple',
          loanLabel: calculationResults.length === 1 ? firstResult?.label : `${calculationResults.length} loan types`
        },
        financed_emissions: sanitizeNumericValue(totalFinancedEmissions), // Sum all financed emissions
        attribution_factor: sanitizeNumericValue(averageAttributionFactor),
        evic: sanitizeNumericValue(firstResult?.denominatorValue || 0),
        total_equity_plus_debt: sanitizeNumericValue(firstResult?.denominatorValue || 0),
        status: 'completed'
      });

      console.log('✅ Successfully saved aggregate record to emission_calculations table:', savedCalculation);
      console.log('✅ Total financed emissions:', totalFinancedEmissions);
      console.log('✅ Calculation type:', mode);
      console.log('✅ Counterparty ID:', counterpartyId);

      // Cache a lightweight summary for immediate display on return
      try {
        const cacheKey = `latestEmissionSummary:${counterpartyId}:${mode}`;
        const summary = {
          financed_emissions: totalFinancedEmissions,
          attribution_factor: averageAttributionFactor,
          denominator_value: firstResult?.denominatorValue || 0,
          updated_at: new Date().toISOString(),
          calculation_type: mode
        };
        sessionStorage.setItem(cacheKey, JSON.stringify(summary));
        console.log('✅ Cached latest emission summary:', cacheKey, summary);
      } catch (e) {
        console.warn('Failed to cache latest emission summary:', e);
      }

      // Update exposure amount in exposures table
      if (formData?.outstandingLoan && formData.outstandingLoan > 0) {
        try {
          await PortfolioClient.updateExposureAmountForCounterparty(
            counterpartyId, 
            sanitizeNumericValue(formData.outstandingLoan)
          );
          console.log('Successfully updated exposure amount');
        } catch (error) {
          console.warn('Failed to update exposure amount:', error);
        }
      }

      // Remove post-save deletion to avoid wiping the new records
      await cleanupOldFinanceEmissionCalculations(counterpartyId, calculationResults);

      toast({
        title: "Emission Calculations Saved",
        description: `Successfully saved ${calculationResults.length} ${mode} emission calculation(s) to the database.`,
        variant: "default"
      });

      // Refresh portfolio data if available
      if (typeof (window as any).refreshPortfolioData === 'function') {
        try {
          await (window as any).refreshPortfolioData();
          console.log('Portfolio data refreshed after saving emission calculations');
        } catch (error) {
          console.warn('Failed to refresh portfolio data:', error);
        }
      }
    } catch (error) {
      console.error('Error saving emission calculations:', error);
      console.error('Counterparty ID being used for emission calculations:', counterpartyId);
      console.error('Calculation results being saved:', calculationResults);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Unable to Save Calculations",
        description: `Your emission calculations could not be saved: ${errorMessage}. Please check your internet connection and try again. You can recalculate if needed.`,
        variant: "destructive"
      });
    }
  };

  // Remove the loadQuestionnaireFromDatabase function - always start fresh

  // Always start completely fresh - no pre-filling from database or sessionStorage

  // Auto-save functionality
  const performAutoSave = useRef(async () => {
    if (!counterpartyId || startFresh) return;
    
    setAutoSaveStatus('saving');
    try {
      await saveQuestionnaireData();
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    } catch (error) {
      setAutoSaveStatus('error');
      setTimeout(() => setAutoSaveStatus('idle'), 3000);
    }
  });

  // Update the ref when formData changes
  useEffect(() => {
    performAutoSave.current = async () => {
      if (!counterpartyId || startFresh) return;
      
      setAutoSaveStatus('saving');
      try {
        await saveQuestionnaireData();
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } catch (error) {
        setAutoSaveStatus('error');
        setTimeout(() => setAutoSaveStatus('idle'), 3000);
      }
    };
  }, [counterpartyId, startFresh, formData]);

  // Set up auto-save interval
  useEffect(() => {
    if (!counterpartyId || startFresh) return;

    // Clear any existing interval
    if (autoSaveIntervalRef.current) {
      clearInterval(autoSaveIntervalRef.current);
    }

    // Set up new interval (30 seconds)
    autoSaveIntervalRef.current = setInterval(() => {
      performAutoSave.current();
    }, 30000);

    // Cleanup on unmount
    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [counterpartyId, startFresh]);

  // Mark step as completed when moving forward
  useEffect(() => {
    if (canProceed() && currentStep > 0) {
      setCompletedSteps(prev => new Set([...prev, currentStep - 1]));
    }
  }, [currentStep]);

  const handleNext = () => {
    // Validate before proceeding
    const errors = validateCurrentStep();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast({
        title: "Validation Error",
        description: "Please fix the errors before proceeding",
        variant: "destructive"
      });
      return;
    }

    // Mark current step as completed
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    setValidationErrors({});

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setValidationErrors({});
    }
  };

  // Handle step click with confirmation if data will be lost
  const handleStepClick = (stepIndex: number) => {
    if (stepIndex === currentStep) return;
    
    // If going backwards, allow it
    if (stepIndex < currentStep) {
      setCurrentStep(stepIndex);
      setValidationErrors({});
      return;
    }

    // If going forwards, validate current step first
    const errors = validateCurrentStep();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast({
        title: "Complete Current Step",
        description: "Please complete the current step before proceeding",
        variant: "destructive"
      });
      return;
    }

    setCurrentStep(stepIndex);
    setValidationErrors({});
  };

  // Validate current step fields
  const validateCurrentStep = (customFormData?: typeof formData): Record<string, string> => {
    const dataToValidate = customFormData || formData;
    const errors: Record<string, string> = {};
    const stepId = steps[currentStep]?.id;

    switch (stepId) {
      case 'corporate-structure':
        if (!dataToValidate.corporateStructure) {
          errors.corporateStructure = 'Please select a corporate structure';
        }
        break;
      case 'loan-type':
        if (dataToValidate.loanTypes.length === 0) {
          errors.loanTypes = 'Please select at least one loan type';
        }
        break;
      case 'emission-status':
        if (!dataToValidate.hasEmissions) {
          errors.hasEmissions = 'Please indicate if you have emissions calculated';
        }
        break;
      case 'verification':
        if (dataToValidate.hasEmissions === 'yes' && !dataToValidate.verificationStatus) {
          errors.verificationStatus = 'Please select verification status';
        } else if (dataToValidate.hasEmissions === 'yes' && dataToValidate.verificationStatus === 'verified' && !dataToValidate.verifierName.trim()) {
          errors.verifierName = 'Please enter the verifier name';
        } else if (dataToValidate.hasEmissions === 'no' && !dataToValidate.calculationMethod) {
          errors.calculationMethod = 'Please select a calculation method';
        }
        if (dataToValidate.hasEmissions === 'yes') {
          const totalEmissions = (dataToValidate.scope1Emissions || 0) + (dataToValidate.scope2Emissions || 0) + (dataToValidate.scope3Emissions || 0);
          if (totalEmissions <= 0) {
            errors.scopeEmissions = 'Please enter at least one scope emission value';
          }
        }
        break;
    }

    return errors;
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate verified/unverified emissions when scope emissions change
      if (['scope1Emissions', 'scope2Emissions', 'scope3Emissions', 'verificationStatus'].includes(field)) {
        const totalEmissions = (updated.scope1Emissions || 0) + (updated.scope2Emissions || 0) + (updated.scope3Emissions || 0);
        
        if (updated.verificationStatus === 'verified') {
          updated.verified_emissions = totalEmissions;
          updated.unverified_emissions = 0;
        } else if (updated.verificationStatus === 'unverified') {
          updated.unverified_emissions = totalEmissions;
          updated.verified_emissions = 0;
        }
      }
      
      // Immediately validate with the updated form data
      const errors = validateCurrentStep(updated);
      
      // Update validation errors immediately - replace all errors for current step
      setValidationErrors(errors);
      
      return updated;
    });
  };

  // No persistence - always start fresh

  const addLoanType = (loanType: string, quantity: number = 1) => {
    const existingIndex = formData.loanTypes.findIndex(item => item.type === loanType);
    if (existingIndex >= 0) {
      // Update quantity if already exists
      setFormData(prev => ({
        ...prev,
        loanTypes: prev.loanTypes.map((item, index) => 
          index === existingIndex 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      }));
    } else {
      // Add new loan type
      setFormData(prev => ({
        ...prev,
        loanTypes: [...prev.loanTypes, { type: loanType, quantity }]
      }));
    }
  };

  const removeLoanType = (loanType: string) => {
    setFormData(prev => ({
      ...prev,
      loanTypes: prev.loanTypes.filter(item => item.type !== loanType)
    }));
  };

  const updateLoanTypeQuantity = (loanType: string, quantity: number) => {
    if (quantity <= 0) {
      removeLoanType(loanType);
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      loanTypes: prev.loanTypes.map(item => 
        item.type === loanType 
          ? { ...item, quantity }
          : item
      )
    }));
  };

  // Remove tab handling since we only show one form based on mode

  const renderStepContent = () => {
    if (!steps[currentStep]) {
      return <div className="text-center text-muted-foreground py-8">Loading step content...</div>;
    }
    
    switch (steps[currentStep].id) {
      case 'corporate-structure':
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="corporate-structure" className="text-base font-semibold text-gray-900 block mb-3">
                Corporate Structure <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={formData.corporateStructure} 
                onValueChange={(value) => updateFormData('corporateStructure', value)}
              >
                <SelectTrigger 
                  className={`h-12 text-base border-2 ${validationErrors.corporateStructure ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-teal-500'}`}
                >
                  <SelectValue placeholder="Select corporate structure" />
                </SelectTrigger>
                  <SelectContent className="w-full">
                    <SelectItem 
                      value="listed"
                      className="group relative cursor-pointer"
                      title="Company whose shares are traded on a public stock exchange. Uses EVIC (Enterprise Value Including Cash) calculation method."
                    >
                      <span>Listed Company</span>
                      <div className="absolute left-full ml-3 top-0 hidden group-hover:block z-[100] pointer-events-none">
                        <div className="bg-slate-800 text-white text-sm rounded-lg px-4 py-3 w-72 shadow-2xl backdrop-blur-sm">
                          <p className="leading-relaxed">
                            Company whose shares are traded on a public stock exchange. Uses EVIC (Enterprise Value Including Cash) calculation method.
                          </p>
                          <div className="absolute right-full top-4 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[6px] border-r-slate-800"></div>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem 
                      value="unlisted"
                      className="group relative cursor-pointer"
                      title="Private company not traded on public exchanges. Uses Total Debt + Total Equity calculation method."
                    >
                      <span>Unlisted Company</span>
                      <div className="absolute left-full ml-3 top-0 hidden group-hover:block z-[100] pointer-events-none">
                        <div className="bg-slate-800 text-white text-sm rounded-lg px-4 py-3 w-72 shadow-2xl backdrop-blur-sm">
                          <p className="leading-relaxed">
                            Private company not traded on public exchanges. Uses Total Debt + Total Equity calculation method.
                          </p>
                          <div className="absolute right-full top-4 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[6px] border-r-slate-800"></div>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
              </Select>
              {validationErrors.corporateStructure && (
                <p className="text-sm text-red-500 mt-2 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {validationErrors.corporateStructure}
                </p>
              )}
            </div>
          </div>
        );

      case 'loan-type':
        if (mode === 'facilitated') {
          // Skip rendering loan-type step entirely for facilitated mode (defensive)
          return null;
        }
        const loanTypeOptions = [
          { value: 'corporate-bond', label: 'Corporate Bond', description: 'Debt securities issued by corporations' },
          { value: 'business-loan', label: 'Business Loan', description: 'Traditional loans to businesses for operations' },
          { value: 'project-finance', label: 'Project Finance', description: 'Financing for specific infrastructure or development projects' },
          { value: 'mortgage', label: 'Mortgage', description: 'Loans secured by real estate property' },
          { value: 'sovereign-debt', label: 'Sovereign Debt', description: 'Loans or bonds issued by national governments' },
          { value: 'motor-vehicle-loan', label: 'Motor Vehicle Loan', description: 'Loans for purchasing cars, trucks, motorcycles, and other vehicles' },
          { value: 'commercial-real-estate', label: 'Commercial Real Estate', description: 'Loans for commercial properties like offices, retail, and industrial buildings' }
        ];

        return (
          <div className="space-y-8">
            <div className="text-center">
              <p className="text-sm text-gray-500">
                Select one or more loan types for your {mode === 'finance' ? 'finance' : 'facilitated'} emission calculation
              </p>
            </div>

            {/* Selected Loan Types - Show at top if any selected */}
            {formData.loanTypes.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <div className="h-px flex-1 bg-gray-200"></div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide px-3">
                    {formData.loanTypes.length} Selected
                  </span>
                  <div className="h-px flex-1 bg-gray-200"></div>
                </div>
                <div className="flex flex-wrap gap-3 justify-center">
                  {formData.loanTypes.map((loanTypeItem) => {
                    const option = loanTypeOptions.find(opt => opt.value === loanTypeItem.type);
                    return (
                      <div key={loanTypeItem.type} className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-gray-200 bg-white shadow-sm">
                        <span className="text-sm font-medium text-gray-900">{option?.label}</span>
                        <div className="flex items-center gap-2">
                          <Input
                            id={`quantity-${loanTypeItem.type}`}
                            type="number"
                            min="1"
                            value={loanTypeItem.quantity}
                            onChange={(e) => updateLoanTypeQuantity(loanTypeItem.type, parseInt(e.target.value) || 1)}
                            className="w-16 h-8 text-center text-sm border-gray-200"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLoanType(loanTypeItem.type)}
                            className="h-8 w-8 p-0 hover:bg-red-50 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Available Loan Types */}
            <div className="grid grid-cols-1 gap-3">
              {loanTypeOptions.map((option) => {
                const isSelected = formData.loanTypes.some(item => item.type === option.value);
                const selectedItem = formData.loanTypes.find(item => item.type === option.value);
                
                return (
                  <div 
                    key={option.value} 
                    className={`p-4 rounded-lg border transition-all duration-200 ${
                      isSelected 
                        ? 'border-gray-300 bg-white shadow-sm' 
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 mb-1">{option.label}</div>
                        <div className="text-sm text-gray-500">{option.description}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isSelected ? (
                          <>
                            <div className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md">
                              Qty: {selectedItem?.quantity}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addLoanType(option.value, 1)}
                              className="h-9 px-3"
                            >
                              +1
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeLoanType(option.value)}
                              className="h-9 px-3 text-red-600 hover:bg-red-50"
                            >
                              Remove
                            </Button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="1"
                              placeholder="1"
                              className="w-16 h-9 text-center text-sm border-gray-200"
                              value={pendingQuantities[option.value] ?? 1}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setPendingQuantities(prev => ({ ...prev, [option.value]: isNaN(val) ? 1 : Math.max(1, val) }));
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const quantity = pendingQuantities[option.value] ?? 1;
                                  addLoanType(option.value, quantity);
                                  setPendingQuantities(prev => ({ ...prev, [option.value]: 1 }));
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              onClick={() => {
                                const quantity = pendingQuantities[option.value] ?? 1;
                                addLoanType(option.value, quantity);
                                setPendingQuantities(prev => ({ ...prev, [option.value]: 1 }));
                              }}
                              className="h-9 px-4"
                            >
                              Add
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {formData.loanTypes.length === 0 && (
              <div className={`text-center py-8 ${validationErrors.loanTypes ? 'text-red-600' : 'text-gray-400'}`}>
                <p className="flex items-center justify-center gap-2">
                  {validationErrors.loanTypes && <AlertCircle className="w-5 h-5" />}
                  <span className="text-sm">
                    {validationErrors.loanTypes || 'Select at least one loan type to continue'}
                  </span>
                </p>
              </div>
            )}
          </div>
        );

      case 'emission-status':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <Label className="text-base font-semibold text-gray-900 block">
                Do you have your emissions calculated? <span className="text-red-500">*</span>
              </Label>
              <RadioGroup
                value={formData.hasEmissions}
                onValueChange={(value) => updateFormData('hasEmissions', value)}
                className="space-y-3"
              >
                <div className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors">
                  <RadioGroupItem value="yes" id="yes" />
                  <Label htmlFor="yes" className="text-base font-medium text-gray-900 cursor-pointer flex-1">
                    Yes
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors">
                  <RadioGroupItem value="no" id="no" />
                  <Label htmlFor="no" className="text-base font-medium text-gray-900 cursor-pointer flex-1">
                    No
                  </Label>
                </div>
              </RadioGroup>
              {validationErrors.hasEmissions && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {validationErrors.hasEmissions}
                  </p>
                </div>
              )}
            </div>

            {formData.hasEmissions === 'yes' && (
              <div className="space-y-6 mt-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Enter Emissions by Scope</h3>
                  <p className="text-sm text-gray-500">
                    Values are in tCO₂e (tonnes of carbon dioxide equivalent)
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="scope1" className="text-sm font-medium text-gray-700 block">
                      Scope 1 Emissions
                      <span className="text-xs text-gray-400 font-normal ml-1">(tCO₂e)</span>
                    </Label>
                    <FormattedNumberInput
                      id="scope1"
                      placeholder="Enter value"
                      value={formData.scope1Emissions || 0}
                      onChange={(value) => updateFormData('scope1Emissions', value)}
                      className={`h-12 text-base ${validationErrors.scopeEmissions ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-gray-400 focus:ring-gray-100'}`}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="scope2" className="text-sm font-medium text-gray-700 block">
                      Scope 2 Emissions
                      <span className="text-xs text-gray-400 font-normal ml-1">(tCO₂e)</span>
                    </Label>
                    <FormattedNumberInput
                      id="scope2"
                      placeholder="Enter value"
                      value={formData.scope2Emissions || 0}
                      onChange={(value) => updateFormData('scope2Emissions', value)}
                      className={`h-12 text-base ${validationErrors.scopeEmissions ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-gray-400 focus:ring-gray-100'}`}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="scope3" className="text-sm font-medium text-gray-700 block">
                      Scope 3 Emissions
                      <span className="text-xs text-gray-400 font-normal ml-1">(tCO₂e)</span>
                    </Label>
                    <FormattedNumberInput
                      id="scope3"
                      placeholder="Enter value"
                      value={formData.scope3Emissions || 0}
                      onChange={(value) => updateFormData('scope3Emissions', value)}
                      className={`h-12 text-base ${validationErrors.scopeEmissions ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-gray-400 focus:ring-gray-100'}`}
                    />
                  </div>
                </div>
                {validationErrors.scopeEmissions && (
                  <div className="pt-2">
                    <p className="text-sm text-red-600 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {validationErrors.scopeEmissions}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'verification':
        if (formData.hasEmissions === 'yes') {
          return (
            <div className="space-y-6">
              <div className="space-y-6">
                <div>
                  <Label className="text-base font-medium text-gray-900 block mb-4">
                    Is it verified by a third party? <span className="text-red-500">*</span>
                  </Label>
                  <RadioGroup
                    value={formData.verificationStatus}
                    onValueChange={(value) => updateFormData('verificationStatus', value)}
                    className="space-y-3"
                  >
                    <div className="flex items-center space-x-3 py-3">
                      <RadioGroupItem value="verified" id="verified" />
                      <Label htmlFor="verified" className="text-sm font-medium text-gray-900 cursor-pointer flex-1">
                        Verified
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 py-3">
                      <RadioGroupItem value="unverified" id="unverified" />
                      <Label htmlFor="unverified" className="text-sm font-medium text-gray-900 cursor-pointer flex-1">
                        Unverified
                      </Label>
                    </div>
                  </RadioGroup>
                  {validationErrors.verificationStatus && (
                    <p className="text-sm text-red-600 mt-3 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {validationErrors.verificationStatus}
                    </p>
                  )}
                </div>

                {formData.verificationStatus === 'verified' && (
                  <div className="space-y-3 pt-2">
                    <Label htmlFor="verifier-name" className="text-sm font-medium text-gray-900 block">
                      Verified by (Organization/Agency Name) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="verifier-name"
                      placeholder="e.g., SGS, DNV, Bureau Veritas"
                      className={`h-12 text-base ${validationErrors.verifierName ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-gray-400 focus:ring-gray-100'}`}
                      value={formData.verifierName}
                      onChange={(e) => updateFormData('verifierName', e.target.value)}
                    />
                    {validationErrors.verifierName && (
                      <p className="text-sm text-red-600 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {validationErrors.verifierName}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        } else if (formData.hasEmissions === 'no') {
          return (
            <div className="space-y-6">
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  Since you don't have emissions calculated, please use our emission calculator to calculate them first.
                </p>
                <Button
                  type="button"
                  onClick={() => {
                    // Set calculationMethod to indicate user has chosen to use the emission calculator
                    updateFormData('calculationMethod', 'emission-calculator');
                    // Persist current state and mark to resume at calculation
                    try {
                      sessionStorage.setItem('esgWizardState', JSON.stringify({ 
                        formData: { ...formData, calculationMethod: 'emission-calculator' }, 
                        resumeAtCalculation: true, 
                        mode, 
                        ts: Date.now() 
                      }));
                    } catch {}
                    // Navigate to the site's main emission calculator with counterpartyId
                    const url = `/emission-calculator?from=wizard&mode=${mode}${counterpartyId ? `&counterpartyId=${counterpartyId}` : ''}`;
                    window.location.href = url;
                  }}
                  className="w-full h-12 text-base font-semibold"
                >
                  <Calculator className="w-5 h-5 mr-2" />
                  Open Emission Calculator
                </Button>
                {validationErrors.calculationMethod && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {validationErrors.calculationMethod}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        }
        return (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Please complete the previous step first.</p>
          </div>
        );

      case 'emission-calculation':
        console.log('ESGWizard passing props to FinanceEmissionCalculator:', {
          hasEmissions: formData.hasEmissions,
          verificationStatus: formData.verificationStatus,
          corporateStructure: formData.corporateStructure,
          loanTypes: formData.loanTypes,
          counterpartyId
        });
        return <FinanceEmissionCalculator 
          hasEmissions={formData.hasEmissions}
          verificationStatus={formData.verificationStatus}
          corporateStructure={formData.corporateStructure}
          loanTypes={formData.loanTypes}
          counterpartyId={counterpartyId}
          scope1Emissions={formData.scope1Emissions}
          scope2Emissions={formData.scope2Emissions}
          scope3Emissions={formData.scope3Emissions}
          verifiedEmissions={formData.verified_emissions}
          unverifiedEmissions={formData.unverified_emissions}
          activeTab={mode}
          onTabChange={() => {}} // No tab change needed since we only show one form
          onResults={(r, formData) => {
            console.log('✅ ESGWizard - Received results and form data:', { results: r, formData });
            console.log('✅ ESGWizard - Setting results:', r);
            setResults(r);
            const resultsStepIndex = steps.findIndex(s => s.id === 'results');
            console.log('✅ ESGWizard - Results step index:', resultsStepIndex, 'Current step:', currentStep);
            if (resultsStepIndex >= 0) {
              console.log('✅ ESGWizard - Navigating to results step');
              setCurrentStep(resultsStepIndex);
            } else {
              console.error('❌ ESGWizard - Results step not found in steps array');
            }
            // Save emission calculations to database (async, don't wait for it)
            saveEmissionCalculations(r, formData).catch(error => {
              console.error('Error saving emission calculations:', error);
              // Don't prevent navigation if save fails
            });
          }}
        />;

      case 'results':
        console.log('ESGWizard - Results array:', results);
        
        // Calculate totals for summary
        // Filter out Infinity and NaN values
        const validResults = results?.filter(r => 
          r.financedEmissions !== null && 
          r.financedEmissions !== undefined && 
          isFinite(r.financedEmissions) &&
          r.attributionFactor !== null && 
          r.attributionFactor !== undefined && 
          isFinite(r.attributionFactor)
        ) || [];
        
        const totalEmissions = validResults.reduce((sum, r) => sum + (r.financedEmissions || 0), 0);
        // Get shared EVIC value from first result (only for listed companies using EVIC)
        const sharedEVIC = validResults.length > 0 && formData.corporateStructure === 'listed' 
          ? validResults.find(r => r.denominatorLabel === 'EVIC')?.denominatorValue || 0
          : validResults.length > 0 && formData.corporateStructure === 'unlisted'
          ? validResults.find(r => r.denominatorLabel === 'Total Equity + Debt')?.denominatorValue || 0
          : 0;
        const averageAttributionFactor = validResults.length > 0 
          ? validResults.reduce((sum, r) => sum + (r.attributionFactor || 0), 0) / validResults.length 
          : 0;

        return (
          <div className="space-y-8">
            {!results || results.length === 0 ? (
              <Card className="border-gray-200">
                <CardContent className="py-16">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                      <Calculator className="h-8 w-8 text-gray-400" />
                    </div>
                    <div className="text-gray-600 text-lg font-medium">No results yet</div>
                    <p className="text-gray-500">Please run a calculation to see results.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Header with Summary */}
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center space-y-4"
                >
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <CheckCircle className="h-7 w-7 text-white" />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-teal-700 to-cyan-700 bg-clip-text text-transparent">
                      {mode === 'finance' ? 'Finance Emissions' : 'Facilitated Emissions'} Calculated
                    </h2>
                  </div>
                  <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto font-medium">
                    Your {mode === 'finance' ? 'finance' : 'facilitated'} emissions have been successfully calculated. 
                    Review the detailed results below.
                  </p>
                </motion.div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Card className="bg-gradient-to-br from-blue-50 via-blue-100 to-cyan-50 border-blue-200 shadow-lg hover:shadow-xl transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                            <TrendingUp className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-blue-700 mb-1">Total Emissions</div>
                            <div className="text-3xl font-bold text-blue-900">
                              {isFinite(totalEmissions) ? totalEmissions.toFixed(2) : '0.00'} <span className="text-lg text-blue-700">tCO₂e</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Card className="bg-gradient-to-br from-green-50 via-emerald-100 to-teal-50 border-green-200 shadow-lg hover:shadow-xl transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-md">
                            <BarChart3 className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-green-700 mb-1">Average Attribution</div>
                            <div className="text-3xl font-bold text-green-900">
                              {isFinite(averageAttributionFactor) ? (averageAttributionFactor * 100).toFixed(2) : '0.00'}%
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Card className="bg-gradient-to-br from-purple-50 via-purple-100 to-indigo-50 border-purple-200 shadow-lg hover:shadow-xl transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                            <Building className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-purple-700 mb-1">
                              {formData.corporateStructure === 'listed' ? 'EVIC' : 'Total Equity + Debt'}
                            </div>
                            <div className="text-3xl font-bold text-purple-900">
                              {sharedEVIC > 0 ? sharedEVIC.toLocaleString() : '0'} <span className="text-lg text-purple-700">PKR</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                </div>

                {/* Detailed Results Table */}
                {validResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Card className="border-gray-200 shadow-lg">
                      <CardHeader>
                        <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-teal-600" />
                          Detailed Results by Loan Type
                        </CardTitle>
                        <CardDescription className="text-base">
                          Breakdown of emissions for each loan type in your portfolio
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b-2 border-gray-200">
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Loan Type</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Attribution Factor</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Financed Emissions</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Denominator</th>
                              </tr>
                            </thead>
                            <tbody>
                              {validResults.map((result, index) => (
                                <motion.tr
                                  key={index}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.5 + index * 0.1 }}
                                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                >
                                  <td className="py-4 px-4">
                                    <div className="font-semibold text-gray-900">{result.label}</div>
                                  </td>
                                  <td className="py-4 px-4 text-right">
                                    <span className="font-semibold text-teal-700">
                                      {(result.attributionFactor * 100).toFixed(2)}%
                                    </span>
                                  </td>
                                  <td className="py-4 px-4 text-right">
                                    <span className="font-bold text-blue-700">
                                      {result.financedEmissions.toFixed(2)} <span className="text-sm font-normal text-gray-600">tCO₂e</span>
                                    </span>
                                  </td>
                                  <td className="py-4 px-4 text-right">
                                    <div className="text-sm text-gray-600">
                                      <div className="font-medium">{result.denominatorLabel}</div>
                                      <div className="text-xs text-gray-500 mt-0.5">
                                        {result.denominatorValue.toLocaleString()} PKR
                                      </div>
                                    </div>
                                  </td>
                                </motion.tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Action Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6"
                >
                  <Button 
                    onClick={() => setCurrentStep(steps.findIndex(s => s.id === 'emission-calculation'))}
                    variant="outline" 
                    className="w-full sm:w-auto min-w-[160px] h-11 text-base font-semibold border-2 border-gray-300 hover:border-teal-400 hover:bg-teal-50"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Recalculate
                  </Button>
                  <Button 
                    onClick={() => navigate(returnUrl || '/dashboard', { state: { activeSection: 'portfolio' } })}
                    className="w-full sm:w-auto min-w-[200px] h-11 text-base font-semibold bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-lg"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete & Return to Portfolio
                  </Button>
                </motion.div>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (steps[currentStep].id) {
      case 'corporate-structure':
        return formData.corporateStructure !== '';
      case 'loan-type':
        return formData.loanTypes.length > 0;
      case 'emission-status':
        return formData.hasEmissions !== '';
      case 'verification':
        if (formData.hasEmissions === 'yes') {
          return formData.verificationStatus !== '';
        } else if (formData.hasEmissions === 'no') {
          return formData.calculationMethod !== '';
        }
        return false;
      default:
        return true;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br bg-[var(--gradient-subtle)] p-4 sm:p-6 overflow-visible">
      <div className="max-w-4xl mx-auto overflow-visible">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Go Back</span>
            </Button>
            <div className="flex-1"></div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-teal-700 to-cyan-700 bg-clip-text text-transparent mb-3">
            {mode === 'finance' ? 'ESG Finance Assessment' : 'ESG Facilitated Assessment'}
          </h1>
          <p className="text-base md:text-lg text-gray-600 font-medium">
            {mode === 'finance' ? 'Loan Risk Assessment & Finance Emission Calculator' : 'Facilitated Emission Calculator'}
          </p>
        </div>

        {/* Enhanced Progress Steps */}
        <div className="mb-6 sm:mb-8 py-6 overflow-visible">
          <div className="flex justify-between items-start relative overflow-x-auto overflow-y-visible">
            {/* Progress bar background */}
            <div className="absolute top-8 left-0 right-0 h-1 bg-gray-200 rounded-full -z-10 hidden sm:block">
              <div 
                className="h-full bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full transition-all duration-500"
                style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
              />
            </div>

            {steps.map((step, index) => {
              const isCompleted = completedSteps.has(index);
              const isCurrent = index === currentStep;
              const isPast = index < currentStep;
              const StepIcon = step.icon || Building2;

              return (
                <div key={step.id} className="flex flex-col items-center flex-1 relative z-10 min-w-[60px] sm:min-w-[80px]">
                  <div className="relative w-16 h-16 sm:w-18 sm:h-18 flex items-center justify-center mb-2">
                    <button
                      onClick={() => handleStepClick(index)}
                      disabled={index > currentStep && !canProceed()}
                      className={`
                        group relative w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 flex items-center justify-center transition-all duration-300 touch-manipulation
                        ${isCompleted || isPast
                          ? 'bg-gradient-to-br from-teal-500 to-cyan-600 border-teal-600 text-white shadow-lg shadow-teal-500/30'
                          : isCurrent
                          ? 'bg-white border-teal-500 text-teal-600 shadow-lg border-[3px]'
                          : 'bg-white border-gray-300 text-gray-400 hover:border-gray-400'
                        }
                        ${index <= currentStep || canProceed() ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-not-allowed opacity-50'}
                      `}
                      title={step.description}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                      ) : (
                        <StepIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                      )}
                      {isCurrent && (
                        <span className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-teal-500 rounded-full border-2 border-white animate-pulse" />
                      )}
                    </button>
                  </div>
                  
                  {/* Step label */}
                  <div className="mt-2 text-center w-full px-1">
                    <div className={`
                      text-[10px] sm:text-xs font-medium break-words leading-tight
                      ${isCurrent ? 'text-teal-600 font-semibold' : isPast || isCompleted ? 'text-gray-600' : 'text-gray-400'}
                    `}>
                      {step.title}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Auto-save status indicator */}
          {counterpartyId && !startFresh && (
            <div className="flex items-center justify-center gap-2 mt-4 text-sm">
              {autoSaveStatus === 'saving' && (
                <>
                  <div className="w-3 h-3 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-gray-600">Saving...</span>
                </>
              )}
              {autoSaveStatus === 'saved' && (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-green-600">Saved</span>
                </>
              )}
              {autoSaveStatus === 'error' && (
                <>
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-red-600">Save failed</span>
                </>
              )}
              {autoSaveStatus === 'idle' && (
                <>
                  <Save className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">Auto-save enabled</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Step Content */}
        <Card className="shadow-lg border-gray-200 bg-white">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold text-gray-900 text-center">
              {steps[currentStep]?.title || 'Loading...'}
            </CardTitle>
            <CardDescription className="text-base text-gray-600 mt-2 text-center">
              {steps[currentStep]?.description || 'Please wait...'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
            
            {/* Navigation - only show for non-results steps */}
            {steps[currentStep].id !== 'results' && (
              <>
                <Separator className="my-6" />
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row gap-3 sm:justify-between">
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={handlePrevious}
                        disabled={currentStep === 0}
                        className="w-full sm:w-auto sm:min-w-[120px] h-11"
                      >
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Previous
                      </Button>
                      
                      {counterpartyId && !startFresh && (
                        <Button
                          variant="ghost"
                          onClick={async () => {
                            try {
                              await saveQuestionnaireData();
                              toast({
                                title: "Progress Saved",
                                description: "Your progress has been saved. You can continue later.",
                                variant: "default"
                              });
                            } catch (error) {
                              toast({
                                title: "Save Failed",
                                description: "Failed to save progress. Please try again.",
                                variant: "destructive"
                              });
                            }
                          }}
                          className="w-full sm:w-auto h-11"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save & Continue Later
                        </Button>
                      )}
                    </div>
                    
                    {currentStep < steps.length - 1 ? (
                      <Button 
                        onClick={handleNext} 
                        disabled={!canProceed() || Object.keys(validationErrors).length > 0}
                        className="w-full sm:w-auto sm:min-w-[120px] h-11"
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    ) : (
                      <Button variant="default" onClick={handleNext} className="w-full sm:w-auto sm:min-w-[180px] h-11">
                        Complete Assessment
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};