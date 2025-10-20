import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
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
import EmissionResults from "./pages/EmissionResults";
import EmissionHistory from "./pages/EmissionHistory";
import ESGFinancialInstitutions from "./pages/solutions/esg-financial-institutions";  
import CCUSPage from "./pages/solutions/ccus.tsx";
import DecarbonizationPage from "./pages/solutions/decarbonization.tsx";
import ESGRiskAssessment from "./pages/solutions/esg-risk-assessment.tsx";
import Dashboard2 from "./pages/Dashboard2";
// Removed ESGWizard import - now handled through IntegratedFinanceEmission
import IntegratedFinanceEmission from "./pages/IntegratedFinanceEmission";

const AppRoutes = () => {
  // Global scroll to top functionality for all routes
  useScrollToTop();

  return (
    <div className="min-h-screen flex flex-col">
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/solutions/esg-financial-institutions" element={<ESGFinancialInstitutions />} />
          <Route path="/solutions/ccus" element={<CCUSPage />} />
          <Route path="/solutions/decarbonization" element={<DecarbonizationPage />} />
          <Route path="/solutions/esg-risk-assessment" element={<ESGRiskAssessment />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/confirm-email" element={<ConfirmEmail />} />
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard2 />
            </ProtectedRoute>
          } />
          <Route path="/dashboard-legacy" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/dashboard2" element={<Navigate to="/dashboard" replace />} />
          <Route path="/ai-advisor" element={
            <ProtectedRoute>
              <AIAdvisor />
            </ProtectedRoute>
          } />
          {/* Hide project wizard entry point; keep route for legacy if needed */}
          <Route path="/project-wizard" element={
            <ProtectedRoute>
              <ProjectWizard />
            </ProtectedRoute>
          } />
          <Route path="/bank-portfolio" element={
            <ProtectedRoute>
              <BankPortfolio />
            </ProtectedRoute>
          } />
          <Route path="/bank-portfolio/:id" element={
            <ProtectedRoute>
              <CompanyDetail />
            </ProtectedRoute>
          } />
          <Route path="/scenario-building" element={
            <ProtectedRoute>
              <SimpleScenarioBuilding />
            </ProtectedRoute>
          } />
          <Route path="/climate-risk-results" element={
            <ProtectedRoute>
              <ClimateRiskResults />
            </ProtectedRoute>
          } />
          <Route path="/project-results" element={
            <ProtectedRoute>
              <ProjectResults />
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute>
              <ProjectReports />
            </ProtectedRoute>
          } />
          <Route path="/drafts" element={
            <ProtectedRoute>
              <ProjectDrafts />
            </ProtectedRoute>
          } />
          <Route path="/project/:id" element={
            <ProtectedRoute>
              <ProjectDetails />
            </ProtectedRoute>
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
          <Route path="/emission-calculator" element={
            <ProtectedRoute>
              <EmissionCalculator />
            </ProtectedRoute>
          } />
          <Route path="/emission-history" element={
            <ProtectedRoute>
              <EmissionHistory />
            </ProtectedRoute>
          } />
          <Route path="/emission-results" element={
            <ProtectedRoute>
              <EmissionResults />
            </ProtectedRoute>
          } />
          {/* Removed /onboarding route - now using /finance-emission for both flows */}
          <Route path="/finance-emission" element={
            <ProtectedRoute>
              <IntegratedFinanceEmission />
            </ProtectedRoute>
          } />
          <Route path="/ccus-management-strategy/:country" element={
            <ProtectedRoute>            
            <CCUSManagementStrategy />
            </ProtectedRoute>
            } />
          <Route path="/filtered-projects" element={
            <ProtectedRoute>
              <FilteredProjects />
            </ProtectedRoute>            
            } />
          <Route path="/project-table" element={
            <ProtectedRoute>
              <ProjectTable />
            </ProtectedRoute>
          } />
          <Route path="/project-cards" element={
            <ProtectedRoute>
              <ProjectCards />
            </ProtectedRoute>
          } />
          <Route path="/contact-submissions" element={
            <ProtectedRoute>
              <ContactSubmissions />
            </ProtectedRoute>
          } />
          <Route path="/esg-health-check" element={
            <ProtectedRoute>
              <ESGHealthCheck />
            </ProtectedRoute>
          } />
          <Route path="/esg-results" element={
            <ProtectedRoute>
              <ESGResults />
            </ProtectedRoute>
          } />
        </Route>
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="/filtered-projects-landing" element={
          <ProtectedRoute>
            <FilteredProjectsLanding />
          </ProtectedRoute>
        } />
        <Route path="/filtered-ccus-projects" element={ 
          <ProtectedRoute>
            <FilteredCCUSProjects />
          </ProtectedRoute>
        } />
        <Route path="/filtered-methodologies" element={
          <ProtectedRoute>
            <FilteredMethodologies />
          </ProtectedRoute>
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
      <Footer />
    </div>
  );
};

const App = () => (
  <AuthProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </AuthProvider>
);

export default App;
