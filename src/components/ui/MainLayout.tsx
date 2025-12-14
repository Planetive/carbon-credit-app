import { Outlet, useLocation } from "react-router-dom";
import AppHeader from "./AppHeader";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useState, useEffect } from "react";

const MainLayout = () => {
  // Scroll to top when navigating to any page - applies globally
  useScrollToTop();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState<string>('overview');

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

  if (!shouldShowSidebar) {
    return (
      <>
        <AppHeader />
        <main className="flex-1">
          <Outlet />
        </main>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/40 to-cyan-50/60 flex flex-col">
      <AppHeader />
      <div className="flex-1 flex overflow-hidden">
        <DashboardSidebar 
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 lg:p-10">
            <Outlet context={{ activeSection, setActiveSection }} />
          </main>
        </div>
      </div>
    </div>
  );
};

export default MainLayout; 