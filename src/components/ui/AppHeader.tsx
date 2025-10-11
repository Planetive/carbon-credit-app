import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Compass, BarChart3, User, Settings as SettingsIcon, LogOut, FileText, Menu, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";

const navLinks = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/drafts", label: "Drafts", icon: FileText },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

const AppHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  return (
    <header className="w-full bg-white shadow-sm py-4 px-4 md:px-8 flex items-center justify-between z-50 relative">
      {/* Logo */}
      <Link to="/dashboard" className="h-10 md:h-14 flex items-center hover:opacity-80 transition-opacity">
        <img 
          src="/logoo.png"
          alt="ReThink Carbon Logo"
          className="h-10 md:h-14 w-auto object-contain"
        />
      </Link>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex gap-6 text-gray-600">
        {navLinks.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={`hover:text-primary flex items-center gap-1 transition-colors ${location.pathname.startsWith(to) ? 'text-primary font-semibold' : ''}`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Desktop Logout */}
      <button
        onClick={handleLogout}
        className="hidden md:flex items-center gap-1 text-gray-500 hover:text-red-500 font-semibold ml-6"
        title="Logout"
      >
        <LogOut className="h-5 w-5" /> Logout
      </button>

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
              {navLinks.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    location.pathname.startsWith(to) 
                      ? 'bg-primary text-white' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </Link>
              ))}
            </div>
          </nav>

          {/* Mobile Logout */}
          <div className="p-4 border-t border-gray-200">
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