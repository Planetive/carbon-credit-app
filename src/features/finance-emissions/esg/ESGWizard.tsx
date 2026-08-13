import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, Plus, Building2, CheckCircle, BarChart3, Building, ArrowLeft, FileText, Shield, AlertCircle, Calculator, Save, Car, Landmark, Minus, Home } from 'lucide-react';
import { FinanceEmissionCalculator } from './FinanceEmissionCalculator';
import { FormattedNumberInput } from "@/components/shared/finance/FormattedNumberInput";
import { PortfolioClient } from '@/integrations/supabase/portfolioClient';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { EmissionResultRow, FinanceMode, WizardLocationState, WizardResumePayload } from "../types/contracts";
import type { LucideIcon } from 'lucide-react';

type RefreshPortfolioWindow = Window & {
  refreshPortfolioData?: () => Promise<void>;
};

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
}

const LOAN_TYPE_OPTIONS: Array<{
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  { value: 'corporate-bond', label: 'Corporate Bond', description: 'Debt securities issued by corporations', icon: Landmark },
  { value: 'business-loan', label: 'Business Loan', description: 'Loans to businesses for operations', icon: Building2 },
  { value: 'project-finance', label: 'Project Finance', description: 'Financing for a specific project', icon: BarChart3 },
  { value: 'mortgage', label: 'Mortgage', description: 'Loans secured by residential property', icon: Home },
  { value: 'sovereign-debt', label: 'Sovereign Debt', description: 'Bonds or loans issued by governments', icon: FileText },
  { value: 'motor-vehicle-loan', label: 'Motor Vehicle Loan', description: 'Loans for cars, trucks, and other vehicles', icon: Car },
  { value: 'commercial-real-estate', label: 'Commercial Real Estate', description: 'Loans for offices, retail, and industrial buildings', icon: Building },
];

const loanTypeLabel = (type: string) =>
  LOAN_TYPE_OPTIONS.find((o) => o.value === type)?.label || type;

const BOND_FAMILY = ['corporate-bond', 'business-loan', 'project-finance'];
const PROPERTY_FAMILY = ['commercial-real-estate', 'mortgage'];

const VEHICLE_METHODS = [
  { id: '1a', title: 'Actual fuel consumption', score: 'Score 1', description: 'Primary fuel use × fuel-specific emission factor' },
  { id: '1b', title: 'Actual distance + make/model efficiency', score: 'Score 1', description: 'Actual distance × make/model efficiency × fuel emission factor' },
  { id: '2a', title: 'Local distance statistics', score: 'Score 2', description: 'Local statistical distance × make/model efficiency × fuel emission factor' },
  { id: '2b', title: 'Regional distance statistics', score: 'Score 3', description: 'Regional statistical distance × make/model efficiency × fuel emission factor' },
  { id: '3a', title: 'Vehicle-type efficiency', score: 'Score 4', description: 'Statistical distance × vehicle-type efficiency × fuel emission factor' },
  { id: '3b', title: 'Average vehicle efficiency', score: 'Score 5', description: 'Statistical distance × average-vehicle efficiency × fuel emission factor' },
];

const PROPERTY_METHODS = [
  { id: '1a', title: 'Actual energy + supplier factor', score: 'Score 1', description: 'Actual building electricity × EPA/DEFRA supplier-specific factor' },
  { id: '1b', title: 'Actual energy + average factor', score: 'Score 2', description: 'Actual building electricity × EPA/DEFRA average factor' },
  { id: '2a', title: 'Energy labels', score: 'Score 3', description: 'Energy from labels × floor area × EPA/DEFRA average factor' },
  { id: '2b', title: 'Statistics + floor area', score: 'Score 4', description: 'Energy from statistics × floor area × EPA/DEFRA average factor' },
  { id: '3', title: 'Statistics + buildings', score: 'Score 5', description: 'Energy from statistics × number of buildings × EPA/DEFRA average factor' },
];

const SOVEREIGN_METHODS = [
  { id: '1a', title: 'Verified country GHG', score: 'Score 1', description: 'Climate TRACE country emissions (Pakistan & UAE)' },
  { id: '1b', title: 'Unverified country GHG', score: 'Score 2', description: 'Unverified country GHG emissions' },
  { id: '2a', title: 'Country energy consumption', score: 'Score 3', description: 'Country energy × EPA/DEFRA factor (+ process emissions)' },
  { id: '3a', title: 'Country sector intensity', score: 'Score 4', description: 'PPP-GDP × sector intensity from the reference table' },
  { id: '3b', title: 'Proxy country intensity', score: 'Score 5', description: 'Target PPP-GDP × (proxy GHG / proxy PPP-GDP)' },
];

const BOND_NO_GHG_METHODS = [
  { id: '2a', title: 'Energy consumption', score: 'Score 3', description: 'Energy or fuel use × EPA/DEFRA emission factor' },
  { id: '2b', title: 'Production', score: 'Score 3', description: 'Production volume × product emission factor' },
  { id: '3a', title: 'Revenue-based', score: 'Score 4', description: 'Company revenue × sector intensity (GHG / revenue from table)' },
  { id: '3c', title: 'Asset turnover (ATR)', score: 'Score 5', description: 'Outstanding × ATR × sector intensity (GHG / revenue from table)' },
];

const FACILITATED_NO_GHG_METHODS = [
  { id: '2a', title: 'Energy consumption', score: 'Score 3', description: 'Energy or fuel use × EPA/DEFRA emission factor × weight factor' },
  { id: '2b', title: 'Production', score: 'Score 3', description: 'Production volume × emission factor × weight factor' },
  { id: '3a', title: 'Revenue-based', score: 'Score 4', description: 'Company revenue × sector intensity (GHG / revenue from table) × weight factor' },
  { id: '3c', title: 'Asset turnover (ATR)', score: 'Score 5', description: 'Facilitated amount × ATR × sector intensity (GHG / revenue from table) × weight factor' },
];

const TILE =
  'w-full text-left rounded-[14px] border p-4 transition-all duration-200';
const TILE_ON = 'border-[#0F6E56] bg-[#EAF7F1]/70 shadow-[0_8px_20px_rgba(15,110,86,0.08)]';
const TILE_OFF = 'border-[#E8EEF0] bg-white hover:border-[#BFE3D3] hover:shadow-[0_8px_20px_rgba(15,23,42,0.04)]';

