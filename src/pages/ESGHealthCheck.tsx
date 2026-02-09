import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Leaf, Users, Shield, CheckCircle, Clock, TrendingUp, ChevronDown, ChevronUp, Save, FileText, Info, CheckCircle2, Circle, Sparkles, Target, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { calculateESGScore, type ESGAssessmentData } from "@/utils/esgScoringEngine";


interface ESGData {
  environmental: {
    // GHG Emissions
    ghgBaseline: string;
    ghgEmissions: string;
    airPollutants: string;
    ghgReductionInitiatives: string;
    
    // Energy Efficiency
    energyVisibility: string;
    totalEnergyUsed: string;
    energyGrid: string;
    energyRenewable: string;
    energyDiesel: string;
    energyGas: string;
    
    // Water Management
    waterWithdrawal: string;
    waterReclaimed: string;
    
    // Waste Management
    wasteType: string;
    wasteQuantity: string;
    wasteTreated: string;
    
    // Environmental Operations
    environmentalPolicy: string;
    wasteManagementPolicy: string;
    energyManagementPolicy: string;
    waterManagementPolicy: string;
    recyclingPolicy: string;
    
    // Environmental Oversight
    boardClimateOversight: string;
    managementClimateOversight: string;
    
    // Sustainable Sourcing
    sustainableSourcing: string;
  };
  social: {
    // Q1: Pay Ratios
    medianMaleCompensation: string;
    medianFemaleCompensation: string;
    
    // Q2: CEO Pay Ratio
    ceoPayRatio: string;
    ceoPayRatioReporting: string;
    
    // Q3: Turnover
    fullTimeTurnover: string;
    partTimeTurnover: string;
    consultantsTurnover: string;
    
    // Q4: Gender Diversity and Inclusion
    diversityInclusionPolicy: string;
    totalHeadcount: string;
    menHeadcount: string;
    womenHeadcount: string;
    menEntryMidLevel: string;
    womenEntryMidLevel: string;
    menSeniorExecutive: string;
    womenSeniorExecutive: string;
    differentlyAbledWorkforce: string;
    
    // Q5: Temporary Workers Ratio
    temporaryWorkers: string;
    consultants: string;
    
    // Q6: Harassment, Discrimination and Grievance
    antiHarassmentPolicy: string;
    harassmentCasesReported: string;
    harassmentCasesResolved: string;
    grievanceMechanism: string;
    grievanceCasesReported: string;
    grievanceCasesResolved: string;
    
    // Q7: Health and Safety
    healthSafetyPolicy: string;
    hseManagementSystem: string;
    fatalities: string;
    ltis: string;
    safetyAccidents: string;
    productionLoss: string;
    trir: string;
    
    // Q8: Child and Forced Labor
    childForcedLaborPolicy: string;
    
    // Q9: Human Rights
    humanRightsPolicy: string;
    
    // Q10: Employee Training and Succession Planning
    personnelTrained: string;
    womenPromoted: string;
    menPromoted: string;
    
    // Q11: CSR and Marketing
    csrPercentage: string;
    responsibleMarketingPolicy: string;
  };
  governance: {
    // Q1: Board Diversification, Independence and Competence
    totalBoardMembers: string;
    independentBoardMembers: string;
    menBoardMembers: string;
    womenBoardMembers: string;
    boardGovernanceCommittees: string;
    menCommitteeChairs: string;
    womenCommitteeChairs: string;
    ceoBoardProhibition: string;
    esgCertifiedBoardMembers: string;
    
    // Q2: ESG Performance Incentivization
    esgIncentivization: string;
    
    // Q3: Voice of Employees
    workersUnion: string;
    
    // Q4: Supplier Code of Conduct
    supplierCodeOfConduct: string;
    supplierCompliancePercentage: string;
    
    // Q5: Sustainability Disclosures
    unSdgsFocus: string;
    sustainabilityReport: string;
    sustainabilityReportingFramework: string;
    sustainabilityRegulatoryFiling: string;
    sustainabilityThirdPartyAssurance: string;
    
    // Q6: Ethics and Anti-Corruption Governance
    ethicsAntiCorruptionPolicy: string;
    policyRegularReview: string;
    
    // Q7: Data Privacy
    dataPrivacyPolicy: string;
  };
}

