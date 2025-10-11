import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { 
  ArrowLeft, 
  Download, 
  Search, 
  Filter, 
  Eye, 
  Share2,
  FileText,
  BarChart3,
  TrendingUp,
  Calendar,
  Users,
  Globe
} from "lucide-react";

const ProjectReports = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      if (!user) return;
      setLoading(true);
      setError(null);
      const { data, error } = await (supabase as any)
        .from("project_reports")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        setError("Failed to load reports");
        setReports([]);
      } else {
        setReports(data || []);
      }
      setLoading(false);
    };
    fetchReports();
  }, [user]);

  // Mock data for reports and analytics
  const analytics = {
    totalProjects: 12,
    activeProjects: 8,
    totalCredits: 425000,
    totalRevenue: 6750000,
    averageRoi: 18.5,
    successRate: 85,
    
    monthlyData: [
      { month: "Jan", credits: 15000, revenue: 225000 },
      { month: "Feb", credits: 18000, revenue: 270000 },
      { month: "Mar", credits: 22000, revenue: 330000 },
      { month: "Apr", credits: 25000, revenue: 375000 },
      { month: "May", credits: 28000, revenue: 420000 },
      { month: "Jun", credits: 32000, revenue: 480000 }
    ],
    
    projectTypes: [
      { type: "Forestry", count: 5, percentage: 42 },
      { type: "Renewable Energy", count: 3, percentage: 25 },
      { type: "Agriculture", count: 2, percentage: 17 },
      { type: "Waste Management", count: 2, percentage: 16 }
    ]
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
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <Button variant="ghost" size="sm" className="mr-4" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Reports & Analytics</h1>
              <p className="text-muted-foreground">Comprehensive project reports and performance analytics</p>
            </div>
          </div>
          
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            Generate New Report
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="reports" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="space-y-6">
            {/* Filters */}
            <Card>
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
                <div>Loading reports...</div>
              ) : error ? (
                <div className="text-red-500">{error}</div>
              ) : reports.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <CardTitle className="mb-2">No Reports Found</CardTitle>
                    <CardDescription className="mb-6">
                      You don't have any project reports yet.
                    </CardDescription>
                  </CardContent>
                </Card>
              ) : (
                reports.map((report) => (
                  <Card key={report.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <FileText className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{report.report_title}</h3>
                            <div className="text-sm text-muted-foreground">{report.report_type}</div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <Badge className={getStatusColor(report.report_format)}>{report.report_format}</Badge>
                          <span className="text-xs text-muted-foreground mt-1">{report.date ? new Date(report.date).toLocaleDateString() : "-"}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Globe className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Projects</p>
                      <p className="text-2xl font-bold">{analytics.totalProjects}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Active Projects</p>
                      <p className="text-2xl font-bold">{analytics.activeProjects}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Credits</p>
                      <p className="text-2xl font-bold">{analytics.totalCredits.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Average ROI</p>
                      <p className="text-2xl font-bold">{analytics.averageRoi}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Performance</CardTitle>
                  <CardDescription>Carbon credits and revenue over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
                    <div className="text-center text-muted-foreground">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                      <p>Line chart would be displayed here</p>
                      <p className="text-sm">Showing monthly credits and revenue</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Project Distribution</CardTitle>
                  <CardDescription>Portfolio breakdown by project type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.projectTypes.map((type, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-4 h-4 bg-primary rounded-full"></div>
                          <span className="font-medium">{type.type}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-muted-foreground">{type.count} projects</span>
                          <span className="font-semibold">{type.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Table */}
            <Card>
              <CardHeader>
                <CardTitle>Project Performance Summary</CardTitle>
                <CardDescription>Detailed performance metrics for all projects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Project</th>
                        <th className="text-left p-2">Type</th>
                        <th className="text-left p-2">Credits Issued</th>
                        <th className="text-left p-2">Revenue</th>
                        <th className="text-left p-2">ROI</th>
                        <th className="text-left p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="p-2">Forest Restoration Project</td>
                        <td className="p-2">Forestry</td>
                        <td className="p-2">15,000 tCO2e</td>
                        <td className="p-2">$225,000</td>
                        <td className="p-2 text-green-600">+22%</td>
                        <td className="p-2">
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2">Solar Farm Initiative</td>
                        <td className="p-2">Renewable</td>
                        <td className="p-2">25,000 tCO2e</td>
                        <td className="p-2">$375,000</td>
                        <td className="p-2 text-green-600">+18%</td>
                        <td className="p-2">
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2">Wetland Conservation</td>
                        <td className="p-2">Restoration</td>
                        <td className="p-2">8,500 tCO2e</td>
                        <td className="p-2">$127,500</td>
                        <td className="p-2 text-green-600">+15%</td>
                        <td className="p-2">
                          <Badge className="bg-yellow-100 text-yellow-800">Planning</Badge>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <span>Market Insights</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-800 mb-2">Positive Trend</h4>
                    <p className="text-sm text-green-700">
                      Carbon credit prices have increased by 15% this quarter, improving project profitability.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-2">Market Opportunity</h4>
                    <p className="text-sm text-blue-700">
                      Forestry projects show highest demand with 3x more buyers than supply.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h4 className="font-semibold text-yellow-800 mb-2">Regulatory Update</h4>
                    <p className="text-sm text-yellow-700">
                      New verification standards coming Q2 2025 may affect certification timelines.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span>Performance Insights</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Top Performing Projects</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Solar Farm Initiative</span>
                        <span className="text-green-600 font-semibold">+22% ROI</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Forest Restoration</span>
                        <span className="text-green-600 font-semibold">+18% ROI</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Wind Energy Project</span>
                        <span className="text-green-600 font-semibold">+16% ROI</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Improvement Areas</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Reduce project development timelines by 20%</li>
                      <li>• Improve verification success rate to 95%</li>
                      <li>• Increase community engagement scores</li>
                      <li>• Optimize operational cost management</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Strategic Recommendations</CardTitle>
                <CardDescription>Data-driven recommendations for portfolio optimization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Short-term Actions (1-3 months)</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2"></div>
                        <span>Focus on forestry projects due to high market demand</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2"></div>
                        <span>Accelerate solar farm project development</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2"></div>
                        <span>Negotiate long-term credit purchase agreements</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-3">Long-term Strategy (6-12 months)</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2"></div>
                        <span>Diversify into emerging markets (Asia-Pacific)</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2"></div>
                        <span>Develop nature-based solution expertise</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2"></div>
                        <span>Build strategic partnerships with technology providers</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProjectReports;