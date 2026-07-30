import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CompanyProtectedRoute } from "@/components/CompanyProtectedRoute";
import { PermissionProtectedRoute } from "@/components/PermissionProtectedRoute";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import Footer from "@/components/layout/Footer";
import Index from "./pages/Index";
import Login from "@/features/auth/screens/LoginScreen";
import ForgotPassword from "@/features/auth/screens/ForgotPasswordScreen";
import ConfirmEmail from "@/features/auth/screens/ConfirmEmailScreen";
import Dashboard from "./pages/Dashboard";
import AIAdvisor from "./pages/AIAdvisor";
import ProjectWizard from "@/features/projects/screens/ProjectWizardScreen";
import BankPortfolio from "@/features/portfolio/screens/BankPortfolioScreen";
import CompanyDetail from "@/features/portfolio/screens/CompanyDetailScreen";
import SimpleScenarioBuilding from "@/features/climate-risk/screens/ScenarioBuildingScreen";
import ClimateRiskResults from "@/features/climate-risk/results/ClimateRiskResultsScreen";
import ProjectResults from "@/features/projects/screens/ProjectResultsScreen";
import ProjectReports from "@/features/projects/screens/ProjectReportsScreen";
import ProjectDrafts from "@/features/projects/screens/ProjectDraftsScreen";
import NotFound from "@/features/legal/screens/NotFoundScreen";
import ProjectDetails from "@/features/projects/screens/ProjectDetailsScreen";
import ExploreProjects from "./pages/ExploreProjects";
import ProjectTable from "@/features/projects/screens/ProjectTableScreen";
import ProjectCards from "@/features/projects/screens/ProjectCardsScreen";
import ExploreHub from "./pages/ExploreHub";
import MarketsMechanisms from "./pages/MarketsMechanisms";
import FilteredProjects from "./pages/FilteredProjects";
import FilteredProjectsLanding from "./pages/FilteredProjectsLanding";
import FilteredCCUSProjects from "./pages/FilteredCCUSProjects";
import FilteredMethodologies from "./pages/FilteredMethodologies";
import AppHeader from "@/components/layout/AppHeader";
import MainLayout from "@/components/layout/MainLayout";
import ExploreCCUSProjects from "./pages/ExploreCCUSProjects";
import CCUSProjectDetails from "./pages/CCUSProjectDetails";
import ExploreCCUSPolicies from "./pages/ExploreCCUSPolicies";
import ExploreBESS from "./pages/ExploreBESS";
import CountryEmissions from "./pages/CountryEmissions";
import CCUSManagementStrategy from "./pages/CCUSManagementStrategy";
import AboutUs from "@/features/marketing/screens/AboutUsScreen";
import ContactUs from "@/features/marketing/screens/ContactUsScreen";
import ContactSubmissions from "@/features/marketing/screens/ContactSubmissionsScreen";
import Pricing from "@/features/marketing/screens/PricingScreen";
import ESGHealthCheck from "@/features/esg-readiness/screens/ESGHealthCheckScreen";
import EsgManagementEntryRedirect from "@/features/esg-management/screens/EsgManagementEntryRedirect";
import BoundarySettingPage from "@/features/esg-management/boundary/BoundarySettingScreen";
import AirQualityPage from "@/features/esg-management/topics/air/AirQualityScreen";
import AirQualityResultsPage from "@/features/esg-management/topics/air/AirQualityResultsScreen";
import EsgTopicsPage from "@/features/esg-management/screens/EsgTopicsScreen";
import GhgInventoryBoundaryPage from "@/features/esg-management/topics/ghg/GhgInventoryBoundaryScreen";
import WaterManagementPage from "@/features/esg-management/topics/water/WaterManagementScreen";
import WaterManagementResultsPage from "@/features/esg-management/topics/water/WaterManagementResultsScreen";
import WasteManagementPage from "@/features/esg-management/topics/waste-management/WasteManagementScreen";
import WasteManagementResultsPage from "@/features/esg-management/topics/waste-management/WasteManagementResultsScreen";
import BiodiversityPage from "@/features/esg-management/topics/biodiversity/BiodiversityScreen";
import BiodiversityResultsPage from "@/features/esg-management/topics/biodiversity/BiodiversityResultsScreen";
import ReservesValuationPage from "@/features/esg-management/topics/reserves-valuation-capex/ReservesValuationScreen";
import ReservesValuationResultsPage from "@/features/esg-management/topics/reserves-valuation-capex/ReservesValuationResultsScreen";
import WorkforceHealthSafetyPage from "@/features/esg-management/topics/workforce-health-safety/WorkforceHealthSafetyScreen";
import WorkforceHealthSafetyResultsPage from "@/features/esg-management/topics/workforce-health-safety/WorkforceHealthSafetyResultsScreen";
import EmergencyManagementPage from "@/features/esg-management/topics/emergency-management/EmergencyManagementScreen";
import EmergencyManagementResultsPage from "@/features/esg-management/topics/emergency-management/EmergencyManagementResultsScreen";
import IndigenousRightsPage from "@/features/esg-management/topics/indigenous-peoples-rights/IndigenousRightsScreen";
import IndigenousRightsResultsPage from "@/features/esg-management/topics/indigenous-peoples-rights/IndigenousRightsResultsScreen";
import BusinessEthicsPage from "@/features/esg-management/topics/business-ethics/BusinessEthicsScreen";
import BusinessEthicsResultsPage from "@/features/esg-management/topics/business-ethics/BusinessEthicsResultsScreen";
import CommunityRelationsPage from "@/features/esg-management/topics/community-relations/CommunityRelationsScreen";
import CommunityRelationsResultsPage from "@/features/esg-management/topics/community-relations/CommunityRelationsResultsScreen";
import EnvironmentalManagementPage from "@/features/esg-management/topics/environmental-management/EnvironmentalManagementScreen";
import EnvironmentalManagementResultsPage from "@/features/esg-management/topics/environmental-management/EnvironmentalManagementResultsScreen";
import ESGResults from "@/features/esg-readiness/screens/ESGResultsScreen";
import AdminLogin from "@/features/admin/screens/AdminLoginScreen";
import AdminDashboard from "@/features/admin/screens/AdminDashboardScreen";
import AdminScoring from "@/features/admin/screens/AdminScoringScreen";
import EmissionCalculator from "@/features/emission-calculator/methodologies/uk/UKCalculatorScreen";
import EmissionCalculatorChoice from "./pages/EmissionCalculatorChoice";
import EmissionCalculatorEPA from "./pages/EmissionCalculatorEPA";
import EmissionResults from "@/features/emission-calculator/results/UKResultsScreen";
import EmissionResultsEpaIpcc from "@/features/emission-calculator/results/EpaIpccResultsScreen";
import EmissionHistory from "@/features/emission-calculator/results/EmissionHistoryScreen";
import ESGFinancialInstitutions from "./pages/solutions/esg-financial-institutions";  
import CorporateSolutions from "./pages/solutions/corporate";
import ModuleSolutionPage from "./pages/solutions/module-solution-page";
import Dashboard2 from "./pages/Dashboard2";
// Removed ESGWizard import - now handled through IntegratedFinanceEmission
import IntegratedFinanceEmission from "@/features/finance-emissions/screens/FinanceEmissionScreen";
import LoginChoice from "@/features/auth/screens/LoginChoiceScreen";
// import RegisterChoice from "./pages/RegisterChoice";
import OrganizationManagement from "./pages/OrganizationManagement";
import OrganizationSettings from "./pages/OrganizationSettings";
import UserManagement from "./pages/UserManagement";
import AcceptInvitation from "@/features/auth/screens/AcceptInvitationScreen";
import Settings from "./pages/Settings";
import SupplyChainIntelligence from "./pages/SupplyChainIntelligence";
import AssetMonitoring from "@/features/asset-monitoring/screens/AssetMonitoringScreen";
import TermsAndConditions from "@/features/legal/screens/TermsAndConditionsScreen";
import PrivacyPolicy from "@/features/legal/screens/PrivacyPolicyScreen";
import DataConsent from "@/features/legal/screens/DataConsentScreen";

