import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, TrendingUp, TrendingDown, Clock,CheckCircle, AlertCircle, Info, Plus, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PDFDownload } from '../components/PDFDownload';

const ESGResults = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assessment, setAssessment] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        // Fetch assessment and profile first
        const [assessmentResult, profileResult] = await Promise.all([
          supabase
            .from('esg_assessments')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'submitted')
            .single(),
          supabase 
            .from('profiles' as any)
            .select('organization_name, display_name')
            .eq('user_id', user.id)
            .single()
        ]);

        if (assessmentResult.error) throw assessmentResult.error;

        // Fetch scores for the current assessment
        const scoresResult = await supabase
          .from('esg_scores')
          .select('*')
          .eq('assessment_id', assessmentResult.data.id)
          .single();

        const scoresData = scoresResult.data || null;

        // Consider scores valid only if scored_at >= assessment.updated_at
        let effectiveScores = scoresData;
        if (scoresData && assessmentResult.data?.updated_at && scoresData.scored_at) {
          const assessedUpdatedAt = new Date(assessmentResult.data.updated_at).getTime();
          const scoredAt = new Date(scoresData.scored_at).getTime();
          if (scoredAt < assessedUpdatedAt) {
            effectiveScores = null;
          }
        }

        setAssessment({
          ...assessmentResult.data,
          scores: effectiveScores
        });
        
        // Set user profile if available, otherwise set to null
        setUserProfile(profileResult.data || null);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return { text: 'Excellent', color: 'bg-green-100 text-green-800' };
    if (score >= 60) return { text: 'Good', color: 'bg-yellow-100 text-yellow-800' };
    if (score >= 40) return { text: 'Fair', color: 'bg-orange-100 text-orange-800' };
    return { text: 'Needs Improvement', color: 'bg-red-100 text-red-800' };
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your ESG results...</p>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Assessment Found</h2>
          <p className="text-gray-600 mb-4">You haven't completed an ESG assessment yet.</p>
          <Button onClick={() => navigate('/esg-health-check')}>
            Start ESG Assessment
          </Button>
        </div>
      </div>
    );
  }

  // Check if assessment has been scored by admin or scores are stale
  if (!assessment.scores) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Assessment Under Review</h2>
          <p className="text-gray-600 mb-4">Your ESG assessment has been submitted and is currently being reviewed by our team.</p>
          <p className="text-sm text-gray-500">You will receive your results once the review is complete.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  ESG Readiness Score
                </h1>
                <p className="text-gray-600">
                  Completed on {new Date(assessment.submitted_at).toLocaleDateString()}
                </p>
              </div>
              <div className="mt-4 md:mt-0">
                <Badge className="bg-green-100 text-green-800 text-lg px-4 py-2">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Assessment Complete
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* PDF Download Section */}
        <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">
            Download Your Results
          </h2>
          <PDFDownload
            containerId="esg-results-container"
            fileName={`esg-assessment-${new Date().toISOString().split('T')[0]}`}
            companyName={userProfile?.organization_name || userProfile?.company_name || 'Your Organization'}
            assessmentDate={new Date(assessment.submitted_at).toLocaleDateString()}
            userName={userProfile?.full_name || userProfile?.display_name || user?.email || 'User'}
            overallScore={Math.round(assessment.scores.overall_score || 0)}
            overallRecommendations={assessment.scores.overall_recommendations || ''}
            environmentalScore={Math.round(assessment.scores.environmental_total_score || 0)}
            socialScore={Math.round(assessment.scores.social_total_score || 0)}
            governanceScore={Math.round(assessment.scores.governance_total_score || 0)}
            environmentalStrengths={assessment.scores.environmental_strengths || ''}
            environmentalImprovements={assessment.scores.environmental_improvements || ''}
            socialStrengths={assessment.scores.social_strengths || ''}
            socialImprovements={assessment.scores.social_improvements || ''}
            governanceStrengths={assessment.scores.governance_strengths || ''}
            governanceImprovements={assessment.scores.governance_improvements || ''}
          />
        </div>

        {/* Overall Score */}
        <div id="esg-results-container">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-teal-600" />
                Overall ESG Readiness Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className={`text-6xl font-bold mb-4 ${getScoreColor(assessment.scores.overall_score || 0)}`}>
                  {Math.round(assessment.scores.overall_score || 0)}%
                </div>
                <Badge className={`text-lg px-4 py-2 ${getScoreBadge(assessment.scores.overall_score || 0).color}`}>
                  {getScoreBadge(assessment.scores.overall_score || 0).text}
                </Badge>
              </div>
            </CardContent>
          </Card>
        {/* Overall Recommendations */}
        {assessment.scores.overall_recommendations && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-teal-600" />
                Overall Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-gray-700 whitespace-pre-line">
                  {assessment.scores.overall_recommendations}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

          {/* Detailed Analysis Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Left Side - Individual Scores */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Individual Scores</h2>
            {[
              { key: 'environmental', label: 'Environmental', color: '#10B981', scoreKey: 'environmental_total_score' },
              { key: 'social', label: 'Social', color: '#3B82F6', scoreKey: 'social_total_score' },
              { key: 'governance', label: 'Governance', color: '#8B5CF6', scoreKey: 'governance_total_score' }
            ].map((section) => {
              const score = assessment.scores[section.scoreKey as keyof typeof assessment.scores] || 0;
              const badge = getScoreBadge(score);
              
              return (
                <Card key={section.key} className="shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <div 
                        className="w-4 h-4 rounded-full mr-2" 
                        style={{ backgroundColor: section.color }}
                      ></div>
                      {section.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center mb-4">
                      <div className={`text-3xl font-bold mb-2 ${getScoreColor(score)}`}>
                        {Math.round(score)}%
                      </div>
                      <Badge className={badge.color}>
                        {badge.text}
                      </Badge>
                    </div>
                    <Progress value={score} className="mb-4" />
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Right Side - Strengths and Weaknesses */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Analysis</h2>
            {[
              { key: 'environmental', label: 'Environmental', color: '#10B981', scoreKey: 'environmental_total_score', strengthsKey: 'environmental_strengths', improvementsKey: 'environmental_improvements' },
              { key: 'social', label: 'Social', color: '#3B82F6', scoreKey: 'social_total_score', strengthsKey: 'social_strengths', improvementsKey: 'social_improvements' },
              { key: 'governance', label: 'Governance', color: '#8B5CF6', scoreKey: 'governance_total_score', strengthsKey: 'governance_strengths', improvementsKey: 'governance_improvements' }
            ].map((section) => {
              const score = assessment.scores[section.scoreKey as keyof typeof assessment.scores] || 0;
              const strengths = assessment.scores[section.strengthsKey as keyof typeof assessment.scores] || '';
              const improvements = assessment.scores[section.improvementsKey as keyof typeof assessment.scores] || '';
              
              return (
                <Card key={section.key} className="shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <div 
                        className="w-4 h-4 rounded-full mr-2" 
                        style={{ backgroundColor: section.color }}
                      ></div>
                      {section.label} Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Strengths */}
                    <div>
                      <h4 className="font-semibold text-sm text-gray-700 mb-2 flex items-center">
                        <Plus className="h-4 w-4 text-green-600 mr-2" />
                        Strengths
                      </h4>
                      {strengths ? (
                        <div className="text-sm text-gray-600 bg-green-50 p-3 rounded-lg">
                          {strengths.split('\n').map((line, index) => (
                            <p key={index} className="mb-1 last:mb-0">{line}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No strengths identified yet.</p>
                      )}
                    </div>

                    {/* Weaknesses */}
                    <div>
                      <h4 className="font-semibold text-sm text-gray-700 mb-2 flex items-center">
                        <Minus className="h-4 w-4 text-red-600 mr-2" />
                        Areas for Improvement
                      </h4>
                      {improvements ? (
                        <div className="text-sm text-gray-600 bg-red-50 p-3 rounded-lg">
                          {improvements.split('\n').map((line, index) => (
                            <p key={index} className="mb-1 last:mb-0">{line}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No areas for improvement identified yet.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>



        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            onClick={() => navigate('/esg-health-check')}
            variant="outline"
            className="flex-1 sm:flex-none"
          >
            Update Assessment
          </Button>
          <Button 
            onClick={() => navigate('/dashboard')}
            className="flex-1 sm:flex-none"
          >
            Back to Dashboard
          </Button>
        </div>
        </div>
      </div>
    </div>
  );
};

export default ESGResults;
