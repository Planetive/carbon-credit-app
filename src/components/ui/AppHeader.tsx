import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Compass, BarChart3, User, Settings as SettingsIcon, LogOut, FileText, Menu, X, Lock, ChevronDown } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

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

  // Determine logo link destination based on user role
  const logoLink = isCompanyUser(user) ? "/dashboard" : "/explore";


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
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="font-normal">
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
            <DropdownMenuItem asChild>
              <Link to="/dashboard" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings" className="cursor-pointer">
                <SettingsIcon className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleLogout}
              className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
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