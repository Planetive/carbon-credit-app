import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
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
  Shield
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  const [organizationName, setOrganizationName] = useState<string>("");
  const [userType, setUserType] = useState<string>("financial_institution");
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
  const navigate = useNavigate();
  // Onboarding gate removed
  // Hooks must be declared before any early returns
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    const checkProfile = async () => {
      if (!user) return;
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, organization_name, user_type")
        .eq("user_id", user.id)
        .single();
      if (!data || error) {
        setProfileMissing(true);
      } else {
        setProfileMissing(false);
      }
      if (data && data.organization_name) {
        setOrganizationName(data.organization_name);
      } else {
        setOrganizationName("");
      }
      if (data && data.user_type) {
        setUserType(data.user_type);
      } else {
        setUserType("financial_institution"); // Default to financial_institution
      }

      // Onboarding completion check removed
    };
    checkProfile();
  }, [user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.organizationName || !profileForm.displayName) {
      toast({ title: "Missing fields", description: "Organization name and display name are required.", variant: "destructive" });
      return;
    }
    setProfileSubmitting(true);
    const { error } = await (supabase as any)
      .from("profiles")
      .insert([
        {
          user_id: user.id,
          organization_name: profileForm.organizationName,
          display_name: profileForm.displayName,
          phone: profileForm.phone || null,
        },
      ]);
    setProfileSubmitting(false);
    if (error) {
      toast({ title: "Profile error", description: error.message, variant: "destructive" });
    } else {
      setProfileMissing(false);
      toast({ title: "Profile created!", description: "Your profile has been saved." });
    }
  };

  useEffect(() => {
    if (!user || profileMissing) return;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from("project_inputs" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (projectsError) {
        setError("Failed to load projects");
        setProjects([]);
      } else {
        setProjects(projectsData || []);
      }

      // Fetch ESG assessment
      const { data: esgData, error: esgError } = await supabase
        .from("esg_assessments")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!esgError && esgData) {
        setEsgAssessment(esgData);
        
        // Fetch admin scores if assessment exists
        const { data: scoresData, error: scoresError } = await supabase
          .from("esg_scores")
          .select("*")
          .eq("assessment_id", esgData.id)
          .single();
          
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
          (supabase as any).from('scope3_investments').select('emissions').eq('user_id', user.id),
          (supabase as any).from('scope3_downstream_transportation').select('emissions').eq('user_id', user.id),
          (supabase as any).from('scope3_end_of_life_treatment').select('emissions').eq('user_id', user.id),
          (supabase as any).from('scope3_processing_sold_products').select('row_data').eq('user_id', user.id),
          (supabase as any).from('scope3_use_of_sold_products').select('row_data').eq('user_id', user.id),
        ]);

        const sumScope3 = (arr: any[] | null | undefined) => (arr || []).reduce((s, r) => s + (Number(r.emissions) || 0), 0);
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
          sumScope3(businessTravelRes.data) + sumScope3(employeeCommutingRes.data) + sumScope3(investmentsRes.data) + 
          sumScope3(downstreamTransportRes.data) + sumScope3(endOfLifeRes.data) + processingTotal + useTotal;
        setScope3Total(scope3);

        // Set hasAnyEmissions based on whether any scope has data
        setHasAnyEmissions(scope1 > 0 || scope2 > 0 || scope3 > 0);
      } catch (error) {
        console.error('Error loading emission totals:', error);
        setHasAnyEmissions(false);
        setScope1Total(0);
        setScope2Total(0);
        setScope3Total(0);
      }

      // Fetch and aggregate all Finance Emission calculations across all portfolios
      // Check both finance_emission_calculations and emission_calculations tables
      try {
        // First, let's see what's actually in the database - query all records for this user
        const { data: allFinanceRecords, error: allFinanceError } = await supabase
          .from('finance_emission_calculations')
          .select('*')
          .eq('user_id', user.id);

        console.log('🔍 Dashboard - All finance_emission_calculations for user:', allFinanceRecords?.length || 0, 'records');
        if (allFinanceRecords && allFinanceRecords.length > 0) {
          console.log('📋 Sample record:', allFinanceRecords[0]);
        }

        // Query finance_emission_calculations table - filter by calculation_type
        const { data: financeData1, error: financeError1 } = await supabase
          .from('finance_emission_calculations')
          .select('financed_emissions, status, counterparty_id, calculation_type')
          .eq('user_id', user.id)
          .eq('calculation_type', 'finance_emission');

        // Query emission_calculations table
        const { data: financeData2, error: financeError2 } = await supabase
          .from('emission_calculations')
          .select('financed_emissions, status, counterparty_id, calculation_type')
          .eq('user_id', user.id)
          .eq('calculation_type', 'finance');

        console.log('🔍 Dashboard - Finance query results:');
        console.log('  finance_emission_calculations:', financeData1?.length || 0, 'records', financeError1 || 'no error');
        console.log('  emission_calculations:', financeData2?.length || 0, 'records', financeError2 || 'no error');
        
        if (financeError1) console.error('Error fetching finance emissions from finance_emission_calculations:', financeError1);
        if (financeError2) console.error('Error fetching finance emissions from emission_calculations:', financeError2);

        // Filter out failed status manually
        const validFinanceData1 = (financeData1 || []).filter(r => r.status !== 'failed');
        const validFinanceData2 = (financeData2 || []).filter(r => r.status !== 'failed');

        // Combine results from both tables
        const allFinanceData = [
          ...validFinanceData1,
          ...validFinanceData2
        ];

        if (allFinanceData.length > 0) {
          console.log('✅ Finance emission data found:', allFinanceData.length, 'records');
          console.log('📊 Finance data details:', allFinanceData);
          // Sum all finance emissions from all companies
          const totalFinanceEmissions = allFinanceData.reduce((sum, record) => {
            const emissions = parseFloat(String(record.financed_emissions || 0)) || 0;
            console.log('  Adding:', emissions, 'from', record.calculation_type, 'counterparty:', record.counterparty_id);
            return sum + emissions;
          }, 0);
          
          console.log('💰 Total finance emissions:', totalFinanceEmissions);
          
          if (totalFinanceEmissions > 0) {
            setFinanceEmissionData({
              financed_emissions: totalFinanceEmissions,
              total_companies: allFinanceData.length
            });
          } else {
            console.log('⚠️ Total is 0, setting to null');
            setFinanceEmissionData(null);
          }
        } else {
          console.log('❌ No finance emission data found for user:', user.id);
          console.log('   Checked tables: finance_emission_calculations, emission_calculations');
          // If we found records in the all query but not in the filtered query, there might be a data issue
          if (allFinanceRecords && allFinanceRecords.length > 0) {
            console.log('⚠️ Found', allFinanceRecords.length, 'records but none matched calculation_type filter');
            console.log('   Available calculation_types:', [...new Set(allFinanceRecords.map(r => r.calculation_type))]);
          }
          setFinanceEmissionData(null);
        }
      } catch (error) {
        console.error('💥 Exception fetching finance emissions:', error);
        setFinanceEmissionData(null);
      }

      // Fetch and aggregate all Facilitated Emission calculations across all portfolios
      // Check both finance_emission_calculations and emission_calculations tables
      try {
        // First, let's see what's actually in the database - query all records for this user
        const { data: allFacilitatedRecords, error: allFacilitatedError } = await supabase
          .from('finance_emission_calculations')
          .select('*')
          .eq('user_id', user.id);

        console.log('🔍 Dashboard - All finance_emission_calculations for user (facilitated check):', allFacilitatedRecords?.length || 0, 'records');

        // Query finance_emission_calculations table - filter by calculation_type
        const { data: facilitatedData1, error: facilitatedError1 } = await supabase
          .from('finance_emission_calculations')
          .select('financed_emissions, status, counterparty_id, calculation_type')
          .eq('user_id', user.id)
          .eq('calculation_type', 'facilitated_emission');

        // Query emission_calculations table
        const { data: facilitatedData2, error: facilitatedError2 } = await supabase
          .from('emission_calculations')
          .select('financed_emissions, status, counterparty_id, calculation_type')
          .eq('user_id', user.id)
          .eq('calculation_type', 'facilitated');

        console.log('🔍 Dashboard - Facilitated query results:');
        console.log('  finance_emission_calculations:', facilitatedData1?.length || 0, 'records', facilitatedError1 || 'no error');
        console.log('  emission_calculations:', facilitatedData2?.length || 0, 'records', facilitatedError2 || 'no error');
        
        if (facilitatedError1) console.error('Error fetching facilitated emissions from finance_emission_calculations:', facilitatedError1);
        if (facilitatedError2) console.error('Error fetching facilitated emissions from emission_calculations:', facilitatedError2);

        // Filter out failed status manually
        const validFacilitatedData1 = (facilitatedData1 || []).filter(r => r.status !== 'failed');
        const validFacilitatedData2 = (facilitatedData2 || []).filter(r => r.status !== 'failed');

        // Combine results from both tables
        const allFacilitatedData = [
          ...validFacilitatedData1,
          ...validFacilitatedData2
        ];

        if (allFacilitatedData.length > 0) {
          console.log('✅ Facilitated emission data found:', allFacilitatedData.length, 'records');
          console.log('📊 Facilitated data details:', allFacilitatedData);
          // Sum all facilitated emissions from all companies
          const totalFacilitatedEmissions = allFacilitatedData.reduce((sum, record) => {
            const emissions = parseFloat(String(record.financed_emissions || 0)) || 0;
            console.log('  Adding:', emissions, 'from', record.calculation_type, 'counterparty:', record.counterparty_id);
            return sum + emissions;
          }, 0);
          
          console.log('💰 Total facilitated emissions:', totalFacilitatedEmissions);
          
          if (totalFacilitatedEmissions > 0) {
            setFacilitatedEmissionData({
              financed_emissions: totalFacilitatedEmissions,
              total_companies: allFacilitatedData.length
            });
          } else {
            console.log('⚠️ Total is 0, setting to null');
            setFacilitatedEmissionData(null);
          }
        } else {
          console.log('❌ No facilitated emission data found for user:', user.id);
          console.log('   Checked tables: finance_emission_calculations, emission_calculations');
          // If we found records in the all query but not in the filtered query, there might be a data issue
          if (allFacilitatedRecords && allFacilitatedRecords.length > 0) {
            console.log('⚠️ Found', allFacilitatedRecords.length, 'records but none matched calculation_type filter');
            console.log('   Available calculation_types:', [...new Set(allFacilitatedRecords.map(r => r.calculation_type))]);
          }
          setFacilitatedEmissionData(null);
        }
      } catch (error) {
        console.error('💥 Exception fetching facilitated emissions:', error);
        setFacilitatedEmissionData(null);
      }

      // TODO: Fetch Risk Assessment data (placeholder for now)
      setRiskAssessmentData(null);
      
      setLoading(false);
    };
    fetchData();
  }, [user, profileMissing]);


  if (profileMissing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-50 p-4">
        <Card className="w-full max-w-md shadow-xl border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-4 sm:pb-6">
            <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-teal-500/10 rounded-full flex items-center justify-center mb-3 sm:mb-4">
              <User className="h-6 w-6 sm:h-8 sm:w-8 text-teal-600" />
            </div>
            <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900">Complete Your Profile</CardTitle>
            <CardDescription className="text-sm sm:text-base text-gray-600">To continue, please provide your organization and display name.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block font-semibold text-gray-700 mb-1 sm:mb-2 text-sm sm:text-base">Organization Name</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-3 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm sm:text-base"
                  name="organizationName"
                  type="text"
                  value={profileForm.organizationName}
                  onChange={e => setProfileForm(f => ({ ...f, organizationName: e.target.value }))}
                  required
                  placeholder="Enter your organization name"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1 sm:mb-2 text-sm sm:text-base">Designation</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-3 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm sm:text-base"
                  name="displayName"
                  type="text"
                  value={profileForm.displayName}
                  onChange={e => setProfileForm(f => ({ ...f, displayName: e.target.value }))}
                  required
                  placeholder="Enter your display name"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1 sm:mb-2 text-sm sm:text-base">Phone Number</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-3 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm sm:text-base"
                  name="phone"
                  type="tel"
                  value={profileForm.phone}
                  onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="03XX-XXXXXXX"
                />
              </div>
              <Button type="submit" className="w-full py-2 sm:py-3 text-base sm:text-lg font-semibold bg-teal-600 hover:bg-teal-700" disabled={profileSubmitting}>
                {profileSubmitting ? "Saving..." : "Complete Profile"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Onboarding gate removed; continue to dashboard

  // Conditionally set sidebar items based on user_type
  const sidebarItems = [
    {
      id: 'overview',
      title: 'Company Overview',
      icon: Grid3X3,
      path: null
    },
    {
      id: 'portfolio',
      title: userType === 'corporate' ? 'My Projects' : 'My Portfolio',
      icon: FileText,
      path: userType === 'corporate' ? '/project-wizard' : null
    },
    {
      id: 'start-project',
      title: userType === 'corporate' ? 'Start New Projects' : 'Start New Portfolio',
      icon: Plus,
      path: userType === 'corporate' ? '/project-wizard' : '/bank-portfolio'
    },
    {
      id: 'reports',
      title: 'Reports & Analytics',
      icon: BarChart3,
      path: '/reports'
    },
    {
      id: 'esg',
      title: 'ESG Assessment',
      icon: BarChart3,
      path: '/esg-health-check'
    },
    {
      id: 'emissions',
      title: 'Emission Calculator',
      icon: Factory,
      path: '/emission-calculator'
    },
  ];

  const handleSidebarClick = (item: any) => {
    if (item.path) {
      navigate(item.path);
    } else {
      setActiveSection(item.id);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Sidebar */}
      <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
        {/* Sidebar Navigation */}
        <div className="flex-1 p-4">
          <nav className="space-y-1">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSidebarClick(item)}
                className={`w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeSection === item.id 
                    ? 'bg-teal-100 text-teal-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Main Content */}
        <main className="flex-1 p-6 bg-gray-50">
          {activeSection === 'overview' ? (
            <div className="max-w-7xl">
              {/* Welcome Section */}
              <div className="mb-8">
                <div className="bg-gradient-to-r from-teal-500 to-cyan-600 rounded-lg p-6 text-white">
                  <h2 className="text-2xl font-bold mb-2">
                    {organizationName ? `Welcome back, ${organizationName}! 👋` : "Welcome to your Dashboard!"}
                  </h2>
                  <p className="text-teal-100">
                    Track your organization's sustainability progress and carbon footprint
                  </p>
                </div>
              </div>


              {/* Top Row - Main Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {/* Finance Emission Card */}
                <Card className="bg-white border border-gray-200 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Finance Emission</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {financeEmissionData ? `${financeEmissionData.financed_emissions?.toFixed(1) || '0.0'} tCO2e` : 'N/A'}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                        <Factory className="h-6 w-6 text-teal-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Facilitated Emission Card */}
                <Card className="bg-white border border-gray-200 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Facilitated Emission</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {facilitatedEmissionData ? `${facilitatedEmissionData.financed_emissions?.toFixed(1) || '0.0'} tCO2e` : 'N/A'}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <BarChart3 className="h-6 w-6 text-emerald-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Risk Assessment Card */}
                <Card className="bg-white border border-gray-200 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Risk Assessment</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {riskAssessmentData ? `${riskAssessmentData.risk_score || 'N/A'}` : 'Not Started'}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Shield className="h-6 w-6 text-orange-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

              </div>

              {/* Bottom Row - Secondary Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Total Projects Card */}
                <Card className="bg-white border border-gray-200 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Projects</p>
                        <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* ESG Score Card */}
                <Card className="bg-white border border-gray-200 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">ESG Score</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {esgScores ? `${Math.round(esgScores.overall_score || 0)}%` : 'N/A'}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Emissions Tracked Card */}
                <Card className="bg-white border border-gray-200 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Emissions Tracked</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {hasAnyEmissions ? 'Yes' : 'No'}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <Factory className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Assessment Status Card */}
                <Card className="bg-white border border-gray-200 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Assessment Status</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {esgAssessment ? (esgAssessment.status === 'submitted' ? 'Complete' : 'Draft') : 'Not Started'}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                        <BarChart3 className="h-6 w-6 text-cyan-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Emissions Footprint Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <Card className="bg-white border border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Factory className="h-5 w-5 text-teal-600" />
                      <span>Emissions Overview</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="text-sm font-medium">Scope 1 Emissions</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-800">
                          {scope1Total > 0 
                            ? `${scope1Total.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg CO2e`
                            : 'Not Tracked'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <span className="text-sm font-medium">Scope 2 Emissions</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-800">
                          {scope2Total > 0 
                            ? `${scope2Total.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg CO2e`
                            : 'Not Tracked'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-sm font-medium">Scope 3 Emissions</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-800">
                          {scope3Total > 0 
                            ? `${scope3Total.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg CO2e`
                            : 'Not Tracked'}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Button 
                        className="w-full" 
                        onClick={() => navigate('/emission-results')}
                      >
                        {hasAnyEmissions ? 'View Emission Results' : 'Start Emission Calculation'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                      <span>ESG Progress</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {esgAssessment ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Environmental</span>
                            <span>{esgAssessment.environmental_completion}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{ width: `${esgAssessment.environmental_completion}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Social</span>
                            <span>{esgAssessment.social_completion}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${esgAssessment.social_completion}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Governance</span>
                            <span>{esgAssessment.governance_completion}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-purple-500 h-2 rounded-full" 
                              style={{ width: `${esgAssessment.governance_completion}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="mt-4">
                          <Button 
                            className="w-full" 
                            onClick={() => navigate('/esg-health-check')}
                          >
                            {esgAssessment.status === 'submitted' ? 'View Results' : 'Continue Assessment'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-4">No ESG assessment started yet</p>
                        <Button 
                          className="w-full" 
                          onClick={() => navigate('/esg-health-check')}
                        >
                          Start ESG Assessment
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Explore Projects hidden for now */}
                {/* <Link to="/explore">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                          <Globe className="h-6 w-6 text-teal-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Explore Projects</h3>
                          <p className="text-sm text-gray-600">Discover global carbon projects</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link> */}

                {userType === 'corporate' ? (
                  <Link to="/project-wizard">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <Plus className="h-6 w-6 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">Start New Projects</h3>
                            <p className="text-sm text-gray-600">Begin your project wizard</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ) : (
                  <Link to="/bank-portfolio">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <Plus className="h-6 w-6 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">Start New Portfolio</h3>
                            <p className="text-sm text-gray-600">Add companies and loan amounts</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )}

              </div>
            </div>
          ) : (
            <div className="max-w-4xl">
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Grid3X3 className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {sidebarItems.find(item => item.id === activeSection)?.title}
                </h3>
                <p className="text-gray-600 mb-6">
                  This section will show detailed information and tools for {sidebarItems.find(item => item.id === activeSection)?.title.toLowerCase()}.
                </p>
                <Button onClick={() => setActiveSection('overview')}>
                  Back to Overview
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard2;
