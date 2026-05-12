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
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ConfirmEmail from "./pages/ConfirmEmail";
import Dashboard from "./pages/Dashboard";
import AIAdvisor from "./pages/AIAdvisor";
import ProjectWizard from "./pages/ProjectWizard";
import BankPortfolio from "./pages/BankPortfolio";
import CompanyDetail from "./pages/CompanyDetail";
import SimpleScenarioBuilding from "./pages/SimpleScenarioBuilding";
import ClimateRiskResults from "./pages/ClimateRiskResults";
import ProjectResults from "./pages/ProjectResults";
import ProjectReports from "./pages/ProjectReports";
import ProjectDrafts from "./pages/ProjectDrafts";
import NotFound from "./pages/NotFound";
import ProjectDetails from "./pages/ProjectDetails";
import ExploreProjects from "./pages/explore/sub-pages/global-projects";
import ProjectTable from "./pages/ProjectTable";
import ProjectCards from "./pages/ProjectCards";
import ExploreHub from "./pages/explore";
import MarketsMechanisms from "./pages/explore/sub-pages/markets-mechanisms";
import FilteredProjects from "./pages/FilteredProjects";
import FilteredProjectsLanding from "./pages/FilteredProjectsLanding";
import FilteredCCUSProjects from "./pages/FilteredCCUSProjects";
import FilteredMethodologies from "./pages/FilteredMethodologies";
import AppHeader from "@/components/layout/AppHeader";
import MainLayout from "@/components/layout/MainLayout";
import ExploreCCUSProjects from "./pages/explore/sub-pages/ccus-projects";
import CCUSProjectDetails from "./pages/explore/sub-pages/ccus-project-details";
import ExploreCCUSPolicies from "./pages/explore/sub-pages/ccus-policies";
import ExploreBESS from "./pages/explore/sub-pages/bess-projects";
import CountryEmissions from "./pages/explore/sub-pages/country-emissions";
import CCUSManagementStrategy from "./pages/explore/sub-pages/ccus-management-strategy";
import AboutUs from "./pages/AboutUs";
import ContactUs from "./pages/ContactUs";
import ContactSubmissions from "./pages/ContactSubmissions";
import Pricing from "./pages/Pricing";
import ESGHealthCheck from "./pages/ESGHealthCheck";
import EsgManagementEntryRedirect from "./pages/esg-management/EsgManagementEntryRedirect";
import BoundarySettingPage from "./pages/esg-management/BoundarySettingPage";
import AirQualityPage from "./pages/esg-management/AirQualityPage";
import AirQualityResultsPage from "./pages/esg-management/AirQualityResultsPage";
import EsgTopicsPage from "./pages/esg-management/EsgTopicsPage";
import GhgInventoryBoundaryPage from "./pages/esg-management/GhgInventoryBoundaryPage";
import WaterManagementPage from "./pages/esg-management/WaterManagementPage";
import WaterManagementResultsPage from "./pages/esg-management/WaterManagementResultsPage";
import BiodiversityPage from "./pages/esg-management/BiodiversityPage";
import BiodiversityResultsPage from "./pages/esg-management/BiodiversityResultsPage";
import ESGResults from "./pages/ESGResults";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminScoring from "./pages/AdminScoring";
import EmissionCalculator from "./pages/EmissionCalculator";
import EmissionCalculatorChoice from "./pages/EmissionCalculatorChoice";
import EmissionCalculatorEPA from "./pages/EmissionCalculatorEPA";
import EmissionCalculatorIPCC from "./pages/EmissionCalculatorIPCC";
import EmissionResults from "./pages/EmissionResults";
import EmissionResultsEpaIpcc from "./pages/EmissionResultsEpaIpcc";
import EmissionHistory from "./pages/EmissionHistory";
import ESGFinancialInstitutions from "./pages/solutions/esg-financial-institutions";  
import CorporateSolutions from "./pages/solutions/corporate";
import Dashboard2 from "./pages/Dashboard2";
// Removed ESGWizard import - now handled through IntegratedFinanceEmission
import IntegratedFinanceEmission from "./pages/IntegratedFinanceEmission";
import LoginChoice from "./pages/LoginChoice";
// import RegisterChoice from "./pages/RegisterChoice";
import OrganizationManagement from "./pages/OrganizationManagement";
import OrganizationSettings from "./pages/OrganizationSettings";
import UserManagement from "./pages/UserManagement";
import AcceptInvitation from "./pages/AcceptInvitation";
import Settings from "./pages/Settings";
import SupplyChainIntelligence from "./pages/SupplyChainIntelligence";
import TermsAndConditions from "./pages/TermsAndConditions";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import DataConsent from "./pages/DataConsent";

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
          <Route path="/emission-calculator-ipcc" element={
            <CompanyProtectedRoute>
              <EmissionCalculatorIPCC />
            </CompanyProtectedRoute>
          } />
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