function MethodOptionGrid({
  methods,
  selectedId,
  onSelect,
  error,
}: {
  methods: Array<{ id: string; title: string; score: string; description: string }>;
  selectedId: string;
  onSelect: (id: string) => void;
  error?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {methods.map((method) => {
          const selected = selectedId === method.id;
          return (
            <button
              key={method.id}
              type="button"
              onClick={() => onSelect(method.id)}
              className={cn(TILE, selected ? TILE_ON : TILE_OFF)}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-[#0F172A] tracking-[-0.01em]">{method.title}</p>
                <span className="shrink-0 text-[11px] font-semibold text-[#0F6E56] bg-[#EAF7F1] px-2 py-0.5 rounded-full">
                  {method.score}
                </span>
              </div>
              <p className="text-sm text-[#64748B] mt-1.5 leading-relaxed">{method.description}</p>
            </button>
          );
        })}
      </div>
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

function ChoiceTile({
  selected,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  title: string;
  description?: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={cn(TILE, selected ? TILE_ON : TILE_OFF)}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
            selected ? 'border-[#0F6E56] bg-[#0F6E56]' : 'border-slate-300 bg-white'
          )}
        >
          {selected && <CheckCircle className="h-3.5 w-3.5 text-white" />}
        </span>
        <div>
          <p className="font-semibold text-[#0F172A]">{title}</p>
          {description && <p className="text-sm text-[#64748B] mt-1 leading-relaxed">{description}</p>}
        </div>
      </div>
    </button>
  );
}

export const ESGWizard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const locationState = (location.state || {}) as WizardLocationState;
  const mode: FinanceMode = locationState.mode || 'finance';
  const getCounterpartyIdFromSources = (): string | undefined => {
    const stateId = locationState.counterpartyId || locationState.counterparty || locationState.id;
    if (stateId) return stateId;

    try {
      const saved = sessionStorage.getItem('esgWizardState');
      if (saved) {
        const parsed = JSON.parse(saved);
        const sessionId = parsed?.counterpartyId || parsed?.formData?.counterpartyId;
        if (sessionId) return sessionId;
      }
    } catch (error) {
      void error;
    }

    return new URLSearchParams(window.location.search).get('counterpartyId') || undefined;
  };

  // Keep counterparty stable across rerenders/navigation state updates.
  const [counterpartyId, setCounterpartyId] = useState<string | undefined>(() => getCounterpartyIdFromSources());
  useEffect(() => {
    const latest = getCounterpartyIdFromSources();
    if (latest && latest !== counterpartyId) {
      setCounterpartyId(latest);
    }
  }, [location.state, counterpartyId]);
  const startFresh: boolean = locationState.startFresh === true;
  const returnUrl: string | undefined = locationState.returnUrl;
  const originalState = locationState;
  const hasPortfolioState = !!(originalState?.company || originalState?.counterpartyId || originalState?.id);
  const resolvedReturnUrl = returnUrl || "/emission-calculator";
  
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
        calculationMethods: {} as Record<string, string>,
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
      let resumePayload: WizardResumePayload | null = null;
      try {
        const saved = sessionStorage.getItem('esgWizardState');
        if (saved) {
          const parsed = JSON.parse(saved);
          resumePayload = parsed;
          if (parsed.mode && parsed.mode !== mode) {
            console.log('ESGWizard - Clearing sessionStorage: previous mode was', parsed.mode, 'current mode is', mode);
            sessionStorage.removeItem('esgWizardState');
            resumePayload = null;
          }
        }
      } catch (e) {
        console.warn('Error checking sessionStorage mode:', e);
      }

      const shouldPreserveReturnedScopeValues =
        !!resumePayload &&
        resumePayload.resumeAtCalculation === true &&
        resumePayload.mode === mode &&
        (typeof resumePayload.scope1Emissions === 'number' ||
          typeof resumePayload.scope2Emissions === 'number' ||
          typeof resumePayload.scope3Emissions === 'number');

      try {
        console.log('Loading existing questionnaire for counterpartyId:', counterpartyId);
        const questionnaire = await PortfolioClient.getQuestionnaire(counterpartyId);
        
        if (questionnaire) {
          console.log('Found existing questionnaire:', questionnaire);
          
          // Load loan types from emission calculations for this counterparty (only for finance mode)
          const loanTypes: Array<{ type: string; quantity: number }> = [];
          if (mode === 'finance') {
            const emissionCalculations = (
              await PortfolioClient.getEmissionCalculations(counterpartyId)
            ).filter((c) => c.calculation_type === 'finance');
            
            // Extract loan types from emission calculations (only for finance mode)
            if (emissionCalculations.length > 0) {
              const loanTypeMap = new Map<string, number>();
              emissionCalculations.forEach((calc) => {
                if (calc.inputs && typeof calc.inputs === 'object') {
                  const inputs = calc.inputs as Record<string, unknown>;
                  if (Array.isArray(inputs.loanTypes) && inputs.loanTypes.length > 0) {
                    inputs.loanTypes.forEach((loanType: unknown) => {
                      const normalizedType = typeof loanType === 'string' ? loanType : '';
                      if (!normalizedType) return;
                      const count = loanTypeMap.get(normalizedType) || 0;
                      loanTypeMap.set(normalizedType, count + 1);
                    });
                    return;
                  }
                  if (inputs.loanType) {
                    const count = loanTypeMap.get(String(inputs.loanType)) || 0;
                    loanTypeMap.set(String(inputs.loanType), count + 1);
                  }
                }
              });
              
              loanTypeMap.forEach((quantity, type) => {
                loanTypes.push({ type, quantity });
              });
            }
          }
          // For facilitated mode, loanTypes should always be empty array
          
          // Prefer fresh values returned from emission calculator when resuming;
          // otherwise use persisted questionnaire scope values.
          const resumedScope1 = Number(resumePayload?.scope1Emissions ?? 0);
          const resumedScope2 = Number(resumePayload?.scope2Emissions ?? 0);
          const resumedScope3 = Number(resumePayload?.scope3Emissions ?? 0);
          const scope1Emissions = shouldPreserveReturnedScopeValues ? resumedScope1 : (questionnaire.scope1_emissions || 0);
          const scope2Emissions = shouldPreserveReturnedScopeValues ? resumedScope2 : (questionnaire.scope2_emissions || 0);
          const scope3Emissions = shouldPreserveReturnedScopeValues ? resumedScope3 : (questionnaire.scope3_emissions || 0);

          // Auto-calculate verified/unverified emissions when scope emissions change
          const totalEmissions = scope1Emissions + scope2Emissions + scope3Emissions;
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
            calculationMethods: {} as Record<string, string>,
            score: 0,
            scope1Emissions,
            scope2Emissions,
            scope3Emissions,
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
          if (!hasRestoredRef.current) {
            try {
              const saved = sessionStorage.getItem('esgWizardState');
              if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.resumeAtCalculation === true && parsed.mode === mode) {
                  const hasRequiredData = mode === 'finance'
                    ? loanTypes.length > 0
                    : !!questionnaire.corporate_structure;
                  if (hasRequiredData) {
                    pendingStepIdRef.current = 'emission-calculation';
                  }
                }
              }
            } catch (e) {
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
    try {
      localStorage.setItem(sharedKey, JSON.stringify(data));
    } catch (error) {
      void error;
    }
  };

  const sharedPrefill = loadSharedAnswers();

  const catalogFinance: WizardStep[] = [
    { id: 'loan-type', title: 'Loan type', description: 'What are you financing?', icon: FileText },
    { id: 'corporate-structure', title: 'Listed or unlisted', description: 'Needed for EVIC vs equity + debt', icon: Building2 },
    { id: 'emission-status', title: 'Company GHG', description: 'Do you have company emissions data?', icon: AlertCircle },
    { id: 'verification', title: 'Verification', description: 'Verification details', icon: Shield },
    { id: 'emission-calculation', title: 'Inputs', description: 'Enter the data for this option', icon: Calculator },
    { id: 'results', title: 'Results', description: 'Financed emissions', icon: CheckCircle }
  ];
  const catalogFacilitated: WizardStep[] = [
    { id: 'corporate-structure', title: 'Listed or unlisted', description: 'Is the company listed or unlisted?', icon: Building2 },
    { id: 'emission-status', title: 'Company GHG', description: 'Do you have company emissions data?', icon: AlertCircle },
    { id: 'verification', title: 'Verification', description: 'Verification details', icon: Shield },
    { id: 'emission-calculation', title: 'Inputs', description: 'Calculate facilitated emissions', icon: Calculator },
    { id: 'results', title: 'Results', description: 'Facilitated emissions', icon: CheckCircle }
  ];

  const pendingStepIdRef = useRef<string | null>(null);
  const lastStepIdRef = useRef(mode === 'finance' ? 'loan-type' : 'corporate-structure');
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
          const restoredCounterpartyId =
            parsed.counterpartyId || parsed.formData?.counterpartyId;
          if (restoredCounterpartyId) {
            setCounterpartyId(restoredCounterpartyId);
          }
          
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
          
          if (lastStepIdRef.current !== 'results') {
            pendingStepIdRef.current = 'emission-calculation';
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

  const [formData, setFormData] = useState({
    corporateStructure: '', // 'listed' or 'unlisted'
    loanTypes: [], // Array of loan type objects with quantity
    hasEmissions: '',
    verificationStatus: '',
    calculationMethod: '',
    calculationMethods: {} as Record<string, string>,
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

  const PROPERTY_DIRECT_TYPES = ['commercial-real-estate', 'mortgage'];
  const LISTING_TYPES = ['corporate-bond', 'business-loan'];
  const isPropertyDirect =
    mode === 'finance' &&
    formData.loanTypes.length > 0 &&
    formData.loanTypes.every((item) => PROPERTY_DIRECT_TYPES.includes(item.type));
  const isVehicleDirect =
    mode === 'finance' &&
    formData.loanTypes.length > 0 &&
    formData.loanTypes.every((item) => item.type === 'motor-vehicle-loan');
  const isSovereignDirect =
    mode === 'finance' &&
    formData.loanTypes.length > 0 &&
    formData.loanTypes.every((item) => item.type === 'sovereign-debt');
  const isDirectMethod = isPropertyDirect || isVehicleDirect || isSovereignDirect;
  const needsListing =
    mode === 'finance' &&
    formData.loanTypes.some((item) => LISTING_TYPES.includes(item.type));
  const selectedTypeIds = formData.loanTypes.map((item) => item.type);
  const hasBondFamily = selectedTypeIds.some((t) => BOND_FAMILY.includes(t));
  const hasVehicleFamily = selectedTypeIds.includes('motor-vehicle-loan');
  const hasPropertyFamily = selectedTypeIds.some((t) => PROPERTY_FAMILY.includes(t));
  const hasSovereignFamily = selectedTypeIds.includes('sovereign-debt');
  const isMixedFamilies =
    [hasBondFamily, hasVehicleFamily, hasPropertyFamily, hasSovereignFamily].filter(Boolean).length > 1;
  const skipCompanyGhg = isDirectMethod || (isMixedFamilies && !hasBondFamily);
  const methodFor = (type: string) => formData.calculationMethods?.[type] || '';
  const methodForFamily = (types: string[]) => types.map(methodFor).find(Boolean) || '';
  const activityMixLabels = [
    hasVehicleFamily && 'motor vehicle',
    hasPropertyFamily && 'property',
    hasSovereignFamily && 'sovereign',
  ].filter(Boolean) as string[];
  const activityMixPhrase =
    activityMixLabels.length === 0
      ? 'activity loans'
      : activityMixLabels.length === 1
        ? activityMixLabels[0]
        : `${activityMixLabels.slice(0, -1).join(', ')} and ${activityMixLabels[activityMixLabels.length - 1]}`;

  const steps = (() => {
    let next = mode === 'finance' ? [...catalogFinance] : [...catalogFacilitated];
    if (mode === 'finance' && !needsListing) {
      next = next.filter((s) => s.id !== 'corporate-structure');
    }
    if (skipCompanyGhg) {
      next = next
        .filter((s) => s.id !== 'emission-status')
        .map((s) =>
          s.id === 'verification'
            ? isMixedFamilies
              ? { ...s, title: 'Methods by loan', description: 'Each asset class has its own PCAF options' }
              : { ...s, title: 'Calculation method', description: 'Select the PCAF data-quality option' }
            : s
        );
    } else if (isMixedFamilies) {
      next = next.map((s) => {
        if (s.id === 'emission-status') {
          return {
            ...s,
            title: 'Bond company GHG',
            description: `Only for the corporate bond / business loan — not ${activityMixPhrase}`,
          };
        }
        if (s.id === 'verification') {
          return {
            ...s,
            title: 'Methods by loan',
            description: `Bond can use company GHG; ${activityMixPhrase} always use activity data`,
          };
        }
        return s;
      });
    }
    return next;
  })();

  useEffect(() => {
    if (mode !== 'finance' || formData.loanTypes.length === 0) return;
    if (!needsListing && formData.corporateStructure !== 'unlisted') {
      setFormData((prev) => ({ ...prev, corporateStructure: 'unlisted' }));
    }
  }, [mode, needsListing, formData.loanTypes.length, formData.corporateStructure]);

  useEffect(() => {
    const currentId = steps[currentStep]?.id;
    if (currentId) {
      lastStepIdRef.current = currentId;
      return;
    }
    const mapped = steps.findIndex((s) => s.id === lastStepIdRef.current);
    setCurrentStep(mapped >= 0 ? mapped : 0);
  }, [steps, currentStep]);

  useEffect(() => {
    const target = pendingStepIdRef.current;
    if (!target) return;
    const idx = steps.findIndex((s) => s.id === target);
    if (idx >= 0) {
      setCurrentStep(idx);
      pendingStepIdRef.current = null;
    }
  }, [steps]);

  // Track completed steps for visual indicators
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  
  // Track validation errors for inline display
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Auto-save state
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const autoSaveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [results, setResults] = useState<EmissionResultRow[]>([]);

  // Helper function to sanitize numeric values for database storage
  const sanitizeNumericValue = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") return null;
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) return null;
    return n;
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
      await PortfolioClient.deleteAllEmissionCalculationsForMode(counterpartyId, calculationMode);
      console.log('Deleted all emission calculations for fresh start');
    } catch (error) {
      console.warn('Error in deleteAllFinanceEmissionCalculations:', error);
    }
  };

  // Clean up old finance emission calculations that are no longer needed
  const cleanupOldFinanceEmissionCalculations = async (
    counterpartyId: string,
    currentResults: Array<{
      type: string;
      label: string;
      attributionFactor: number;
      financedEmissions: number;
      denominatorLabel: string;
      denominatorValue: number;
      dataQualityScore?: number;
    }>
  ) => {
    try {
      await PortfolioClient.cleanupStaleEmissionCalculations(
        counterpartyId,
        mode,
        currentResults.map((r) => r.type)
      );
      console.log('Cleaned up old emission calculations');
    } catch (error) {
      console.warn('Error in cleanup function:', error);
    }
  };

  // Save emission calculations to database
  const saveEmissionCalculations = async (
    calculationResults: Array<{
      type: string;
      label: string;
      attributionFactor: number;
      financedEmissions: number;
      denominatorLabel: string;
      denominatorValue: number;
      dataQualityScore?: number;
      pcafFormulaId?: string;
      pcafInputs?: Record<string, unknown>;
      companyType?: string;
    }>,
    formData?: Record<string, unknown>
  ) => {
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

      const resultsWithDataQualityScores = calculationResults.filter(
        (r) => r.dataQualityScore != null && isFinite(r.dataQualityScore)
      );
      const averageDataQualityScore =
        resultsWithDataQualityScores.length > 0
          ? resultsWithDataQualityScores.reduce((sum, r) => sum + (r.dataQualityScore as number), 0) /
            resultsWithDataQualityScores.length
          : null;

      // Save individual records for each loan type (for detailed tracking)
      for (const result of calculationResults) {
        // Also save to finance_emission_calculations table for portfolio integration
        await PortfolioClient.saveFinanceEmissionCalculation({
          counterparty_id: counterpartyId,
          outstanding_amount: sanitizeNumericValue(formData?.outstandingLoan || 0),
          calculation_type: mode === 'finance' ? 'finance_emission' : 'facilitated_emission',
          formula_id: result.type,
          formula_name: result.label,
          company_type: (formData?.corporateStructure as 'listed' | 'unlisted') || 'unlisted',
          total_assets: sanitizeNumericValue(formData?.totalAssets || 0),
          evic: sanitizeNumericValue(result.denominatorValue),
          total_equity_plus_debt: sanitizeNumericValue(result.denominatorValue),
          financed_emissions: sanitizeNumericValue(result.financedEmissions),
          attribution_factor: sanitizeNumericValue(result.attributionFactor),
          data_quality_score: sanitizeNumericValue(
            result.dataQualityScore != null && isFinite(result.dataQualityScore)
              ? result.dataQualityScore
              : null
          ),
          status: 'completed',
          share_price: sanitizeNumericValue(formData?.sharePrice || 0),
          outstanding_shares: sanitizeNumericValue(formData?.outstandingShares || 0),
          total_debt: sanitizeNumericValue(formData?.totalDebt || 0),
          total_equity: sanitizeNumericValue(formData?.totalEquity || 0),
          minority_interest: sanitizeNumericValue(formData?.minorityInterest || 0),
          preferred_stock: sanitizeNumericValue(formData?.preferredStock || 0),
          pcaf_formula_id: result.pcafFormulaId,
          pcaf_inputs: result.pcafInputs,
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
        company_type: (() => {
          const structure = formData?.corporateStructure;
          return typeof structure === "string" && structure ? structure : "unlisted";
        })(),
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
            denominatorValue: sanitizeNumericValue(r.denominatorValue),
            dataQualityScore:
              r.dataQualityScore != null && isFinite(r.dataQualityScore)
                ? sanitizeNumericValue(r.dataQualityScore)
                : null
          })),
          // Use first result for single values (usually same for all)
          attributionFactor: sanitizeNumericValue(averageAttributionFactor),
          financedEmissions: sanitizeNumericValue(totalFinancedEmissions),
          denominatorLabel: firstResult?.denominatorLabel || '',
          denominatorValue: sanitizeNumericValue(firstResult?.denominatorValue || 0),
          loanType: calculationResults.length === 1 ? firstResult?.type : 'multiple',
          loanLabel: calculationResults.length === 1 ? firstResult?.label : `${calculationResults.length} loan types`,
          dataQualityScore:
            averageDataQualityScore != null && isFinite(averageDataQualityScore)
              ? sanitizeNumericValue(averageDataQualityScore)
              : null
        },
        financed_emissions: sanitizeNumericValue(totalFinancedEmissions), // Sum all financed emissions
        attribution_factor: sanitizeNumericValue(averageAttributionFactor),
        data_quality_score:
          averageDataQualityScore != null && isFinite(averageDataQualityScore)
            ? sanitizeNumericValue(averageDataQualityScore)
            : null,
        evic: sanitizeNumericValue(firstResult?.denominatorValue || 0),
        total_equity_plus_debt: sanitizeNumericValue(firstResult?.denominatorValue || 0),
        status: 'completed'
      });

      console.log('✅ Successfully saved aggregate record to emission_calculations table:', savedCalculation);
      console.log('✅ Total financed emissions:', totalFinancedEmissions);
      console.log('✅ Calculation type:', mode);
      console.log('✅ Counterparty ID:', counterpartyId);

      // Cache enough for Company Detail to show breakdown (+) and data quality scores immediately — not only after DB refetch
      try {
        const cacheKey = `latestEmissionSummary:${counterpartyId}:${mode}`;
        const summary = {
          financed_emissions: totalFinancedEmissions,
          attribution_factor: averageAttributionFactor,
          denominator_value: firstResult?.denominatorValue || 0,
          updated_at: new Date().toISOString(),
          calculation_type: mode,
          allResults: calculationResults.map((r) => ({
            type: r.type,
            label: r.label,
            attributionFactor: sanitizeNumericValue(r.attributionFactor),
            financedEmissions: sanitizeNumericValue(r.financedEmissions),
            denominatorLabel: r.denominatorLabel,
            denominatorValue: sanitizeNumericValue(r.denominatorValue),
            dataQualityScore:
              r.dataQualityScore != null && isFinite(r.dataQualityScore)
                ? sanitizeNumericValue(r.dataQualityScore)
                : null
          })),
          dataQualityScore:
            averageDataQualityScore != null && isFinite(averageDataQualityScore)
              ? sanitizeNumericValue(averageDataQualityScore)
              : null,
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
            loanTypes: calculationResults.map((r) => r.type),
            loanLabels: calculationResults.map((r) => r.label)
          }
        };
        sessionStorage.setItem(cacheKey, JSON.stringify(summary));
        console.log('✅ Cached latest emission summary:', cacheKey, summary);
      } catch (e) {
        console.warn('Failed to cache latest emission summary:', e);
      }

      // Update exposure amount in exposures table
      const outstandingLoan = sanitizeNumericValue(formData?.outstandingLoan);
      if (outstandingLoan != null && outstandingLoan > 0) {
        try {
          await PortfolioClient.updateExposureAmountForCounterparty(
            counterpartyId,
            outstandingLoan
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
      const appWindow = window as RefreshPortfolioWindow;
      if (typeof appWindow.refreshPortfolioData === 'function') {
        try {
          await appWindow.refreshPortfolioData();
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
        if (isMixedFamilies) {
          if (hasBondFamily && dataToValidate.hasEmissions === 'yes' && !dataToValidate.verificationStatus) {
            errors.verificationStatus = 'Please select verification status for the bond / loan';
          }
          if (hasBondFamily && dataToValidate.hasEmissions === 'yes' && dataToValidate.verificationStatus === 'verified' && !dataToValidate.verifierName.trim()) {
            errors.verifierName = 'Please enter the verifier name';
          }
          if (hasBondFamily && dataToValidate.hasEmissions === 'no' && !BOND_FAMILY.some((t) => dataToValidate.calculationMethods?.[t])) {
            errors.calculationMethod = 'Select a PCAF option for the corporate bond / business loan';
          }
          if (hasVehicleFamily && !dataToValidate.calculationMethods?.['motor-vehicle-loan']) {
            errors.vehicleMethod = 'Select a PCAF option for the motor vehicle loan';
          }
          if (hasPropertyFamily && !PROPERTY_FAMILY.some((t) => dataToValidate.calculationMethods?.[t])) {
            errors.propertyMethod = 'Select a PCAF option for the property loan';
          }
          if (hasSovereignFamily && !dataToValidate.calculationMethods?.['sovereign-debt']) {
            errors.sovereignMethod = 'Select a PCAF option for sovereign debt';
          }
          break;
        }
        if (isDirectMethod) {
          if (!dataToValidate.calculationMethod) {
            errors.calculationMethod = 'Please select a calculation method';
          }
          break;
        }
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

  const updateFormData = (
    field: string,
    value: string | number | Array<{ type: string; quantity: number }>,
  ) => {
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

  const applyMethods = (types: string[], method: string) => {
    setFormData((prev) => {
      const calculationMethods = { ...(prev.calculationMethods || {}) };
      types.forEach((type) => {
        if (prev.loanTypes.some((item) => item.type === type)) {
          calculationMethods[type] = method;
        }
      });
      const updated = { ...prev, calculationMethod: method, calculationMethods };
      setValidationErrors(validateCurrentStep(updated));
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
      case 'corporate-structure': {
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ChoiceTile
                selected={formData.corporateStructure === 'listed'}
                title="Listed company"
                description="Shares trade on a public exchange. Attribution uses EVIC."
                onClick={() => updateFormData('corporateStructure', 'listed')}
              />
              <ChoiceTile
                selected={formData.corporateStructure === 'unlisted'}
                title="Unlisted company"
                description="Private company. Attribution uses total equity + debt."
                onClick={() => updateFormData('corporateStructure', 'unlisted')}
              />
            </div>
            {validationErrors.corporateStructure && (
              <p className="text-sm text-red-600 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {validationErrors.corporateStructure}
              </p>
            )}
          </div>
        );
      }

      case 'loan-type': {
        if (mode === 'facilitated') {
          return null;
        }

        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {LOAN_TYPE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = formData.loanTypes.some(item => item.type === option.value);
                const selectedItem = formData.loanTypes.find(item => item.type === option.value);

                return (
                  <div
                    key={option.value}
                    className={cn(TILE, isSelected ? TILE_ON : TILE_OFF, 'relative')}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (isSelected) removeLoanType(option.value);
                        else addLoanType(option.value, 1);
                      }}
                      className="w-full text-left"
                    >
                      <div className="flex gap-3">
                        <div
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                            isSelected ? 'bg-[#0F6E56] text-white' : 'bg-[#F1F5F9] text-[#64748B]'
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 pr-6">
                          <p className="font-semibold text-[#0F172A] tracking-[-0.01em]">{option.label}</p>
                          <p className="text-sm text-[#64748B] mt-1 leading-relaxed">{option.description}</p>
                        </div>
                      </div>
                    </button>
                    {isSelected && (
                      <div className="mt-3 ml-[52px] flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs font-medium text-[#64748B]">Quantity</span>
                        <div className="inline-flex items-center rounded-lg border border-[#E2E8F0] bg-white">
                          <button
                            type="button"
                            className="h-8 w-8 flex items-center justify-center text-[#64748B] hover:text-[#0F172A]"
                            onClick={() => updateLoanTypeQuantity(option.value, (selectedItem?.quantity || 1) - 1)}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm font-semibold text-[#0F172A]">
                            {selectedItem?.quantity || 1}
                          </span>
                          <button
                            type="button"
                            className="h-8 w-8 flex items-center justify-center text-[#64748B] hover:text-[#0F172A]"
                            onClick={() => updateLoanTypeQuantity(option.value, (selectedItem?.quantity || 1) + 1)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {isMixedFamilies && (
              <p className="text-sm text-[#64748B]">
                Mixed asset classes each use their own PCAF table. You will pick a method for each on the next steps.
              </p>
            )}
            {validationErrors.loanTypes && (
              <p className="text-sm text-red-600 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {validationErrors.loanTypes}
              </p>
            )}
          </div>
        );
      }

      case 'emission-status':
        return (
          <div className="space-y-6">
            {isMixedFamilies && (
              <div className="rounded-[14px] border border-[#E8EEF0] bg-[#F8FAFC] p-4 space-y-2">
                <p className="text-sm font-semibold text-[#0F172A]">This question is only for the bond / business loan</p>
                <p className="text-sm text-[#64748B]">
                  {activityMixPhrase.charAt(0).toUpperCase() + activityMixPhrase.slice(1)} never use company GHG.
                  They get their own PCAF options on the next step.
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ChoiceTile
                selected={formData.hasEmissions === 'yes'}
                title={isMixedFamilies ? 'Yes — the company has GHG data' : 'Yes — we have company GHG data'}
                description={
                  isMixedFamilies
                    ? 'Used for the corporate bond / business loan only (Option 1a / 1b).'
                    : 'Enter Scope 1, 2 and 3 totals in tCO₂e.'
                }
                onClick={() => updateFormData('hasEmissions', 'yes')}
              />
              <ChoiceTile
                selected={formData.hasEmissions === 'no'}
                title={isMixedFamilies ? 'No — estimate the bond from activity' : 'No — estimate from activity'}
                description={
                  isMixedFamilies
                    ? `Bond uses energy, production, or sector proxies. ${activityMixPhrase.charAt(0).toUpperCase() + activityMixPhrase.slice(1)} still use their own activity methods.`
                    : 'Use energy, production, or sector proxies.'
                }
                onClick={() => updateFormData('hasEmissions', 'no')}
              />
            </div>
            {validationErrors.hasEmissions && (
              <p className="text-sm text-red-600 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {validationErrors.hasEmissions}
              </p>
            )}

            {formData.hasEmissions === 'yes' && (
              <div className="rounded-[14px] border border-[#E8EEF0] bg-[#F8FAFC] p-4 sm:p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#0F172A]">Emissions by scope</h3>
                  <p className="text-sm text-[#64748B] mt-0.5">Values in tCO₂e</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scope1" className="text-sm font-medium text-[#334155]">Scope 1</Label>
                    <FormattedNumberInput
                      id="scope1"
                      placeholder="0"
                      value={formData.scope1Emissions || 0}
                      onChange={(value) => updateFormData('scope1Emissions', value)}
                      className={`h-11 ${validationErrors.scopeEmissions ? 'border-red-400' : 'border-[#E2E8F0] bg-white'}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scope2" className="text-sm font-medium text-[#334155]">Scope 2</Label>
                    <FormattedNumberInput
                      id="scope2"
                      placeholder="0"
                      value={formData.scope2Emissions || 0}
                      onChange={(value) => updateFormData('scope2Emissions', value)}
                      className={`h-11 ${validationErrors.scopeEmissions ? 'border-red-400' : 'border-[#E2E8F0] bg-white'}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scope3" className="text-sm font-medium text-[#334155]">Scope 3</Label>
                    <FormattedNumberInput
                      id="scope3"
                      placeholder="0"
                      value={formData.scope3Emissions || 0}
                      onChange={(value) => updateFormData('scope3Emissions', value)}
                      className={`h-11 ${validationErrors.scopeEmissions ? 'border-red-400' : 'border-[#E2E8F0] bg-white'}`}
                    />
                  </div>
                </div>
                {validationErrors.scopeEmissions && (
                  <p className="text-sm text-red-600 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {validationErrors.scopeEmissions}
                  </p>
                )}
              </div>
            )}
          </div>
        );

      case 'verification':
        if (isMixedFamilies) {
          return (
            <div className="space-y-6">
              <p className="text-sm text-[#64748B]">
                {hasBondFamily && formData.hasEmissions === 'yes'
                  ? `Bond uses the company GHG you just entered. ${activityMixPhrase.charAt(0).toUpperCase() + activityMixPhrase.slice(1)} still need their own activity option.`
                  : 'Each asset class has its own PCAF table. Pick an option for every group below.'}
              </p>
              {hasBondFamily && formData.hasEmissions === 'yes' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-[#0F172A]">Corporate bond / business loan</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <ChoiceTile
                      selected={formData.verificationStatus === 'verified'}
                      title="Verified by a third party"
                      description="Company GHG is independently verified (Option 1a)."
                      onClick={() => updateFormData('verificationStatus', 'verified')}
                    />
                    <ChoiceTile
                      selected={formData.verificationStatus === 'unverified'}
                      title="Not verified"
                      description="Use unverified company GHG (Option 1b)."
                      onClick={() => updateFormData('verificationStatus', 'unverified')}
                    />
                  </div>
                  {formData.verificationStatus === 'verified' && (
                    <Input
                      id="verifier-name-mixed"
                      placeholder="e.g., SGS, DNV, Bureau Veritas"
                      className="h-11 bg-white border-[#E2E8F0]"
                      value={formData.verifierName}
                      onChange={(e) => updateFormData('verifierName', e.target.value)}
                    />
                  )}
                  {validationErrors.verificationStatus && (
                    <p className="text-sm text-red-600">{validationErrors.verificationStatus}</p>
                  )}
                </div>
              )}
              {hasBondFamily && formData.hasEmissions === 'no' && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-[#0F172A]">Corporate bond / business loan</h3>
                  <MethodOptionGrid
                    methods={BOND_NO_GHG_METHODS}
                    selectedId={methodForFamily(BOND_FAMILY)}
                    onSelect={(id) => applyMethods(BOND_FAMILY, id)}
                    error={validationErrors.calculationMethod}
                  />
                </div>
              )}
              {hasVehicleFamily && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-[#0F172A]">Motor vehicle loan — activity data</h3>
                  <p className="text-xs text-[#64748B]">Not company GHG. Choose how you know fuel or distance.</p>
                  <MethodOptionGrid
                    methods={VEHICLE_METHODS}
                    selectedId={methodFor('motor-vehicle-loan')}
                    onSelect={(id) => applyMethods(['motor-vehicle-loan'], id)}
                    error={validationErrors.vehicleMethod}
                  />
                </div>
              )}
              {hasPropertyFamily && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-[#0F172A]">Property loan — activity data</h3>
                  <p className="text-xs text-[#64748B]">Not company GHG. Choose how you know building energy.</p>
                  <MethodOptionGrid
                    methods={PROPERTY_METHODS}
                    selectedId={methodForFamily(PROPERTY_FAMILY)}
                    onSelect={(id) => applyMethods(PROPERTY_FAMILY, id)}
                    error={validationErrors.propertyMethod}
                  />
                </div>
              )}
              {hasSovereignFamily && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-[#0F172A]">Sovereign debt — country data</h3>
                  <p className="text-xs text-[#64748B]">Not company GHG. Choose the country data-quality option.</p>
                  <MethodOptionGrid
                    methods={SOVEREIGN_METHODS}
                    selectedId={methodFor('sovereign-debt')}
                    onSelect={(id) => applyMethods(['sovereign-debt'], id)}
                    error={validationErrors.sovereignMethod}
                  />
                </div>
              )}
            </div>
          );
        }
        if (isSovereignDirect) {
          return (
            <MethodOptionGrid
              methods={SOVEREIGN_METHODS}
              selectedId={formData.calculationMethod}
              onSelect={(id) => applyMethods(['sovereign-debt'], id)}
              error={validationErrors.calculationMethod}
            />
          );
        }
        if (isVehicleDirect) {
          return (
            <MethodOptionGrid
              methods={VEHICLE_METHODS}
              selectedId={formData.calculationMethod}
              onSelect={(id) => applyMethods(['motor-vehicle-loan'], id)}
              error={validationErrors.calculationMethod}
            />
          );
        }
        if (isPropertyDirect) {
          return (
            <MethodOptionGrid
              methods={PROPERTY_METHODS}
              selectedId={formData.calculationMethod}
              onSelect={(id) => applyMethods(PROPERTY_FAMILY, id)}
              error={validationErrors.calculationMethod}
            />
          );
        }
        if (formData.hasEmissions === 'yes') {
          return (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ChoiceTile
                  selected={formData.verificationStatus === 'verified'}
                  title="Verified by a third party"
                  description="Reported GHG has been independently verified."
                  onClick={() => updateFormData('verificationStatus', 'verified')}
                />
                <ChoiceTile
                  selected={formData.verificationStatus === 'unverified'}
                  title="Not verified"
                  description="Use unverified company GHG totals."
                  onClick={() => updateFormData('verificationStatus', 'unverified')}
                />
              </div>
              {validationErrors.verificationStatus && (
                <p className="text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {validationErrors.verificationStatus}
                </p>
              )}

              {formData.verificationStatus === 'verified' && (
                <div className="rounded-[14px] border border-[#E8EEF0] bg-[#F8FAFC] p-4 space-y-2">
                  <Label htmlFor="verifier-name" className="text-sm font-medium text-[#334155]">
                    Verified by
                  </Label>
                  <Input
                    id="verifier-name"
                    placeholder="e.g., SGS, DNV, Bureau Veritas"
                    className={`h-11 bg-white ${validationErrors.verifierName ? 'border-red-400' : 'border-[#E2E8F0]'}`}
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
          );
        } else if (formData.hasEmissions === 'no') {
          if (mode === 'facilitated') {
            return (
              <MethodOptionGrid
                methods={FACILITATED_NO_GHG_METHODS}
                selectedId={formData.calculationMethod}
                onSelect={(id) => updateFormData('calculationMethod', id)}
                error={validationErrors.calculationMethod}
              />
            );
          }
          const hasCommercialRealEstate = formData.loanTypes.some(
            (item) => item.type === 'commercial-real-estate'
          );
          const usesBondLoanMethods = formData.loanTypes.some(
            (item) =>
              item.type === 'corporate-bond' ||
              item.type === 'business-loan' ||
              item.type === 'project-finance'
          );
          const creMethods: Array<{ id: string; title: string; score: string; description: string }> = [
            { id: '2a', title: 'Energy labels', score: 'Score 3', description: 'Energy from labels × floor area × EPA/DEFRA average factor' },
            { id: '2b', title: 'Statistics + floor area', score: 'Score 4', description: 'Energy from statistics × floor area × EPA/DEFRA average factor' },
            { id: '3', title: 'Statistics + buildings', score: 'Score 5', description: 'Energy from statistics × number of buildings × EPA/DEFRA average factor' },
          ];
          if (hasCommercialRealEstate) {
            return (
              <MethodOptionGrid
                methods={creMethods}
                selectedId={formData.calculationMethod}
                onSelect={(id) => applyMethods(PROPERTY_FAMILY, id)}
                error={validationErrors.calculationMethod}
              />
            );
          }
          const corporateBondMethods: Array<{ id: string; title: string; score: string; description: string }> = [
            { id: '2a', title: 'Energy consumption', score: 'Score 3', description: 'Energy or fuel use × EPA/DEFRA emission factor' },
            { id: '2b', title: 'Production', score: 'Score 3', description: 'Production volume × product emission factor' },
            { id: '3a', title: 'Revenue-based', score: 'Score 4', description: 'Company revenue × sector intensity (GHG / revenue from table)' },
            { id: '3c', title: 'Asset turnover (ATR)', score: 'Score 5', description: 'Outstanding × ATR × sector intensity (GHG / revenue from table)' },
          ];
          if (usesBondLoanMethods) {
            return (
              <MethodOptionGrid
                methods={corporateBondMethods}
                selectedId={formData.calculationMethod}
                onSelect={(id) => applyMethods(BOND_FAMILY, id)}
                error={validationErrors.calculationMethod}
              />
            );
          }
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
                        counterpartyId,
                        mode, 
                        ts: Date.now() 
                      }));
                    } catch (error) {
                      void error;
                    }
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
          calculationMethod={formData.calculationMethod}
          calculationMethods={formData.calculationMethods}
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

      case 'results': {
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

        const formatWithSeparators = (value: number, maximumFractionDigits = 2): string =>
          new Intl.NumberFormat("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits,
          }).format(Number.isFinite(value) ? value : 0);

        const formatCompact = (value: number): string =>
          new Intl.NumberFormat("en-US", {
            notation: "compact",
            maximumFractionDigits: 2,
          }).format(Number.isFinite(value) ? value : 0);

        const metricCard =
          "rounded-[16px] border border-[rgba(15,23,42,0.06)] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_22px_rgba(15,23,42,0.025)]";

        return (
          <div className="space-y-6">
            {!results || results.length === 0 ? (
              <div className="py-14 text-center">
                <div className="w-12 h-12 bg-[#F1F5F9] rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Calculator className="h-6 w-6 text-[#94A3B8]" />
                </div>
                <p className="text-[#0F172A] font-medium">No results yet</p>
                <p className="text-sm text-[#64748B] mt-1">Run a calculation to see financed emissions.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className={metricCard}>
                    <p className="text-[13px] font-medium text-[#64748B]">Total emissions</p>
                    <p className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-[#0F172A]" title={formatWithSeparators(totalEmissions, 2)}>
                      {formatCompact(totalEmissions)} <span className="text-sm font-medium text-[#64748B]">tCO₂e</span>
                    </p>
                    <p className="text-xs text-[#94A3B8] mt-1">{formatWithSeparators(totalEmissions, 2)} tCO₂e</p>
                  </div>
                  <div className={metricCard}>
                    <p className="text-[13px] font-medium text-[#64748B]">Average attribution</p>
                    <p className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-[#0F172A]">
                      {formatWithSeparators(averageAttributionFactor * 100, 2)}%
                    </p>
                  </div>
                  <div className={metricCard}>
                    <p className="text-[13px] font-medium text-[#64748B]">
                      {formData.corporateStructure === 'listed' ? 'EVIC' : 'Total equity + debt'}
                    </p>
                    <p className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-[#0F172A]" title={`${formatWithSeparators(sharedEVIC, 0)} PKR`}>
                      {formatCompact(sharedEVIC)} <span className="text-sm font-medium text-[#64748B]">PKR</span>
                    </p>
                  </div>
                </div>

                {validResults.length > 0 && (
                  <div className="rounded-[16px] border border-[rgba(15,23,42,0.06)] overflow-hidden">
                    <div className="px-5 py-3 border-b border-[#E8EEF0]">
                      <p className="text-sm font-semibold text-[#0F172A]">By loan type</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[#E8EEF0] bg-[#F8FAFC]">
                            <th className="text-left py-2.5 px-5 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Loan type</th>
                            <th className="text-right py-2.5 px-5 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Attribution</th>
                            <th className="text-right py-2.5 px-5 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Emissions</th>
                            <th className="text-right py-2.5 px-5 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Denominator</th>
                          </tr>
                        </thead>
                        <tbody>
                          {validResults.map((result, index) => (
                            <tr key={index} className="border-b border-[#F1F5F9] last:border-0">
                              <td className="py-3.5 px-5 font-medium text-[#0F172A]">{result.label}</td>
                              <td className="py-3.5 px-5 text-right text-[#0F6E56] font-medium">
                                {formatWithSeparators(result.attributionFactor * 100, 2)}%
                              </td>
                              <td className="py-3.5 px-5 text-right font-semibold text-[#0F172A]">
                                {formatWithSeparators(result.financedEmissions, 2)} <span className="text-xs font-normal text-[#64748B]">tCO₂e</span>
                              </td>
                              <td className="py-3.5 px-5 text-right text-sm text-[#64748B]">
                                <div className="font-medium text-[#334155]">{result.denominatorLabel}</div>
                                <div className="text-xs">{formatWithSeparators(result.denominatorValue, 0)} PKR</div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <Button 
                    onClick={() => setCurrentStep(steps.findIndex(s => s.id === 'emission-calculation'))}
                    variant="outline" 
                    className="w-full sm:w-auto h-10 border-[#E2E8F0] text-[#334155]"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Recalculate
                  </Button>
                  {mode === 'finance' ? (
                    <Button 
                      onClick={() => navigate('/finance-emission', { 
                        state: { 
                          ...originalState,
                          mode: 'facilitated',
                          startFresh: true,
                          returnUrl
                        } 
                      })}
                      className="w-full sm:w-auto h-10 bg-[#0F6E56] hover:bg-[#0C5A47] text-white"
                    >
                      Next: Facilitated emission
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => {
                        const target = resolvedReturnUrl;
                        if (hasPortfolioState && returnUrl) {
                          navigate(target, { state: originalState });
                        } else {
                          navigate(target);
                        }
                      }}
                      className="w-full sm:w-auto h-10 bg-[#0F6E56] hover:bg-[#0C5A47] text-white"
                    >
                      Complete & return
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const target = resolvedReturnUrl;
                      if (hasPortfolioState && returnUrl) {
                        navigate(target, { state: originalState });
                      } else {
                        navigate(target);
                      }
                    }}
                    className="w-full sm:w-auto h-10 text-[#64748B]"
                  >
                    Return
                  </Button>
                </div>
              </>
            )}
          </div>
        );
      }

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
        if (isMixedFamilies) {
          const bondOk = !hasBondFamily || (
            formData.hasEmissions === 'yes'
              ? formData.verificationStatus !== ''
              : !!methodForFamily(BOND_FAMILY)
          );
          const vehicleOk = !hasVehicleFamily || !!methodFor('motor-vehicle-loan');
          const propertyOk = !hasPropertyFamily || !!methodForFamily(PROPERTY_FAMILY);
          const sovereignOk = !hasSovereignFamily || !!methodFor('sovereign-debt');
          return bondOk && vehicleOk && propertyOk && sovereignOk;
        }
        if (isDirectMethod) {
          return formData.calculationMethod !== '';
        }
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

  const progressPct = steps.length > 1 ? Math.round((currentStep / (steps.length - 1)) * 100) : 0;
  const isResultsStep = steps[currentStep]?.id === 'results';
  const isEmissionStep = steps[currentStep]?.id === 'emission-calculation';
  const listingLabel =
    formData.corporateStructure === 'listed'
      ? 'Listed'
      : formData.corporateStructure === 'unlisted'
        ? 'Unlisted'
        : null;

  return (
    <div className="relative min-h-screen bg-[#F8FAF8]">
      <div className="mx-auto max-w-[1200px] px-4 pb-28 pt-6 md:px-6 md:pt-8">
        <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 text-sm text-[#64748B] hover:text-[#0F172A] mb-3"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-[#0F172A] sm:text-[32px]">
              {mode === 'finance' ? 'Financed emissions' : 'Facilitated emissions'}
            </h1>
            <p className="mt-1.5 text-sm text-[#64748B]">
              {mode === 'finance'
                ? 'PCAF calculation for this counterparty'
                : 'PCAF facilitated emissions for this counterparty'}
            </p>
          </div>
          <div className="w-full shrink-0 sm:w-[220px] sm:pt-10">
            <div className="mb-1.5 flex items-center justify-between text-xs text-[#64748B]">
              <span>
                Step <span className="font-semibold text-[#0F172A]">{currentStep + 1}</span> of {steps.length}
              </span>
              <span className="font-medium text-[#0F6E56]">{progressPct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#E2E8F0]">
              <div
                className="h-full rounded-full bg-[#0F6E56] transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {counterpartyId && !startFresh && (
              <p className="mt-1.5 text-[11px] text-[#94A3B8] text-right">
                {autoSaveStatus === 'saving' && 'Saving…'}
                {autoSaveStatus === 'saved' && 'Saved'}
                {autoSaveStatus === 'error' && 'Save failed'}
                {autoSaveStatus === 'idle' && 'Auto-save on'}
              </p>
            )}
          </div>
        </header>

        <nav aria-label="Calculation steps" className="mb-8">
          <ol className="flex items-start justify-between gap-1">
            {steps.map((s, i) => {
              const active = i === currentStep;
              const done = i < currentStep;
              return (
                <li key={s.id} className="relative flex min-w-0 flex-1 flex-col items-center">
                  {i < steps.length - 1 ? (
                    <div
                      className={cn(
                        'absolute left-[calc(50%+18px)] right-[calc(-50%+18px)] top-[15px] h-0.5',
                        done || active ? 'bg-[#0F6E56]' : 'bg-[#E2E8F0]'
                      )}
                      aria-hidden
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handleStepClick(i)}
                    className="relative z-[1] flex flex-col items-center gap-2"
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                        active || done
                          ? 'bg-[#0F6E56] text-white'
                          : 'border-2 border-[#E2E8F0] bg-white text-[#94A3B8]'
                      )}
                    >
                      {done ? <CheckCircle className="h-4 w-4" /> : i + 1}
                    </span>
                    <span
                      className={cn(
                        'max-w-[7.5rem] text-center text-[11px] font-medium leading-snug sm:text-xs',
                        active ? 'text-[#0F6E56]' : 'text-[#94A3B8]'
                      )}
                    >
                      {s.title}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
          <div className="rounded-2xl border border-[#E8EEF0] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-7">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-[#0F172A] tracking-[-0.02em]">
                {steps[currentStep]?.title || 'Loading...'}
              </h2>
              <p className="text-sm text-[#64748B] mt-1">
                {steps[currentStep]?.description || 'Please wait...'}
              </p>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>

            {!isResultsStep && (
              <div className="mt-8 flex flex-col gap-3 border-t border-[#E8EEF0] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentStep === 0}
                    className="h-10 border-[#E2E8F0] text-[#334155]"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  {counterpartyId && !startFresh && (
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        try {
                          await saveQuestionnaireData();
                          toast({
                            title: 'Progress Saved',
                            description: 'Your progress has been saved. You can continue later.',
                            variant: 'default'
                          });
                        } catch {
                          toast({
                            title: 'Save Failed',
                            description: 'Failed to save progress. Please try again.',
                            variant: 'destructive'
                          });
                        }
                      }}
                      className="h-10 text-[#64748B]"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                  )}
                </div>
                {!isEmissionStep && currentStep < steps.length - 1 && (
                  <Button
                    onClick={handleNext}
                    disabled={!canProceed() || Object.keys(validationErrors).length > 0}
                    className="h-10 bg-[#0F6E56] hover:bg-[#0C5A47] text-white disabled:opacity-40"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            )}
          </div>

          <aside className="lg:sticky lg:top-6 rounded-2xl border border-[#E8EEF0] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">This calculation</p>
            <dl className="mt-4 space-y-3">
              {formData.loanTypes.length > 0 && (
                <div>
                  <dt className="text-xs text-[#64748B]">Loan type</dt>
                  <dd className="mt-0.5 text-sm font-medium text-[#0F172A]">
                    {formData.loanTypes.map((lt) => `${loanTypeLabel(lt.type)}${lt.quantity > 1 ? ` × ${lt.quantity}` : ''}`).join(', ')}
                  </dd>
                </div>
              )}
              {needsListing && listingLabel && (
                <div>
                  <dt className="text-xs text-[#64748B]">Structure</dt>
                  <dd className="mt-0.5 text-sm font-medium text-[#0F172A]">{listingLabel}</dd>
                </div>
              )}
              {formData.hasEmissions && (
                <div>
                  <dt className="text-xs text-[#64748B]">
                    {hasBondFamily && isMixedFamilies ? 'Bond company GHG' : 'Company GHG'}
                  </dt>
                  <dd className="mt-0.5 text-sm font-medium text-[#0F172A]">
                    {formData.hasEmissions === 'yes' ? 'Available' : 'Estimate from activity'}
                  </dd>
                </div>
              )}
              {Object.keys(formData.calculationMethods || {}).length > 0 ? (
                <div>
                  <dt className="text-xs text-[#64748B]">Method</dt>
                  <dd className="mt-0.5 text-sm font-medium text-[#0F172A] space-y-0.5">
                    {formData.loanTypes.map((lt) => {
                      const method = formData.calculationMethods?.[lt.type] || formData.calculationMethod;
                      if (!method) return null;
                      return (
                        <div key={lt.type}>
                          {loanTypeLabel(lt.type)} · {method.toUpperCase()}
                        </div>
                      );
                    })}
                  </dd>
                </div>
              ) : formData.calculationMethod ? (
                <div>
                  <dt className="text-xs text-[#64748B]">Method</dt>
                  <dd className="mt-0.5 text-sm font-medium text-[#0F172A]">{formData.calculationMethod.toUpperCase()}</dd>
                </div>
              ) : null}
              {formData.verificationStatus && (
                <div>
                  <dt className="text-xs text-[#64748B]">Verification</dt>
                  <dd className="mt-0.5 text-sm font-medium text-[#0F172A] capitalize">{formData.verificationStatus}</dd>
                </div>
              )}
            </dl>
            {formData.loanTypes.length === 0 && !formData.calculationMethod && (
              <p className="mt-4 text-sm text-[#94A3B8]">Selections will appear here as you go.</p>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};