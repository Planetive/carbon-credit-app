import { Outlet } from "react-router-dom";
import AppHeader from "./AppHeader";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";

const MainLayout = () => {
  // Scroll to top when navigating to any page - applies globally
  useScrollToTop();

  return (
    <>
      <AppHeader />
      <main className="flex-1">
        <Outlet />
      </main>
    </>
  );
};

export default MainLayout; 