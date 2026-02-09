import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Compass, BarChart3, User, Settings as SettingsIcon, LogOut, FileText, Menu, X, Lock, ChevronDown, Building2, Check, Plus, Grid3X3, Factory } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useEffect, useState, useRef } from "react";
import { isCompanyUser, isRestrictedRoute } from "@/utils/roleUtils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

const navLinks = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/drafts", label: "Drafts", icon: FileText },
];

const AppHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const { currentOrganization, organizations, switchOrganization, loading: orgLoading, refreshOrganizations } = useOrganization();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [switchingOrg, setSwitchingOrg] = useState<string | null>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const [userType, setUserType] = useState<string>("financial_institution");
  const [isMobileDashboardOpen, setIsMobileDashboardOpen] = useState(false);

    const handleLogout = async () => {
    try {
      // Show loading toast
      toast({
        title: "Signing out...",
        description: "Please wait while we sign you out.",
      });
      
      // Clear all user-related localStorage items but preserve admin data
      const adminAuth = localStorage.getItem('adminAuthenticated');
      const adminLoginTime = localStorage.getItem('adminLoginTime');
      
      // Clear all localStorage
      localStorage.clear();
      
      // Restore admin data if it exists
      if (adminAuth) localStorage.setItem('adminAuthenticated', adminAuth);
      if (adminLoginTime) localStorage.setItem('adminLoginTime', adminLoginTime);
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Use the AuthContext signOut function
      await signOut();
      
      // Show success toast
      toast({
        title: "Signed out",
        description: "You've been signed out successfully.",
      });
      
      // Small delay to ensure toast is visible
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Force navigation directly to landing page
      window.location.href = "/";
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
      
      // Fallback: force redirect even if there's an error
      window.location.href = "/";
    }
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Load user type for dashboard section labels/routes
  useEffect(() => {
    const fetchUserType = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from("profiles")
          .select("user_type")
          .eq("user_id", user.id)
          .single();
        if (data?.user_type) {
          setUserType(data.user_type);
        }
      } catch (e) {
        console.warn("Failed to load user type for AppHeader:", e);
      }
    };
    fetchUserType();
  }, [user]);

  // Determine logo link destination based on user role
  const logoLink = isCompanyUser(user) ? "/dashboard" : "/explore";
  const locationState = location.state as any;
  const activeDashboardSection = locationState?.activeSection;

  const handleSwitchOrganization = async (orgId: string) => {
    if (orgId === currentOrganization?.id) return;
    
    setSwitchingOrg(orgId);
    try {
      await switchOrganization(orgId);
      toast({
        title: 'Organization switched',
        description: 'You have switched to a different organization.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to switch organization. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSwitchingOrg(null);
    }
  };

  const handleCreateOrganization = () => {
    navigate('/settings');
  };


  return (
    <header className="w-full bg-white shadow-sm py-4 px-4 md:px-8 flex items-center justify-between z-50 relative">
      {/* Logo */}
      <Link to={logoLink} className="h-10 md:h-14 flex items-center hover:opacity-80 transition-opacity">
        <img 
          src="/logoo.png"
          alt="ReThink Carbon Logo"
          className="h-10 md:h-14 w-auto object-contain"
        />
      </Link>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex gap-6 text-gray-600">
        <TooltipProvider>
          {navLinks.map(({ to, label, icon: Icon }) => {
            const isRestricted = isRestrictedRoute(to);
            const hasAccess = isCompanyUser(user);
            const isLocked = isRestricted && !hasAccess;

            const linkContent = (
              <div className={`flex items-center gap-1 transition-colors ${
                isLocked 
                  ? 'text-gray-400 cursor-not-allowed opacity-60' 
                  : location.pathname.startsWith(to) 
                    ? 'text-primary font-semibold' 
                    : 'hover:text-primary'
              }`}>
                <Icon className="h-5 w-5" />
                {label}
                {isLocked && <Lock className="h-4 w-4 ml-1" />}
              </div>
            );

            if (isLocked) {
              return (
                <Tooltip key={to}>
                  <TooltipTrigger asChild>
                    <div className="cursor-not-allowed">
                      {linkContent}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This feature is only available for company users</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-1"
              >
                {linkContent}
              </Link>
            );
          })}
        </TooltipProvider>
      </nav>

      {/* Desktop Profile Dropdown */}
      <div className="hidden md:flex items-center ml-6">
        <DropdownMenu onOpenChange={(open) => {
          if (!open && profileButtonRef.current) {
            // Blur the button when dropdown closes to remove focus ring
            profileButtonRef.current.blur();
          }
        }}>
          <DropdownMenuTrigger asChild>
            <button 
              ref={profileButtonRef}
              className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none"
            >
              <Avatar className="h-9 w-9 border-2 border-teal-500">
                <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.email || "User"} />
                <AvatarFallback className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-semibold">
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="h-4 w-4 text-gray-600" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="font-normal px-3 py-2.5">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User"}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* Organizations Section - Always Show */}
            <div className="px-1">
              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground px-2 py-2">
                Organizations
              </DropdownMenuLabel>
              
              {orgLoading ? (
                <div className="px-2 py-2 text-xs text-muted-foreground">
                  Loading organizations...
                </div>
              ) : organizations.length > 0 ? (
                <div className="max-h-56 overflow-y-auto">
                  {organizations.map((org) => {
                    const isCurrent = org.id === currentOrganization?.id;
                    const isSwitching = switchingOrg === org.id;
                    
                    return (
                      <DropdownMenuItem
                        key={org.id}
                        onClick={() => {
                          if (!isCurrent) {
                            handleSwitchOrganization(org.id);
                          }
                        }}
                        disabled={isCurrent || isSwitching}
                        className={`mx-1 my-0.5 rounded-md ${
                          isCurrent 
                            ? 'bg-primary/10 text-primary font-medium cursor-default opacity-100' 
                            : 'cursor-pointer hover:bg-accent'
                        } ${isSwitching ? 'opacity-50 cursor-wait' : ''}`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Building2 className={`h-4 w-4 flex-shrink-0 ${isCurrent ? 'text-primary' : ''}`} />
                            <span className="truncate text-sm font-medium">{org.name}</span>
                            {isCurrent && (
                              <span className="text-xs text-primary/70 ml-1 font-normal">(Current)</span>
                            )}
                          </div>
                          {isCurrent && (
                            <Check className="h-4 w-4 flex-shrink-0 text-primary" />
                          )}
                          {isSwitching && (
                            <div className="h-4 w-4 flex-shrink-0 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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
                className="cursor-pointer mx-1 mt-1 text-primary hover:bg-primary/10 rounded-md"
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
            {/* Dashboard sections quick access */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="cursor-pointer mx-1 my-0.5 rounded-md">
                <div className="flex items-center">
                  <Home className="mr-2 h-4 w-4" />
                  <span>Dashboard sections</span>
                </div>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-64">
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
                    <DropdownMenuItem
                      onClick={() => navigate("/project-wizard")}
                      className="cursor-pointer"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      <span>Start New Project</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate("/bank-portfolio")}
                      className="cursor-pointer"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      <span>Start New Portfolio</span>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem
                      onClick={() => navigate("/dashboard", { state: { activeSection: "portfolio" } })}
                      className="cursor-pointer"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      <span>My Projects</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate("/project-wizard")}
                      className="cursor-pointer"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      <span>Start New Project</span>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem
                  onClick={() => navigate("/reports")}
                  className="cursor-pointer"
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  <span>Reports &amp; Analytics</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("/esg-health-check")}
                  className="cursor-pointer"
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  <span>ESG Assessment</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("/emission-calculator")}
                  className="cursor-pointer"
                >
                  <Factory className="mr-2 h-4 w-4" />
                  <span>Emission Calculator</span>
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
      </div>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden p-2 text-gray-600 hover:text-primary transition-colors"
        aria-label="Toggle mobile menu"
      >
        {isMobileMenuOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </button>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Mobile Menu */}
      <div className={`md:hidden fixed top-0 right-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${
        isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Mobile Menu Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <span className="font-semibold text-gray-900">Menu</span>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 text-gray-600 hover:text-primary transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Mobile Navigation Links */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              <TooltipProvider>
                {navLinks.map(({ to, label, icon: Icon }) => {
                  const isRestricted = isRestrictedRoute(to);
                  const hasAccess = isCompanyUser(user);
                  const isLocked = isRestricted && !hasAccess;

                  // Special handling for Dashboard: show nested dashboard sections
                  if (to === "/dashboard") {
                    const isInDashboardGroup =
                      location.pathname === "/dashboard" ||
                      location.pathname === "/project-wizard" ||
                      location.pathname === "/bank-portfolio" ||
                      location.pathname === "/reports" ||
                      location.pathname === "/esg-health-check" ||
                      location.pathname === "/emission-calculator" ||
                      location.pathname === "/emission-calculator-uk" ||
                      location.pathname === "/emission-calculator-epa";

                    const isOverviewActive =
                      location.pathname === "/dashboard" &&
                      (!activeDashboardSection ||
                        activeDashboardSection === "overview");
                    const isProjectsActive =
                      location.pathname === "/dashboard" &&
                      activeDashboardSection === "projects";
                    const isPortfolioActive =
                      location.pathname === "/dashboard" &&
                      activeDashboardSection === "portfolio";
                    const isStartProjectActive = location.pathname === "/project-wizard";
                    const isStartPortfolioActive = location.pathname === "/bank-portfolio";
                    const isReportsActive = location.pathname === "/reports";
                    const isEsgActive =
                      location.pathname === "/esg-health-check";
                    const isEmissionsActive =
                      location.pathname === "/emission-calculator" ||
                      location.pathname === "/emission-calculator-uk" ||
                      location.pathname === "/emission-calculator-epa";

                    return (
                      <div key={to} className="space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            navigate("/dashboard");
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                            isInDashboardGroup
                              ? "bg-primary text-white"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                          <span>{label}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsMobileDashboardOpen((open) => !open);
                            }}
                            className="ml-auto text-inherit"
                            aria-label="Toggle dashboard sections"
                          >
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${
                                isMobileDashboardOpen ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                        </button>

                        {isMobileDashboardOpen && (
                          <div className="ml-8 space-y-1">
                            <button
                              type="button"
                              onClick={() => {
                                navigate("/dashboard", {
                                  state: { activeSection: "overview" },
                                });
                                setIsMobileMenuOpen(false);
                              }}
                              className={`flex items-center gap-3 w-full p-2 rounded-lg transition-colors text-sm ${
                                isOverviewActive
                                  ? "bg-primary text-white"
                                  : "text-gray-700 hover:bg-gray-100"
                              }`}
                            >
                              <Grid3X3 className="h-4 w-4" />
                              <span>Company Overview</span>
                            </button>
                            {userType === "financial_institution" ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigate("/dashboard", {
                                      state: { activeSection: "projects" },
                                    });
                                    setIsMobileMenuOpen(false);
                                  }}
                                  className={`flex items-center gap-3 w-full p-2 rounded-lg transition-colors text-sm ${
                                    isProjectsActive
                                      ? "bg-primary text-white"
                                      : "text-gray-700 hover:bg-gray-100"
                                  }`}
                                >
                                  <FileText className="h-4 w-4" />
                                  <span>My Projects</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigate("/dashboard", {
                                      state: { activeSection: "portfolio" },
                                    });
                                    setIsMobileMenuOpen(false);
                                  }}
                                  className={`flex items-center gap-3 w-full p-2 rounded-lg transition-colors text-sm ${
                                    isPortfolioActive
                                      ? "bg-primary text-white"
                                      : "text-gray-700 hover:bg-gray-100"
                                  }`}
                                >
                                  <FileText className="h-4 w-4" />
                                  <span>My Portfolio</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigate("/project-wizard");
                                    setIsMobileMenuOpen(false);
                                  }}
                                  className={`flex items-center gap-3 w-full p-2 rounded-lg transition-colors text-sm ${
                                    isStartProjectActive
                                      ? "bg-primary text-white"
                                      : "text-gray-700 hover:bg-gray-100"
                                  }`}
                                >
                                  <Plus className="h-4 w-4" />
                                  <span>Start New Project</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigate("/bank-portfolio");
                                    setIsMobileMenuOpen(false);
                                  }}
                                  className={`flex items-center gap-3 w-full p-2 rounded-lg transition-colors text-sm ${
                                    isStartPortfolioActive
                                      ? "bg-primary text-white"
                                      : "text-gray-700 hover:bg-gray-100"
                                  }`}
                                >
                                  <Plus className="h-4 w-4" />
                                  <span>Start New Portfolio</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigate("/dashboard", {
                                      state: { activeSection: "portfolio" },
                                    });
                                    setIsMobileMenuOpen(false);
                                  }}
                                  className={`flex items-center gap-3 w-full p-2 rounded-lg transition-colors text-sm ${
                                    isPortfolioActive
                                      ? "bg-primary text-white"
                                      : "text-gray-700 hover:bg-gray-100"
                                  }`}
                                >
                                  <FileText className="h-4 w-4" />
                                  <span>My Projects</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigate("/project-wizard");
                                    setIsMobileMenuOpen(false);
                                  }}
                                  className={`flex items-center gap-3 w-full p-2 rounded-lg transition-colors text-sm ${
                                    isStartProjectActive
                                      ? "bg-primary text-white"
                                      : "text-gray-700 hover:bg-gray-100"
                                  }`}
                                >
                                  <Plus className="h-4 w-4" />
                                  <span>Start New Project</span>
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                navigate("/reports");
                                setIsMobileMenuOpen(false);
                              }}
                              className={`flex items-center gap-3 w-full p-2 rounded-lg transition-colors text-sm ${
                                isReportsActive
                                  ? "bg-primary text-white"
                                  : "text-gray-700 hover:bg-gray-100"
                              }`}
                            >
                              <BarChart3 className="h-4 w-4" />
                              <span>Reports &amp; Analytics</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigate("/esg-health-check");
                                setIsMobileMenuOpen(false);
                              }}
                              className={`flex items-center gap-3 w-full p-2 rounded-lg transition-colors text-sm ${
                                isEsgActive
                                  ? "bg-primary text-white"
                                  : "text-gray-700 hover:bg-gray-100"
                              }`}
                            >
                              <BarChart3 className="h-4 w-4" />
                              <span>ESG Assessment</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigate("/emission-calculator");
                                setIsMobileMenuOpen(false);
                              }}
                              className={`flex items-center gap-3 w-full p-2 rounded-lg transition-colors text-sm ${
                                isEmissionsActive
                                  ? "bg-primary text-white"
                                  : "text-gray-700 hover:bg-gray-100"
                              }`}
                            >
                              <Factory className="h-4 w-4" />
                              <span>Emission Calculator</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  }

                  const linkContent = (
                    <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      isLocked
                        ? 'text-gray-400 cursor-not-allowed opacity-60 bg-gray-50'
                        : location.pathname.startsWith(to) 
                          ? 'bg-primary text-white' 
                          : 'text-gray-600 hover:bg-gray-100'
                    }`}>
                      <Icon className="h-5 w-5" />
                      {label}
                      {isLocked && <Lock className="h-4 w-4 ml-auto" />}
                    </div>
                  );

                  if (isLocked) {
                    return (
                      <Tooltip key={to}>
                        <TooltipTrigger asChild>
                          <div className="cursor-not-allowed">
                            {linkContent}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>This feature is only available for company users</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {linkContent}
                    </Link>
                  );
                })}
              </TooltipProvider>
            </div>
          </nav>

          {/* Mobile Profile Section */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
              <Avatar className="h-10 w-10 border-2 border-teal-500">
                <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.email || "User"} />
                <AvatarFallback className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-semibold">
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User"}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email}
                </p>
              </div>
            </div>

            <div className="mb-2 border-t border-gray-200 pt-2" />
            
            {/* Mobile Organizations Section */}
            {!orgLoading && organizations.length > 0 && (
              <>
                <div className="mb-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 mb-2">
                    Organizations
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {organizations.map((org) => {
                      const isCurrent = org.id === currentOrganization?.id;
                      const isSwitching = switchingOrg === org.id;
                      
                      return (
                        <button
                          key={org.id}
                          onClick={() => {
                            if (!isCurrent) {
                              handleSwitchOrganization(org.id);
                            }
                            setIsMobileMenuOpen(false);
                          }}
                          disabled={isCurrent || isSwitching}
                          className={`flex items-center justify-between w-full p-3 rounded-lg transition-colors mb-1 ${
                            isCurrent
                              ? 'bg-primary text-white'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <Building2 className="h-5 w-5 flex-shrink-0" />
                            <span className="truncate">{org.name}</span>
                          </div>
                          {isCurrent && (
                            <Check className="h-5 w-5 flex-shrink-0" />
                          )}
                          {isSwitching && (
                            <div className="h-5 w-5 flex-shrink-0 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => {
                      handleCreateOrganization();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 w-full p-3 text-primary hover:bg-primary/10 rounded-lg transition-colors mb-2"
                  >
                    <Plus className="h-5 w-5" />
                    Create Organization
                  </button>
                </div>
                <div className="mb-2 border-t border-gray-200 pt-2" />
              </>
            )}
            
            {!orgLoading && organizations.length === 0 && (
              <>
                <button
                  onClick={() => {
                    navigate('/settings');
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 w-full p-3 text-primary hover:bg-primary/10 rounded-lg transition-colors mb-2"
                >
                  <Plus className="h-5 w-5" />
                  Create Organization
                </button>
                <div className="mb-2 border-t border-gray-200 pt-2" />
              </>
            )}
            
            <Link
              to="/dashboard"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 w-full p-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors mb-2"
            >
              <User className="h-5 w-5" />
              Profile
            </Link>
            <Link
              to="/settings"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 w-full p-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors mb-2"
            >
              <SettingsIcon className="h-5 w-5" />
              Settings
            </Link>
            <button
              onClick={() => {
                handleLogout();
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center gap-3 w-full p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      </div>
      
    </header>
  );
};

export default AppHeader; 