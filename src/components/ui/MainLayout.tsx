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

  // Routes that should show the sidebar
  const sidebarRoutes = [
    '/dashboard',
    '/bank-portfolio',
    '/esg-health-check',
    '/project-wizard'
  ];

  const shouldShowSidebar = sidebarRoutes.some(route => location.pathname.startsWith(route));

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
      setActiveSection('start-project');
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/40 to-cyan-50/60 flex flex-col">
      <AppHeader />
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar: visible on large screens and up */}
        <div className="hidden lg:flex">
          <DashboardSidebar 
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />
        </div>
        {/* Main content: full-width on mobile, alongside sidebar on desktop */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          <main className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 lg:p-10 bg-slate-50">
            <Outlet context={{ activeSection, setActiveSection }} />
          </main>
        </div>
      </div>
      {legalNoticeCard}
    </div>
  );
};

export default MainLayout; 