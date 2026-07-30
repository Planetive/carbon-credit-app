import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import {
  Download,
  Search,
  Eye,
  Share2,
  FileText,
  BarChart3,
  TrendingUp,
  Plus,
} from "lucide-react";

const ProjectReportsScreen = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      if (!user) {
        setReports([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data, error: fetchError } = await (supabase as any)
          .from("project_reports")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (fetchError) console.warn("Could not load reports:", fetchError.message);
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
        title: "No reports yet",
        description: "Generate a report to see drafts and published outputs listed here.",
      },
      analytics: {
        icon: BarChart3,
        title: "No analytics yet",
        description: "Performance charts will appear here once you have report and project data.",
      },
      insights: {
        icon: TrendingUp,
        title: "No insights yet",
        description: "Recommendations will appear here once you have reports and analytics data.",
      },
    };
    return configs[tab];
  };

  const EmptyState = ({ tab }: { tab: "reports" | "analytics" | "insights" }) => {
    const { icon: Icon, title, description } = emptyStateConfig(tab);
    return (
      <div className="flex flex-col items-center justify-center rounded-[18px] border border-[#E8EEF0] bg-white px-6 py-16 text-center shadow-[0_6px_20px_rgba(15,23,42,0.04)]">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[14px] bg-[#ECFDF3]">
          <Icon className="h-7 w-7 text-[#0F766E]" strokeWidth={1.5} />
        </div>
        <h3 className="text-lg font-semibold text-[#0F172A]">{title}</h3>
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-[#64748B]">{description}</p>
        {tab === "reports" ? (
          <Button
            onClick={() => navigate("/project-wizard")}
            className="mt-6 bg-[#1D9E75] hover:bg-[#0F6E56] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Generate report
          </Button>
        ) : null}
      </div>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "published":
        return "bg-green-100 text-green-800";
      case "live":
        return "bg-blue-100 text-blue-800";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredReports = reports.filter((report) => {
    const matchesSearch = report.report_title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      filterType === "all" || report.report_type.toLowerCase().includes(filterType.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || report.report_format.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="relative min-h-full overflow-hidden bg-[#F8FAF8]">
      <div
        className="pointer-events-none absolute right-0 top-0 h-[360px] w-[min(540px,45vw)] opacity-[0.12]"
        aria-hidden
        style={{
          background:
            "radial-gradient(65% 60% at 80% 20%, rgba(15,118,110,0.22) 0%, rgba(15,118,110,0.06) 40%, rgba(248,250,248,0) 72%)",
        }}
      />

      <div className="relative mx-auto max-w-[1280px] space-y-4 px-5 pb-10 pt-5 md:px-10 md:pt-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 max-w-2xl">
            <h1 className="text-[30px] font-bold leading-[36px] tracking-[-0.02em] text-[#0F172A]">
              Reports & Analytics
            </h1>
            <p className="mt-1 text-[13px] font-normal leading-[22px] text-[#475569]">
              Project reports and performance analytics in one place.
            </p>
          </div>
          <Button
            onClick={() => navigate("/project-wizard")}
            className="w-full shrink-0 bg-gradient-to-r from-[#1C7A53] to-[#1D9E75] text-white shadow-lg shadow-[0_10px_24px_-8px_rgba(29,158,117,0.35)] hover:from-[#0F6E56] hover:to-[#1C7A53] sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Generate report
          </Button>
        </header>

        <Tabs defaultValue="reports" className="space-y-4">
          <TabsList className="grid h-11 w-full grid-cols-3 rounded-xl bg-[#EEF2F2] p-1">
            <TabsTrigger
              value="reports"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#0F6E56] data-[state=active]:shadow-sm data-[state=active]:font-medium"
            >
              Reports
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#0F6E56] data-[state=active]:shadow-sm data-[state=active]:font-medium"
            >
              Analytics
            </TabsTrigger>
            <TabsTrigger
              value="insights"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#0F6E56] data-[state=active]:shadow-sm data-[state=active]:font-medium"
            >
              Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="space-y-5">
            <div className="rounded-[18px] border border-[#E8EEF0] bg-white p-4 shadow-[0_6px_20px_rgba(15,23,42,0.04)]">
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                  <Input
                    placeholder="Search reports..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border-[#E2E8F0] bg-[#F8FAFC] pl-10 focus-visible:ring-[#1D9E75]/30"
                  />
                </div>

                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full border-[#E2E8F0] bg-[#F8FAFC] md:w-48">
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
                  <SelectTrigger className="w-full border-[#E2E8F0] bg-[#F8FAFC] md:w-48">
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
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center rounded-[18px] border border-[#E8EEF0] bg-white py-16 text-[#64748B]">
                  <span className="mr-2 inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#1D9E75] border-t-transparent" />
                  Loading reports…
                </div>
              ) : filteredReports.length === 0 ? (
                <EmptyState tab="reports" />
              ) : (
                filteredReports.map((report) => (
                  <Card
                    key={report.id}
                    className="rounded-[18px] border border-[#E8EEF0] shadow-[0_6px_20px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-[0_10px_28px_rgba(15,23,42,0.08)]"
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex min-w-0 flex-1 items-center gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#ECFDF3]">
                            <FileText className="h-5 w-5 text-[#0F766E]" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate font-semibold text-[#0F172A]">
                              {report.report_title}
                            </h3>
                            <div className="text-sm text-[#64748B]">{report.report_type}</div>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <div className="hidden flex-col items-end sm:flex">
                            <Badge className={getStatusColor(report.report_format)}>
                              {report.report_format}
                            </Badge>
                            <span className="mt-1 text-xs text-[#94A3B8]">
                              {report.date ? new Date(report.date).toLocaleDateString() : "-"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="text-[#64748B]">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-[#64748B]">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-[#64748B]">
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

export default ProjectReportsScreen;
