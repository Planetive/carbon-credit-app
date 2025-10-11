import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Save, 
  CheckCircle, 
  AlertCircle,
  Leaf,
  Users,
  Shield,
  Star,
  StarOff
} from 'lucide-react';
import { supabase, adminSupabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface AssessmentData {
  id: string;
  user_id: string;
  status: 'draft' | 'submitted';
  // Environmental fields
  ghg_baseline: string | null;
  ghg_emissions: string | null;
  air_pollutants: string | null;
  ghg_reduction_initiatives: string | null;
  energy_visibility: string | null;
  total_energy_used: string | null;
  energy_grid: string | null;
  energy_renewable: string | null;
  energy_diesel: string | null;
  energy_gas: string | null;
  water_withdrawal: string | null;
  water_reclaimed: string | null;
  waste_type: string | null;
  waste_quantity: string | null;
  waste_treated: string | null;
  environmental_policy: string | null;
  waste_management_policy: string | null;
  energy_management_policy: string | null;
  water_management_policy: string | null;
  recycling_policy: string | null;
  board_climate_oversight: string | null;
  management_climate_oversight: string | null;
  sustainable_sourcing: string | null;
  // Social fields
  median_male_compensation: string | null;
  median_female_compensation: string | null;
  ceo_pay_ratio: string | null;
  ceo_pay_ratio_reporting: string | null;
  full_time_turnover: string | null;
  part_time_turnover: string | null;
  consultants_turnover: string | null;
  diversity_inclusion_policy: string | null;
  total_headcount: string | null;
  men_headcount: string | null;
  women_headcount: string | null;
  men_entry_mid_level: string | null;
  women_entry_mid_level: string | null;
  men_senior_executive: string | null;
  women_senior_executive: string | null;
  differently_abled_workforce: string | null;
  temporary_workers: string | null;
  consultants: string | null;
  anti_harassment_policy: string | null;
  harassment_cases_reported: string | null;
  harassment_cases_resolved: string | null;
  grievance_mechanism: string | null;
  grievance_cases_reported: string | null;
  grievance_cases_resolved: string | null;
  health_safety_policy: string | null;
  hse_management_system: string | null;
  fatalities: string | null;
  ltis: string | null;
  safety_accidents: string | null;
  production_loss: string | null;
  trir: string | null;
  child_forced_labor_policy: string | null;
  human_rights_policy: string | null;
  personnel_trained: string | null;
  women_promoted: string | null;
  men_promoted: string | null;
  csr_percentage: string | null;
  responsible_marketing_policy: string | null;
  // Governance fields
  total_board_members: string | null;
  independent_board_members: string | null;
  men_board_members: string | null;
  women_board_members: string | null;
  board_governance_committees: string | null;
  men_committee_chairs: string | null;
  women_committee_chairs: string | null;
  ceo_board_prohibition: string | null;
  esg_certified_board_members: string | null;
  esg_incentivization: string | null;
  workers_union: string | null;
  supplier_code_of_conduct: string | null;
  supplier_compliance_percentage: string | null;
  un_sdgs_focus: string | null;
  sustainability_report: string | null;
  sustainability_reporting_framework: string | null;
  sustainability_regulatory_filing: string | null;
  sustainability_third_party_assurance: string | null;
  ethics_anti_corruption_policy: string | null;
  policy_regular_review: string | null;
  data_privacy_policy: string | null;
  created_at: string;
  submitted_at: string | null;
  // user_email?: string;
  user_display_name?: string;
  organization_name?: string;
}

interface ScoringData {
  e_q1_score: number | null;
  e_q2_score: number | null;
  e_q3_score: number | null;
  e_q4_score: number | null;
  e_q5_score: number | null;
  e_q6_score: number | null;
  e_q7_score: number | null;
  s_q1_score: number | null;
  s_q2_score: number | null;
  s_q3_score: number | null;
  s_q4_score: number | null;
  s_q5_score: number | null;
  s_q6_score: number | null;
  s_q7_score: number | null;
  s_q8_score: number | null;
  s_q9_score: number | null;
  s_q10_score: number | null;
  s_q11_score: number | null;
  s_q12_score: number | null;
  g_q1_score: number | null;
  g_q2_score: number | null;
  g_q3_score: number | null;
  g_q4_score: number | null;
  g_q5_score: number | null;
  g_q6_score: number | null;
  g_q7_score: number | null;
  environmental_total_score: number | null;
  social_total_score: number | null;
  governance_total_score: number | null;
  overall_score: number | null;
  environmental_strengths: string | null;
  environmental_improvements: string | null;
  social_strengths: string | null;
  social_improvements: string | null;
  governance_strengths: string | null;
  governance_improvements: string | null;
  overall_recommendations: string | null;
}

const AdminScoring = () => {
  console.log('🔍 AdminScoring Component Rendered'); // Debug render tracking
  
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { requireAuth, isAuthenticated, isLoading } = useAdminAuth();
  
  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const [scoring, setScoring] = useState<ScoringData>({
    e_q1_score: null, e_q2_score: null, e_q3_score: null, e_q4_score: null,
    e_q5_score: null, e_q6_score: null, e_q7_score: null,
    s_q1_score: null, s_q2_score: null, s_q3_score: null, s_q4_score: null,
    s_q5_score: null, s_q6_score: null, s_q7_score: null, s_q8_score: null,
    s_q9_score: null, s_q10_score: null, s_q11_score: null, s_q12_score: null,
    g_q1_score: null, g_q2_score: null, g_q3_score: null, g_q4_score: null,
    g_q5_score: null, g_q6_score: null, g_q7_score: null,
    environmental_total_score: null, social_total_score: null, governance_total_score: null, overall_score: null,
    environmental_strengths: null, environmental_improvements: null,
    social_strengths: null, social_improvements: null,
    governance_strengths: null, governance_improvements: null,
    overall_recommendations: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Only proceed if authenticated and not loading
    if (isLoading) return;
    
    if (!isAuthenticated) {
      requireAuth();
      return;
    }

    if (assessmentId) {
      fetchAssessment();
      fetchExistingScores();
    }
  }, [assessmentId, isAuthenticated, isLoading]); // Only depend on these values

  const fetchAssessment = async () => {
    try {
      console.log('Fetching assessment with ID:', assessmentId); // Debug log
      
      // First fetch the assessment using admin client to bypass RLS
      const { data: assessmentData, error: assessmentError } = await (adminSupabase as any)
        .from('esg_assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();

      console.log('Assessment query result:', { data: assessmentData, error: assessmentError }); // Debug log

      if (assessmentError) {
        console.error('Assessment query error:', assessmentError);
        toast({
          title: "Error",
          description: `Failed to fetch assessment: ${assessmentError.message}`,
          variant: "destructive",
        });
        return;
      }

      if (!assessmentData) {
        toast({
          title: "Error",
          description: "Assessment not found",
          variant: "destructive",
        });
        return;
      }

                         // Fetch user profile separately using admin client to bypass RLS
            const { data: profileData, error: profileError } = await (adminSupabase as any)
              .from('profiles')
              .select('*')
              .eq('user_id', assessmentData.user_id)
              .single();

       console.log('Profile query result:', { data: profileData, error: profileError }); // Debug log
       console.log('Attempting to fetch profile for user_id:', assessmentData.user_id); // Debug log

       // Set assessment with profile data
       setAssessment({
         ...assessmentData,
        //  user_email: assessmentData.user_id, // Use user_id as email for now
         user_display_name: (profileData as any)?.display_name || 'Unknown User',
         organization_name: (profileData as any)?.organization_name || 'Unknown Organization'
       });
    } catch (error) {
      console.error('Error fetching assessment:', error);
      toast({
        title: "Error",
        description: "Failed to fetch assessment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingScores = async () => {
    try {
      const { data, error } = await (adminSupabase as any)
        .from('esg_scores')
        .select('*')
        .eq('assessment_id', assessmentId)
        .single();

      if (data && !error) {
        // Use type assertion to handle potential type mismatches
        setScoring(data as any);
      }
    } catch (error) {
      // No existing scores found, which is fine
    }
  };

  const handleScoreChange = useCallback((questionKey: keyof ScoringData, value: number | string) => {
    console.log('🔍 Score Change:', { questionKey, value });
    setScoring(prev => {
      const newScoring = {
        ...prev,
        [questionKey]: value
      };
      console.log('🔍 New Scoring State:', newScoring);
      return newScoring;
    });
  }, []); // No dependencies needed

  const calculateSectionScore = (section: 'e' | 's' | 'g') => {
    let totalWeightedScore = 0;
    
    if (section === 'e') {
      // Environmental: 30% weightage, 7 questions
      // Question percentages: [5, 4, 4, 4, 4, 5, 4] = [0.05, 0.04, 0.04, 0.04, 0.04, 0.05, 0.04]
      const questionPercentages = [0.05, 0.04, 0.04, 0.04, 0.04, 0.05, 0.04];
      
      for (let i = 1; i <= 7; i++) {
        const scoreKey = `e_q${i}_score` as keyof ScoringData;
        const score = scoring[scoreKey];
        const questionPercentage = questionPercentages[i - 1];
        
        if (score !== null && score !== undefined) {
          // Multiply admin score with question percentage
          totalWeightedScore += (score as number) * questionPercentage;
        }
      }
      // Final E percentage = total weighted score / (30% × 3)
      return totalWeightedScore / (0.30 * 3);
    } else if (section === 's') {
      // Social: 35% weightage, 12 questions
      // Question percentages: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2] = [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.02]
      const questionPercentages = [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.02];
      
      for (let i = 1; i <= 12; i++) {
        const scoreKey = `s_q${i}_score` as keyof ScoringData;
        const score = scoring[scoreKey];
        const questionPercentage = questionPercentages[i - 1];
        
        if (score !== null && score !== undefined) {
          // Multiply admin score with question percentage
          totalWeightedScore += (score as number) * questionPercentage;
        }
      }
      // Final S percentage = total weighted score / (35% × 3)
      return totalWeightedScore / (0.35 * 3);
    } else {
      // Governance: 35% weightage, 7 questions
      // Question percentages: [5, 5, 5, 5, 5, 5, 5] = [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05]
      const questionPercentages = [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05];
      
      for (let i = 1; i <= 7; i++) {
        const scoreKey = `g_q${i}_score` as keyof ScoringData;
        const score = scoring[scoreKey];
        const questionPercentage = questionPercentages[i - 1];
        
        if (score !== null && score !== undefined) {
          // Multiply admin score with question percentage
          totalWeightedScore += (score as number) * questionPercentage;
        }
      }
      // Final G percentage = total weighted score / (35% × 3)
      return totalWeightedScore / (0.35 * 3);
    }
  };

  const calculateOverallScore = () => {
    const eScore = calculateSectionScore('e');
    const sScore = calculateSectionScore('s');
    const gScore = calculateSectionScore('g');
    
    // Overall score = E (30%) + S (35%) + G (35%)
    // Since each section score is already a percentage, we multiply by the section weightage
    return (eScore * 0.30) + (sScore * 0.35) + (gScore * 0.35);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const environmentalTotalScore = calculateSectionScore('e');
      const socialTotalScore = calculateSectionScore('s');
      const governanceTotalScore = calculateSectionScore('g');
      const overallScore = calculateOverallScore();

      const scoreData = {
        ...scoring,
        user_id: assessment?.user_id,
        assessment_id: assessmentId,
        environmental_total_score: environmentalTotalScore * 100,
        social_total_score: socialTotalScore * 100,
        governance_total_score: governanceTotalScore * 100,
        overall_score: overallScore * 100,
        scored_by: 'Admin', // You can make this dynamic
        scored_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await (adminSupabase as any)
        .from('esg_scores')
        .upsert(scoreData, { onConflict: 'assessment_id' });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Scores saved successfully",
      });
    } catch (error) {
      console.error('Error saving scores:', error);
      toast({
        title: "Error",
        description: "Failed to save scores",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const environmentalTotalScore = calculateSectionScore('e');
      const socialTotalScore = calculateSectionScore('s');
      const governanceTotalScore = calculateSectionScore('g');
      const overallScore = calculateOverallScore();

      const scoreData = {
        ...scoring,
        user_id: assessment?.user_id,
        assessment_id: assessmentId,
        environmental_total_score: environmentalTotalScore ? environmentalTotalScore * 100 : null,
        social_total_score: socialTotalScore ? socialTotalScore * 100 : null,
        governance_total_score: governanceTotalScore ? governanceTotalScore * 100 : null,
        overall_score: overallScore ? overallScore * 100 : null,
        scored_by: 'Admin',
        // Explicitly set to null to avoid DB default NOW() marking as submitted
        scored_at: null,
        updated_at: new Date().toISOString()
      };

      const { error } = await (adminSupabase as any)
        .from('esg_scores')
        .upsert(scoreData, { onConflict: 'assessment_id' });

      if (error) throw error;

      toast({
        title: "Draft saved",
        description: "Your scoring progress has been saved (not visible to user).",
      });
    } catch (error) {
      console.error('Error saving draft scores:', error);
      toast({
        title: "Error",
        description: "Failed to save draft scores",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const renderScoreInput = (questionKey: keyof ScoringData, label: string) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <Select
        value={scoring[questionKey]?.toString() || ''}
        onValueChange={(value) => handleScoreChange(questionKey, parseInt(value))}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select score (1-3)" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">1 - Poor</SelectItem>
          <SelectItem value="2">2 - Fair</SelectItem>
          <SelectItem value="3">3 - Good</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const renderQuestionWithScore = (questionKey: keyof ScoringData, question: string, responses: Record<string, string | null>) => (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 mb-3">{question}</h4>
          
          {/* Display all sub-questions and responses */}
          <div className="space-y-3">
            {Object.entries(responses).map(([fieldName, response]) => (
              <div key={fieldName} className="bg-gray-50 rounded p-3">
                <h5 className="text-sm font-medium text-gray-800 mb-1 capitalize">
                  {fieldName.replace(/_/g, ' ')}
                </h5>
                <p className="text-sm text-gray-700">
                  {response || 'No response provided'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
      {renderScoreInput(questionKey, 'Score')}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Assessment Not Found</h2>
          <p className="text-gray-600 mb-4">The requested assessment could not be found.</p>
          <p className="text-sm text-gray-500 mb-4">Assessment ID: {assessmentId}</p>
          <Button onClick={() => navigate('/admin/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/admin/dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Score Assessment</h1>
                <p className="text-gray-600">
                  {assessment.user_display_name} - {assessment.organization_name}
                </p>
                {/* <p className="text-sm text-gray-500">{assessment.user_email}</p> */}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Draft'}
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save & Publish'}
              </Button>
            </div>
          </div>


          {/* Assessment Info */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <Badge className={assessment.status === 'submitted' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                    {assessment.status === 'submitted' ? 'Submitted' : 'Draft'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="font-medium">{new Date(assessment.created_at).toLocaleDateString()}</p>
                </div>
                {assessment.submitted_at && (
                  <div>
                    <p className="text-sm text-gray-600">Submitted</p>
                    <p className="font-medium">{new Date(assessment.submitted_at).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scoring Interface */}
        <Tabs defaultValue="environmental" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="environmental" className="flex items-center space-x-2">
              <Leaf className="h-4 w-4" />
              <span>Environmental</span>
            </TabsTrigger>
            <TabsTrigger value="social" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Social</span>
            </TabsTrigger>
            <TabsTrigger value="governance" className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Governance</span>
            </TabsTrigger>
          </TabsList>

                     <TabsContent value="environmental" className="space-y-6">
             <Card>
               <CardHeader>
                 <CardTitle>Environmental Section Scoring</CardTitle>
               </CardHeader>
               <CardContent className="space-y-6">
                 {renderQuestionWithScore('e_q1_score', 'Q1: GHG Emissions', {
                   'ghg_baseline': assessment.ghg_baseline,
                   'ghg_emissions': assessment.ghg_emissions,
                   'air_pollutants': assessment.air_pollutants,
                   'ghg_reduction_initiatives': assessment.ghg_reduction_initiatives
                 })}
                 {renderQuestionWithScore('e_q2_score', 'Q2: Energy Efficiency', {
                   'energy_visibility': assessment.energy_visibility,
                   'total_energy_used': assessment.total_energy_used,
                   'energy_grid': assessment.energy_grid,
                   'energy_renewable': assessment.energy_renewable,
                   'energy_diesel': assessment.energy_diesel,
                   'energy_gas': assessment.energy_gas
                 })}
                 {renderQuestionWithScore('e_q3_score', 'Q3: Water Management', {
                   'water_withdrawal': assessment.water_withdrawal,
                   'water_reclaimed': assessment.water_reclaimed
                 })}
                 {renderQuestionWithScore('e_q4_score', 'Q4: Waste Management', {
                   'waste_type': assessment.waste_type,
                   'waste_quantity': assessment.waste_quantity,
                   'waste_treated': assessment.waste_treated
                 })}
                 {renderQuestionWithScore('e_q5_score', 'Q5: Environmental Policies', {
                   'environmental_policy': assessment.environmental_policy,
                   'waste_management_policy': assessment.waste_management_policy,
                   'energy_management_policy': assessment.energy_management_policy,
                   'water_management_policy': assessment.water_management_policy,
                   'recycling_policy': assessment.recycling_policy
                 })}
                 {renderQuestionWithScore('e_q6_score', 'Q6: Environmental Oversight', {
                   'board_climate_oversight': assessment.board_climate_oversight,
                   'management_climate_oversight': assessment.management_climate_oversight
                 })}
                 {renderQuestionWithScore('e_q7_score', 'Q7: Sustainable Sourcing', {
                   'sustainable_sourcing': assessment.sustainable_sourcing
                 })}
                
                <div className="border-t pt-6 space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Environmental Strengths</Label>
                    <Textarea
                      value={scoring.environmental_strengths || ''}
                      onChange={(e) => handleScoreChange('environmental_strengths', e.target.value)}
                      placeholder="Enter key strengths in environmental practices..."
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Areas for Improvement</Label>
                    <Textarea
                      value={scoring.environmental_improvements || ''}
                      onChange={(e) => handleScoreChange('environmental_improvements', e.target.value)}
                      placeholder="Enter areas that need improvement..."
                      className="mt-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

                     <TabsContent value="social" className="space-y-6">
             <Card>
               <CardHeader>
                 <CardTitle>Social Section Scoring</CardTitle>
               </CardHeader>
               <CardContent className="space-y-6">
                 {renderQuestionWithScore('s_q1_score', 'Q1: Pay Ratios', {
                   'median_male_compensation': assessment.median_male_compensation,
                   'median_female_compensation': assessment.median_female_compensation
                 })}
                 {renderQuestionWithScore('s_q2_score', 'Q2: CEO Pay Ratio', {
                   'ceo_pay_ratio': assessment.ceo_pay_ratio,
                   'ceo_pay_ratio_reporting': assessment.ceo_pay_ratio_reporting
                 })}
                 {renderQuestionWithScore('s_q3_score', 'Q3: Turnover', {
                   'full_time_turnover': assessment.full_time_turnover,
                   'part_time_turnover': assessment.part_time_turnover,
                   'consultants_turnover': assessment.consultants_turnover
                 })}
                 {renderQuestionWithScore('s_q4_score', 'Q4: Gender Diversity and Inclusion', {
                   'diversity_inclusion_policy': assessment.diversity_inclusion_policy,
                   'total_headcount': assessment.total_headcount,
                   'men_headcount': assessment.men_headcount,
                   'women_headcount': assessment.women_headcount,
                   'men_entry_mid_level': assessment.men_entry_mid_level,
                   'women_entry_mid_level': assessment.women_entry_mid_level,
                   'men_senior_executive': assessment.men_senior_executive,
                   'women_senior_executive': assessment.women_senior_executive,
                   'differently_abled_workforce': assessment.differently_abled_workforce
                 })}
                 {renderQuestionWithScore('s_q5_score', 'Q5: Temporary Workers Ratio', {
                   'temporary_workers': assessment.temporary_workers,
                   'consultants': assessment.consultants
                 })}
                 {renderQuestionWithScore('s_q6_score', 'Q6: Harassment, Discrimination and Grievance', {
                   'anti_harassment_policy': assessment.anti_harassment_policy,
                   'harassment_cases_reported': assessment.harassment_cases_reported,
                   'harassment_cases_resolved': assessment.harassment_cases_resolved,
                   'grievance_mechanism': assessment.grievance_mechanism,
                   'grievance_cases_reported': assessment.grievance_cases_reported,
                   'grievance_cases_resolved': assessment.grievance_cases_resolved
                 })}
                 {renderQuestionWithScore('s_q7_score', 'Q7: Health and Safety', {
                   'health_safety_policy': assessment.health_safety_policy,
                   'hse_management_system': assessment.hse_management_system,
                   'fatalities': assessment.fatalities,
                   'ltis': assessment.ltis,
                   'safety_accidents': assessment.safety_accidents,
                   'production_loss': assessment.production_loss,
                   'trir': assessment.trir
                 })}
                 {renderQuestionWithScore('s_q8_score', 'Q8: Child and Forced Labor', {
                   'child_forced_labor_policy': assessment.child_forced_labor_policy
                 })}
                 {renderQuestionWithScore('s_q9_score', 'Q9: Human Rights', {
                   'human_rights_policy': assessment.human_rights_policy
                 })}
                 {renderQuestionWithScore('s_q10_score', 'Q10: Employee Training and Succession Planning', {
                   'personnel_trained': assessment.personnel_trained,
                   'women_promoted': assessment.women_promoted,
                   'men_promoted': assessment.men_promoted
                 })}
                 {renderQuestionWithScore('s_q11_score', 'Q11: CSR', {
                   'csr_percentage': assessment.csr_percentage
                 })}
                 {renderQuestionWithScore('s_q12_score', 'Q12: Marketing', {
                   'responsible_marketing_policy': assessment.responsible_marketing_policy
                 })}
                
                <div className="border-t pt-6 space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Social Strengths</Label>
                    <Textarea
                      value={scoring.social_strengths || ''}
                      onChange={(e) => handleScoreChange('social_strengths', e.target.value)}
                      placeholder="Enter key strengths in social practices..."
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Areas for Improvement</Label>
                    <Textarea
                      value={scoring.social_improvements || ''}
                      onChange={(e) => handleScoreChange('social_improvements', e.target.value)}
                      placeholder="Enter areas that need improvement..."
                      className="mt-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

                     <TabsContent value="governance" className="space-y-6">
             <Card>
               <CardHeader>
                 <CardTitle>Governance Section Scoring</CardTitle>
               </CardHeader>
               <CardContent className="space-y-6">
                 {renderQuestionWithScore('g_q1_score', 'Q1: Board Diversification, Independence and Competence', {
                   'total_board_members': assessment.total_board_members,
                   'independent_board_members': assessment.independent_board_members,
                   'men_board_members': assessment.men_board_members,
                   'women_board_members': assessment.women_board_members,
                   'board_governance_committees': assessment.board_governance_committees,
                   'men_committee_chairs': assessment.men_committee_chairs,
                   'women_committee_chairs': assessment.women_committee_chairs,
                   'ceo_board_prohibition': assessment.ceo_board_prohibition,
                   'esg_certified_board_members': assessment.esg_certified_board_members
                 })}
                 {renderQuestionWithScore('g_q2_score', 'Q2: ESG Performance Incentivization', {
                   'esg_incentivization': assessment.esg_incentivization
                 })}
                 {renderQuestionWithScore('g_q3_score', 'Q3: Voice of Employees', {
                   'workers_union': assessment.workers_union
                 })}
                 {renderQuestionWithScore('g_q4_score', 'Q4: Supplier Code of Conduct', {
                   'supplier_code_of_conduct': assessment.supplier_code_of_conduct,
                   'supplier_compliance_percentage': assessment.supplier_compliance_percentage
                 })}
                 {renderQuestionWithScore('g_q5_score', 'Q5: Sustainability Disclosures', {
                   'un_sdgs_focus': assessment.un_sdgs_focus,
                   'sustainability_report': assessment.sustainability_report,
                   'sustainability_reporting_framework': assessment.sustainability_reporting_framework,
                   'sustainability_regulatory_filing': assessment.sustainability_regulatory_filing,
                   'sustainability_third_party_assurance': assessment.sustainability_third_party_assurance
                 })}
                 {renderQuestionWithScore('g_q6_score', 'Q6: Ethics and Anti-Corruption Governance', {
                   'ethics_anti_corruption_policy': assessment.ethics_anti_corruption_policy,
                   'policy_regular_review': assessment.policy_regular_review
                 })}
                 {renderQuestionWithScore('g_q7_score', 'Q7: Data Privacy', {
                   'data_privacy_policy': assessment.data_privacy_policy
                 })}
                
                <div className="border-t pt-6 space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Governance Strengths</Label>
                    <Textarea
                      value={scoring.governance_strengths || ''}
                      onChange={(e) => handleScoreChange('governance_strengths', e.target.value)}
                      placeholder="Enter key strengths in governance practices..."
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Areas for Improvement</Label>
                    <Textarea
                      value={scoring.governance_improvements || ''}
                      onChange={(e) => handleScoreChange('governance_improvements', e.target.value)}
                      placeholder="Enter areas that need improvement..."
                      className="mt-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Overall Recommendations */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Overall Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={scoring.overall_recommendations || ''}
              onChange={(e) => handleScoreChange('overall_recommendations', e.target.value)}
              placeholder="Enter overall recommendations and next steps..."
              className="min-h-[120px]"
            />
          </CardContent>
        </Card>
 
        <div className="flex justify-end mt-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save & Publish'}
          </Button>
        </div>
        </div>
      </div>
    </div>
  );
};

export default AdminScoring;
