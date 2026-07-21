import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Building2,
  Check,
  Factory,
  FileText,
  Globe2,
  Grid3X3,
  Home,
  Layers,
  LogOut,
  Plus,
  Settings as SettingsIcon,
  User,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

/** Matches logged-in sidebar / overview forest accents (not teal). */
const FOREST = "#0B3D2E";
const FOREST_MID = "#0F3D32";
const FOREST_SOFT_BG = "#E8F3EF";

interface UserAccountMenuProps {
  trigger: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  contentClassName?: string;
}

const UserAccountMenu = ({
  trigger,
  side = "bottom",
  align = "end",
  contentClassName = "w-80",
}: UserAccountMenuProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const {
    currentOrganization,
    organizations,
    switchOrganization,
    loading: orgLoading,
  } = useOrganization();
  const [switchingOrg, setSwitchingOrg] = useState<string | null>(null);
  const [userType, setUserType] = useState("corporate");

  useEffect(() => {
    const loadType = async () => {
      if (!user) return;
      const { data } = await (supabase as any)
        .from("profiles")
        .select("user_type")
        .eq("user_id", user.id)
        .single();
      if (data?.user_type) setUserType(data.user_type);
    };
    loadType();
  }, [user]);

  const handleSwitchOrganization = async (orgId: string) => {
    setSwitchingOrg(orgId);
    try {
      await switchOrganization(orgId);
      toast({
        title: "Organization switched",
        description: "Your workspace context was updated.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Could not switch organization",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSwitchingOrg(null);
    }
  };

  const handleCreateOrganization = () => {
    navigate("/settings");
  };

  const handleLogout = async () => {
    try {
      toast({
        title: "Signing out...",
        description: "Please wait while we sign you out.",
      });

      const adminAuth = localStorage.getItem("adminAuthenticated");
      const adminLoginTime = localStorage.getItem("adminLoginTime");
      localStorage.clear();
      if (adminAuth) localStorage.setItem("adminAuthenticated", adminAuth);
      if (adminLoginTime) localStorage.setItem("adminLoginTime", adminLoginTime);
      sessionStorage.clear();

      await signOut();
      toast({
        title: "Signed out",
        description: "You've been signed out successfully.",
      });
      await new Promise((resolve) => setTimeout(resolve, 500));
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
      window.location.href = "/";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent side={side} align={align} sideOffset={8} className={contentClassName}>
        <DropdownMenuLabel className="font-normal px-3 py-2.5">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-[#0F172A]">
              {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User"}
            </p>
            <p className="text-xs leading-none text-[#64748B]">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="px-1">
          <DropdownMenuLabel className="text-xs font-semibold px-2 py-2" style={{ color: FOREST_MID }}>
            Organizations
          </DropdownMenuLabel>

          {orgLoading ? (
            <div className="px-2 py-2 text-xs text-muted-foreground">Loading organizations...</div>
          ) : organizations.length > 0 ? (
            <div className="max-h-56 overflow-y-auto">
              {organizations.map((org) => {
                const isCurrent = org.id === currentOrganization?.id;
                const isSwitching = switchingOrg === org.id;
                return (
                  <DropdownMenuItem
                    key={org.id}
                    onClick={() => {
                      if (!isCurrent) handleSwitchOrganization(org.id);
                    }}
                    disabled={isCurrent || isSwitching}
                    className={`mx-1 my-0.5 rounded-md data-[disabled]:opacity-100 ${
                      isCurrent
                        ? "font-medium cursor-default"
                        : "cursor-pointer text-[#0F172A] hover:bg-[#F8FAF8]"
                    } ${isSwitching ? "opacity-50 cursor-wait" : ""}`}
                    style={
                      isCurrent
                        ? { backgroundColor: FOREST_SOFT_BG, color: FOREST }
                        : undefined
                    }
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Building2
                          className="h-4 w-4 flex-shrink-0"
                          style={{ color: isCurrent ? FOREST : "#64748B" }}
                        />
                        <span
                          className="truncate text-sm font-medium"
                          style={{ color: isCurrent ? FOREST : "#0F172A" }}
                        >
                          {org.name}
                        </span>
                        {isCurrent && (
                          <span className="text-xs ml-1 font-normal" style={{ color: FOREST_MID }}>
                            (Current)
                          </span>
                        )}
                      </div>
                      {isCurrent && (
                        <Check className="h-4 w-4 flex-shrink-0" style={{ color: FOREST }} />
                      )}
                      {isSwitching && (
                        <div
                          className="h-4 w-4 flex-shrink-0 border-2 border-t-transparent rounded-full animate-spin"
                          style={{ borderColor: FOREST, borderTopColor: "transparent" }}
                        />
                      )}
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </div>
          ) : (
            <div className="px-2 py-3 text-xs text-muted-foreground text-center">
              No organizations yet
            </div>
          )}

          <DropdownMenuItem
            onClick={handleCreateOrganization}
            className="cursor-pointer mx-1 mt-1 rounded-md text-[#0B3D2E] hover:bg-[#E8F3EF] hover:text-[#0B3D2E]"
          >
            <Plus className="mr-2 h-4 w-4" />
            <span className="text-sm font-medium">Create Organization</span>
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/dashboard" className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer mx-1 my-0.5 rounded-md">
            <div className="flex items-center">
              <Home className="mr-2 h-4 w-4" />
              <span>Dashboard sections</span>
            </div>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent side="right" className="w-64">
            <DropdownMenuItem
              onClick={() => navigate("/dashboard", { state: { activeSection: "overview" } })}
              className="cursor-pointer"
            >
              <Grid3X3 className="mr-2 h-4 w-4" />
              <span>Company Overview</span>
            </DropdownMenuItem>
            {userType === "financial_institution" ? (
              <>
                <DropdownMenuItem
                  onClick={() => navigate("/dashboard", { state: { activeSection: "projects" } })}
                  className="cursor-pointer"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  <span>My Projects</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("/dashboard", { state: { activeSection: "portfolio" } })}
                  className="cursor-pointer"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  <span>My Portfolio</span>
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem
                onClick={() => navigate("/dashboard", { state: { activeSection: "portfolio" } })}
                className="cursor-pointer"
              >
                <FileText className="mr-2 h-4 w-4" />
                <span>My Projects</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => navigate("/esg-management")} className="cursor-pointer">
              <Layers className="mr-2 h-4 w-4" />
              <span>ESG Management</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/esg-health-check")} className="cursor-pointer">
              <BarChart3 className="mr-2 h-4 w-4" />
              <span>ESG Assessment</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/emission-calculator")} className="cursor-pointer">
              <Factory className="mr-2 h-4 w-4" />
              <span>Emission Calculator</span>
            </DropdownMenuItem>
            {userType === "corporate" && (
              <DropdownMenuItem onClick={() => navigate("/asset-monitoring")} className="cursor-pointer">
                <Activity className="mr-2 h-4 w-4" />
                <span>Asset Monitoring</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => navigate("/supply-chain-intelligence")}
              className="cursor-pointer"
            >
              <Globe2 className="mr-2 h-4 w-4" />
              <span>Supply Chain intelligence</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/reports")} className="cursor-pointer">
              <BarChart3 className="mr-2 h-4 w-4" />
              <span>Reports &amp; Analytics</span>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuItem asChild>
          <Link to="/settings" className="cursor-pointer">
            <SettingsIcon className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 mx-1 my-0.5 rounded-md"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span className="text-sm">Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserAccountMenu;
