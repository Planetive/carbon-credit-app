import { Link, Outlet, useLocation } from "react-router-dom";
import AppHeader from "./AppHeader";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const FIRST_LOGIN_LEGAL_KEY_PREFIX = "first-login-legal-dismissed";

const MainLayout = () => {
  // Scroll to top when navigating to any page - applies globally
  useScrollToTop();
  const location = useLocation();
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [showFirstLoginLegal, setShowFirstLoginLegal] = useState(false);

  // Routes that should show the sidebar (keep shell aligned with DashboardSidebar destinations)
  const sidebarRoutes = [
    '/dashboard',
    '/bank-portfolio',
    '/esg-management',
    '/esg-health-check',
    '/project-wizard',
    '/reports',
    '/asset-monitoring',
    '/supply-chain-intelligence',
  ];

  const shouldShowSidebar = sidebarRoutes.some(route => location.pathname.startsWith(route));
  const isAssetMonitoringRoute = location.pathname.startsWith("/asset-monitoring");

  // Check if navigation state has activeSection and set it
  useEffect(() => {
    if (location.state && (location.state as any).activeSection) {
      setActiveSection((location.state as any).activeSection);
      // Clear the state to avoid persisting on refresh
      window.history.replaceState({}, document.title);
    } else if (location.pathname === '/dashboard') {
      // Default to overview if on dashboard without state
      setActiveSection('overview');
    } else if (location.pathname === '/bank-portfolio') {
      setActiveSection('portfolio');
    }
  }, [location.state, location.pathname]);

  useEffect(() => {
    if (!user?.id) {
      setShowFirstLoginLegal(false);
      return;
    }

    const dismissedKey = `${FIRST_LOGIN_LEGAL_KEY_PREFIX}:${user.id}`;
    const isDismissed = localStorage.getItem(dismissedKey) === "true";
    if (isDismissed) {
      setShowFirstLoginLegal(false);
      return;
    }
    setShowFirstLoginLegal(true);
  }, [user]);

  const dismissFirstLoginLegal = () => {
    if (user?.id) {
      localStorage.setItem(`${FIRST_LOGIN_LEGAL_KEY_PREFIX}:${user.id}`, "true");
    }
    setShowFirstLoginLegal(false);
  };

  const legalNoticeCard = showFirstLoginLegal ? (
    <div className="fixed left-4 bottom-4 z-[60] w-[calc(100vw-2rem)] max-w-sm rounded-xl border border-teal-200 bg-white/95 shadow-xl backdrop-blur p-4">
      <p className="text-sm font-semibold text-gray-900">Before you continue</p>
      <p className="mt-1 text-xs text-gray-600">
        To help protect your organization’s data, please review our Terms, Privacy Policy, and Data Consent before continuing.
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <Link to="/terms-and-conditions" className="text-teal-700 hover:underline">Terms</Link>
        <span className="text-gray-300">|</span>
        <Link to="/privacy-policy" className="text-teal-700 hover:underline">Privacy</Link>
        <span className="text-gray-300">|</span>
        <Link to="/data-consent" className="text-teal-700 hover:underline">Data Consent</Link>
      </div>
      <button
        onClick={dismissFirstLoginLegal}
        className="mt-3 w-full rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 transition-colors"
      >
        Got it
      </button>
    </div>
  ) : null;

  if (!shouldShowSidebar) {
    return (
      <>
        <AppHeader />
        <main className="flex-1">
          <Outlet context={{ activeSection, setActiveSection }} />
        </main>
        {legalNoticeCard}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F5F4] flex flex-col lg:h-screen lg:max-h-screen lg:overflow-hidden">
      <div className="lg:hidden flex-shrink-0">
        <AppHeader />
      </div>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="hidden lg:flex flex-shrink-0 sticky top-0 self-start h-full lg:h-screen lg:max-h-screen">
          <DashboardSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        </div>
        <div className="flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden">
          <main
            className={
              isAssetMonitoringRoute
                ? "flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-[#F8FAF8] p-0"
                : "flex-1 min-h-0 overflow-y-auto custom-scrollbar pt-4 px-[18px] pb-5"
            }
          >
            <Outlet context={{ activeSection, setActiveSection }} />
          </main>
        </div>
      </div>
      {legalNoticeCard}
    </div>
  );
};

export default MainLayout; 