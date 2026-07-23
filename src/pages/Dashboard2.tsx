import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate, useLocation, useOutletContext } from "react-router-dom";
import { 
  Plus, 
  FolderOpen, 
  BarChart3, 
  Settings, 
  LogOut, 
  User, 
  Globe, 
  TrendingUp, 
  FileText, 
  Factory,
  Grid3X3,
  Info,
  Shield,
  Sparkles,
  ArrowRight,
  Activity,
  Zap,
  Building2,
  Edit,
  Trash2,
  MoreVertical,
  Calendar,
  Leaf,
  Download,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loadEpaIpccResults } from "@/lib/epaIpccResults";
import { motion, AnimatePresence } from "framer-motion";
import { PortfolioClient, Counterparty, Exposure } from "@/integrations/supabase/portfolioClient";
import DashboardSidebar from "@/components/DashboardSidebar";
import { exportPortfolioPdfReport, formatDataQualityScoresFromStoredResults } from "@/utils/portfolioPdfExport";
import CompanyOverviewScreen from "@/features/dashboard/CompanyOverviewScreen";
// Onboarding wizard gate removed; users go straight to dashboard

const Dashboard2 = () => {
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileMissing, setProfileMissing] = useState(false);
  const [profileForm, setProfileForm] = useState({ organizationName: "", displayName: "", phone: "" });
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string>("");
  const [organizationName, setOrganizationName] = useState<string>("");
  const [userType, setUserType] = useState<string>("corporate");
  const [userTypeResolved, setUserTypeResolved] = useState(false);
  const [esgAssessment, setEsgAssessment] = useState<any>(null);
  const [esgScores, setEsgScores] = useState<any>(null);
  const [emissionData, setEmissionData] = useState<any>(null);
  const [hasAnyEmissions, setHasAnyEmissions] = useState<boolean>(false);
  const [scope1Total, setScope1Total] = useState<number>(0);
  const [scope2Total, setScope2Total] = useState<number>(0);
  const [scope3Total, setScope3Total] = useState<number>(0);
  const [financeEmissionData, setFinanceEmissionData] = useState<any>(null);
  const [facilitatedEmissionData, setFacilitatedEmissionData] = useState<any>(null);
  const [riskAssessmentData, setRiskAssessmentData] = useState<any>(null);
  const [portfolioCompanies, setPortfolioCompanies] = useState<any[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [isGeneratingPortfolioPdf, setIsGeneratingPortfolioPdf] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deletingCompanyId, setDeletingCompanyId] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  // Get activeSection from MainLayout via outlet context
  const outletContext = useOutletContext<{ activeSection?: string; setActiveSection?: (section: string) => void }>();
  const activeSection = outletContext?.activeSection || 'overview';
  const setActiveSection = outletContext?.setActiveSection || (() => {});

  // Sync activeSection from navigation state (e.g. sidebar / account menu)
  useEffect(() => {
    const sectionFromState = (location.state as { activeSection?: string } | null)?.activeSection;
    if (sectionFromState && setActiveSection) {
      setActiveSection(sectionFromState);
    }
  }, [location.state, setActiveSection]);

  useEffect(() => {
    const checkProfile = async () => {
      if (!user) {
        setProfileLoading(false);
        return;
      }

      // Clear immediately so a previous session's name never flashes
      setProfileLoading(true);
      setDisplayName("");
      setOrganizationName("");
      setProfileForm({ organizationName: "", displayName: "", phone: "" });

      try {
        const { data, error } = await (supabase as any)
          .from("profiles")
          .select("id, user_type, organization_name, display_name, phone")
          .eq("user_id", user.id)
          .single();
        if (!data || error) {
          setProfileMissing(true);
          setDisplayName("");
        } else {
          // Check if organization_name, display_name, or phone are missing or just default values
          // If display_name is just the email prefix (from default), phone is null, or organization_name is missing, show the form
          const displayNameIsDefault = !data.display_name || data.display_name === user.email?.split('@')[0];
          const phoneIsMissing = !data.phone || data.phone.trim() === '';
          const organizationNameIsMissing = !data.organization_name || data.organization_name.trim() === '' || data.organization_name === 'My Organization';
          
          // Show questionnaire if any required field is missing
          setProfileMissing(displayNameIsDefault || phoneIsMissing || organizationNameIsMissing);
          
          // Pre-fill the form with existing data if available
          if (data.organization_name && !organizationNameIsMissing) {
            setProfileForm(prev => ({ ...prev, organizationName: data.organization_name }));
            setOrganizationName(data.organization_name);
          } else {
            setOrganizationName("");
          }
          if (data.display_name && !displayNameIsDefault) {
            setProfileForm(prev => ({ ...prev, displayName: data.display_name }));
            setDisplayName(data.display_name);
          } else {
            setDisplayName("");
          }
          if (data.phone && !phoneIsMissing) {
            setProfileForm(prev => ({ ...prev, phone: data.phone }));
          }
        }
        if (data && data.user_type) {
          setUserType(data.user_type);
        } else {
          setUserType("corporate"); // Default to corporate for safety
        }
        setUserTypeResolved(true);
      } finally {
        setProfileLoading(false);
      }

      // Onboarding completion check removed
    };
    checkProfile();
  }, [user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.organizationName || !profileForm.displayName || !profileForm.phone) {
      toast({ title: "Missing fields", description: "Organization name, your name, and phone number are required.", variant: "destructive" });
      return;
    }
    setProfileSubmitting(true);
    
    // Use upsert to handle both insert and update
    const { error } = await (supabase as any)
      .from("profiles")
      .upsert({
        user_id: user.id,
        organization_name: profileForm.organizationName,
        display_name: profileForm.displayName,
        phone: profileForm.phone || null,
        user_type: userType, // Preserve user type
      }, {
        onConflict: 'user_id'
      });
    
    // Also update the organization name if it exists
    if (!error) {
      const { data: profileData } = await (supabase as any)
        .from("profiles")
        .select("current_organization_id")
        .eq("user_id", user.id)
        .single();
      
      if (profileData?.current_organization_id) {
        await (supabase as any)
          .from("organizations")
          .update({ name: profileForm.organizationName })
          .eq("id", profileData.current_organization_id);
      }
    }
    
    setProfileSubmitting(false);
    if (error) {
      toast({ title: "Profile error", description: error.message, variant: "destructive" });
    } else {
      setProfileMissing(false);
      setDisplayName(profileForm.displayName);
      toast({ title: "Profile saved!", description: "Your profile has been saved." });
    }
  };

  useEffect(() => {
    if (!user || profileMissing) return;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      // Fetch projects
      const { data: projectsData, error: projectsError } = await (supabase as any)
        .from("project_inputs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (projectsError) {
        setError("Failed to load projects");
        setProjects([]);
      } else {
        setProjects(projectsData || []);
      }

      // Fetch ISSB readiness assessment
      const { data: esgData, error: esgError } = await (supabase as any)
        .from("esg_assessments")
        .select("id, status, total_completion, submitted_at, updated_at, assessment_type")
        .eq("user_id", user.id)
        .eq("assessment_type", "issb_readiness_v1")
        .maybeSingle();

      if (!esgError && esgData) {
        setEsgAssessment(esgData);
        
        // Fetch admin scores if assessment exists
        const { data: scoresData, error: scoresError } = await supabase
          .from("esg_scores")
          .select("readiness_overall_score, readiness_maturity_band, readiness_results, scored_at")
          .eq("assessment_id", esgData.id)
          .maybeSingle();
          
        if (!scoresError && scoresData) {
          const updatedAtMs = esgData?.updated_at ? new Date(esgData.updated_at).getTime() : 0;
          const scoredAtMs = scoresData?.scored_at ? new Date(scoresData.scored_at).getTime() : 0;
          if (scoredAtMs >= updatedAtMs) {
            setEsgScores(scoresData);
          } else {
            setEsgScores(null);
          }
        } else {
          setEsgScores(null);
        }
      }

      // Fetch emission calculator data
      const { data: emissionData, error: emissionError } = await (supabase as any)
        .from("emission_calculator")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!emissionError && emissionData) {
        setEmissionData(emissionData);
      }

      // Load emission totals for Scope 1, 2, and 3
      try {
        // EPA calculator uses unified EPA+IPCC tables for totals.
        const epaResults = await loadEpaIpccResults(user.id);
        setScope1Total(epaResults.totals.scope1);
        setScope2Total(epaResults.totals.scope2);
        setScope3Total(epaResults.totals.scope3);
        setHasAnyEmissions(epaResults.totals.grand > 0);
        if (false) {
        // Scope 1 - Load all categories
        const [fuelRes, refRes, passRes, delRes] = await Promise.all([
          (supabase as any).from('scope1_fuel_entries').select('emissions').eq('user_id', user.id),
          (supabase as any).from('scope1_refrigerant_entries').select('emissions').eq('user_id', user.id),
          (supabase as any).from('scope1_passenger_vehicle_entries').select('emissions').eq('user_id', user.id),
          (supabase as any).from('scope1_delivery_vehicle_entries').select('emissions').eq('user_id', user.id),
        ]);

        const sum = (arr: any[] | null | undefined) => (arr || []).reduce((s, r) => s + (Number(r.emissions) || 0), 0);
        const scope1 = sum(fuelRes.data) + sum(refRes.data) + sum(passRes.data) + sum(delRes.data);
        setScope1Total(scope1);

        // Scope 2 - Electricity
        const { data: mainRow } = await (supabase as any)
          .from('scope2_electricity_main')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        let elecTotal = 0;
        if (mainRow) {
          const totalKwh = Number(mainRow.total_kwh) || 0;
          const gridPct = Number(mainRow.grid_pct) || 0;
          const otherPct = Number(mainRow.other_pct) || 0;

          const { data: subs } = await (supabase as any)
            .from('scope2_electricity_subanswers')
            .select('*')
            .eq('user_id', user.id)
            .eq('main_id', mainRow.id);

          const gridRow = (subs || []).find((r: any) => r.type === 'grid');
          const gridFactor = gridRow?.grid_emission_factor ? Number(gridRow.grid_emission_factor) : 0;
          const gridPart = totalKwh > 0 && gridPct > 0 && gridFactor > 0 ? (gridPct / 100) * totalKwh * gridFactor : 0;

          const otherRows = (subs || []).filter((r: any) => r.type === 'other');
          const sumOtherEmissions = otherRows.reduce((s: number, r: any) => s + (Number(r.other_sources_emissions) || 0), 0);
          const otherPart = totalKwh > 0 && otherPct > 0 ? (otherPct / 100) * totalKwh * sumOtherEmissions : 0;

          elecTotal = Number((gridPart + otherPart).toFixed(6));
        }

        // Scope 2 - Heat & Steam
        const { data: heatRows } = await (supabase as any)
          .from('scope2_heatsteam_entries')
          .select('emissions')
          .eq('user_id', user.id);
        const heatTotal = (heatRows || []).reduce((s: number, r: any) => s + (Number(r.emissions) || 0), 0);
        const scope2 = elecTotal + Number(heatTotal.toFixed(6));
        setScope2Total(scope2);

        // Scope 3 - Load all categories (excluding LCA)
        const [
          purchasedGoodsRes,
          capitalGoodsRes,
          fuelEnergyRes,
          upstreamTransportRes,
          wasteGeneratedRes,
          businessTravelRes,
          employeeCommutingRes,
          investmentsRes,
          facilitatedRes,
          downstreamTransportRes,
          endOfLifeRes,
          processingSoldRes,
          useOfSoldRes,
        ] = await Promise.all([
          (supabase as any).from('scope3_purchased_goods_services').select('emissions').eq('user_id', user.id),
          (supabase as any).from('scope3_capital_goods').select('emissions').eq('user_id', user.id),
          (supabase as any).from('scope3_fuel_energy_activities').select('emissions').eq('user_id', user.id),
          (supabase as any).from('scope3_upstream_transportation').select('emissions').eq('user_id', user.id),
          (supabase as any).from('scope3_waste_generated').select('emissions').eq('user_id', user.id),
          (supabase as any).from('scope3_business_travel').select('emissions').eq('user_id', user.id),
          (supabase as any).from('scope3_employee_commuting').select('emissions').eq('user_id', user.id),
          (supabase as any)
            .from('scope3_investments')
            .select('calculated_emissions, emissions, ownership_percentage')
            .eq('user_id', user.id),
          (supabase as any).from('scope3_facilitated_emissions').select('emissions').eq('user_id', user.id),
          (supabase as any).from('scope3_downstream_transportation').select('emissions').eq('user_id', user.id),
          (supabase as any).from('scope3_end_of_life_treatment').select('emissions').eq('user_id', user.id),
          (supabase as any).from('scope3_processing_sold_products').select('row_data').eq('user_id', user.id),
          (supabase as any).from('scope3_use_of_sold_products').select('row_data').eq('user_id', user.id),
        ]);

        const sumScope3 = (arr: any[] | null | undefined) => (arr || []).reduce((s, r) => s + (Number(r.emissions) || 0), 0);
        const sumInvestmentAttributed = (arr: any[] | null | undefined) =>
          (arr || []).reduce((s, r) => {
            const c = Number(r?.calculated_emissions);
            if (Number.isFinite(c)) return s + c;
            const inv = Number(r?.emissions) || 0;
            const pct = Number(r?.ownership_percentage) || 0;
            return s + (inv * pct) / 100;
          }, 0);
        const processingTotal = (processingSoldRes.data || []).reduce((s: number, r: any) => {
          const rowData = r.row_data;
          if (rowData && typeof rowData.emissions === 'number') {
            return s + rowData.emissions;
          }
          return s;
        }, 0);
        const useTotal = (useOfSoldRes.data || []).reduce((s: number, r: any) => {
          const rowData = r.row_data;
          if (rowData && typeof rowData.emissions === 'number') {
            return s + rowData.emissions;
          }
          return s;
        }, 0);

        const scope3 = sumScope3(purchasedGoodsRes.data) + sumScope3(capitalGoodsRes.data) + 
          sumScope3(fuelEnergyRes.data) + sumScope3(upstreamTransportRes.data) + sumScope3(wasteGeneratedRes.data) + 
          sumScope3(businessTravelRes.data) + sumScope3(employeeCommutingRes.data) + sumInvestmentAttributed(investmentsRes.data) + 
          sumScope3(facilitatedRes.data) +
          sumScope3(downstreamTransportRes.data) + sumScope3(endOfLifeRes.data) + processingTotal + useTotal;
        setScope3Total(scope3);

        // Set hasAnyEmissions based on whether any scope has data
        setHasAnyEmissions(scope1 > 0 || scope2 > 0 || scope3 > 0);
        }
      } catch (error) {
        console.error('Error loading emission totals:', error);
        setHasAnyEmissions(false);
        setScope1Total(0);
        setScope2Total(0);
        setScope3Total(0);
      }

      // Fetch and aggregate all Finance Emission calculations across all portfolios
      // Only fetch for financial_institution users
      if (userType === 'financial_institution') {
        try {
          // Query emission_calculations table - same as CompanyDetail does
          const { data: financeData, error: financeError } = await (supabase as any)
            .from('emission_calculations')
            .select('financed_emissions, counterparty_id, calculation_type, status, updated_at')
            .eq('user_id', user.id)
            .eq('calculation_type', 'finance')
            .neq('status', 'failed');

          if (financeError) {
            console.error('❌ Dashboard - Error fetching finance emissions:', financeError);
            setFinanceEmissionData(null);
          } else {
            console.log('🔍 Dashboard - Finance emission records:', financeData?.length || 0, financeData);

            // Filter out any invalid records and sum emissions
            const validFinanceData = (financeData || []).filter((r: any) => {
              const emissions = parseFloat(String(r.financed_emissions || 0)) || 0;
              return emissions > 0 && isFinite(emissions);
            });

            // Get unique counterparty IDs to count companies
            const uniqueCounterparties = new Set(
              validFinanceData
                .map((r: any) => r.counterparty_id)
                .filter((id: any) => id !== null && id !== undefined)
            );

            if (validFinanceData.length > 0) {
              // Sum all finance emissions from all companies
              const totalFinanceEmissions = validFinanceData.reduce((sum: number, record: any) => {
                const emissions = parseFloat(String(record.financed_emissions || 0)) || 0;
                console.log('  ✅ Adding emissions:', emissions, 'from counterparty:', record.counterparty_id);
                return sum + emissions;
              }, 0);
              
              console.log('💰 Dashboard - Total finance emissions:', totalFinanceEmissions, 'from', uniqueCounterparties.size, 'companies');
              
              if (totalFinanceEmissions > 0) {
                setFinanceEmissionData({
                  financed_emissions: totalFinanceEmissions,
                  total_companies: uniqueCounterparties.size || validFinanceData.length
                });
              } else {
                setFinanceEmissionData(null);
              }
            } else {
              console.log('❌ Dashboard - No valid finance data found');
              setFinanceEmissionData(null);
            }
          }
        } catch (error) {
          console.error('💥 Error fetching finance emissions:', error);
          setFinanceEmissionData(null);
        }

        // Fetch and aggregate all Facilitated Emission calculations across all portfolios
        try {
          // Query emission_calculations table only
          const { data: facilitatedData, error: facilitatedError } = await (supabase as any)
            .from('emission_calculations')
            .select('financed_emissions, status, counterparty_id, calculation_type')
            .eq('user_id', user.id)
            .eq('calculation_type', 'facilitated')
            .neq('status', 'failed');

          console.log('🔍 Dashboard - Facilitated emissions:', facilitatedData?.length || 0, facilitatedData);

          // Filter out invalid records
          const validFacilitatedData = (facilitatedData || []).filter((r: any) => {
            const emissions = parseFloat(String(r.financed_emissions || 0)) || 0;
            return emissions > 0 && isFinite(emissions);
          });

          // Get unique counterparty IDs to count companies
          const uniqueCounterparties = new Set(
            validFacilitatedData
              .map((r: any) => r.counterparty_id)
              .filter((id: any) => id !== null && id !== undefined)
          );

          if (validFacilitatedData.length > 0) {
            // Sum all facilitated emissions from all companies
            const totalFacilitatedEmissions = validFacilitatedData.reduce((sum: number, record: any) => {
              const emissions = parseFloat(String(record.financed_emissions || 0)) || 0;
              return sum + emissions;
            }, 0);
            
            if (totalFacilitatedEmissions > 0) {
              setFacilitatedEmissionData({
                financed_emissions: totalFacilitatedEmissions,
                total_companies: uniqueCounterparties.size || validFacilitatedData.length
              });
            } else {
              setFacilitatedEmissionData(null);
            }
          } else {
            setFacilitatedEmissionData(null);
          }
        } catch (error) {
          console.error('Error fetching facilitated emissions:', error);
          setFacilitatedEmissionData(null);
        }

        // TODO: Fetch Risk Assessment data (placeholder for now)
        setRiskAssessmentData(null);
      } else {
        // Corporate users don't need these
        setFinanceEmissionData(null);
        setFacilitatedEmissionData(null);
        setRiskAssessmentData(null);
      }
      
      setLoading(false);
    };
    fetchData();
    }, [user, profileMissing, userType]);

  // Fetch portfolio companies when portfolio section is active (financial institution)
  useEffect(() => {
    if (activeSection === 'portfolio' && userType === 'financial_institution' && user && !profileMissing) {
      const loadPortfolioCompanies = async () => {
        try {
          setPortfolioLoading(true);
          const counterparties = await PortfolioClient.getCounterparties();
          const exposures = await PortfolioClient.getExposures();
          
          // Combine counterparty and exposure data
          const companies = counterparties.map(counterparty => {
            const exposure = exposures.find(e => e.counterparty_id === counterparty.id);
            return {
              id: counterparty.id,
              name: counterparty.name,
              sector: counterparty.sector || 'N/A',
              geography: counterparty.geography || 'N/A',
              counterpartyType: counterparty.counterparty_type || 'SME',
              amount: exposure?.amount_pkr || 0,
              exposureId: exposure?.exposure_id || null,
              probabilityOfDefault: exposure?.probability_of_default ?? 0,
              lossGivenDefault: exposure?.loss_given_default ?? 0,
              tenor: exposure?.tenor_months ?? 0
            };
          });
          
          setPortfolioCompanies(companies);
        } catch (error) {
          console.error('Error loading portfolio companies:', error);
          setPortfolioCompanies([]);
        } finally {
          setPortfolioLoading(false);
        }
      };
      
      loadPortfolioCompanies();
    }
  }, [activeSection, userType, user, profileMissing]);

  // Fetch projects when My Projects section is active
  useEffect(() => {
    if (activeSection === 'projects' && user && !profileMissing) {
      const loadProjects = async () => {
        try {
          setLoading(true);
          const { data: projectsData, error: projectsError } = await (supabase as any)
            .from("project_inputs")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });
          
          if (projectsError) {
            console.error('Error loading projects:', projectsError);
            setProjects([]);
          } else {
            setProjects(projectsData || []);
          }
        } catch (error) {
          console.error('Error loading projects:', error);
          setProjects([]);
        } finally {
          setLoading(false);
        }
      };
      
      loadProjects();
    }
  }, [activeSection, user, profileMissing]);

  // Delete company function
  const handleDeleteCompany = async (companyId: string) => {
    try {
      setDeletingCompanyId(companyId);
      
      // Get the exposure for this counterparty
      const exposures = await PortfolioClient.getExposures();
      const exposure = exposures.find(e => e.counterparty_id === companyId);
      
      // Delete exposure if exists
      if (exposure) {
        const { error: exposureError } = await supabase
          .from('exposures')
          .delete()
          .eq('id', exposure.id)
          .eq('user_id', user?.id);
        
        if (exposureError) throw exposureError;
      }
      
      // Delete counterparty
      const { error: counterpartyError } = await supabase
        .from('counterparties')
        .delete()
        .eq('id', companyId)
        .eq('user_id', user?.id);
      
      if (counterpartyError) throw counterpartyError;
      
      // Refresh the list
      const counterparties = await PortfolioClient.getCounterparties();
      const updatedExposures = await PortfolioClient.getExposures();
      
      const companies = counterparties.map(counterparty => {
        const exp = updatedExposures.find(e => e.counterparty_id === counterparty.id);
        return {
          id: counterparty.id,
          name: counterparty.name,
          sector: counterparty.sector || 'N/A',
          geography: counterparty.geography || 'N/A',
          counterpartyType: counterparty.counterparty_type || 'SME',
          amount: exp?.amount_pkr || 0,
          exposureId: exp?.exposure_id || null
        };
      });
      
      setPortfolioCompanies(companies);
      setShowDeleteConfirm(null);
      toast({
        title: "Company deleted",
        description: "The company has been removed from your portfolio.",
      });
    } catch (error: any) {
      console.error('Error deleting company:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete company.",
        variant: "destructive",
      });
    } finally {
      setDeletingCompanyId(null);
    }
  };

  // Edit company - navigate to bank portfolio with company data
  const handleEditCompany = (company: any) => {
    navigate('/bank-portfolio', { 
      state: { 
        editCompany: company,
        exposureId: company.exposureId 
      } 
    });
  };

  const handleDownloadPortfolioReport = async () => {
    if (isGeneratingPortfolioPdf) return;
    try {
      setIsGeneratingPortfolioPdf(true);

      const dataQualityScoresByCounterparty = new Map<string, { finance: string; facilitated: string }>();
      if (user?.id && portfolioCompanies.length > 0) {
        const { data: aggRows } = await (supabase as any)
          .from("emission_calculations")
          .select("counterparty_id, calculation_type, results, data_quality_score")
          .eq("user_id", user.id)
          .eq("formula_id", "aggregate")
          .in("calculation_type", ["finance", "facilitated"]);

        for (const row of aggRows || []) {
          const cid = row.counterparty_id as string | null;
          if (!cid) continue;
          const prev = dataQualityScoresByCounterparty.get(cid) || { finance: "—", facilitated: "—" };
          const formatted = formatDataQualityScoresFromStoredResults(row.results, row.data_quality_score);
          if (row.calculation_type === "finance") {
            dataQualityScoresByCounterparty.set(cid, { ...prev, finance: formatted });
          } else if (row.calculation_type === "facilitated") {
            dataQualityScoresByCounterparty.set(cid, { ...prev, facilitated: formatted });
          }
        }
      }

      await exportPortfolioPdfReport({
        organizationName: organizationName || "Organization",
        displayName: displayName || user?.email?.split("@")[0] || "User",
        generatedAt: new Date().toISOString(),
        financeEmissions: Number(financeEmissionData?.financed_emissions || 0),
        facilitatedEmissions: Number(facilitatedEmissionData?.financed_emissions || 0),
        companies: portfolioCompanies.map((company) => {
          const dqs = dataQualityScoresByCounterparty.get(company.id);
          return {
            name: company.name || "N/A",
            counterpartyType: company.counterpartyType || "N/A",
            sector: company.sector || "N/A",
            geography: company.geography || "N/A",
            amount: Number(company.amount || 0),
            probabilityOfDefault: Number(company.probabilityOfDefault || 0),
            lossGivenDefault: Number(company.lossGivenDefault || 0),
            tenor: Number(company.tenor || 0),
            financeDataQualityScores: dqs?.finance ?? "—",
            facilitatedDataQualityScores: dqs?.facilitated ?? "—",
          };
        }),
      });
      toast({
        title: "Report ready",
        description: "Portfolio PDF report has been downloaded.",
      });
    } catch (error: any) {
      console.error("Error generating portfolio report:", error);
      toast({
        title: "Export failed",
        description: error?.message || "Could not generate portfolio PDF report.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPortfolioPdf(false);
    }
  };


  if (profileMissing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-[#EAF7F1]/30 to-[#EDF8F3]/50 p-4 relative overflow-hidden">
        {/* Animated Background Elements */}
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
            x: [0, 100, 0],
            y: [0, -50, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 left-20 w-72 h-72 bg-teal-400/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.2, 0.1],
            x: [0, -80, 0],
            y: [0, 60, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative z-10"
        >
          <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-xl">
            <CardHeader className="text-center pb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", bounce: 0.5 }}
                className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[#1C7A53] to-[#1D9E75] rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-[0_10px_24px_-8px_rgba(29,158,117,0.35)]"
              >
                <User className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              </motion.div>
              <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#1C7A53] to-[#1D9E75] bg-clip-text text-transparent mb-2">
                Complete Your Profile
              </CardTitle>
              <CardDescription className="text-base text-gray-600">
                To continue, please provide your organization name, your name, and phone number.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-5">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <label className="block font-semibold text-gray-700 mb-2 text-sm">Organization Name <span className="text-red-500">*</span></label>
                  <input
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#1D9E75]/30 focus:border-[#1D9E75] transition-all text-base bg-white/50 backdrop-blur-sm"
                    name="organizationName"
                    type="text"
                    value={profileForm.organizationName}
                    onChange={e => setProfileForm(f => ({ ...f, organizationName: e.target.value }))}
                    required
                    placeholder="Enter your organization name"
                  />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <label className="block font-semibold text-gray-700 mb-2 text-sm">Your Name <span className="text-red-500">*</span></label>
                  <input
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#1D9E75]/30 focus:border-[#1D9E75] transition-all text-base bg-white/50 backdrop-blur-sm"
                    name="displayName"
                    type="text"
                    value={profileForm.displayName}
                    onChange={e => setProfileForm(f => ({ ...f, displayName: e.target.value }))}
                    required
                    placeholder="Enter your full name"
                  />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <label className="block font-semibold text-gray-700 mb-2 text-sm">Phone Number <span className="text-red-500">*</span></label>
                  <input
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#1D9E75]/30 focus:border-[#1D9E75] transition-all text-base bg-white/50 backdrop-blur-sm"
                    name="phone"
                    type="tel"
                    value={profileForm.phone}
                    onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                    required
                    placeholder="03XX-XXXXXXX"
                  />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button 
                    type="submit" 
                    className="w-full py-3 text-lg font-semibold bg-gradient-to-r from-[#1C7A53] to-[#1D9E75] hover:from-[#0F6E56] hover:to-[#1C7A53] text-white shadow-lg shadow-[0_10px_24px_-8px_rgba(29,158,117,0.35)]" 
                    disabled={profileSubmitting}
                  >
                    {profileSubmitting ? "Saving..." : "Complete Profile"}
                  </Button>
                </motion.div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Onboarding gate removed; continue to dashboard

  // Section title mapping
  const sectionTitles: Record<string, string> = {
    'overview': 'Impact Overview',
    'portfolio': 'My Portfolio',
    'projects': 'My Projects',
    'reports': 'Reports & Analytics',
    'esg': 'ESG Assessment',
    'emissions': 'Emission Calculator',
    'supply-chain-intel': 'Supply Chain intelligence',
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
            {activeSection === 'overview' ? (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35 }}
              >
                <CompanyOverviewScreen
                  displayName={displayName || profileForm.displayName || undefined}
                  organizationName={organizationName || profileForm.organizationName || undefined}
                  profileLoading={profileLoading}
                  projectsCount={projects.length}
                  esgScorePercent={
                    esgScores?.readiness_overall_score != null
                      ? Math.round(Number(esgScores.readiness_overall_score))
                      : null
                  }
                  esgMaturityLabel={esgScores?.readiness_maturity_band || (esgAssessment ? "In progress" : "Not scored")}
                  assessmentStatusLabel={
                    esgAssessment?.status === "submitted"
                      ? "Complete"
                      : esgAssessment
                        ? "Draft"
                        : "Not started"
                  }
                  assessmentProgressPercent={
                    typeof esgAssessment?.total_completion === "number"
                      ? Math.round(esgAssessment.total_completion)
                      : 0
                  }
                  impactEnvironmentPercent={
                    Number(
                      (esgScores?.readiness_results as any)?.pillarSummary?.find(
                        (p: any) => p.pillarId === "climate_metrics"
                      )?.pillarPercent
                    ) || 0
                  }
                  impactSocialPercent={
                    Number(
                      (esgScores?.readiness_results as any)?.pillarSummary?.find(
                        (p: any) => p.pillarId === "strategy"
                      )?.pillarPercent
                    ) || 0
                  }
                  impactGovernancePercent={
                    Number(
                      (esgScores?.readiness_results as any)?.pillarSummary?.find(
                        (p: any) => p.pillarId === "governance"
                      )?.pillarPercent
                    ) || 0
                  }
                  emissionsTracked={hasAnyEmissions}
                  scope1Kg={scope1Total}
                  scope2Kg={scope2Total}
                  scope3Kg={scope3Total}
                />
              </motion.div>
          ) : activeSection === 'portfolio' ? (
            <motion.div
              key="portfolio"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="max-w-7xl mx-auto"
            >
              {/* Portfolio Header */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-8"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">My Portfolio</h2>
                    <p className="text-gray-600">View and manage your portfolio companies</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={handleDownloadPortfolioReport}
                        disabled={portfolioLoading || isGeneratingPortfolioPdf}
                        className="bg-white text-[#0F6E56] border border-[#BFE3D3] hover:bg-[#EAF7F1] hover:border-[#9ECFB8] shadow-md disabled:opacity-60"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {isGeneratingPortfolioPdf ? "Generating PDF..." : "Portfolio Report"}
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={() =>
                          navigate('/scenario-building', {
                            state: {
                              bankPortfolioData: portfolioCompanies
                                .filter((company) => Number(company.amount) > 0)
                                .map((company) => ({
                                  id: company.exposureId || company.id,
                                  company: company.name,
                                  amount: company.amount,
                                  counterpartyType: company.counterpartyType,
                                  counterpartyId: company.id,
                                  sector: company.sector,
                                  geography: company.geography,
                                  probabilityOfDefault: company.probabilityOfDefault ?? 0,
                                  lossGivenDefault: company.lossGivenDefault ?? 0,
                                  tenor: company.tenor ?? 0,
                                })),
                              referrer: '/dashboard',
                            },
                          })
                        }
                        className="bg-white text-[#0F6E56] border border-[#BFE3D3] hover:bg-[#EAF7F1] hover:border-[#9ECFB8] shadow-md"
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Risk Analysis
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={() => navigate('/bank-portfolio')}
                        className="bg-gradient-to-r from-[#1C7A53] to-[#1D9E75] hover:from-[#0F6E56] hover:to-[#1C7A53] text-white shadow-lg shadow-[0_10px_24px_-8px_rgba(29,158,117,0.35)]"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Company
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </motion.div>

              {/* Portfolio Companies Grid */}
              {portfolioLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1D9E75]"></div>
                  <p className="mt-4 text-gray-600">Loading companies...</p>
                </div>
              ) : portfolioCompanies.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16"
                >
                  <div className="w-20 h-20 bg-[#EAF7F1] rounded-3xl flex items-center justify-center mx-auto mb-6 border border-[#BFE3D3]/60">
                    <FileText className="h-10 w-10 text-[#1A5C4A]" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No companies yet</h3>
                  <p className="text-gray-600 mb-6">Start building your portfolio by adding companies</p>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={() => navigate('/bank-portfolio')}
                      className="bg-gradient-to-r from-[#1C7A53] to-[#1D9E75] hover:from-[#0F6E56] hover:to-[#1C7A53] text-white shadow-lg shadow-[0_10px_24px_-8px_rgba(29,158,117,0.35)]"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Company
                    </Button>
                  </motion.div>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {portfolioCompanies.map((company, index) => (
                    <motion.div
                      key={company.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ y: -5, scale: 1.02 }}
                    >
                      <Card 
                        className="bg-white border border-gray-200/80 shadow-md hover:border-[#BFE3D3] hover:shadow-xl hover:shadow-[0_14px_34px_rgba(11,77,61,0.12)] transition-all duration-300 overflow-hidden relative h-full flex flex-col"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-[#1D9E75]/8 to-[#33C08A]/8 opacity-0 hover:opacity-100 transition-opacity" />
                        <CardContent className="p-6 relative z-10 flex-1 flex flex-col">
                          <div 
                            className="flex-1 cursor-pointer"
                            onClick={() => navigate(`/bank-portfolio/${company.exposureId || company.id}`)}
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-900 mb-1">{company.name}</h3>
                                <p className="text-sm text-gray-500">{company.counterpartyType}</p>
                              </div>
                              <div className="w-12 h-12 bg-gradient-to-br from-[#1C7A53] to-[#1D9E75] rounded-xl flex items-center justify-center shadow-md">
                                <Building2 className="h-6 w-6 text-white" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Sector</span>
                                <span className="font-semibold text-gray-900">{company.sector}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Geography</span>
                                <span className="font-semibold text-gray-900">{company.geography}</span>
                              </div>
                              {company.amount > 0 && (
                                <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100">
                                  <span className="text-gray-500">Amount</span>
                                  <span className="font-bold text-[#0F6E56]">
                                    {company.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })} PKR
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleEditCompany(company)}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-[#0F6E56] bg-[#EAF7F1] hover:bg-[#DDF3EA] rounded-lg transition-colors"
                            >
                              <Edit className="h-4 w-4" />
                              Edit
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setShowDeleteConfirm(company.id)}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </motion.button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Delete Confirmation Dialog */}
              {showDeleteConfirm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                  onClick={() => setShowDeleteConfirm(null)}
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Card className="w-full max-w-md bg-white">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-600">
                          <Trash2 className="h-5 w-5" />
                          Delete Company
                        </CardTitle>
                        <CardDescription>
                          Are you sure you want to delete this company? This action cannot be undone.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-3">
                          <Button
                            variant="destructive"
                            onClick={() => handleDeleteCompany(showDeleteConfirm)}
                            disabled={deletingCompanyId === showDeleteConfirm}
                            className="flex-1"
                          >
                            {deletingCompanyId === showDeleteConfirm ? "Deleting..." : "Delete"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setShowDeleteConfirm(null)}
                            disabled={deletingCompanyId === showDeleteConfirm}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>
              )}
            </motion.div>
          ) : activeSection === 'projects' ? (
            <motion.div
              key="projects"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="max-w-7xl mx-auto"
            >
              {/* Projects Header */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-8"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">My Projects</h2>
                    <p className="text-sm sm:text-base text-gray-600">
                      View and manage all your carbon credit projects
                    </p>
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="md:flex-shrink-0"
                  >
                    <Button
                      onClick={() => navigate('/project-wizard')}
                      className="w-full sm:w-auto bg-gradient-to-r from-[#1C7A53] to-[#1D9E75] hover:from-[#0F6E56] hover:to-[#1C7A53] text-white shadow-lg shadow-[0_10px_24px_-8px_rgba(29,158,117,0.35)]"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Start New Project
                    </Button>
                  </motion.div>
                </div>
              </motion.div>

              {/* Projects Grid */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1D9E75]"></div>
                  <p className="mt-4 text-gray-600">Loading projects...</p>
                </div>
              ) : projects.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16"
                >
                  <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <FileText className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No projects yet</h3>
                  <p className="text-gray-600 mb-6">Start building your carbon credit portfolio by creating your first project</p>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={() => navigate('/project-wizard')}
                      className="bg-gradient-to-r from-[#1C7A53] to-[#1D9E75] hover:from-[#0F6E56] hover:to-[#1C7A53] text-white shadow-lg shadow-[0_10px_24px_-8px_rgba(29,158,117,0.35)]"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Start Your First Project
                    </Button>
                  </motion.div>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map((project, index) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ y: -5, scale: 1.02 }}
                    >
                      <Card 
                        className="bg-white border border-gray-200/80 shadow-md hover:border-[#BFE3D3] hover:shadow-xl hover:shadow-[0_14px_34px_rgba(29,158,117,0.12)] transition-all duration-300 overflow-hidden relative h-full flex flex-col"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-[#1D9E75]/5 to-[#33C08A]/5 opacity-0 hover:opacity-100 transition-opacity" />
                        <CardContent className="p-6 relative z-10 flex-1 flex flex-col">
                          <div 
                            className="flex-1 cursor-pointer"
                            onClick={() => navigate(`/project/${project.id}`)}
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-900 mb-1">{project.project_name || 'Untitled Project'}</h3>
                                {project.type && (
                                  <Badge className="mt-1 bg-[#EAF7F1] text-[#0F6E56]">
                                    {project.type}
                                  </Badge>
                                )}
                              </div>
                              <div className="w-12 h-12 bg-gradient-to-br from-[#1C7A53] to-[#1D9E75] rounded-xl flex items-center justify-center shadow-md">
                                <Leaf className="h-6 w-6 text-white" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              {project.country && (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-500">Country</span>
                                  <span className="font-semibold text-gray-900">{project.country}</span>
                                </div>
                              )}
                              {project.area_of_interest && (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-500">Area of Interest</span>
                                  <span className="font-semibold text-gray-900 truncate ml-2">{project.area_of_interest}</span>
                                </div>
                              )}
                              {project.goal && (
                                <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100">
                                  <span className="text-gray-500">Goal</span>
                                  <span className="font-semibold text-[#1D9E75] truncate ml-2">{project.goal}</span>
                                </div>
                              )}
                              {project.created_at && (
                                <div className="flex items-center text-xs text-gray-400 pt-2 border-t border-gray-100">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  Created {new Date(project.created_at).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => {
                                const typeToPass = project.subcategory?.trim() || project.type?.trim();
                                navigate('/filtered-projects-landing', {
                                  state: {
                                    country: project.country,
                                    areaOfInterest: project.area_of_interest,
                                    type: typeToPass,
                                    subcategory: project.subcategory,
                                    goal: project.goal,
                                  }
                                });
                              }}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-[#0F6E56] bg-[#EAF7F1] hover:bg-[#DDF3EA] rounded-lg transition-colors"
                            >
                              <Edit className="h-4 w-4" />
                              Continue
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => navigate(`/project/${project.id}`)}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <FileText className="h-4 w-4" />
                              View
                            </motion.button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="max-w-4xl mx-auto"
            >
              {activeSection === 'supply-chain-intel' ? (
                <div className="min-h-[60vh] flex items-center justify-center px-4">
                  <Card className="w-full max-w-xl bg-white/90 backdrop-blur-sm border border-red-200/60 shadow-xl rounded-2xl">
                    <CardContent className="p-8">
                      <div className="flex flex-col items-center text-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center border border-red-100 mb-2">
                          <Factory className="h-8 w-8 text-red-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">
                          Supply Chain intelligence access restricted
                        </h2>
                        <p className="text-sm text-red-700 max-w-md">
                          You do not currently have access to the Supply Chain intelligence module in this account.
                        </p>
                        <p className="text-sm text-gray-600 max-w-md">
                          Please contact your administrator if you believe you should have access to this part of the platform.
                        </p>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            onClick={() => setActiveSection("overview")}
                            className="mt-2 bg-[#1D9E75] hover:bg-[#22B87E] text-white shadow-lg"
                          >
                            Back to Dashboard
                          </Button>
                        </motion.div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-16">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="w-20 h-20 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg"
                  >
                    <Grid3X3 className="h-10 w-10 text-[#1D9E75]" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    {sectionTitles[activeSection] || 'Dashboard'}
                  </h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    This section will show detailed information and tools for {(sectionTitles[activeSection] || 'dashboard').toLowerCase()}.
                  </p>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      onClick={() => setActiveSection('overview')}
                      className="bg-gradient-to-r from-[#1C7A53] to-[#1D9E75] hover:from-[#0F6E56] hover:to-[#1C7A53] text-white shadow-lg"
                    >
                      Back to Overview
                    </Button>
                  </motion.div>
                </div>
              )}
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard2;
