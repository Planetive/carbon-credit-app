import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Download, 
  Search, 
  Eye, 
  Share2,
  FileText,
  BarChart3,
  TrendingUp,
  Plus,
} from "lucide-react";

const ProjectReports = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      if (!user) {
        setReports([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await (supabase as any)
          .from("project_reports")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (fetchError) setError(fetchError.message);
        else setReports(data ?? []);
      } catch (err) {
        console.warn("Could not load reports:", err);
        setReports([]);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [user]);

  const emptyStateConfig = (tab: "reports" | "analytics" | "insights") => {
    const configs = {
      reports: {
        icon: FileText,
        title: "No reports found",
        description: "You don't have any draft or published reports yet. Generate a report to see it here.",
      },
      analytics: {
        icon: BarChart3,
        title: "No analytics yet",
        description: "There's no analysis or performance data to show. Reports and project data will appear here once available.",
      },
      insights: {
        icon: TrendingUp,
        title: "No insights yet",
        description: "Insights and recommendations will appear here once you have reports and analytics data.",
      },
    };
    return configs[tab];
  };

  const EmptyState = ({ tab }: { tab: "reports" | "analytics" | "insights" }) => {
    const { icon: Icon, title, description } = emptyStateConfig(tab);
    return (
      <Card className="border border-teal-100 dark:border-teal-900/30 shadow-md bg-gradient-to-br from-white to-teal-50/30 dark:from-slate-900/50 dark:to-teal-950/20 overflow-hidden">
        <CardContent className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="rounded-2xl bg-teal-100/80 dark:bg-teal-900/30 p-7 mb-6 ring-4 ring-teal-50 dark:ring-teal-900/20">
            <Icon className="h-14 w-14 text-teal-600 dark:text-teal-400" strokeWidth={1.25} />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
          <p className="text-muted-foreground max-w-md leading-relaxed">{description}</p>
        </CardContent>
      </Card>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "published": return "bg-green-100 text-green-800";
      case "live": return "bg-blue-100 text-blue-800";
      case "draft": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.report_title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || report.report_type.toLowerCase().includes(filterType.toLowerCase());
    const matchesStatus = filterStatus === "all" || report.report_format.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <Button variant="ghost" size="sm" className="shrink-0 -ml-1" asChild>
              <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back to Dashboard
              </Link>
            </Button>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Reports & Analytics</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Comprehensive project reports and performance analytics</p>
            </div>
          </div>
          <Button
            onClick={() => navigate("/project-wizard")}
            className="bg-teal-600 hover:bg-teal-700 text-white shadow-md hover:shadow-lg transition-shadow shrink-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Generate New Report
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="reports" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-11 bg-muted/60 p-1 rounded-lg">
            <TabsTrigger value="reports" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-teal-700 data-[state=active]:font-medium">Reports</TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-teal-700 data-[state=active]:font-medium">Analytics</TabsTrigger>
            <TabsTrigger value="insights" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-teal-700 data-[state=active]:font-medium">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="space-y-6">
            {/* Filters */}
            <Card className="border-border/80 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search reports..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Report Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="quarterly">Quarterly Reports</SelectItem>
                      <SelectItem value="annual">Annual Reports</SelectItem>
                      <SelectItem value="feasibility">Feasibility Studies</SelectItem>
                      <SelectItem value="analytics">Analytics</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Reports List */}
            <div className="space-y-4">
              {loading ? (
                <Card className="border border-teal-100 dark:border-teal-900/30 shadow-sm">
                  <CardContent className="flex items-center justify-center py-16 text-muted-foreground">
                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-teal-500 border-t-transparent mr-2" />
                    Loading reports…
                  </CardContent>
                </Card>
              ) : filteredReports.length === 0 ? (
                <EmptyState tab="reports" />
              ) : (
                filteredReports.map((report) => (
                  <Card key={report.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <FileText className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{report.report_title}</h3>
                            <div className="text-sm text-muted-foreground">{report.report_type}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex flex-col items-end">
                            <Badge className={getStatusColor(report.report_format)}>{report.report_format}</Badge>
                            <span className="text-xs text-muted-foreground mt-1">
                              {report.date ? new Date(report.date).toLocaleDateString() : "-"}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Share2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <EmptyState tab="analytics" />
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <EmptyState tab="insights" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProjectReports;