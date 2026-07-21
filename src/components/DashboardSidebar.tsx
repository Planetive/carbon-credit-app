import { useNavigate, useLocation, Link } from "react-router-dom";
import type { ComponentType } from "react";
import {
  Grid3X3,
  FileText,
  BarChart3,
  ArrowRight,
  FolderOpen,
  Building2,
  Globe2,
  Layers,
  Activity,
  Calculator,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import UserAccountMenu from "@/components/UserAccountMenu";

interface SidebarItem {
  id: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  path: string | null;
}

interface DashboardSidebarProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

const DashboardSidebar = ({ activeSection, onSectionChange }: DashboardSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [userType, setUserType] = useState<string>("financial_institution");
  const [userTypeResolved, setUserTypeResolved] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [roleLabel, setRoleLabel] = useState("Admin");

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const { data } = (await (supabase as any)
          .from("profiles")
          .select("user_type, display_name, contact_role")
          .eq("user_id", user.id)
          .single()) as { data: { user_type?: string; display_name?: string; contact_role?: string } | null };
        if (data?.user_type) setUserType(data.user_type);
        if (data?.display_name) setDisplayName(data.display_name);
        else if (user.email) setDisplayName(user.email.split("@")[0]);
        if (data?.contact_role) setRoleLabel(data.contact_role);
      } finally {
        setUserTypeResolved(true);
      }
    };
    fetchProfile();
  }, [user]);

  const effectiveUserType = userTypeResolved ? userType : "corporate";
  const restrictedPortfolioEmails = ["asghar.hayat@marienergies.com.pk"];
  const isPortfolioRestrictedUser = user?.email
    ? restrictedPortfolioEmails.includes(user.email.toLowerCase())
    : false;

  let sidebarItems: SidebarItem[] =
    effectiveUserType === "financial_institution"
      ? [
          { id: "overview", title: "Company Overview", icon: Grid3X3, path: "/dashboard" },
          { id: "projects", title: "My Projects", icon: FolderOpen, path: "/dashboard" },
          { id: "portfolio", title: "My Portfolio", icon: Building2, path: "/dashboard" },
          { id: "esg-management", title: "ESG Management", icon: Layers, path: "/esg-management" },
          { id: "esg-assessment", title: "ESG Assessment", icon: FileText, path: "/esg-health-check" },
          { id: "emissions", title: "Carbon Accounting", icon: Calculator, path: "/emission-calculator" },
          {
            id: "asset-monitoring",
            title: "Asset Monitoring",
            icon: Activity,
            path: "/asset-monitoring",
          },
          {
            id: "supply-chain-intel",
            title: "Supply Chain Intelligence",
            icon: Globe2,
            path: "/supply-chain-intelligence",
          },
          { id: "reports", title: "Reports & Analytics", icon: BarChart3, path: "/reports" },
        ]
      : [
          { id: "overview", title: "Company Overview", icon: Grid3X3, path: "/dashboard" },
          { id: "portfolio", title: "My Projects", icon: FileText, path: "/dashboard" },
          { id: "esg-management", title: "ESG Management", icon: Layers, path: "/esg-management" },
          { id: "esg-assessment", title: "ESG Assessment", icon: FileText, path: "/esg-health-check" },
          { id: "emissions", title: "Carbon Accounting", icon: Calculator, path: "/emission-calculator" },
          {
            id: "asset-monitoring",
            title: "Asset Monitoring",
            icon: Activity,
            path: "/asset-monitoring",
          },
          {
            id: "supply-chain-intel",
            title: "Supply Chain Intelligence",
            icon: Globe2,
            path: "/supply-chain-intelligence",
          },
          { id: "reports", title: "Reports & Analytics", icon: BarChart3, path: "/reports" },
        ];

  if (isPortfolioRestrictedUser) {
    sidebarItems = sidebarItems.filter((item) => item.id !== "portfolio");
  }

  const handleSidebarClick = (item: SidebarItem) => {
    if (item.path) {
      if (item.id === "portfolio" || item.id === "projects") {
        navigate("/dashboard", { state: { activeSection: item.id } });
      } else if (item.id === "overview") {
        navigate("/dashboard", { state: { activeSection: "overview" } });
        onSectionChange?.("overview");
      } else {
        navigate(item.path);
      }
    }
  };

  const isActive = (item: SidebarItem) => {
    if (item.id === "portfolio") {
      return location.pathname === "/dashboard" && activeSection === "portfolio";
    }
    if (item.id === "projects") {
      return location.pathname === "/dashboard" && activeSection === "projects";
    }
    if (item.id === "overview") {
      return location.pathname === "/dashboard" && (!activeSection || activeSection === "overview");
    }
    if (item.id === "esg-management" && item.path) {
      return location.pathname.startsWith("/esg-management");
    }
    if (item.id === "esg-assessment" && item.path) {
      return location.pathname === item.path || location.pathname.startsWith("/esg-results");
    }
    if (item.id === "emissions" && item.path) {
      return (
        location.pathname === item.path ||
        location.pathname === "/emission-calculator-uk" ||
        location.pathname === "/emission-calculator-epa" ||
        location.pathname.startsWith("/emission-results")
      );
    }
    if (item.id === "asset-monitoring" && item.path) {
      return location.pathname.startsWith("/asset-monitoring");
    }
    if (item.path && location.pathname === item.path) {
      return true;
    }
    return false;
  };

  const userInitial = (displayName || "U").charAt(0).toUpperCase();

  return (
    <div className="w-[232px] h-full lg:h-screen lg:max-h-screen bg-[#FAFBFA] border-r border-gray-200/60 flex flex-col">
      <div className="px-4 pt-5 pb-4 pl-5">
        <Link
          to="/dashboard"
          className="flex h-14 w-44 items-center justify-start overflow-hidden ml-2 hover:opacity-80 transition-opacity"
        >
          <img
            src="/new_logo.png"
            alt="Rethink Carbon Logo"
            className="h-full w-auto object-contain origin-left scale-[4.1] -translate-x-2"
          />
        </Link>
      </div>

      <div className="flex-1 min-h-0 px-2 py-2 overflow-y-auto custom-scrollbar">
        <nav className="space-y-1">
          {sidebarItems.map((item) => {
            const itemActive = isActive(item);
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSidebarClick(item)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-sm font-medium rounded-md transition-colors ${
                  itemActive
                    ? "bg-[#EEF6F2]/90 text-[#0F3D32]"
                    : "text-gray-600 hover:bg-gray-50/90 hover:text-gray-800"
                }`}
              >
                <Icon
                  className={`h-4 w-4 flex-shrink-0 ${
                    itemActive ? "text-[#1a6b4a]" : "text-gray-400"
                  }`}
                  strokeWidth={1.75}
                />
                <span className="text-left leading-snug">{item.title}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-2 border-t border-gray-100/80 space-y-2">
        <button
          type="button"
          onClick={() => navigate("/ai-advisor")}
          className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-md border border-gray-200/80 bg-gray-50/60 text-sm font-medium text-gray-600 hover:bg-gray-100/80 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" strokeWidth={1.75} />
            AI Assistant
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-gray-400" strokeWidth={1.75} />
        </button>

        <UserAccountMenu
          side="top"
          align="start"
          trigger={
            <button
              type="button"
              className="w-full flex items-center gap-2.5 px-1.5 py-1.5 rounded-md hover:bg-gray-50/90 transition-colors focus:outline-none"
            >
              <div className="h-8 w-8 rounded-full bg-[#0B3D2E] text-white flex items-center justify-center text-xs font-medium">
                {userInitial}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-gray-900 truncate">{displayName || "User"}</p>
                <p className="text-sm font-normal text-gray-500 capitalize">{roleLabel}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
            </button>
          }
        />
      </div>
    </div>
  );
};

export default DashboardSidebar;
