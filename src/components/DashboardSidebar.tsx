import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Grid3X3,
  FileText,
  Plus,
  BarChart3,
  Factory,
  ArrowRight,
  FolderOpen,
  Building2,
  Globe2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SidebarItem {
  id: string;
  title: string;
  icon: any;
  path: string | null;
  active?: boolean;
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

  useEffect(() => {
    const fetchUserType = async () => {
      if (!user) return;
      try {
        const { data } = (await (supabase as any)
          .from("profiles")
          .select("user_type")
          .eq("user_id", user.id)
          .single()) as { data: { user_type?: string } | null };
        if (data?.user_type) {
          setUserType(data.user_type);
        }
      } finally {
        setUserTypeResolved(true);
      }
    };
    fetchUserType();
  }, [user]);

  // Until profile is loaded, show corporate layout so corporate users don't see FI flash
  const effectiveUserType = userTypeResolved ? userType : "corporate";
  const sidebarItems: SidebarItem[] = effectiveUserType === 'financial_institution'
    ? [
        { id: 'overview', title: 'Company Overview', icon: Grid3X3, path: '/dashboard' },
        { id: 'projects', title: 'My Projects', icon: FolderOpen, path: '/dashboard' },
        { id: 'portfolio', title: 'My Portfolio', icon: Building2, path: '/dashboard' },
        { id: 'supply-chain-intel', title: 'Supply Chain intelligence', icon: Globe2, path: null },
        { id: 'start-project', title: 'Start New Project', icon: Plus, path: '/project-wizard' },
        { id: 'start-portfolio', title: 'Start New Portfolio', icon: Plus, path: '/bank-portfolio' },
        { id: 'reports', title: 'Reports & Analytics', icon: BarChart3, path: '/reports' },
        { id: 'esg', title: 'ESG Assessment', icon: BarChart3, path: '/esg-health-check' },
        { id: 'emissions', title: 'Emission Calculator', icon: Factory, path: '/emission-calculator' },
      ]
    : [
        { id: 'overview', title: 'Company Overview', icon: Grid3X3, path: '/dashboard' },
        { id: 'portfolio', title: 'My Projects', icon: FileText, path: '/dashboard' },
        { id: 'supply-chain-intel', title: 'Supply Chain intelligence', icon: Globe2, path: null },
        { id: 'start-project', title: 'Start New Project', icon: Plus, path: '/project-wizard' },
        { id: 'reports', title: 'Reports & Analytics', icon: BarChart3, path: '/reports' },
        { id: 'esg', title: 'ESG Assessment', icon: BarChart3, path: '/esg-health-check' },
        { id: 'emissions', title: 'Emission Calculator', icon: Factory, path: '/emission-calculator' },
      ];

  const handleSidebarClick = (item: SidebarItem) => {
    if (item.path) {
      if (item.id === 'portfolio' || item.id === 'projects') {
        navigate('/dashboard', { state: { activeSection: item.id } });
      } else if (item.id === 'overview') {
        navigate('/dashboard', { state: { activeSection: 'overview' } });
      } else {
        navigate(item.path);
      }
    } else if (onSectionChange) {
      onSectionChange(item.id);
    }
  };

  const isActive = (item: SidebarItem) => {
    if (item.id === 'start-project') {
      return location.pathname === '/project-wizard';
    }
    if (item.id === 'start-portfolio') {
      return location.pathname === '/bank-portfolio';
    }
    if (item.id === 'portfolio') {
      return location.pathname === '/dashboard' && activeSection === 'portfolio';
    }
    if (item.id === 'projects') {
      return location.pathname === '/dashboard' && activeSection === 'projects';
    }
    if (item.id === 'overview') {
      return location.pathname === '/dashboard' && (!activeSection || activeSection === 'overview');
    }
    if (item.id === 'emissions' && item.path) {
      return location.pathname === item.path || location.pathname === '/emission-calculator-uk' || location.pathname === '/emission-calculator-epa';
    }
    if (item.path && location.pathname === item.path) {
      return true;
    }
    return false;
  };

  return (
    <div className="w-72 bg-white border-r border-gray-200/60 shadow-xl flex flex-col">
      {/* Sidebar Navigation */}
      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        <nav className="space-y-2">
          {sidebarItems.map((item) => {
            const itemActive = isActive(item);
            return (
              <motion.button
                key={item.id}
                onClick={() => handleSidebarClick(item)}
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 relative overflow-hidden group ${
                  itemActive
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/30' 
                    : 'text-gray-700 hover:bg-white/60 hover:shadow-md'
                }`}
              >
                {itemActive && (
                  <motion.div
                    layoutId="activeSidebarItem"
                    className="absolute inset-0 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-xl"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <item.icon className={`h-5 w-5 relative z-10 ${itemActive ? 'text-white' : 'text-gray-600 group-hover:text-teal-600'}`} />
                <span className="relative z-10">{item.title}</span>
                {itemActive && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="ml-auto relative z-10"
                  >
                    <ArrowRight className="h-4 w-4 text-white" />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default DashboardSidebar;

