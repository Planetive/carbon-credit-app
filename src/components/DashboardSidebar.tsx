import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Grid3X3,
  FileText,
  Plus,
  BarChart3,
  Factory,
  ArrowRight
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

  useEffect(() => {
    const fetchUserType = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("user_id", user.id)
        .single();
      if (data?.user_type) {
        setUserType(data.user_type);
      }
    };
    fetchUserType();
  }, [user]);

  const sidebarItems: SidebarItem[] = [
    {
      id: 'overview',
      title: 'Company Overview',
      icon: Grid3X3,
      path: '/dashboard'
    },
    {
      id: 'portfolio',
      title: userType === 'corporate' ? 'My Projects' : 'My Portfolio',
      icon: FileText,
      path: '/dashboard'
    },
    {
      id: 'start-project',
      title: userType === 'corporate' ? 'Start New Project' : 'Start New Portfolio',
      icon: Plus,
      path: userType === 'corporate' ? '/project-wizard' : '/bank-portfolio'
    },
    {
      id: 'reports',
      title: 'Reports & Analytics',
      icon: BarChart3,
      path: '/reports'
    },
    {
      id: 'esg',
      title: 'ESG Assessment',
      icon: BarChart3,
      path: '/esg-health-check'
    },
    {
      id: 'emissions',
      title: 'Emission Calculator',
      icon: Factory,
      path: '/emission-calculator'
    },
  ];

  const handleSidebarClick = (item: SidebarItem) => {
    if (item.path) {
      if (item.id === 'portfolio') {
        navigate('/dashboard', { state: { activeSection: 'portfolio' } });
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
    // Start Project/Portfolio is only active when on its specific path
    if (item.id === 'start-project') {
      return location.pathname === '/bank-portfolio' || location.pathname === '/project-wizard';
    }
    
    // Portfolio is only active when activeSection is 'portfolio' AND we're on dashboard
    if (item.id === 'portfolio') {
      return location.pathname === '/dashboard' && activeSection === 'portfolio';
    }
    
    // Overview is only active when on dashboard and activeSection is 'overview' or not set
    if (item.id === 'overview') {
      return location.pathname === '/dashboard' && (!activeSection || activeSection === 'overview');
    }
    
    // Emission Calculator is active on choice page or either version (UK/EPA)
    if (item.id === 'emissions' && item.path) {
      return location.pathname === item.path || location.pathname === '/emission-calculator-uk' || location.pathname === '/emission-calculator-epa';
    }

    // Other items are active when pathname matches their path
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

