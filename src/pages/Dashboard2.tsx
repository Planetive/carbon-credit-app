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
  const [displayName, setDisplayName] = useState<string>("");
  const [esgAssessment, setEsgAssessment] = useState<any>(null);
  const [esgScores, setEsgScores] = useState<any>(null);
  const [emissionData, setEmissionData] = useState<any>(null);
  const [hasAnyEmissions, setHasAnyEmissions] = useState<boolean>(false);
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
        .select("id, display_name")
        .eq("user_id", user.id)
        .single();
      if (!data || error) {
        setProfileMissing(true);
      } else {
        setProfileMissing(false);
      }
      if (data && data.display_name) {
        setDisplayName(data.display_name);
      } else {
        setDisplayName("");
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

      // Determine if user has any scope 1 emission entries saved
      try {
        const [fuelCount, refCount, passCount, delCount] = await Promise.all([
          (supabase as any).from('scope1_fuel_entries').select('id', { count: 'exact' }).eq('user_id', user.id),
          (supabase as any).from('scope1_refrigerant_entries').select('id', { count: 'exact' }).eq('user_id', user.id),
          (supabase as any).from('scope1_passenger_vehicle_entries').select('id', { count: 'exact' }).eq('user_id', user.id),
          (supabase as any).from('scope1_delivery_vehicle_entries').select('id', { count: 'exact' }).eq('user_id', user.id),
        ]);
        const totalCount = (fuelCount.count || 0) + (refCount.count || 0) + (passCount.count || 0) + (delCount.count || 0);
        setHasAnyEmissions(totalCount > 0);
      } catch (_) {
        setHasAnyEmissions(false);
      }

      // Fetch Finance Emission calculations
      try {
        const { data: financeData, error: financeError } = await supabase
          .from('finance_emission_calculations')
          .select('*')
          .eq('user_id', user.id)
          .eq('calculation_type', 'finance_emission')
          .order('created_at', { ascending: false })
          .limit(1);

        if (!financeError && financeData && financeData.length > 0) {
          setFinanceEmissionData(financeData[0]);
        }
      } catch (_) {
        setFinanceEmissionData(null);
      }

      // Fetch Facilitated Emission calculations
      try {
        const { data: facilitatedData, error: facilitatedError } = await supabase
          .from('finance_emission_calculations')
          .select('*')
          .eq('user_id', user.id)
          .eq('calculation_type', 'facilitated_emission')
          .order('created_at', { ascending: false })
          .limit(1);

        if (!facilitatedError && facilitatedData && facilitatedData.length > 0) {
          setFacilitatedEmissionData(facilitatedData[0]);
        }
      } catch (_) {
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

  const sidebarItems = [
    {
      id: 'overview',
      title: 'Company Overview',
      icon: Grid3X3,
      path: null
    },
    {
      id: 'portfolio',
      title: 'My Portfolio',
      icon: FileText,
      path: null
    },
    {
      id: 'start-project',
      title: 'Start New Portfolio',
      icon: Plus,
      path: '/bank-portfolio'
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
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="font-semibold text-gray-900">Carbon Credit</span>
          </div>
        </div>

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
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {activeSection === 'overview' ? 'Company Overview' : 
                 sidebarItems.find(item => item.id === activeSection)?.title || 'Dashboard'}
              </h1>
              <p className="text-gray-600 mt-1">
                {activeSection === 'overview' ? 
                  `Welcome back, ${displayName || 'User'}! Here's your organization's sustainability overview.` :
                  'Manage your carbon credit projects and explore global opportunities'
                }
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Info className="h-4 w-4 mr-2" />
                Help
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 bg-gray-50">
          {activeSection === 'overview' ? (
            <div className="max-w-7xl">
              {/* Welcome Section */}
              <div className="mb-8">
                <div className="bg-gradient-to-r from-teal-500 to-cyan-600 rounded-lg p-6 text-white">
                  <h2 className="text-2xl font-bold mb-2">
                    {displayName ? `Welcome back, ${displayName}! 👋` : "Welcome to your Dashboard!"}
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
                        <span className="text-sm text-gray-600">
                          {hasAnyEmissions ? 'Data Available' : 'No Data'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <span className="text-sm font-medium">Scope 2 Emissions</span>
                        </div>
                        <span className="text-sm text-gray-600">
                          {hasAnyEmissions ? 'Data Available' : 'No Data'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-sm font-medium">Scope 3 Emissions</span>
                        </div>
                        <span className="text-sm text-gray-600">Not Tracked</span>
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
