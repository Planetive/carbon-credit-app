import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  Search, 
  FileText, 
  Clock, 
  CheckCircle, 
  Users, 
  TrendingUp,
  LogOut,
  Eye
} from 'lucide-react';
import { supabase, adminSupabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface Assessment {
  id: string;
  user_id: string;
  status: 'draft' | 'submitted';
  total_completion: number;
  environmental_completion: number;
  social_completion: number;
  governance_completion: number;
  created_at: string;
  submitted_at: string | null;
  updated_at?: string;
  // user_email?: string;
  user_display_name?: string;
  organization_name?: string;
  admin_status?: 'draft' | 'scored'; // Admin status: draft if no scores, scored if admin has given scores
  needs_update?: boolean; // True when scores exist but are older than latest assessment update
  scored_at?: string | null; // Latest scoring publish time
}

const AdminDashboard = () => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(''); 
  const [filterStatus, setFilterStatus] = useState<'all' | 'need_updates' | 'submitted' | 'drafts' | 'new'>('all');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { requireAuth, logout } = useAdminAuth();

  useEffect(() => {
    // Check if admin is authenticated
    if (!requireAuth()) {
      return;
    }

    fetchAssessments();
  }, [requireAuth]);

  const fetchAssessments = async () => {
    try {
      console.log('Fetching assessments...'); // Debug log
      
      // First, fetch all assessments using admin client to bypass RLS
      const { data: assessmentsData, error: assessmentsError } = await (adminSupabase as any)
        .from('esg_assessments')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Assessments query result:', { data: assessmentsData, error: assessmentsError }); // Debug log

      if (assessmentsError) {
        console.error('Assessments query error:', assessmentsError);
        toast({
          title: "Error",
          description: `Failed to fetch assessments: ${assessmentsError.message}`,
          variant: "destructive",
        });
        return;
      }

      if (!assessmentsData || assessmentsData.length === 0) {
        setAssessments([]);
        setLoading(false);
        return;
      }

      // Get unique user IDs from assessments
      const userIds = [...new Set(assessmentsData.map(a => a.user_id))];
      console.log('User IDs to fetch:', userIds); // Debug log

      // Fetch user profiles separately using admin client to bypass RLS
      const { data: profilesData, error: profilesError } = await (adminSupabase as any)
        .from('profiles')
        .select('user_id, display_name, organization_name')
        .in('user_id', userIds);

      // Fetch existing scores with timestamps to determine admin status and staleness
      const { data: scoresData, error: scoresError } = await (adminSupabase as any)
        .from('esg_scores')
        .select('assessment_id, scored_at')
        .in('assessment_id', assessmentsData.map(a => a.id));

      console.log('Scores query result:', { data: scoresData, error: scoresError }); // Debug log

      console.log('Profiles query result:', { data: profilesData, error: profilesError }); // Debug log
      console.log('User IDs requested:', userIds); // Debug log

      if (profilesError) {
        console.error('Profiles query error:', profilesError);
        console.log('Continuing without profile data due to RLS restrictions');
        // Continue with assessments but without profile data
        const transformedData = assessmentsData.map(assessment => ({
          ...assessment,
          // user_email: assessment.user_id, // Use user_id as email for now
          user_display_name: 'Unknown User',
          organization_name: 'Unknown Organization'
        }));
        setAssessments(transformedData);
        setLoading(false);
        return;
      }

      // Create a map of user_id to profile data
      const profileMap = new Map();
      if (profilesData) {
        profilesData.forEach(profile => {
          profileMap.set(profile.user_id, profile);
        });
      }

      // Create a map of assessment_id -> scored_at and a set of scored ids
      const scoredAtByAssessmentId = new Map<string, string | null>();
      const scoredAssessmentIds = new Set<string>();
      if (scoresData) {
        scoresData.forEach((score: any) => {
          scoredAssessmentIds.add(score.assessment_id);
          scoredAtByAssessmentId.set(score.assessment_id, score.scored_at || null);
        });
      }

      console.log('Profile map entries:', Array.from(profileMap.entries())); // Debug log
      console.log('Profile data found for user IDs:', profilesData?.map(p => p.user_id) || []); // Debug log
      console.log('Scored assessment IDs:', Array.from(scoredAssessmentIds)); // Debug log

      // Combine assessments with profile data and admin status
      const transformedData = assessmentsData.map((assessment: any) => {
        const profile = profileMap.get(assessment.user_id);
        const hasScores = scoredAssessmentIds.has(assessment.id);
        const scoredAt = scoredAtByAssessmentId.get(assessment.id) || null;
        const needsUpdate = hasScores && assessment.updated_at && scoredAt
          ? new Date(scoredAt).getTime() < new Date(assessment.updated_at).getTime()
          : false;
        console.log(`Assessment ${assessment.id}: user_id=${assessment.user_id}, profile found=${!!profile}, has scores=${hasScores}`); // Debug log
        return {
          ...assessment,
          // user_email: assessment.user_id, // Use user_id as email for now
          user_display_name: profile?.display_name || 'Unknown User',
          organization_name: profile?.organization_name || 'Unknown Organization',
          admin_status: (hasScores ? 'scored' : 'draft') as 'draft' | 'scored',
          needs_update: needsUpdate,
          scored_at: scoredAt
        };
      });

      console.log('Final transformed data:', transformedData); // Debug log
      console.log('Profile map:', profileMap); // Debug log
      setAssessments(transformedData);
    } catch (error) {
      console.error('Error fetching assessments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch assessments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const filteredAssessments = assessments.filter(assessment => {
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
        matchesStatus = assessment.admin_status === 'scored' && !assessment.scored_at; // scoring started, not published
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
    scored: assessments.filter(a => a.admin_status === 'scored').length,
    draft: assessments.filter(a => a.admin_status === 'draft').length,
    averageCompletion: assessments.length > 0 
      ? Math.round(assessments.reduce((sum, a) => sum + a.total_completion, 0) / assessments.length)
      : 0
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Header */}
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
                <p className="text-sm sm:text-base text-gray-600">Manage and score ESG assessments</p>
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

        {/* Stats Cards */}
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
                <div className="h-8 w-8 sm:h-10 sm:w-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Average completion</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.averageCompletion}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
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
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('all')}
                size="sm"
                className="flex-1 sm:flex-none"
              >
                All
              </Button>
              <Button
                variant={filterStatus === 'need_updates' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('need_updates')}
                size="sm"
                className="flex-1 sm:flex-none"
              >
                Need Updates
              </Button>
              <Button
                variant={filterStatus === 'submitted' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('submitted')}
                size="sm"
                className="flex-1 sm:flex-none"
              >
                Submitted
              </Button>
              <Button
                variant={filterStatus === 'drafts' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('drafts')}
                size="sm"
                className="flex-1 sm:flex-none"
              >
                Drafts
              </Button>
              <Button
                variant={filterStatus === 'new' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('new')}
                size="sm"
                className="flex-1 sm:flex-none"
              >
                New
              </Button>
            </div>
          </div>
        </div>

        {/* Unified List - respects selected filter */}
        <div className="space-y-3 sm:space-y-4">
          {filteredAssessments.length === 0 ? (
            <Card>
              <CardContent className="p-6 sm:p-8 text-center">
                <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">No assessments found</h3>
                <p className="text-sm sm:text-base text-gray-600">Try adjusting your search or changing the filter.</p>
              </CardContent>
            </Card>
          ) : (
            filteredAssessments.map((assessment) => (
              <Card key={assessment.id} className={`hover:shadow-md transition-shadow`}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{assessment.user_display_name}</h3>
                      <p className="text-sm text-gray-600">{assessment.organization_name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {assessment.needs_update ? `Last updated: ${new Date(assessment.updated_at || assessment.created_at).toLocaleString()}` : assessment.scored_at ? `Scored: ${new Date(assessment.scored_at).toLocaleString()}` : `Created: ${new Date(assessment.created_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {assessment.needs_update && <Badge className="bg-yellow-100 text-yellow-800">Needs Re-scoring</Badge>}
                      {!assessment.needs_update && assessment.scored_at && <Badge className="bg-green-100 text-green-800">Scored</Badge>}
                      {!assessment.scored_at && assessment.admin_status === 'scored' && <Badge className="bg-yellow-100 text-yellow-800">Draft</Badge>}
                      {!assessment.scored_at && assessment.admin_status === 'draft' && <Badge variant="secondary">New</Badge>}
                      <Button size="sm" className="bg-teal-600 hover:bg-teal-700" onClick={() => navigate(`/admin/score/${assessment.id}`)}>
                        {assessment.needs_update ? 'Re-score' : assessment.scored_at ? 'View' : assessment.admin_status === 'scored' ? 'Continue' : 'Score'}
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

export default AdminDashboard;