const AppRoutes = () => {
  // Global scroll to top functionality for all routes
  useScrollToTop();
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login-choice" element={<LoginChoice />} />
        {/* Registration is disabled; users must be invited or contacted */}
        <Route path="/login" element={<Login />} />
        <Route path="/accept-invitation" element={<AcceptInvitation />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/solutions/corporate" element={<CorporateSolutions />} />
        <Route path="/solutions/financial-institutions" element={<ESGFinancialInstitutions />} />
        <Route path="/solutions/esg-financial-institutions" element={<Navigate to="/solutions/financial-institutions" replace />} />
        <Route path="/solutions/modules" element={<Navigate to="/solutions/modules/ai" replace />} />
        <Route path="/solutions/modules/:moduleKey" element={<ModuleSolutionPage />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/data-consent" element={<DataConsent />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/confirm-email" element={<ConfirmEmail />} />
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={
            <CompanyProtectedRoute>
              <Dashboard2 />
            </CompanyProtectedRoute>
          } />
          <Route path="/dashboard-legacy" element={
            <CompanyProtectedRoute>
              <Dashboard />
            </CompanyProtectedRoute>
          } />
          <Route path="/dashboard2" element={<Navigate to="/dashboard" replace />} />
          <Route path="/ai-advisor" element={
            <CompanyProtectedRoute>
              <AIAdvisor />
            </CompanyProtectedRoute>
          } />
          {/* Hide project wizard entry point; keep route for legacy if needed */}
          <Route path="/project-wizard" element={
            <CompanyProtectedRoute>
              <ProjectWizard />
            </CompanyProtectedRoute>
          } />
          <Route path="/bank-portfolio" element={
            <CompanyProtectedRoute>
              <BankPortfolio />
            </CompanyProtectedRoute>
          } />
          <Route path="/bank-portfolio/:id" element={
            <CompanyProtectedRoute>
              <CompanyDetail />
            </CompanyProtectedRoute>
          } />
          <Route path="/scenario-building" element={
            <CompanyProtectedRoute>
              <SimpleScenarioBuilding />
            </CompanyProtectedRoute>
          } />
          <Route path="/climate-risk-results" element={
            <CompanyProtectedRoute>
              <ClimateRiskResults />
            </CompanyProtectedRoute>
          } />
          <Route path="/project-results" element={
            <CompanyProtectedRoute>
              <ProjectResults />
            </CompanyProtectedRoute>
          } />
          <Route path="/reports" element={
            <CompanyProtectedRoute>
              <ProjectReports />
            </CompanyProtectedRoute>
          } />
          <Route path="/drafts" element={
            <CompanyProtectedRoute>
              <ProjectDrafts />
            </CompanyProtectedRoute>
          } />
          <Route path="/project/:id" element={
            <CompanyProtectedRoute>
              <ProjectDetails />
            </CompanyProtectedRoute>
          } />
          <Route path="/explore" element={
            <ProtectedRoute>
              <ExploreHub />
            </ProtectedRoute>
          } />
          <Route path="/explore/global-projects" element={
            <ProtectedRoute>
              <ExploreProjects />
            </ProtectedRoute>
          } />
          <Route path="/explore/markets-mechanisms" element={
            <ProtectedRoute>
              <MarketsMechanisms />
            </ProtectedRoute>
          } />
          <Route path="/explore/ccus-projects" element={
            <ProtectedRoute>
              <ExploreCCUSProjects />
            </ProtectedRoute>
          } />
          <Route path="/explore/ccus-projects/details" element={
            <ProtectedRoute>
              <CCUSProjectDetails />
            </ProtectedRoute>
          } />
          <Route path="/explore/ccus-policies" element={
            <ProtectedRoute>
              <ExploreCCUSPolicies />
            </ProtectedRoute>
          } />
          <Route path="/explore/bess-projects" element={
            <ProtectedRoute>
              <ExploreBESS />
            </ProtectedRoute>
          } />
          <Route path="/explore/country-emissions" element={
            <ProtectedRoute>
              <CountryEmissions />
            </ProtectedRoute>
          } />
          <Route path="/emission-calculator" element={
            <CompanyProtectedRoute>
              <EmissionCalculatorChoice />
            </CompanyProtectedRoute>
          } />
          <Route path="/emission-calculator-uk" element={
            <CompanyProtectedRoute>
              <EmissionCalculator />
            </CompanyProtectedRoute>
          } />
          <Route path="/emission-calculator-epa" element={
            <CompanyProtectedRoute>
              <EmissionCalculatorEPA />
            </CompanyProtectedRoute>
          } />
          <Route path="/emission-calculator-ipcc" element={<Navigate to="/emission-calculator-epa" replace />} />
          <Route path="/emission-history" element={
            <CompanyProtectedRoute>
              <EmissionHistory />
            </CompanyProtectedRoute>
          } />
          <Route path="/emission-results" element={
            <CompanyProtectedRoute>
              <EmissionResults />
            </CompanyProtectedRoute>
          } />
          <Route path="/emission-results-calculator" element={
            <CompanyProtectedRoute>
              <EmissionResultsEpaIpcc />
            </CompanyProtectedRoute>
          } />
          <Route path="/emission-results-epa-ipcc" element={<Navigate to="/emission-results-calculator" replace />} />
          {/* Removed /onboarding route - now using /finance-emission for both flows */}
          <Route path="/finance-emission" element={
            <CompanyProtectedRoute>
              <IntegratedFinanceEmission />
            </CompanyProtectedRoute>
          } />
          <Route path="/ccus-management-strategy/:country" element={
            <CompanyProtectedRoute>            
            <CCUSManagementStrategy />
            </CompanyProtectedRoute>
            } />
          <Route path="/filtered-projects" element={
            <CompanyProtectedRoute>
              <FilteredProjects />
            </CompanyProtectedRoute>            
            } />
          <Route path="/project-table" element={
            <CompanyProtectedRoute>
              <ProjectTable />
            </CompanyProtectedRoute>
          } />
          <Route path="/project-cards" element={
            <CompanyProtectedRoute>
              <ProjectCards />
            </CompanyProtectedRoute>
          } />
          <Route path="/contact-submissions" element={
            <CompanyProtectedRoute>
              <ContactSubmissions />
            </CompanyProtectedRoute>
          } />
          <Route path="/esg-management" element={
            <CompanyProtectedRoute>
              <EsgManagementEntryRedirect />
            </CompanyProtectedRoute>
          } />
          <Route path="/esg-management/topics" element={
            <CompanyProtectedRoute>
              <EsgTopicsPage />
            </CompanyProtectedRoute>
          } />
          <Route path="/esg-management/boundary-setting" element={
            <CompanyProtectedRoute>
              <BoundarySettingPage />
            </CompanyProtectedRoute>
          } />
          <Route path="/esg-management/ghg/inventory-boundary" element={
            <CompanyProtectedRoute>
              <GhgInventoryBoundaryPage />
            </CompanyProtectedRoute>
          } />
          <Route path="/esg-management/air-quality/results" element={
            <CompanyProtectedRoute>
              <AirQualityResultsPage />
            </CompanyProtectedRoute>
          } />
          <Route path="/esg-management/air-quality" element={
            <CompanyProtectedRoute>
              <AirQualityPage />
            </CompanyProtectedRoute>
          } />
          <Route path="/esg-management/water-management/results" element={
            <CompanyProtectedRoute>
              <WaterManagementResultsPage />
            </CompanyProtectedRoute>
          } />
          <Route path="/esg-management/water-management" element={
            <CompanyProtectedRoute>
              <WaterManagementPage />
            </CompanyProtectedRoute>
          } />
          <Route path="/esg-management/waste-management/results" element={
            <CompanyProtectedRoute>
              <WasteManagementResultsPage />
            </CompanyProtectedRoute>
          } />
          <Route path="/esg-management/waste-management" element={
            <CompanyProtectedRoute>
              <WasteManagementPage />
            </CompanyProtectedRoute>
          } />
          <Route path="/esg-management/biodiversity/results" element={
            <CompanyProtectedRoute>
              <BiodiversityResultsPage />
            </CompanyProtectedRoute>
          } />
          <Route path="/esg-management/biodiversity" element={
            <CompanyProtectedRoute>
              <BiodiversityPage />
            </CompanyProtectedRoute>
          } />
          <Route path="/esg-management/reserves-valuation/results" element={
            <CompanyProtectedRoute>
              <ReservesValuationResultsPage />
            </CompanyProtectedRoute>
          } />
          <Route path="/esg-management/reserves-valuation" element={
            <CompanyProtectedRoute>
              <ReservesValuationPage />
            </CompanyProtectedRoute>
          } />
          <Route path="/esg-management/workforce-health-safety/results" element={
            <CompanyProtectedRoute>
              <WorkforceHealthSafetyResultsPage />
            </CompanyProtectedRoute>
          } />
          <Route path="/esg-management/workforce-health-safety" element={
            <CompanyProtectedRoute>
              <WorkforceHealthSafetyPage />
            </CompanyProtectedRoute>
          } />
          <Route path="/esg-management/emergency-management/results" element={
            <CompanyProtectedRoute>
              <EmergencyManagementResultsPage />
            </CompanyProtectedRoute>
          } />
          <Route path="/esg-management/emergency-management" element={
            <CompanyProtectedRoute>
              <EmergencyManagementPage />
            </CompanyProtectedRoute>
          } />
          <Route path="/esg-management/indigenous-rights/results" element={
            <CompanyProtectedRoute>
              <IndigenousRightsResultsPage />
            </CompanyProtectedRoute>
          } />
          <Route path="/esg-management/indigenous-rights" element={
            <CompanyProtectedRoute>
              <IndigenousRightsPage />
            </CompanyProtectedRoute>
          } />
          <Route path="/esg-management/community-relations/results" element={
            <CompanyProtectedRoute>
              <CommunityRelationsResultsPage />
            </CompanyProtectedRoute>
          } />
          <Route path="/esg-management/community-relations" element={
            <CompanyProtectedRoute>
              <CommunityRelationsPage />
            </CompanyProtectedRoute>
          } />
          <Route path="/esg-management/business-ethics/results" element={
            <CompanyProtectedRoute>
              <BusinessEthicsResultsPage />
            </CompanyProtectedRoute>
          } />
          <Route path="/esg-management/business-ethics" element={
            <CompanyProtectedRoute>
              <BusinessEthicsPage />
            </CompanyProtectedRoute>
          } />
          <Route path="/esg-management/environmental-management/results" element={
            <CompanyProtectedRoute>
              <EnvironmentalManagementResultsPage />
            </CompanyProtectedRoute>
          } />
          <Route path="/esg-management/environmental-management" element={
            <CompanyProtectedRoute>
              <EnvironmentalManagementPage />
            </CompanyProtectedRoute>
          } />
          <Route path="/esg-management/modules" element={
            <CompanyProtectedRoute>
              <Navigate to="/esg-management/topics" replace />
            </CompanyProtectedRoute>
          } />
          <Route path="/esg-health-check" element={
            <CompanyProtectedRoute>
              <ESGHealthCheck />
            </CompanyProtectedRoute>
          } />
          <Route path="/esg-results" element={
            <CompanyProtectedRoute>
              <ESGResults />
            </CompanyProtectedRoute>
          } />
          {/* Redirect old routes to Settings page */}
          <Route path="/organization-management" element={
            <CompanyProtectedRoute>
              <Navigate to="/settings" replace />
            </CompanyProtectedRoute>
          } />
          <Route path="/organization-settings" element={
            <CompanyProtectedRoute>
              <Navigate to="/settings" replace />
            </CompanyProtectedRoute>
          } />
          <Route path="/user-management" element={
            <CompanyProtectedRoute>
              <Navigate to="/settings" replace />
            </CompanyProtectedRoute>
          } />
          <Route path="/settings" element={
            <CompanyProtectedRoute>
              <Settings />
            </CompanyProtectedRoute>
          } />
          <Route path="/asset-monitoring" element={
            <CompanyProtectedRoute>
              <AssetMonitoring />
            </CompanyProtectedRoute>
          } />
          <Route path="/supply-chain-intelligence" element={
            <CompanyProtectedRoute>
              <SupplyChainIntelligence />
            </CompanyProtectedRoute>
          } />
        </Route>
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="/filtered-projects-landing" element={
          <CompanyProtectedRoute>
            <FilteredProjectsLanding />
          </CompanyProtectedRoute>
        } />
        <Route path="/filtered-ccus-projects" element={ 
          <CompanyProtectedRoute>
            <FilteredCCUSProjects />
          </CompanyProtectedRoute>
        } />
        <Route path="/filtered-methodologies" element={
          <CompanyProtectedRoute>
            <FilteredMethodologies />
          </CompanyProtectedRoute>
        } />

        
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={
          <AdminProtectedRoute>
            <AdminDashboard />
          </AdminProtectedRoute>
        } />
        <Route path="/admin/score/:assessmentId" element={
          <AdminProtectedRoute>
            <AdminScoring />
          </AdminProtectedRoute>
        } />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!user && <Footer />}
    </div>
  );
};

const App = () => (
  <AuthProvider>
    <OrganizationProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </OrganizationProvider>
  </AuthProvider>
);

export default App;
