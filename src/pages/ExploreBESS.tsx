import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import React from "react";
import { Search, Battery, ArrowLeft, Zap, Building2, Database } from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";

interface BESSProject {
  Developer: string | null;
  "Project Name": string | null;
  Power: number | null;
  Energy: number | null;
}

// Normalize rows so both quoted and snake_case columns work
function normalizeBESSRow(row: any): BESSProject {
  return {
    Developer: row?.Developer ?? row?.developer ?? null,
    "Project Name": row?.["Project Name"] ?? row?.project_name ?? row?.project ?? null,
    Power: row?.Power ?? row?.power ?? null,
    Energy: row?.Energy ?? row?.energy ?? null,
  };
}

const ExploreBESS = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [projects, setProjects] = useState<BESSProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to fetch all BESS projects
  async function fetchAllBESSProjects() {
    const { data, error } = await supabase
      .from("bess")
      .select("*");

    if (error) throw error;
    return (data || []).map(normalizeBESSRow);
  }

  // Fetch projects on mount
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchAllBESSProjects()
      .then((allProjects) => {
        setProjects(allProjects);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching BESS projects:", err);
        setError("Failed to load BESS projects");
        setProjects([]);
        setLoading(false);
      });
  }, []);

  // Filter projects by search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const query = searchQuery.toLowerCase();
    return projects.filter((p) => {
      const name = String(p["Project Name"] || "").toLowerCase();
      const developer = String(p["Developer"] || "").toLowerCase();
      return name.includes(query) || developer.includes(query);
    });
  }, [projects, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = filteredProjects.length;
    const totalPower = filteredProjects.reduce((sum, p) => sum + (p.Power || 0), 0);
    const totalEnergy = filteredProjects.reduce((sum, p) => sum + (p.Energy || 0), 0);
    const uniqueDevelopers = new Set(filteredProjects.map(p => p.Developer).filter(Boolean)).size;

    return { total, totalPower, totalEnergy, uniqueDevelopers };
  }, [filteredProjects]);

  // Aggregate chart data
  const developerData = useMemo(() => {
    const developerMap = new Map<string, { count: number; totalPower: number; totalEnergy: number }>();
    
    filteredProjects.forEach((p) => {
      const developer = p.Developer || "Unknown";
      const current = developerMap.get(developer) || { count: 0, totalPower: 0, totalEnergy: 0 };
      developerMap.set(developer, {
        count: current.count + 1,
        totalPower: current.totalPower + (p.Power || 0),
        totalEnergy: current.totalEnergy + (p.Energy || 0),
      });
    });
    
    return Array.from(developerMap.entries())
      .map(([developer, data]) => ({
        developer,
        count: data.count,
        totalPower: data.totalPower,
        totalEnergy: data.totalEnergy,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 developers
  }, [filteredProjects]);

  const pieColors = [
    "#14b8a6", "#0d9488", "#10b981", "#059669", "#06b6d4", "#0891b2",
    "#22c55e", "#16a34a", "#34d399", "#2dd4bf", "#5eead4", "#6ee7b7",
    "#7dd3fc", "#a5f3fc", "#20bfa9", "#17817b", "#ffc658", "#ff8042"
  ];

  if (loading) {
    return <LoadingScreen message="Loading BESS Database" subMessage="Fetching Battery Energy Storage Systems data..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/20 flex items-center justify-center">
        <Card className="bg-white/90 backdrop-blur-sm border-red-200 shadow-xl p-8">
          <CardContent>
            <p className="text-red-600 text-lg">{error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/20">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-200/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 animate-in fade-in duration-500">
          <Button
            variant="ghost"
            onClick={() => navigate('/explore')}
            className="mb-6 text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 transition-all duration-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="mb-4">
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-cyan-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent mb-2">
              Battery Energy Storage Systems (BESS)
            </h1>
            <p className="text-gray-600 text-lg">Explore Battery Energy Storage Systems projects with detailed power and energy capacity information</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-cyan-200/50 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 animate-in fade-in" style={{ animationDelay: '0.1s' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Projects</p>
                  <p className="text-3xl font-bold text-cyan-600 transition-all duration-300">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center transition-transform duration-300 hover:scale-110">
                  <Database className="w-6 h-6 text-cyan-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-indigo-200/50 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 animate-in fade-in" style={{ animationDelay: '0.15s' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Power</p>
                  <p className="text-3xl font-bold text-indigo-600 transition-all duration-300">
                    {stats.totalPower >= 1000 ? `${(stats.totalPower / 1000).toFixed(1)} GW` : `${stats.totalPower.toLocaleString()} MW`}
                  </p>
                </div>
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center transition-transform duration-300 hover:scale-110">
                  <Zap className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-blue-200/50 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 animate-in fade-in" style={{ animationDelay: '0.2s' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Energy</p>
                  <p className="text-3xl font-bold text-blue-600 transition-all duration-300">
                    {stats.totalEnergy >= 1000 ? `${(stats.totalEnergy / 1000).toFixed(1)} GWh` : `${stats.totalEnergy.toLocaleString()} MWh`}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center transition-transform duration-300 hover:scale-110">
                  <Battery className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-purple-200/50 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 animate-in fade-in" style={{ animationDelay: '0.25s' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Developers</p>
                  <p className="text-3xl font-bold text-purple-600 transition-all duration-300">{stats.uniqueDevelopers}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center transition-transform duration-300 hover:scale-110">
                  <Building2 className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-6 bg-white/80 backdrop-blur-sm border-cyan-200/50 shadow-lg animate-in fade-in duration-500" style={{ animationDelay: '0.3s' }}>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 transition-colors duration-300" />
              <Input
                placeholder="Search projects by name or developer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-cyan-200 focus:border-cyan-400 transition-all duration-300 focus:ring-2 focus:ring-cyan-200"
              />
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Projects by Developer */}
          <Card className="bg-white/80 backdrop-blur-sm border-cyan-200/50 shadow-lg animate-in fade-in duration-500" style={{ animationDelay: '0.4s' }}>
            <CardHeader>
              <CardTitle className="text-lg">Top Developers by Project Count</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(350, developerData.length * 35)}>
                <BarChart data={developerData} layout="vertical" className="animate-in fade-in duration-500">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="developer"
                    type="category"
                    width={150}
                    tick={{ fontSize: 12, fill: "#666" }}
                    interval={0}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="#06b6d4" animationBegin={0} animationDuration={800} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Power Distribution by Developer */}
          <Card className="bg-white/80 backdrop-blur-sm border-indigo-200/50 shadow-lg animate-in fade-in duration-500" style={{ animationDelay: '0.5s' }}>
            <CardHeader>
              <CardTitle className="text-lg">Top Developers by Total Power (MW)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(350, developerData.length * 35)}>
                <BarChart data={developerData} layout="vertical" className="animate-in fade-in duration-500">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="developer"
                    type="category"
                    width={150}
                    tick={{ fontSize: 12, fill: "#666" }}
                    interval={0}
                  />
                  <Tooltip 
                    formatter={(value: number) => `${value.toLocaleString()} MW`}
                  />
                  <Bar dataKey="totalPower" fill="#6366f1" animationBegin={0} animationDuration={800} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Projects Table */}
        <Card className="mb-8 bg-white/80 backdrop-blur-sm border-cyan-200/50 shadow-lg animate-in fade-in duration-500" style={{ animationDelay: '0.6s' }}>
          <CardHeader>
            <CardTitle className="text-xl">BESS Projects</CardTitle>
            <Badge variant="outline" className="text-sm w-fit mt-2">
              {filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-3 font-semibold text-gray-700">Project Name</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Developer</th>
                    <th className="text-right p-3 font-semibold text-gray-700">Power (MW)</th>
                    <th className="text-right p-3 font-semibold text-gray-700">Energy (MWh)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center p-8 text-gray-500">
                        No projects found
                      </td>
                    </tr>
                  ) : (
                    filteredProjects.map((project, index) => (
                      <tr
                        key={index}
                        className="border-b border-gray-100 hover:bg-cyan-50/50 transition-colors"
                      >
                        <td className="p-3 text-gray-900 font-medium">
                          {project["Project Name"] || "N/A"}
                        </td>
                        <td className="p-3 text-gray-700">
                          {project.Developer || "N/A"}
                        </td>
                        <td className="p-3 text-right text-gray-700">
                          {project.Power ? project.Power.toLocaleString() : "N/A"}
                        </td>
                        <td className="p-3 text-right text-gray-700">
                          {project.Energy ? project.Energy.toLocaleString() : "N/A"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExploreBESS;
