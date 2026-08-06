import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Search,
  FileText,
  Clock,
  CheckCircle,
  TrendingUp,
  LogOut,
} from 'lucide-react';
import { adminSupabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAdminAuth } from '@/features/admin/hooks/useAdminAuth';
import {
  isAdminEsgApiEnabled,
  listAdminEsgAssessments,
} from '@/api/esg';
import { ESG_READINESS_ASSESSMENT_TYPE } from '@/features/esg-readiness/constants';

interface Assessment {
  id: string;
  user_id: string;
  status: 'draft' | 'submitted';
  total_completion: number;
  assessment_type: string;
  created_at: string;
  submitted_at: string | null;
  updated_at?: string;
  user_display_name?: string;
  organization_name?: string;
  admin_status?: 'draft' | 'scored';
  needs_update?: boolean;
  scored_at?: string | null;
}

const AdminDashboardScreen = () => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'need_updates' | 'submitted' | 'drafts' | 'new'>('all');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { requireAuth, logout } = useAdminAuth();

  useEffect(() => {
    if (!requireAuth()) {
      return;
    }
    fetchAssessments();
  }, [requireAuth]);

  const fetchAssessments = async () => {
    try {
      if (isAdminEsgApiEnabled()) {
        const rows = await listAdminEsgAssessments(ESG_READINESS_ASSESSMENT_TYPE, 500);
        const transformedData: Assessment[] = rows.map((row) => {
          const hasScores = !!row.has_score;
          const scoredAt = row.scored_at || null;
          const needsUpdate =
            hasScores && row.updated_at && scoredAt
              ? new Date(scoredAt).getTime() < new Date(row.updated_at).getTime()
              : false;
          return {
            id: row.id,
            user_id: row.user_id,
            status: (row.status as 'draft' | 'submitted') || 'draft',
            total_completion: Number(row.total_completion ?? 0),
            assessment_type: row.assessment_type,
            created_at: row.created_at || new Date().toISOString(),
            submitted_at: row.submitted_at ?? null,
            updated_at: row.updated_at || undefined,
            user_display_name: row.user_display_name || 'Unknown User',
            organization_name: row.organization_name || 'Unknown Organization',
            admin_status: (hasScores ? 'scored' : 'draft') as 'draft' | 'scored',
            needs_update: needsUpdate,
            scored_at: scoredAt,
          };
        });
        setAssessments(transformedData);
        return;
      }

      const { data: assessmentsData, error: assessmentsError } = await (adminSupabase as any)
        .from('esg_assessments')
        .select('id, user_id, status, total_completion, assessment_type, created_at, submitted_at, updated_at')
        .eq('assessment_type', ESG_READINESS_ASSESSMENT_TYPE)
        .order('created_at', { ascending: false });

      if (assessmentsError) {
        console.error('Assessments query error:', assessmentsError);
        toast({
          title: 'Error',
          description: `Failed to fetch assessments: ${assessmentsError.message}`,
          variant: 'destructive',
        });
        return;
      }

      if (!assessmentsData || assessmentsData.length === 0) {
        setAssessments([]);
        return;
      }

      const userIds = [...new Set(assessmentsData.map((a: any) => a.user_id))];

      const { data: profilesData, error: profilesError } = await (adminSupabase as any)
        .from('profiles')
        .select('user_id, display_name, organization_name')
        .in('user_id', userIds);

      const { data: scoresData } = await (adminSupabase as any)
        .from('esg_scores')
        .select('assessment_id, scored_at')
        .in('assessment_id', assessmentsData.map((a: any) => a.id));

      if (profilesError) {
        console.error('Profiles query error:', profilesError);
        setAssessments(
          assessmentsData.map((assessment: any) => ({
            ...assessment,
            user_display_name: 'Unknown User',
            organization_name: 'Unknown Organization',
          }))
        );
        return;
      }

      const profileMap = new Map();
      if (profilesData) {
        profilesData.forEach((profile: any) => {
          profileMap.set(profile.user_id, profile);
        });
      }

      const scoredAtByAssessmentId = new Map<string, string | null>();
      const scoredAssessmentIds = new Set<string>();
      if (scoresData) {
        scoresData.forEach((score: any) => {
          scoredAssessmentIds.add(score.assessment_id);
          scoredAtByAssessmentId.set(score.assessment_id, score.scored_at || null);
        });
      }

      setAssessments(
        assessmentsData.map((assessment: any) => {
          const profile = profileMap.get(assessment.user_id);
          const hasScores = scoredAssessmentIds.has(assessment.id);
          const scoredAt = scoredAtByAssessmentId.get(assessment.id) || null;
          const needsUpdate =
            hasScores && assessment.updated_at && scoredAt
              ? new Date(scoredAt).getTime() < new Date(assessment.updated_at).getTime()
              : false;
          return {
            ...assessment,
            user_display_name: profile?.display_name || 'Unknown User',
            organization_name: profile?.organization_name || 'Unknown Organization',
            admin_status: (hasScores ? 'scored' : 'draft') as 'draft' | 'scored',
            needs_update: needsUpdate,
            scored_at: scoredAt,
          };
        })
      );
    } catch (error) {
      console.error('Error fetching assessments:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch assessments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const filteredAssessments = assessments.filter((assessment) => {
    const matchesSearch =
      assessment.user_display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assessment.organization_name?.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesStatus = true;
    switch (filterStatus) {
      case 'need_updates':
        matchesStatus = !!assessment.needs_update;
        break;
      case 'submitted':
        matchesStatus = !!assessment.scored_at && !assessment.needs_update;
        break;
      case 'drafts':
        matchesStatus = assessment.admin_status === 'scored' && !assessment.scored_at;
        break;
      case 'new':
        matchesStatus = assessment.admin_status === 'draft' && !assessment.scored_at;
        break;
      default:
        matchesStatus = true;
    }

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: assessments.length,
    scored: assessments.filter((a) => a.admin_status === 'scored').length,
    draft: assessments.filter((a) => a.admin_status === 'draft').length,
    averageCompletion:
      assessments.length > 0
        ? Math.round(
            assessments.reduce((sum, a) => sum + a.total_completion, 0) / assessments.length
          )
        : 0,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1D9E75] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-4 sm:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                className="text-gray-600 hover:text-gray-900 w-full sm:w-auto"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Site
              </Button>
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">ESG Assessment Admin</h1>
                <p className="text-sm sm:text-base text-gray-600">
                  View ISSB readiness assessments (auto-scored on submit)
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="text-red-600 border-red-200 hover:bg-red-50 w-full sm:w-auto"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Total Assessments</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Scored</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.scored}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Drafts</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.draft}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2 lg:col-span-1">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 bg-[#EAF7F1] rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-[#1D9E75]" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Average completion</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.averageCompletion}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col space-y-4">
            <div className="flex-1 w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by name or organization..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['all', 'All'],
                  ['need_updates', 'Need Updates'],
                  ['submitted', 'Submitted'],
                  ['drafts', 'Drafts'],
                  ['new', 'New'],
                ] as const
              ).map(([key, label]) => (
                <Button
                  key={key}
                  variant={filterStatus === key ? 'default' : 'outline'}
                  onClick={() => setFilterStatus(key)}
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {filteredAssessments.length === 0 ? (
            <Card>
              <CardContent className="p-6 sm:p-8 text-center">
                <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                  No assessments found
                </h3>
                <p className="text-sm sm:text-base text-gray-600">
                  Try adjusting your search or changing the filter.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredAssessments.map((assessment) => (
              <Card key={assessment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{assessment.user_display_name}</h3>
                      <p className="text-sm text-gray-600">{assessment.organization_name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {assessment.needs_update
                          ? `Last updated: ${new Date(assessment.updated_at || assessment.created_at).toLocaleString()}`
                          : assessment.scored_at
                            ? `Scored: ${new Date(assessment.scored_at).toLocaleString()}`
                            : `Created: ${new Date(assessment.created_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {assessment.needs_update && (
                        <Badge className="bg-yellow-100 text-yellow-800">Needs Re-scoring</Badge>
                      )}
                      {!assessment.needs_update && assessment.scored_at && (
                        <Badge className="bg-green-100 text-green-800">Scored</Badge>
                      )}
                      {!assessment.scored_at && assessment.admin_status === 'scored' && (
                        <Badge className="bg-yellow-100 text-yellow-800">Draft</Badge>
                      )}
                      {!assessment.scored_at && assessment.admin_status === 'draft' && (
                        <Badge variant="secondary">New</Badge>
                      )}
                      <Button
                        size="sm"
                        className="bg-[#1D9E75] hover:bg-[#22B87E]"
                        onClick={() => navigate(`/admin/score/${assessment.id}`)}
                      >
                        {assessment.needs_update
                          ? 'Re-score'
                          : assessment.scored_at
                            ? 'View'
                            : assessment.admin_status === 'scored'
                              ? 'Continue'
                              : 'Score'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardScreen;
