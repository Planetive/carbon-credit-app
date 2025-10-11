import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Leaf, Users, Shield, CheckCircle, Clock, TrendingUp, ChevronDown, ChevronUp, Save, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";


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

  const saveToDatabase = async (isDraft: boolean = true) => {
    if (!user) return;
    
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
      if (existingAssessment) {
        // Update existing assessment
        result = await supabase
          .from('esg_assessments')
          .update(assessmentData)
          .eq('user_id', user.id);
      } else {
        // Insert new assessment
        result = await supabase
          .from('esg_assessments')
          .insert([assessmentData]);
      }

      if (result.error) {
        throw result.error;
      }

      setExistingAssessment(result.data?.[0] || assessmentData);
      
      toast({
        title: isDraft ? "Draft Saved" : "Assessment Submitted",
        description: isDraft 
          ? "Your draft has been saved successfully. You can continue editing later."
          : "Your ESG assessment has been submitted successfully!",
      });


    } catch (error) {
      console.error('Error saving assessment:', error);
      toast({
        title: "Error",
        description: "Failed to save your assessment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = () => {
    saveToDatabase(true);
  };

  const handleSubmitFinal = () => {
    saveToDatabase(false);
    // Navigate to ESG results page after successful submission
    setTimeout(() => navigate('/esg-results'));
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
    
    return (
      <div key={field.key} className="space-y-2">
        <div className="flex items-start space-x-3">
          <div className={`w-4 h-4 rounded mt-1 flex-shrink-0 ${
            field.type === 'yesno' ? 'bg-gray-400' : 
            field.type === 'number' ? 'bg-yellow-400' : 'bg-blue-400'
          }`}></div>
          <div className="flex-1">
            <Label htmlFor={field.key} className="text-sm font-semibold text-gray-700">
              {field.label}
              {field.unit && (
                <span className="text-xs text-gray-500 ml-1">(Unit: {field.unit})</span>
              )}
            </Label>
            
            {field.type === 'yesno' && (
              <div className="flex space-x-4 mt-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name={field.key}
                    value="yes"
                    checked={value === 'yes'}
                    onChange={(e) => handleInputChange(activeTab, field.key, e.target.value)}
                    className="text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-700">Yes</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name={field.key}
                    value="no"
                    checked={value === 'no'}
                    onChange={(e) => handleInputChange(activeTab, field.key, e.target.value)}
                    className="text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-700">No</span>
                </label>
              </div>
            )}
            
            {field.type === 'number' && (
              <Input
                id={field.key}
                type="number"
                step="any"
                placeholder={`Enter value in ${field.unit}`}
                value={value}
                onChange={(e) => handleInputChange(activeTab, field.key, e.target.value)}
                className="max-w-xs"
              />
            )}
            
            {field.type === 'text' && (
              <Textarea
                id={field.key}
                placeholder="Enter your response"
                value={value}
                onChange={(e) => handleInputChange(activeTab, field.key, e.target.value)}
                className="min-h-[80px] resize-none"
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4 text-teal-600 hover:text-teal-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              ESG Health Check Assessment
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Evaluate your organization's Environmental, Social, and Governance performance 
              with our comprehensive assessment tool.
            </p>
          </div>
        </div>

        {/* Tips Section */}
        <Card className="mt-8 bg-gradient-to-r mb-8 from-teal-500 to-cyan-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="h-12 w-12 bg-white/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">ESG Assessment Tips</h3>
                <ul className="space-y-1 text-sm text-teal-100">
                  <li>• Click on each section to expand and fill out the questions</li>
                  <li>• Be honest and accurate in your responses for better insights</li>
                  <li>• Provide specific examples and measurable data where possible</li>
                  <li>• Save your progress regularly to avoid losing data</li>
                  <li>• If you are not sure about the answer, you can leave it blank or save as Draft to edit it later.</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {tabs.map((tab) => {
            const score = calculateScore(tab.id as keyof ESGData);
            const badge = getScoreBadge(score);
            const Icon = tab.icon;
            
            return (
              <Card 
                key={tab.id} 
                className="bg-white/80 backdrop-blur-sm border-0 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-105"
                onClick={() => setActiveTab(tab.id as keyof ESGData)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-teal-100 rounded-lg flex items-center justify-center">
                        <Icon className="h-5 w-5 text-teal-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{tab.label}</h3>
                        <p className="text-sm text-gray-500">{tab.description}</p>
                      </div>
                    </div>
                    <Badge className={badge.color}>{badge.text}</Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Completion</span>
                      <span className={`font-semibold ${getScoreColor(score)}`}>{score}%</span>
                    </div>
                    <Progress value={score} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tabs */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="border-b border-gray-200">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const score = calculateScore(tab.id as keyof ESGData);
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as keyof ESGData)}
                    className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-teal-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                    {score > 0 && (
                      <Badge 
                        variant="secondary" 
                        className={`ml-2 ${
                          isActive ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-700'
                        }`}
                      >
                        {score}%
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </CardHeader>

          <CardContent className="p-8">
            <div className="space-y-6">
              {getSectionsForTab(activeTab).map((section) => {
                const isExpanded = expandedSections.has(section.id);
                const sectionFields = esgData[activeTab];
                const sectionScore = Math.round(
                  (section.fields.filter(field => sectionFields[field.key as keyof typeof sectionFields] !== '').length / section.fields.length) * 100
                );
                
                return (
                  <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-3">
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-gray-600" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-600" />
                          )}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 text-left">
                              {section.title}
                            </h3>
                            <p className="text-sm text-gray-600 text-left">
                              {section.description}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {section.fields.filter(field => sectionFields[field.key as keyof typeof sectionFields] !== '').length} / {section.fields.length}
                          </div>
                          <div className="text-xs text-gray-500">Questions</div>
                        </div>
                        
                      </div>
                    </button>
                    
                    {isExpanded && (
                      <div className="px-6 py-4 bg-white border-t border-gray-200">
                        <div className="space-y-6">
                          {(() => {
                            let gatingYesNoKey: string | null = null;
                            const sectionFieldsState = esgData[activeTab];
                            const visibleFields = section.fields.filter((field: any) => {
                              if (field.type === 'yesno') {
                                // Always show yes/no questions and reset the gate to this key
                                gatingYesNoKey = field.key;
                                return true;
                              }
                              // For non-yesno fields, if there's an active gate, only show when gate is answered 'yes'
                              if (gatingYesNoKey) {
                                const gateValue = sectionFieldsState[gatingYesNoKey as keyof typeof sectionFieldsState];
                                return gateValue === 'yes';
                              }
                              // No gating applied, show the field
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
            <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-6 border-t border-gray-200">
              <Button
                onClick={handleSaveDraft}
                disabled={saving}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Draft"}
              </Button>
              <Button
                onClick={handleSubmitFinal}
                disabled={saving}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-3"
              >
                <FileText className="h-4 w-4 mr-2" />
                {saving ? "Submitting..." : "Submit Final Assessment"}
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default ESGHealthCheck; 