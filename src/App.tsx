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
import Footer from "@/components/ui/Footer";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
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
import ExploreProjects from "./pages/ExploreProjects";
import ProjectTable from "./pages/ProjectTable";
import ProjectCards from "./pages/ProjectCards";
import ExploreHub from "./pages/ExploreHub";
import MarketsMechanisms from "./pages/MarketsMechanisms";
import FilteredProjects from "./pages/FilteredProjects";
import FilteredProjectsLanding from "./pages/FilteredProjectsLanding";
import FilteredCCUSProjects from "./pages/FilteredCCUSProjects";
import FilteredMethodologies from "./pages/FilteredMethodologies";
import AppHeader from "@/components/ui/AppHeader";
import MainLayout from "@/components/ui/MainLayout";
import ExploreCCUSProjects from "./pages/ExploreCCUSProjects";
import CCUSProjectDetails from "./pages/CCUSProjectDetails";
import ExploreCCUSPolicies from "./pages/ExploreCCUSPolicies";
import ExploreBESS from "./pages/ExploreBESS";
import CCUSManagementStrategy from "./pages/CCUSManagementStrategy";
import AboutUs from "./pages/AboutUs";
import ContactUs from "./pages/ContactUs";
import ContactSubmissions from "./pages/ContactSubmissions";
import Pricing from "./pages/Pricing";
import ESGHealthCheck from "./pages/ESGHealthCheck";
import ESGResults from "./pages/ESGResults";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminScoring from "./pages/AdminScoring";
import EmissionCalculator from "./pages/EmissionCalculator";
import EmissionCalculatorEPA from "./pages/EmissionCalculatorEPA";
import EmissionResults from "./pages/EmissionResults";
import EmissionHistory from "./pages/EmissionHistory";
import ESGFinancialInstitutions from "./pages/solutions/esg-financial-institutions";  
import CorporateSolutions from "./pages/solutions/corporate";
import Dashboard2 from "./pages/Dashboard2";
// Removed ESGWizard import - now handled through IntegratedFinanceEmission
import IntegratedFinanceEmission from "./pages/IntegratedFinanceEmission";
import LoginChoice from "./pages/LoginChoice";
import RegisterChoice from "./pages/RegisterChoice";
import OrganizationManagement from "./pages/OrganizationManagement";
import OrganizationSettings from "./pages/OrganizationSettings";
import UserManagement from "./pages/UserManagement";
import AcceptInvitation from "./pages/AcceptInvitation";
import Settings from "./pages/Settings";

const AppRoutes = () => {
  // Global scroll to top functionality for all routes
  useScrollToTop();
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login-choice" element={<LoginChoice />} />
        <Route path="/register-choice" element={<RegisterChoice />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/accept-invitation" element={<AcceptInvitation />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/solutions/corporate" element={<CorporateSolutions />} />
        <Route path="/solutions/financial-institutions" element={<ESGFinancialInstitutions />} />
        <Route path="/solutions/esg-financial-institutions" element={<Navigate to="/solutions/financial-institutions" replace />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/pricing" element={<Pricing />} />
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
          <Route path="/emission-calculator" element={
            <CompanyProtectedRoute>
              <EmissionCalculator />
            </CompanyProtectedRoute>
          } />
          <Route path="/emission-calculator-epa" element={
            <CompanyProtectedRoute>
              <EmissionCalculatorEPA />
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
