import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { 
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Clock,
  CheckCircle, 
  AlertCircle, 
  Info, 
  Plus, 
  Minus,
  Download,
  Leaf,
  Users,
  Shield,
  Target,
  BarChart3,
  Sparkles,
  Award,
  Lightbulb,
  AlertTriangle,
  Activity,
  Zap,
  TrendingUp as TrendingUpIcon
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PDFDownload } from '../components/PDFDownload';
import { RadialBarChart, RadialBar, BarChart, Bar, XAxis, YAxis, Cell, PieChart, Pie, AreaChart, Area, CartesianGrid, ResponsiveContainer } from 'recharts';

// Animated Progress Bar Component
const ProgressBarWithAnimation = ({ value }: { value: number }) => {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    // Reset and animate to target value
    setAnimatedValue(0);
    const timer = setTimeout(() => {
      setAnimatedValue(value);
    }, 100);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-gradient-to-r from-teal-500 to-blue-600 transition-all duration-1000 ease-out"
        style={{ width: `${animatedValue}%` }}
      />
    </div>
  );
};

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

  const getScoreColorHex = (score: number) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    if (score >= 40) return '#F97316';
    return '#EF4444';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return { text: 'Excellent', color: 'bg-green-100 text-green-800' };
    if (score >= 60) return { text: 'Good', color: 'bg-yellow-100 text-yellow-800' };
    if (score >= 40) return { text: 'Fair', color: 'bg-orange-100 text-orange-800' };
    return { text: 'Needs Improvement', color: 'bg-red-100 text-red-800' };
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex items-center justify-center">
        {/* Decorative background elements */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-teal-200/20 to-blue-300/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-200/20 to-purple-300/20 rounded-full blur-3xl"></div>
        </div>
        
        <div className="text-center space-y-4 animate-in fade-in duration-500">
          {/* Simple Loading Spinner */}
          <div className="mx-auto w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
          
          {/* Loading Text */}
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-slate-800">
              Loading ESG Results
            </h3>
            <p className="text-slate-600 text-sm">Preparing your assessment data...</p>
          </div>
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

  // Prepare data for charts
  const overallScore = Math.round(assessment.scores.overall_score || 0);
  const envScore = Math.round(assessment.scores.environmental_total_score || 0);
  const socialScore = Math.round(assessment.scores.social_total_score || 0);
  const govScore = Math.round(assessment.scores.governance_total_score || 0);

  // Chart data for Shadcn UI ChartContainer
  const barChartData = [
    { category: 'Environmental', score: envScore, target: 80 },
    { category: 'Social', score: socialScore, target: 80 },
    { category: 'Governance', score: govScore, target: 80 },
  ];

  const pieChartData = [
    { name: 'Environmental', value: envScore, fill: '#10B981' },
    { name: 'Social', value: socialScore, fill: '#3B82F6' },
    { name: 'Governance', value: govScore, fill: '#8B5CF6' },
  ];

  const chartConfig = {
    score: {
      label: 'Score',
      color: '#10B981',
    },
    target: {
      label: 'Target',
      color: '#64748b',
    },
    environmental: {
      label: 'Environmental',
      color: '#10B981',
    },
    social: {
      label: 'Social',
      color: '#3B82F6',
    },
    governance: {
      label: 'Governance',
      color: '#8B5CF6',
    },
  };

  const radialData = [{ value: overallScore, fill: getScoreColorHex(overallScore) }];

  const esgCategories = [
    { 
      key: 'environmental', 
      label: 'Environmental', 
      icon: Leaf,
      color: '#10B981', 
      gradient: 'from-green-500 to-emerald-600',
      scoreKey: 'environmental_total_score', 
      strengthsKey: 'environmental_strengths', 
      improvementsKey: 'environmental_improvements' 
    },
    { 
      key: 'social', 
      label: 'Social', 
      icon: Users,
      color: '#3B82F6', 
      gradient: 'from-blue-500 to-indigo-600',
      scoreKey: 'social_total_score', 
      strengthsKey: 'social_strengths', 
      improvementsKey: 'social_improvements' 
    },
    { 
      key: 'governance', 
      label: 'Governance', 
      icon: Shield,
      color: '#8B5CF6', 
      gradient: 'from-purple-500 to-violet-600',
      scoreKey: 'governance_total_score', 
      strengthsKey: 'governance_strengths', 
      improvementsKey: 'governance_improvements' 
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Decorative background elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-teal-200/20 to-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-200/20 to-purple-300/20 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative z-10">
        {/* Page Header */}
        <div id="esg-results-container">
          <div className="space-y-2 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 shadow-lg animate-in zoom-in duration-500 delay-100">
                  <Award className="h-7 w-7 text-white" />
                </div>
              <div>
                  <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent animate-in fade-in slide-in-from-left-4 duration-500 delay-150">
                    ESG Assessment Results
                </h1>
                  <p className="text-slate-600 mt-1.5 font-medium animate-in fade-in slide-in-from-left-4 duration-500 delay-200">
                    Completed on {new Date(assessment.submitted_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                </p>
              </div>
              </div>
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="group border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all duration-300 ease-in-out hover:scale-105 active:scale-95 animate-in fade-in slide-in-from-right-4 duration-500 delay-200"
              >
                <ArrowLeft className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:-translate-x-1" />
                Back
              </Button>
            </div>
          </div>

          {/* Overall Score Card - Modern Design */}
          <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-50/50 via-transparent to-blue-50/50 pointer-events-none"></div>
            <CardHeader className="relative z-10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-teal-500 to-blue-600">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Overall ESG Score</CardTitle>
                  <CardDescription className="text-base mt-1">Your comprehensive ESG readiness assessment</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="grid gap-8 lg:grid-cols-2">
                {/* Overall Score - Clean Circular Display */}
                <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in duration-700 delay-400">
                  <div className="relative w-72 h-72 mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart 
                        innerRadius="75%" 
                        outerRadius="98%" 
                        data={radialData}
                        startAngle={90}
                        endAngle={-270}
                      >
                        <RadialBar 
                          dataKey="value" 
                          cornerRadius={12}
                          fill={getScoreColorHex(overallScore)}
                          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.08))' }}
                        />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <div className={`text-5xl font-bold ${getScoreColor(overallScore)} mb-1.5`}>
                        {overallScore}%
                      </div>
                      <Badge className={`text-xs px-3 py-1 ${getScoreBadge(overallScore).color} border-0`}>
                        {getScoreBadge(overallScore).text}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overall Performance</p>
                </div>

                {/* Individual Category Scores - Clean Progress Bars */}
                <div className="space-y-6 animate-in fade-in slide-in-from-right-6 duration-700 delay-500">
                  {barChartData.map((entry, index) => {
                    const categoryColors: { [key: string]: { color: string; icon: any } } = {
                      'Environmental': { color: '#10B981', icon: Leaf },
                      'Social': { color: '#3B82F6', icon: Users },
                      'Governance': { color: '#8B5CF6', icon: Shield }
                    };
                    const categoryInfo = categoryColors[entry.category] || { color: '#64748b', icon: Activity };
                    const Icon = categoryInfo.icon;
                    
                    return (
                      <div key={entry.category} className="space-y-2 animate-in fade-in slide-in-from-right-4 duration-500" style={{ animationDelay: `${600 + index * 100}ms` }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-md" style={{ backgroundColor: `${categoryInfo.color}15` }}>
                              <Icon className="h-4 w-4" style={{ color: categoryInfo.color }} />
                            </div>
                            <span className="text-sm font-semibold text-slate-700">{entry.category}</span>
                          </div>
                          <span className="text-sm font-bold text-slate-900">{entry.score}%</span>
                        </div>
                        <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{ 
                              width: `${entry.score}%`,
                              backgroundColor: categoryInfo.color
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* PDF Download & Recommendations */}
        <div className="grid gap-6 md:grid-cols-2 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-800">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
            <CardHeader className="animate-in fade-in slide-in-from-left-4 duration-500 delay-900">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-gradient-to-br from-teal-500 to-blue-600 animate-in zoom-in duration-500 delay-1000">
                  <Download className="h-5 w-5 text-white" />
                </div>
                Download Report
              </CardTitle>
              <CardDescription className="text-base">Get a detailed PDF report of your assessment</CardDescription>
            </CardHeader>
            <CardContent>
          <PDFDownload
            containerId="esg-results-container"
            fileName={`esg-assessment-${new Date().toISOString().split('T')[0]}`}
            companyName={userProfile?.organization_name || userProfile?.company_name || 'Your Organization'}
            assessmentDate={new Date(assessment.submitted_at).toLocaleDateString()}
            userName={userProfile?.full_name || userProfile?.display_name || user?.email || 'User'}
                overallScore={overallScore}
            overallRecommendations={assessment.scores.overall_recommendations || ''}
                environmentalScore={envScore}
                socialScore={socialScore}
                governanceScore={govScore}
            environmentalStrengths={assessment.scores.environmental_strengths || ''}
            environmentalImprovements={assessment.scores.environmental_improvements || ''}
            socialStrengths={assessment.scores.social_strengths || ''}
            socialImprovements={assessment.scores.social_improvements || ''}
            governanceStrengths={assessment.scores.governance_strengths || ''}
            governanceImprovements={assessment.scores.governance_improvements || ''}
          />
            </CardContent>
          </Card>

        {assessment.scores.overall_recommendations && (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50/50 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
              <CardHeader className="animate-in fade-in slide-in-from-right-4 duration-500 delay-900">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 animate-in zoom-in duration-500 delay-1000">
                    <Lightbulb className="h-5 w-5 text-white" />
                  </div>
                  Key Recommendations
              </CardTitle>
                <CardDescription className="text-base">Overall assessment insights</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-slate-700 leading-relaxed line-clamp-6 font-medium">
                  {assessment.scores.overall_recommendations}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        </div>

        {/* Detailed Analysis - Tabs Layout */}
        <Tabs defaultValue="environmental" className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-600">
          <Card className="p-1.5 bg-white border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500 delay-700">
            <TabsList className="grid w-full grid-cols-3 bg-transparent h-auto p-0 gap-1.5">
              {esgCategories.map((category, index) => {
                const Icon = category.icon;
                const categoryColors: { [key: string]: { active: string; inactive: string } } = {
                  'Environmental': { active: 'bg-green-50 text-green-700 border-green-200', inactive: 'text-slate-600 hover:bg-slate-50' },
                  'Social': { active: 'bg-blue-50 text-blue-700 border-blue-200', inactive: 'text-slate-600 hover:bg-slate-50' },
                  'Governance': { active: 'bg-purple-50 text-purple-700 border-purple-200', inactive: 'text-slate-600 hover:bg-slate-50' }
                };
                const colors = categoryColors[category.label] || { active: 'bg-slate-50 text-slate-700 border-slate-200', inactive: 'text-slate-600 hover:bg-slate-50' };
                
                return (
                  <TabsTrigger 
                    key={category.key} 
                    value={category.key}
                    className={cn(
                      "flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all duration-300 ease-in-out",
                      "data-[state=active]:shadow-sm data-[state=inactive]:border-transparent",
                      "hover:scale-[1.02] active:scale-[0.98]",
                      colors.active,
                      colors.inactive
                    )}
                    style={{ animationDelay: `${750 + index * 50}ms` }}
                  >
                    <Icon className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                    <span className="font-semibold">{category.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Card>

          {esgCategories.map((category) => {
            const Icon = category.icon;
            const score = Math.round(assessment.scores[category.scoreKey as keyof typeof assessment.scores] || 0);
            const strengths = assessment.scores[category.strengthsKey as keyof typeof assessment.scores] || '';
            const improvements = assessment.scores[category.improvementsKey as keyof typeof assessment.scores] || '';
              const badge = getScoreBadge(score);
              
              return (
              <TabsContent 
                key={category.key} 
                value={category.key} 
                className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300"
              >
                <Card className="transition-all duration-300 hover:shadow-lg">
                  <CardHeader className="animate-in fade-in slide-in-from-top-2 duration-300 delay-75">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 animate-in zoom-in duration-300 delay-100">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="animate-in fade-in slide-in-from-left-2 duration-300 delay-150">
                          <CardTitle>{category.label} Analysis</CardTitle>
                          <CardDescription>Detailed insights and recommendations</CardDescription>
                        </div>
                      </div>
                      <div className="text-right animate-in fade-in slide-in-from-right-2 duration-300 delay-150">
                        <div className={`text-3xl font-bold ${getScoreColor(score)} transition-all duration-300`}>
                          {score}%
                        </div>
                        <Badge className={`${badge.color} transition-all duration-300`}>
                        {badge.text}
                      </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                    {/* Strengths */}
                      <Card className="border-green-200 bg-green-50/50 transition-all duration-300 hover:shadow-md animate-in fade-in slide-in-from-left-2 duration-300 delay-200">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                        Strengths
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                      {strengths ? (
                            <div className="space-y-2">
                              {strengths.split('\n').filter(line => line.trim()).map((line, index) => (
                                <div 
                                  key={index} 
                                  className="flex items-start gap-2 text-sm animate-in fade-in slide-in-from-left-1 duration-200"
                                  style={{ animationDelay: `${300 + index * 30}ms` }}
                                >
                                  <div className="h-1.5 w-1.5 rounded-full bg-green-600 mt-1.5 flex-shrink-0" />
                                  <p className="text-muted-foreground leading-relaxed">{line.trim()}</p>
                                </div>
                          ))}
                        </div>
                      ) : (
                            <p className="text-sm text-muted-foreground italic">No strengths identified yet.</p>
                      )}
                        </CardContent>
                      </Card>

                      {/* Areas for Improvement */}
                      <Card className="border-orange-200 bg-orange-50/50 transition-all duration-300 hover:shadow-md animate-in fade-in slide-in-from-right-2 duration-300 delay-200">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Target className="h-4 w-4 text-orange-600" />
                        Areas for Improvement
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                      {improvements ? (
                            <div className="space-y-2">
                              {improvements.split('\n').filter(line => line.trim()).map((line, index) => (
                                <div 
                                  key={index} 
                                  className="flex items-start gap-2 text-sm animate-in fade-in slide-in-from-right-1 duration-200"
                                  style={{ animationDelay: `${300 + index * 30}ms` }}
                                >
                                  <div className="h-1.5 w-1.5 rounded-full bg-orange-600 mt-1.5 flex-shrink-0" />
                                  <p className="text-muted-foreground leading-relaxed">{line.trim()}</p>
                                </div>
                          ))}
                        </div>
                      ) : (
                            <p className="text-sm text-muted-foreground italic">No areas for improvement identified yet.</p>
                      )}
                        </CardContent>
                      </Card>
                    </div>

                    <Separator className="animate-in fade-in duration-300 delay-400" />

                    <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-500">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Performance Level</span>
                        <span className="text-muted-foreground">{score}%</span>
                      </div>
                      <ProgressBarWithAnimation value={score} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              );
            })}
        </Tabs>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-1000">
          <Button 
            onClick={() => navigate('/esg-health-check')}
            variant="outline"
            className="group flex-1 transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-md"
          >
            <Sparkles className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:rotate-12" />
            Update Assessment
          </Button>
          <Button 
            onClick={() => navigate('/dashboard')}
            className="group flex-1 transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-md"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ESGResults;