const ESGHealthCheck = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'environmental' | 'social' | 'governance'>('environmental');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingAssessment, setExistingAssessment] = useState<any>(null);
  const [esgData, setEsgData] = useState<ESGData>({
    environmental: {
      // GHG Emissions
      ghgBaseline: '',
      ghgEmissions: '',
      airPollutants: '',
      ghgReductionInitiatives: '',
      
      // Energy Efficiency
      energyVisibility: '',
      totalEnergyUsed: '',
      energyGrid: '',
      energyRenewable: '',
      energyDiesel: '',
      energyGas: '',
      
      // Water Management
      waterWithdrawal: '',
      waterReclaimed: '',
      
      // Waste Management
      wasteType: '',
      wasteQuantity: '',
      wasteTreated: '',
      
      // Environmental Operations
      environmentalPolicy: '',
      wasteManagementPolicy: '',
      energyManagementPolicy: '',
      waterManagementPolicy: '',
      recyclingPolicy: '',
      
      // Environmental Oversight
      boardClimateOversight: '',
      managementClimateOversight: '',
      
      // Sustainable Sourcing
      sustainableSourcing: ''
    },
    social: {
      // Q1: Pay Ratios
      medianMaleCompensation: '',
      medianFemaleCompensation: '',
      
      // Q2: CEO Pay Ratio
      ceoPayRatio: '',
      ceoPayRatioReporting: '',
      
      // Q3: Turnover
      fullTimeTurnover: '',
      partTimeTurnover: '',
      consultantsTurnover: '',
      
      // Q3: Gender Diversity and Inclusion
      diversityInclusionPolicy: '',
      totalHeadcount: '',
      menHeadcount: '',
      womenHeadcount: '',
      menEntryMidLevel: '',
      womenEntryMidLevel: '',
      menSeniorExecutive: '',
      womenSeniorExecutive: '',
      differentlyAbledWorkforce: '',
      
      // Q4: Temporary Workers Ratio
      temporaryWorkers: '',
      consultants: '',
      
      // Q5: Harassment, Discrimination and Grievance
      antiHarassmentPolicy: '',
      harassmentCasesReported: '',
      harassmentCasesResolved: '',
      grievanceMechanism: '',
      grievanceCasesReported: '',
      grievanceCasesResolved: '',
      
      // Q6: Health and Safety
      healthSafetyPolicy: '',
      hseManagementSystem: '',
      fatalities: '',
      ltis: '',
      safetyAccidents: '',
      productionLoss: '',
      trir: '',
      
      // Q7: Child and Forced Labor
      childForcedLaborPolicy: '',
      
      // Q8: Human Rights
      humanRightsPolicy: '',
      
      // Q9: Employee Training and Succession Planning
      personnelTrained: '',
      womenPromoted: '',
      menPromoted: '',
      
      // Q10: CSR
      csrPercentage: '',
      
      // Q11: Marketing
      responsibleMarketingPolicy: ''
    },
    governance: {
      // Q1: Board Diversification, Independence and Competence
      totalBoardMembers: '',
      independentBoardMembers: '',
      menBoardMembers: '',
      womenBoardMembers: '',
      boardGovernanceCommittees: '',
      menCommitteeChairs: '',
      womenCommitteeChairs: '',
      ceoBoardProhibition: '',
      esgCertifiedBoardMembers: '',
      
      // Q2: ESG Performance Incentivization
      esgIncentivization: '',
      
      // Q3: Voice of Employees
      workersUnion: '',
      
      // Q4: Supplier Code of Conduct
      supplierCodeOfConduct: '',
      supplierCompliancePercentage: '',
      
      // Q5: Sustainability Disclosures
      unSdgsFocus: '',
      sustainabilityReport: '',
      sustainabilityReportingFramework: '',
      sustainabilityRegulatoryFiling: '',
      sustainabilityThirdPartyAssurance: '',
      
      // Q6: Ethics and Anti-Corruption Governance
      ethicsAntiCorruptionPolicy: '',
      policyRegularReview: '',
      
      // Q7: Data Privacy
      dataPrivacyPolicy: ''
    }
  });

  const [scores, setScores] = useState({
    environmental: 0,
    social: 0,
    governance: 0
  });

  const handleInputChange = (section: keyof ESGData, field: string, value: string) => {
    setEsgData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const calculateScore = (section: keyof ESGData) => {
    const sectionData = esgData[section];
    const filledFields = Object.values(sectionData).filter(value => value !== '').length;
    const totalFields = Object.keys(sectionData).length;
    return Math.round((filledFields / totalFields) * 100);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score == 100) return { color: "bg-green-100 text-green-800", text: "Complete" };
    if (score >= 70) return { color: "bg-green-100 text-green-800", text: "Good" };
    if (score >= 40) return { color: "bg-yellow-100 text-yellow-800", text: "Fair" };
    if (score >= 5) return { color: "bg-orange-100 text-orange-800", text: "Started" };
    return { color: "bg-red-100 text-red-800", text: "Not Started" };
  };

  // Load existing assessment data
  useEffect(() => {
    const loadAssessment = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('esg_assessments')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
          console.error('Error loading assessment:', error);
          toast({
            title: "Error",
            description: "Failed to load your assessment data.",
            variant: "destructive"
          });
        }

        if (data) {
          setExistingAssessment(data);
          // Convert database fields to form data
          const formData: ESGData = {
            environmental: {
              ghgBaseline: data.ghg_baseline || '',
              ghgEmissions: data.ghg_emissions || '',
              airPollutants: data.air_pollutants || '',
              ghgReductionInitiatives: data.ghg_reduction_initiatives || '',
              energyVisibility: data.energy_visibility || '',
              totalEnergyUsed: data.total_energy_used || '',
              energyGrid: data.energy_grid || '',
              energyRenewable: data.energy_renewable || '',
              energyDiesel: data.energy_diesel || '',
              energyGas: data.energy_gas || '',
              waterWithdrawal: data.water_withdrawal || '',
              waterReclaimed: data.water_reclaimed || '',
              wasteType: data.waste_type || '',
              wasteQuantity: data.waste_quantity || '',
              wasteTreated: data.waste_treated || '',
              environmentalPolicy: data.environmental_policy || '',
              wasteManagementPolicy: data.waste_management_policy || '',
              energyManagementPolicy: data.energy_management_policy || '',
              waterManagementPolicy: data.water_management_policy || '',
              recyclingPolicy: data.recycling_policy || '',
              boardClimateOversight: data.board_climate_oversight || '',
              managementClimateOversight: data.management_climate_oversight || '',
              sustainableSourcing: data.sustainable_sourcing || ''
            },
            social: {
              medianMaleCompensation: data.median_male_compensation || '',
              medianFemaleCompensation: data.median_female_compensation || '',
              ceoPayRatio: data.ceo_pay_ratio || '',
              ceoPayRatioReporting: data.ceo_pay_ratio_reporting || '',
              fullTimeTurnover: data.full_time_turnover || '',
              partTimeTurnover: data.part_time_turnover || '',
              consultantsTurnover: data.consultants_turnover || '',
              diversityInclusionPolicy: data.diversity_inclusion_policy || '',
              totalHeadcount: data.total_headcount || '',
              menHeadcount: data.men_headcount || '',
              womenHeadcount: data.women_headcount || '',
              menEntryMidLevel: data.men_entry_mid_level || '',
              womenEntryMidLevel: data.women_entry_mid_level || '',
              menSeniorExecutive: data.men_senior_executive || '',
              womenSeniorExecutive: data.women_senior_executive || '',
              differentlyAbledWorkforce: data.differently_abled_workforce || '',
              temporaryWorkers: data.temporary_workers || '',
              consultants: data.consultants || '',
              antiHarassmentPolicy: data.anti_harassment_policy || '',
              harassmentCasesReported: data.harassment_cases_reported || '',
              harassmentCasesResolved: data.harassment_cases_resolved || '',
              grievanceMechanism: data.grievance_mechanism || '',
              grievanceCasesReported: data.grievance_cases_reported || '',
              grievanceCasesResolved: data.grievance_cases_resolved || '',
              healthSafetyPolicy: data.health_safety_policy || '',
              hseManagementSystem: data.hse_management_system || '',
              fatalities: data.fatalities || '',
              ltis: data.ltis || '',
              safetyAccidents: data.safety_accidents || '',
              productionLoss: data.production_loss || '',
              trir: data.trir || '',
              childForcedLaborPolicy: data.child_forced_labor_policy || '',
              humanRightsPolicy: data.human_rights_policy || '',
              personnelTrained: data.personnel_trained || '',
              womenPromoted: data.women_promoted || '',
              menPromoted: data.men_promoted || '',
              csrPercentage: data.csr_percentage || '',
              responsibleMarketingPolicy: data.responsible_marketing_policy || ''
            },
            governance: {
              totalBoardMembers: data.total_board_members || '',
              independentBoardMembers: data.independent_board_members || '',
              menBoardMembers: data.men_board_members || '',
              womenBoardMembers: data.women_board_members || '',
              boardGovernanceCommittees: data.board_governance_committees || '',
              menCommitteeChairs: data.men_committee_chairs || '',
              womenCommitteeChairs: data.women_committee_chairs || '',
              ceoBoardProhibition: data.ceo_board_prohibition || '',
              esgCertifiedBoardMembers: data.esg_certified_board_members || '',
              esgIncentivization: data.esg_incentivization || '',
              workersUnion: data.workers_union || '',
              supplierCodeOfConduct: data.supplier_code_of_conduct || '',
              supplierCompliancePercentage: data.supplier_compliance_percentage || '',
              unSdgsFocus: data.un_sdgs_focus || '',
              sustainabilityReport: data.sustainability_report || '',
              sustainabilityReportingFramework: data.sustainability_reporting_framework || '',
              sustainabilityRegulatoryFiling: data.sustainability_regulatory_filing || '',
              sustainabilityThirdPartyAssurance: data.sustainability_third_party_assurance || '',
              ethicsAntiCorruptionPolicy: data.ethics_anti_corruption_policy || '',
              policyRegularReview: data.policy_regular_review || '',
              dataPrivacyPolicy: data.data_privacy_policy || ''
            }
          };
          setEsgData(formData);
        }
      } catch (error) {
        console.error('Error loading assessment:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAssessment();
  }, [user, toast]);

  const saveToDatabase = async (isDraft: boolean = true): Promise<boolean> => {
    if (!user) return false;
    
    setSaving(true);
    try {
      const environmentalScore = calculateScore('environmental');
      const socialScore = calculateScore('social');
      const governanceScore = calculateScore('governance');
      const totalScore = Math.round((environmentalScore + socialScore + governanceScore) / 3);

      const assessmentData = {
        user_id: user.id,
        // Environmental
        ghg_baseline: esgData.environmental.ghgBaseline,
        ghg_emissions: esgData.environmental.ghgEmissions,
        air_pollutants: esgData.environmental.airPollutants,
        ghg_reduction_initiatives: esgData.environmental.ghgReductionInitiatives,
        energy_visibility: esgData.environmental.energyVisibility,
        total_energy_used: esgData.environmental.totalEnergyUsed,
        energy_grid: esgData.environmental.energyGrid,
        energy_renewable: esgData.environmental.energyRenewable,
        energy_diesel: esgData.environmental.energyDiesel,
        energy_gas: esgData.environmental.energyGas,
        water_withdrawal: esgData.environmental.waterWithdrawal,
        water_reclaimed: esgData.environmental.waterReclaimed,
        waste_type: esgData.environmental.wasteType,
        waste_quantity: esgData.environmental.wasteQuantity,
        waste_treated: esgData.environmental.wasteTreated,
        environmental_policy: esgData.environmental.environmentalPolicy,
        waste_management_policy: esgData.environmental.wasteManagementPolicy,
        energy_management_policy: esgData.environmental.energyManagementPolicy,
        water_management_policy: esgData.environmental.waterManagementPolicy,
        recycling_policy: esgData.environmental.recyclingPolicy,
        board_climate_oversight: esgData.environmental.boardClimateOversight,
        management_climate_oversight: esgData.environmental.managementClimateOversight,
        sustainable_sourcing: esgData.environmental.sustainableSourcing,
        // Social
        median_male_compensation: esgData.social.medianMaleCompensation,
        median_female_compensation: esgData.social.medianFemaleCompensation,
        ceo_pay_ratio: esgData.social.ceoPayRatio,
        ceo_pay_ratio_reporting: esgData.social.ceoPayRatioReporting,
        full_time_turnover: esgData.social.fullTimeTurnover,
        part_time_turnover: esgData.social.partTimeTurnover,
        consultants_turnover: esgData.social.consultantsTurnover,
        diversity_inclusion_policy: esgData.social.diversityInclusionPolicy,
        total_headcount: esgData.social.totalHeadcount,
        men_headcount: esgData.social.menHeadcount,
        women_headcount: esgData.social.womenHeadcount,
        men_entry_mid_level: esgData.social.menEntryMidLevel,
        women_entry_mid_level: esgData.social.womenEntryMidLevel,
        men_senior_executive: esgData.social.menSeniorExecutive,
        women_senior_executive: esgData.social.womenSeniorExecutive,
        differently_abled_workforce: esgData.social.differentlyAbledWorkforce,
        temporary_workers: esgData.social.temporaryWorkers,
        consultants: esgData.social.consultants,
        anti_harassment_policy: esgData.social.antiHarassmentPolicy,
        harassment_cases_reported: esgData.social.harassmentCasesReported,
        harassment_cases_resolved: esgData.social.harassmentCasesResolved,
        grievance_mechanism: esgData.social.grievanceMechanism,
        grievance_cases_reported: esgData.social.grievanceCasesReported,
        grievance_cases_resolved: esgData.social.grievanceCasesResolved,
        health_safety_policy: esgData.social.healthSafetyPolicy,
        hse_management_system: esgData.social.hseManagementSystem,
        fatalities: esgData.social.fatalities,
        ltis: esgData.social.ltis,
        safety_accidents: esgData.social.safetyAccidents,
        production_loss: esgData.social.productionLoss,
        trir: esgData.social.trir,
        child_forced_labor_policy: esgData.social.childForcedLaborPolicy,
        human_rights_policy: esgData.social.humanRightsPolicy,
        personnel_trained: esgData.social.personnelTrained,
        women_promoted: esgData.social.womenPromoted,
        men_promoted: esgData.social.menPromoted,
        csr_percentage: esgData.social.csrPercentage,
        responsible_marketing_policy: esgData.social.responsibleMarketingPolicy,
        // Governance
        total_board_members: esgData.governance.totalBoardMembers,
        independent_board_members: esgData.governance.independentBoardMembers,
        men_board_members: esgData.governance.menBoardMembers,
        women_board_members: esgData.governance.womenBoardMembers,
        board_governance_committees: esgData.governance.boardGovernanceCommittees,
        men_committee_chairs: esgData.governance.menCommitteeChairs,
        women_committee_chairs: esgData.governance.womenCommitteeChairs,
        ceo_board_prohibition: esgData.governance.ceoBoardProhibition,
        esg_certified_board_members: esgData.governance.esgCertifiedBoardMembers,
        esg_incentivization: esgData.governance.esgIncentivization,
        workers_union: esgData.governance.workersUnion,
        supplier_code_of_conduct: esgData.governance.supplierCodeOfConduct,
        supplier_compliance_percentage: esgData.governance.supplierCompliancePercentage,
        un_sdgs_focus: esgData.governance.unSdgsFocus,
        sustainability_report: esgData.governance.sustainabilityReport,
        sustainability_reporting_framework: esgData.governance.sustainabilityReportingFramework,
        sustainability_regulatory_filing: esgData.governance.sustainabilityRegulatoryFiling,
        sustainability_third_party_assurance: esgData.governance.sustainabilityThirdPartyAssurance,
        ethics_anti_corruption_policy: esgData.governance.ethicsAntiCorruptionPolicy,
        policy_regular_review: esgData.governance.policyRegularReview,
        data_privacy_policy: esgData.governance.dataPrivacyPolicy,
        // Status and scores
        status: (isDraft ? 'draft' : 'submitted') as 'draft' | 'submitted',
        environmental_completion: environmentalScore,
        social_completion: socialScore,
        governance_completion: governanceScore,
        total_completion: totalScore,
        submitted_at: isDraft ? null : new Date().toISOString()
      };

      let result;
      let assessmentId: string | undefined;
      
      if (existingAssessment?.id) {
        // Update existing assessment
        assessmentId = existingAssessment.id;
        result = await supabase
          .from('esg_assessments')
          .update(assessmentData)
          .eq('user_id', user.id)
          .eq('id', assessmentId)
          .select()
          .single();
      } else {
        // Insert new assessment
        result = await supabase
          .from('esg_assessments')
          .insert([assessmentData])
          .select()
          .single();
        assessmentId = result.data?.id;
      }

      if (result.error) {
        console.error('Database error:', result.error);
        throw result.error;
      }

      if (!result.data) {
        throw new Error('Failed to save assessment: No data returned');
      }

      // Get the saved assessment
      const savedAssessment = result.data;
      assessmentId = savedAssessment.id;
      
      setExistingAssessment(savedAssessment);
      
      console.log('Assessment saved successfully:', {
        id: assessmentId,
        status: savedAssessment.status,
        isDraft
      });
      
      // Automatically calculate and save ESG scores when submitting (not for drafts)
      if (!isDraft && assessmentId) {
        try {
          // Convert esgData to the format expected by scoring engine
          const assessmentDataForScoring: ESGAssessmentData = {
            // Environmental
            ghg_baseline: esgData.environmental.ghgBaseline,
            ghg_emissions: esgData.environmental.ghgEmissions,
            air_pollutants: esgData.environmental.airPollutants,
            ghg_reduction_initiatives: esgData.environmental.ghgReductionInitiatives,
            energy_visibility: esgData.environmental.energyVisibility,
            total_energy_used: esgData.environmental.totalEnergyUsed,
            energy_grid: esgData.environmental.energyGrid,
            energy_renewable: esgData.environmental.energyRenewable,
            energy_diesel: esgData.environmental.energyDiesel,
            energy_gas: esgData.environmental.energyGas,
            water_withdrawal: esgData.environmental.waterWithdrawal,
            water_reclaimed: esgData.environmental.waterReclaimed,
            waste_type: esgData.environmental.wasteType,
            waste_quantity: esgData.environmental.wasteQuantity,
            waste_treated: esgData.environmental.wasteTreated,
            environmental_policy: esgData.environmental.environmentalPolicy,
            waste_management_policy: esgData.environmental.wasteManagementPolicy,
            energy_management_policy: esgData.environmental.energyManagementPolicy,
            water_management_policy: esgData.environmental.waterManagementPolicy,
            recycling_policy: esgData.environmental.recyclingPolicy,
            board_climate_oversight: esgData.environmental.boardClimateOversight,
            management_climate_oversight: esgData.environmental.managementClimateOversight,
            sustainable_sourcing: esgData.environmental.sustainableSourcing,
            // Social
            median_male_compensation: esgData.social.medianMaleCompensation,
            median_female_compensation: esgData.social.medianFemaleCompensation,
            ceo_pay_ratio: esgData.social.ceoPayRatio,
            ceo_pay_ratio_reporting: esgData.social.ceoPayRatioReporting,
            full_time_turnover: esgData.social.fullTimeTurnover,
            part_time_turnover: esgData.social.partTimeTurnover,
            consultants_turnover: esgData.social.consultantsTurnover,
            diversity_inclusion_policy: esgData.social.diversityInclusionPolicy,
            total_headcount: esgData.social.totalHeadcount,
            men_headcount: esgData.social.menHeadcount,
            women_headcount: esgData.social.womenHeadcount,
            men_entry_mid_level: esgData.social.menEntryMidLevel,
            women_entry_mid_level: esgData.social.womenEntryMidLevel,
            men_senior_executive: esgData.social.menSeniorExecutive,
            women_senior_executive: esgData.social.womenSeniorExecutive,
            differently_abled_workforce: esgData.social.differentlyAbledWorkforce,
            temporary_workers: esgData.social.temporaryWorkers,
            consultants: esgData.social.consultants,
            anti_harassment_policy: esgData.social.antiHarassmentPolicy,
            harassment_cases_reported: esgData.social.harassmentCasesReported,
            harassment_cases_resolved: esgData.social.harassmentCasesResolved,
            grievance_mechanism: esgData.social.grievanceMechanism,
            grievance_cases_reported: esgData.social.grievanceCasesReported,
            grievance_cases_resolved: esgData.social.grievanceCasesResolved,
            health_safety_policy: esgData.social.healthSafetyPolicy,
            hse_management_system: esgData.social.hseManagementSystem,
            fatalities: esgData.social.fatalities,
            ltis: esgData.social.ltis,
            safety_accidents: esgData.social.safetyAccidents,
            production_loss: esgData.social.productionLoss,
            trir: esgData.social.trir,
            child_forced_labor_policy: esgData.social.childForcedLaborPolicy,
            human_rights_policy: esgData.social.humanRightsPolicy,
            personnel_trained: esgData.social.personnelTrained,
            women_promoted: esgData.social.womenPromoted,
            men_promoted: esgData.social.menPromoted,
            csr_percentage: esgData.social.csrPercentage,
            responsible_marketing_policy: esgData.social.responsibleMarketingPolicy,
            // Governance
            total_board_members: esgData.governance.totalBoardMembers,
            independent_board_members: esgData.governance.independentBoardMembers,
            men_board_members: esgData.governance.menBoardMembers,
            women_board_members: esgData.governance.womenBoardMembers,
            board_governance_committees: esgData.governance.boardGovernanceCommittees,
            men_committee_chairs: esgData.governance.menCommitteeChairs,
            women_committee_chairs: esgData.governance.womenCommitteeChairs,
            ceo_board_prohibition: esgData.governance.ceoBoardProhibition,
            esg_certified_board_members: esgData.governance.esgCertifiedBoardMembers,
            esg_incentivization: esgData.governance.esgIncentivization,
            workers_union: esgData.governance.workersUnion,
            supplier_code_of_conduct: esgData.governance.supplierCodeOfConduct,
            supplier_compliance_percentage: esgData.governance.supplierCompliancePercentage,
            un_sdgs_focus: esgData.governance.unSdgsFocus,
            sustainability_report: esgData.governance.sustainabilityReport,
            sustainability_reporting_framework: esgData.governance.sustainabilityReportingFramework,
            sustainability_regulatory_filing: esgData.governance.sustainabilityRegulatoryFiling,
            sustainability_third_party_assurance: esgData.governance.sustainabilityThirdPartyAssurance,
            ethics_anti_corruption_policy: esgData.governance.ethicsAntiCorruptionPolicy,
            policy_regular_review: esgData.governance.policyRegularReview,
            data_privacy_policy: esgData.governance.dataPrivacyPolicy,
          };
          
          // Calculate ESG scores automatically
          const scoringResult = calculateESGScore(assessmentDataForScoring);
          
          // Save scores to esg_scores table
          const scoreData = {
            user_id: user.id,
            assessment_id: assessmentId,
            ...scoringResult,
            scored_by: 'Automated System',
            scored_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          const { error: scoreError } = await supabase
            .from('esg_scores')
            .upsert(scoreData, { onConflict: 'assessment_id' });
          
          if (scoreError) {
            console.error('Error saving ESG scores:', scoreError);
            // Don't throw - assessment is saved, scores can be recalculated
          }
        } catch (scoringError) {
          console.error('Error calculating ESG scores:', scoringError);
          // Don't throw - assessment is saved, scores can be recalculated
        }
      }
      
      toast({
        title: isDraft ? "Draft Saved" : "Assessment Submitted",
        description: isDraft 
          ? "Your draft has been saved successfully. You can continue editing later."
          : "Your ESG assessment has been submitted and scored automatically!",
      });

      return true; // Success

    } catch (error) {
      console.error('Error saving assessment:', error);
      toast({
        title: "Error",
        description: "Failed to save your assessment. Please try again.",
        variant: "destructive"
      });
      return false; // Failure
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = () => {
    saveToDatabase(true);
  };

  const handleSubmitFinal = async () => {
    const success = await saveToDatabase(false);
    // Navigate to ESG results page only after successful submission
    if (success) {
      // Small delay to ensure database is updated
      setTimeout(() => navigate('/esg-results'), 500);
    }
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const tabs = [
    {
      id: 'environmental',
      label: 'Environmental',
      icon: Leaf,
      description: 'Environmental impact and sustainability practices'
    },
    {
      id: 'social',
      label: 'Social',
      icon: Users,
      description: 'Social responsibility and stakeholder relations'
    },
    {
      id: 'governance',
      label: 'Governance',
      icon: Shield,
      description: 'Corporate governance and ethical practices'
    }
  ];

  const environmentalSections = [
    {
      id: 'ghg-emissions',
      title: 'Q1: GHG Emissions',
      description: 'Greenhouse gas emissions and reduction initiatives',
      fields: [
        { key: 'ghgBaseline', label: 'Do you have a GHG emissions baseline of the company operations?', type: 'yesno' },
        { key: 'ghgEmissions', label: 'GHG Emissions in Metric Tonnes (including CO2, Methane etc)', type: 'number', unit: 'Metric Tonnes' },
        { key: 'airPollutants', label: 'Emission of other air pollutants in Metric Tonnes', type: 'number', unit: 'Metric Tonnes' },
        { key: 'ghgReductionInitiatives', label: 'Are there any Initiatives in Place for reduction of GHG Emissions?', type: 'yesno' }
      ]
    },
    {
      id: 'energy-efficiency',
      title: 'Q2: Energy Efficiency',
      description: 'Energy consumption and efficiency measures',
      fields: [
        { key: 'energyVisibility', label: 'Do you have visibility on the total amount of Energy Used?', type: 'yesno' },
        { key: 'totalEnergyUsed', label: 'Total amount of Energy Used in kWh', type: 'number', unit: 'kWh' },
        { key: 'energyGrid', label: 'Energy Use by Generation Type - Grid (%)', type: 'number', unit: '%' },
        { key: 'energyRenewable', label: 'Energy Use by Generation Type - Renewable (%)', type: 'number', unit: '%' },
        { key: 'energyDiesel', label: 'Energy Use by Generation Type - Backup Diesel Generators (%)', type: 'number', unit: '%' },
        { key: 'energyGas', label: 'Energy Use by Generation Type - Backup Gas Generators (%)', type: 'number', unit: '%' }
      ]
    },
    {
      id: 'water-management',
      title: 'Q3: Water Management',
      description: 'Water consumption and conservation',
      fields: [
        { key: 'waterWithdrawal', label: 'Total Amount of water withdrawal or Consumed for operations', type: 'number', unit: 'Litres' },
        { key: 'waterReclaimed', label: 'Total Amount of water Reclaimed by treatment initiatives', type: 'number', unit: 'Litres' }
      ]
    },
    {
      id: 'waste-management',
      title: 'Q4: Waste Management',
      description: 'Waste production and treatment',
      fields: [
        { key: 'wasteType', label: 'What kind of Waste is being Produced by the company Operations?', type: 'text' },
        { key: 'wasteQuantity', label: 'What is the total quantity of waste produced in Metric Tonnes', type: 'number', unit: 'Metric Tonnes' },
        { key: 'wasteTreated', label: '% of the produced waste treated', type: 'number', unit: '%' }
      ]
    },
    {
      id: 'environmental-operations',
      title: 'Q5: Environmental Operations',
      description: 'Environmental policies and procedures',
      fields: [
        { key: 'environmentalPolicy', label: 'Does Your company has a formal Environmental Policy?', type: 'yesno' },
        { key: 'wasteManagementPolicy', label: 'Waste Management Policy', type: 'yesno' },
        { key: 'energyManagementPolicy', label: 'Energy Management Policy or System', type: 'yesno' },
        { key: 'waterManagementPolicy', label: 'Water Management Policy', type: 'yesno' },
        { key: 'recyclingPolicy', label: 'Recycling Policy', type: 'yesno' }
      ]
    },
    {
      id: 'environmental-oversight',
      title: 'Q6: Environmental Oversight',
      description: 'Board and management oversight of climate risks',
      fields: [
        { key: 'boardClimateOversight', label: 'Does your Board oversee Climate Related Risks?', type: 'yesno' },
        { key: 'managementClimateOversight', label: 'Does your Management Team oversee Climate Related Risks?', type: 'yesno' }
      ]
    },
    {
      id: 'sustainable-sourcing',
      title: 'Q7: Sustainable Sourcing',
      description: 'Sustainable sourcing policies and procedures',
      fields: [
        { key: 'sustainableSourcing', label: 'Does your company has a policy for sustainable sourcing?', type: 'yesno' }
      ]
    }
  ];

  const socialSections = [
    {
      id: 'pay-ratios',
      title: 'Q1: Pay Ratios',
      description: 'Compensation and pay equity',
      fields: [
        { key: 'medianMaleCompensation', label: 'Median Male Compensation', type: 'number', unit: 'Currency' },
        { key: 'medianFemaleCompensation', label: 'Median Female Compensation', type: 'number', unit: 'Currency' }
      ]
    },
    {
      id: 'ceo-pay-ratio',
      title: 'Q2: CEO Pay Ratio',
      description: 'CEO compensation relative to median employee',
      fields: [
        { key: 'ceoPayRatio', label: 'CEO total compensation to Median Full-time total compensation? Ratio', type: 'number', unit: 'Ratio' },
        { key: 'ceoPayRatioReporting', label: 'Does your company report this metric in regulatory filing?', type: 'yesno' }
      ]
    },
    {
      id: 'turnover',
      title: 'Q3: Turnover',
      description: 'Employee turnover rates',
      fields: [
        { key: 'fullTimeTurnover', label: 'Year on Year Full time employees turnover ratio: %', type: 'number', unit: '%' },
        { key: 'partTimeTurnover', label: 'Year on Year part time employees turnover ratio: %', type: 'number', unit: '%' },
        { key: 'consultantsTurnover', label: 'Year on Year consultants turnover ratio: %', type: 'number', unit: '%' }
      ]
    },
    {
      id: 'gender-diversity',
      title: 'Q4: Gender Diversity and Inclusion',
      description: 'Workforce diversity and inclusion metrics',
      fields: [
        
        { key: 'totalHeadcount', label: 'Total Headcount of the Company?', type: 'number', unit: 'Number' },
        { key: 'menHeadcount', label: 'Number of Men in the total Headcount?', type: 'number', unit: 'Number' },
        { key: 'womenHeadcount', label: 'Number of Women in the Total Headcount?', type: 'number', unit: 'Number' },
        { key: 'menEntryMidLevel', label: 'Entry and mid level positions held by Men?', type: 'number', unit: 'Number' },
        { key: 'womenEntryMidLevel', label: 'Entry and mid level positions held by Women?', type: 'number', unit: 'Number' },
        { key: 'menSeniorExecutive', label: 'Senior and Executive Positions held by Men?', type: 'number', unit: 'Number' },
        { key: 'womenSeniorExecutive', label: 'Senior and Executive Positions held by Women?', type: 'number', unit: 'Number' },
        { key: 'differentlyAbledWorkforce', label: 'Total number of differently abled men and women', type: 'number', unit: 'Number' },
        { key: 'diversityInclusionPolicy', label: 'Does your company have a diversity and inclusion policy?', type: 'yesno' }
      ]
    },
    {
      id: 'temporary-workers',
      title: 'Q5: Temporary Workers Ratio',
      description: 'Temporary and contract workforce',
      fields: [
        { key: 'temporaryWorkers', label: 'Total number of Temporary workers in the company?', type: 'number', unit: 'Number' },
        { key: 'consultants', label: 'Total number of consultants in the company?', type: 'number', unit: 'Number' }
      ]
    },
    {
      id: 'harassment-grievance',
      title: 'Q6: Harassment, Discrimination and Grievance',
      description: 'Anti-harassment policies and grievance mechanisms',
      fields: [
        { key: 'antiHarassmentPolicy', label: 'Does your company have an anti-harassment or anti-discrimination policy?', type: 'yesno' },
        { key: 'harassmentCasesReported', label: 'If Yes, How many cases have been reported in last 5 Years?', type: 'number', unit: 'Number' },
        { key: 'harassmentCasesResolved', label: 'How many cases have been successfully resolved?', type: 'number', unit: 'Number' },
        { key: 'grievanceMechanism', label: 'Is there a confidential grievance mechanism in place?', type: 'yesno' },
        { key: 'grievanceCasesReported', label: 'If Yes, How many cases reported on Grievance Mechanism in last 5 Years?', type: 'number', unit: 'Number' },
        { key: 'grievanceCasesResolved', label: 'How many grievance cases have been successfully resolved?', type: 'number', unit: 'Number' }
      ]
    },
    {
      id: 'health-safety',
      title: 'Q7: Health and Safety',
      description: 'Occupational health and safety metrics',
      fields: [
        { key: 'fatalities', label: 'Number of Fatalities in the last year?', type: 'number', unit: 'Number' },
        { key: 'ltis', label: 'Number of LTIs in the last year?', type: 'number', unit: 'Number' },
        { key: 'safetyAccidents', label: 'Total number of safety related accidents/incidents reported?', type: 'number', unit: 'Number' },
        { key: 'productionLoss', label: 'Number of loss of production due to safety related accidents?', type: 'number', unit: 'Number' },
        { key: 'trir', label: 'Annual Total recordable Injury rate (TRIR)?', type: 'number', unit: 'Rate' },
        
        { key: 'healthSafetyPolicy', label: 'Does your company have a Health and Safety Policy?', type: 'yesno' },
        { key: 'hseManagementSystem', label: 'Are there any HSE Management system in place?', type: 'yesno' }
      ]
    },
    {
      id: 'child-forced-labor',
      title: 'Q8: Child and Forced Labor',
      description: 'Child and forced labor policies',
      fields: [
        { key: 'childForcedLaborPolicy', label: 'Does your company follow a child and/or Forced labor policy?', type: 'yesno' }
      ]
    },
    {
      id: 'human-rights',
      title: 'Q9: Human Rights',
      description: 'Human rights policies',
      fields: [
        { key: 'humanRightsPolicy', label: 'Does your company follow a human rights policy?', type: 'yesno' }
      ]
    },
    {
      id: 'training-succession',
      title: 'Q10: Employee Training and Succession Planning',
      description: 'Training and promotion metrics',
      fields: [
        { key: 'personnelTrained', label: 'Number of Personnel Trained during the intended period', type: 'number', unit: 'Number' },
        { key: 'womenPromoted', label: '% of women promoted in the last year?', type: 'number', unit: '%' },
        { key: 'menPromoted', label: '% of Men promoted in the last year?', type: 'number', unit: '%' }
      ]
    },
    {
      id: 'csr',
      title: 'Q11: CSR',
      description: 'Corporate social responsibility spending',
      fields: [
        { key: 'csrPercentage', label: 'What % of the company\'s bottom line is being used for CSR activities?', type: 'number', unit: '%' }
      ]
    },
    {
      id: 'marketing',
      title: 'Q12: Marketing',
      description: 'Responsible marketing policies',
      fields: [
        { key: 'responsibleMarketingPolicy', label: 'Does your company have responsible gender/age sensitive marketing communication policy?', type: 'yesno' }
      ]
    }
  ];

  const governanceSections = [
    {
      id: 'board-diversification',
      title: 'Q1: Board Diversification, Independence and Competence',
      description: 'Board composition and diversity metrics',
      fields: [
        { key: 'totalBoardMembers', label: 'Total Number of Board Members', type: 'number', unit: 'Number' },
        { key: 'independentBoardMembers', label: 'Total Board Seats occupied by Independent Members', type: 'number', unit: 'Number' },
        { key: 'menBoardMembers', label: 'Total Board Seats occupied by Men', type: 'number', unit: 'Number' },
        { key: 'womenBoardMembers', label: 'Total Board Seats Occupied by Women', type: 'number', unit: 'Number' },
        { key: 'boardGovernanceCommittees', label: 'Total Number of Board Governance Committees', type: 'number', unit: 'Number' },
        { key: 'menCommitteeChairs', label: 'Committee Chairs Occupied by Men', type: 'number', unit: 'Number' },
        { key: 'womenCommitteeChairs', label: 'Committee Chairs Occupied by Women', type: 'number', unit: 'Number' },
        { key: 'ceoBoardProhibition', label: 'Does Company Prohibits CEO from serving as a Board Member', type: 'yesno' },
        { key: 'esgCertifiedBoardMembers', label: 'How many Board Members are ESG Certified', type: 'number', unit: 'Number' }
      ]
    },
    {
      id: 'esg-incentivization',
      title: 'Q2: ESG Performance Incentivization',
      description: 'Executive incentives for sustainability performance',
      fields: [
        { key: 'esgIncentivization', label: 'Are executives formally incentivized to perform on Sustainability?', type: 'yesno' }
      ]
    },
    {
      id: 'voice-employees',
      title: 'Q3: Voice of Employees',
      description: 'Employee representation and unions',
      fields: [
        { key: 'workersUnion', label: 'Does any Worker\'s Union in your company?', type: 'yesno' }
      ]
    },
    {
      id: 'supplier-conduct',
      title: 'Q4: Supplier Code of Conduct',
      description: 'Supplier sustainability requirements',
      fields: [
        { key: 'supplierCodeOfConduct', label: 'Are vendors or suppliers required to follow a code of conduct aligned with sustainability principles?', type: 'yesno' },
        { key: 'supplierCompliancePercentage', label: 'If yes, What Percentage of suppliers have formally certified their compliance?', type: 'number', unit: '%' }
      ]
    },
    {
      id: 'sustainability-disclosures',
      title: 'Q5: Sustainability Disclosures',
      description: 'Sustainability reporting and disclosures',
      fields: [
        { key: 'unSdgsFocus', label: 'Does your company focus on specific UN SDGs?', type: 'yesno' },
        { key: 'sustainabilityReport', label: 'Does your company publish a sustainability Report?', type: 'yesno' },
        { key: 'sustainabilityReportingFramework', label: 'If Yes, the sustainability report is in line with any sustainability reporting framework?', type: 'yesno' },
        { key: 'sustainabilityRegulatoryFiling', label: 'Is sustainability data included in your regulatory filings?', type: 'yesno' },
        { key: 'sustainabilityThirdPartyAssurance', label: 'Are your sustainability disclosures assured or validated by a third party?', type: 'yesno' }
      ]
    },
    {
      id: 'ethics-anti-corruption',
      title: 'Q6: Ethics and Anti-Corruption Governance',
      description: 'Ethics and anti-corruption policies',
      fields: [
        { key: 'ethicsAntiCorruptionPolicy', label: 'Does your company follow an Ethics and/or Anti-Corruption Policy', type: 'yesno' },
        { key: 'policyRegularReview', label: 'Is this policy reviewed and updated on regular basis?', type: 'yesno' }
      ]
    },
    {
      id: 'data-privacy',
      title: 'Q7: Data Privacy',
      description: 'Data privacy policies',
      fields: [
        { key: 'dataPrivacyPolicy', label: 'Does your company follow a Data Privacy Policy?', type: 'yesno' }
      ]
    }
  ];

  const getSectionsForTab = (tab: string) => {
    switch (tab) {
      case 'environmental':
        return environmentalSections;
      case 'social':
        return socialSections;
      case 'governance':
        return governanceSections;
      default:
        return [];
    }
  };

  const renderField = (field: any, sectionId: string) => {
    const value = esgData[activeTab][field.key as keyof typeof esgData[typeof activeTab]];
    const isFilled = value !== '';
    
    return (
      <div key={field.key} className="group animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className={`p-5 rounded-xl border-2 transition-all duration-300 ${
          isFilled 
            ? 'border-teal-300 bg-gradient-to-br from-teal-50/50 to-cyan-50/30 shadow-sm scale-[1.01]' 
            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm hover:scale-[1.005]'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`mt-0.5 flex-shrink-0 transition-colors ${
              isFilled 
                ? 'text-teal-600' 
                : 'text-slate-300 group-hover:text-slate-400'
            }`}>
              {isFilled ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <Circle className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <Label 
                  htmlFor={field.key} 
                  className="text-sm font-semibold text-slate-900 block mb-2 leading-snug"
                >
              {field.label}
                </Label>
              {field.unit && (
                  <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-xs text-slate-600 font-medium">
                    {field.unit}
                  </span>
              )}
              </div>
            
            {field.type === 'yesno' && (
                <div className="flex items-center gap-3 mt-3">
                  <label className={`inline-flex items-center gap-2 cursor-pointer rounded-lg border-2 px-4 py-2 transition-all duration-300 ${
                    value === 'yes'
                      ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-sm scale-105'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:scale-[1.02] text-slate-700'
                  }`}>
                  <input
                    type="radio"
                    name={field.key}
                    value="yes"
                    checked={value === 'yes'}
                    onChange={(e) => handleInputChange(activeTab, field.key, e.target.value)}
                      className="text-teal-600 focus:ring-teal-500 h-4 w-4 transition-all duration-300"
                  />
                    <span className="text-sm font-medium">Yes</span>
                </label>
                  <label className={`inline-flex items-center gap-2 cursor-pointer rounded-lg border-2 px-4 py-2 transition-all duration-300 ${
                    value === 'no'
                      ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-sm scale-105'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:scale-[1.02] text-slate-700'
                  }`}>
                  <input
                    type="radio"
                    name={field.key}
                    value="no"
                    checked={value === 'no'}
                    onChange={(e) => handleInputChange(activeTab, field.key, e.target.value)}
                      className="text-teal-600 focus:ring-teal-500 h-4 w-4 transition-all duration-300"
                  />
                    <span className="text-sm font-medium">No</span>
                </label>
              </div>
            )}
            
            {field.type === 'number' && (
              <Input
                id={field.key}
                type="number"
                step="any"
                  placeholder={`Enter value${field.unit ? ` in ${field.unit}` : ''}`}
                value={value}
                onChange={(e) => handleInputChange(activeTab, field.key, e.target.value)}
                  className={`h-10 text-sm border-2 transition-colors ${
                    isFilled 
                      ? 'border-teal-300 focus:border-teal-500' 
                      : 'border-slate-300 focus:border-teal-500'
                  }`}
              />
            )}
            
            {field.type === 'text' && (
              <Textarea
                id={field.key}
                  placeholder="Enter your detailed response..."
                value={value}
                onChange={(e) => handleInputChange(activeTab, field.key, e.target.value)}
                  className={`min-h-[90px] resize-none text-sm border-2 transition-colors ${
                    isFilled 
                      ? 'border-teal-300 focus:border-teal-500' 
                      : 'border-slate-300 focus:border-teal-500'
                  }`}
              />
            )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const totalScore = Math.round((scores.environmental + scores.social + scores.governance) / 3);
  
  // Auto-expand first incomplete section when tab changes (only if no sections are expanded for this tab)
  useEffect(() => {
    const sections = getSectionsForTab(activeTab);
    if (sections.length > 0) {
      // Check if any section for current tab is expanded
      const hasExpandedSection = sections.some(section => expandedSections.has(section.id));
      
      if (!hasExpandedSection) {
        // Find first incomplete section, or first section if all complete
        const firstIncomplete = sections.find(section => {
          const sectionFields = esgData[activeTab];
          const filledCount = section.fields.filter(
            field => sectionFields[field.key as keyof typeof sectionFields] !== ''
          ).length;
          return filledCount < section.fields.length;
        });
        
        const sectionToExpand = firstIncomplete || sections[0];
        if (sectionToExpand) {
          setExpandedSections(prev => new Set([...prev, sectionToExpand.id]));
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Update scores when data changes
  useEffect(() => {
    setScores({
      environmental: calculateScore('environmental'),
      social: calculateScore('social'),
      governance: calculateScore('governance')
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esgData]);

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
              Loading Assessment
            </h3>
            <p className="text-slate-600 text-sm">Preparing your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="hidden xs:inline text-xs sm:text-sm font-medium text-slate-600">
                ESG Score
              </span>
              <div className="px-3 sm:px-4 py-1.5 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-teal-500/30">
                {totalScore}%
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-6 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-teal-500"></div>
                  <span>E: {scores.environmental}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-cyan-500"></div>
                  <span>S: {scores.social}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  <span>G: {scores.governance}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Hero Header */}
        <div className="mb-6 sm:mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 sm:gap-4 mb-3">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
                  Health Check Assessment
                </h1>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-100 animate-in fade-in slide-in-from-right-4 duration-700 delay-150">
                  <Sparkles className="h-3.5 w-3.5 text-teal-600 animate-pulse" />
                  <span className="text-xs font-medium text-teal-700">ESG Assessment</span>
                </div>
              </div>
              <p className="text-sm sm:text-base md:text-lg text-slate-600 max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
                Comprehensive evaluation of your organization's Environmental, Social, and Governance performance
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {tabs.map((tab, index) => {
              const score = calculateScore(tab.id as keyof ESGData);
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as keyof ESGData)}
                  className={`group relative p-5 rounded-xl border-2 transition-all duration-300 text-left animate-in fade-in slide-in-from-bottom-4 ${
                      isActive
                      ? 'border-teal-500 bg-gradient-to-br from-teal-50 to-cyan-50 shadow-md shadow-teal-500/10 scale-105'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm hover:scale-[1.02]'
                    }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                  >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center transition-all duration-300 ${
                      isActive 
                        ? 'bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-lg rotate-3' 
                        : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200 group-hover:rotate-3'
                    }`}>
                      <Icon className="h-5 w-5 transition-transform duration-300" />
                    </div>
                    <div className={`text-2xl font-bold transition-all duration-300 ${
                      isActive ? 'text-teal-600 scale-110' : 'text-slate-400'
                    }`}>
                        {score}%
                    </div>
                  </div>
                  <h3 className={`font-semibold mb-1 transition-colors duration-300 ${
                    isActive ? 'text-slate-900' : 'text-slate-700'
                  }`}>
                    {tab.label}
                  </h3>
                  <p className="text-xs text-slate-500 mb-3">{tab.description}</p>
                  <Progress 
                    value={score} 
                    className={`h-1.5 transition-all duration-300 ${
                      isActive ? '' : 'opacity-60'
                    }`} 
                  />
                  </button>
                );
              })}
            </div>
        </div>

        {/* Main Content */}
        <div>
          {/* Main Content Area */}
          <div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Section Header */}
              <div className="px-6 py-5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                    <h2 className="text-xl font-bold text-slate-900 mb-1">
                      {tabs.find(t => t.id === activeTab)?.label} Assessment
                    </h2>
                    <p className="text-sm text-slate-600">
                      {tabs.find(t => t.id === activeTab)?.description}
                    </p>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium animate-in fade-in slide-in-from-right-4 duration-500 delay-150">
                    {getSectionsForTab(activeTab).length} Sections
                  </div>
                </div>
              </div>

              {/* Sections */}
              <div className="p-6 space-y-4">
                {getSectionsForTab(activeTab).map((section, index) => {
                const isExpanded = expandedSections.has(section.id);
                const sectionFields = esgData[activeTab];
                  const filledCount = section.fields.filter(
                    field => sectionFields[field.key as keyof typeof sectionFields] !== ''
                  ).length;
                  const sectionScore = Math.round((filledCount / section.fields.length) * 100);
                  const isComplete = sectionScore === 100;
                
                return (
                    <div 
                      key={section.id} 
                      className={`rounded-xl border-2 overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
                        isExpanded 
                          ? 'border-teal-400 shadow-lg shadow-teal-500/5 scale-[1.01]' 
                          : 'border-slate-200 hover:border-slate-300 hover:shadow-md hover:scale-[1.005]'
                      } ${isComplete ? 'bg-gradient-to-br from-teal-50/50 to-cyan-50/30' : 'bg-white'}`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                    <button
                      onClick={() => toggleSection(section.id)}
                        className="w-full px-5 py-4 bg-white hover:bg-slate-50 transition-all duration-300 flex items-center justify-between group"
                    >
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                            isComplete
                              ? 'bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-md scale-110'
                              : isExpanded
                                ? 'bg-teal-100 text-teal-700 scale-105'
                                : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200 group-hover:scale-105'
                          }`}>
                            {isComplete ? (
                              <CheckCircle2 className="h-5 w-5 animate-in zoom-in duration-300" />
                          ) : (
                              <span className="transition-transform duration-300">{index + 1}</span>
                          )}
                          </div>
                          <div className="flex-1 text-left">
                            <h3 className={`font-semibold mb-1 transition-colors duration-300 ${
                              isComplete ? 'text-teal-700' : 'text-slate-900'
                            }`}>
                              {section.title}
                            </h3>
                            <p className="text-sm text-slate-600">{section.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right hidden sm:block animate-in fade-in slide-in-from-right-2 duration-300">
                            <div className="text-sm font-semibold text-slate-700">
                              {filledCount}/{section.fields.length}
                      </div>
                            <div className="text-xs text-slate-500">Questions</div>
                          </div>
                          <ChevronDown className={`h-5 w-5 text-slate-400 transition-all duration-300 ${
                            isExpanded ? 'rotate-180 scale-110' : 'group-hover:scale-110'
                          }`} />
                      </div>
                    </button>
                    
                    {isExpanded && (
                        <div className="px-5 py-5 bg-slate-50/30 border-t-2 border-slate-200 animate-in fade-in slide-in-from-top-2 duration-300">
                          {sectionScore > 0 && (
                            <div className="mb-5 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border border-teal-200 animate-in fade-in slide-in-from-left-4 duration-500">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-teal-900">
                                  Section Progress
                                </span>
                                <span className="text-sm font-bold text-teal-700 animate-in zoom-in duration-300">
                                  {sectionScore}%
                                </span>
                              </div>
                              <Progress value={sectionScore} className="h-2 transition-all duration-500" />
                            </div>
                          )}
                          <div className="space-y-4">
                          {(() => {
                            let gatingYesNoKey: string | null = null;
                            const sectionFieldsState = esgData[activeTab];
                            const visibleFields = section.fields.filter((field: any) => {
                              if (field.type === 'yesno') {
                                gatingYesNoKey = field.key;
                                return true;
                              }
                              if (gatingYesNoKey) {
                                const gateValue = sectionFieldsState[gatingYesNoKey as keyof typeof sectionFieldsState];
                                return gateValue === 'yes';
                              }
                              return true;
                            });
                            return visibleFields.map((field: any) => renderField(field, section.id));
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
              <div className="px-6 py-5 bg-slate-50/50 border-t border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleSaveDraft}
                disabled={saving}
                    variant="outline"
                    className="flex-1 h-11 text-sm font-medium border-2 border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400 text-slate-700 transition-all duration-300 hover:scale-[1.02]"
              >
                    <Save className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:rotate-12" />
                    {saving ? "Saving..." : "Save as Draft"}
              </Button>
              <Button
                onClick={handleSubmitFinal}
                disabled={saving}
                    className="flex-1 h-11 text-sm font-semibold bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 transition-all duration-300 hover:scale-[1.02]"
              >
                    <FileText className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:rotate-12" />
                    {saving ? "Submitting..." : "Submit Assessment"}
              </Button>
            </div>
                <p className="text-xs text-slate-500 text-center mt-3 animate-in fade-in duration-500 delay-200">
                  Your progress is automatically saved
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ESGHealthCheck; 