// Methodology matching and feasibility assessment service

export interface Methodology {
  id: string;
  name: string;
  standard: 'Verra' | 'Gold Standard' | 'American Carbon Registry' | 'Climate Action Reserve';
  projectTypes: string[];
  countries: string[];
  minScale: number; // hectares
  maxScale: number; // hectares
  technologyTypes: string[];
  requirements: string[];
  exclusions: string[];
  monitoringRequirements: string[];
  baselineRequirements: string[];
  additionalityCriteria: string[];
}

export interface FeasibilityResult {
  standard: string;
  eligible: boolean;
  score: number;
  reasoning: string;
  improvements: string[];
  requirements: string[];
  exclusions: string[];
}

export interface MethodologyMatch {
  id: string;
  name: string;
  standard: string;
  eligibility: boolean;
  reasoning: string;
  suggestions: string[];
  matchScore: number;
  requirements: string[];
  exclusions: string[];
}

// Mock methodology database (in real implementation, this would come from your database)
const METHODOLOGIES: Methodology[] = [
  {
    id: "VM0006",
    name: "Afforestation/Reforestation",
    standard: "Verra",
    projectTypes: ["forestry", "land-use"],
    countries: ["us", "ca", "br", "au", "in", "cn", "de", "fr"],
    minScale: 100,
    maxScale: 100000,
    technologyTypes: ["afforestation", "reforestation", "restoration"],
    requirements: [
      "Clear land ownership documentation",
      "Baseline carbon stock assessment",
      "Additionality demonstration",
      "Permanence risk assessment"
    ],
    exclusions: [
      "Projects on land with existing forest cover",
      "Projects in protected areas without proper permits"
    ],
    monitoringRequirements: [
      "Annual carbon stock measurements",
      "Permanent sample plots",
      "Remote sensing validation"
    ],
    baselineRequirements: [
      "Historical land use analysis",
      "Reference region identification",
      "Baseline carbon stock calculation"
    ],
    additionalityCriteria: [
      "Financial barrier analysis",
      "Regulatory barrier analysis",
      "Investment barrier analysis"
    ]
  },
  {
    id: "VM0007",
    name: "Improved Forest Management",
    standard: "Verra",
    projectTypes: ["forestry"],
    countries: ["us", "ca", "br", "au", "in", "cn", "de", "fr"],
    minScale: 500,
    maxScale: 50000,
    technologyTypes: ["forest-management", "conservation", "sustainable-logging"],
    requirements: [
      "Forest management plan",
      "Historical management practices documentation",
      "Carbon stock baseline",
      "Leakage assessment"
    ],
    exclusions: [
      "Projects in primary forests",
      "Projects with unsustainable logging practices"
    ],
    monitoringRequirements: [
      "Annual forest inventory",
      "Growth rate monitoring",
      "Harvest tracking"
    ],
    baselineRequirements: [
      "Historical management analysis",
      "Reference region identification",
      "Baseline carbon stock"
    ],
    additionalityCriteria: [
      "Management practice changes",
      "Financial barrier analysis",
      "Regulatory compliance"
    ]
  },
  {
    id: "GS-VER",
    name: "Verified Carbon Standard",
    standard: "Gold Standard",
    projectTypes: ["renewable", "energy-efficiency", "forestry"],
    countries: ["us", "ca", "br", "au", "in", "cn", "de", "fr"],
    minScale: 1000,
    maxScale: 100000,
    technologyTypes: ["solar", "wind", "biomass", "energy-efficiency"],
    requirements: [
      "Sustainable development goals alignment",
      "Stakeholder consultation",
      "Environmental impact assessment",
      "Social impact assessment"
    ],
    exclusions: [
      "Projects with negative social impacts",
      "Projects in conflict zones",
      "Projects without community consultation"
    ],
    monitoringRequirements: [
      "Energy generation monitoring",
      "Social impact monitoring",
      "Environmental impact monitoring"
    ],
    baselineRequirements: [
      "Grid emission factor calculation",
      "Energy demand baseline",
      "Social baseline assessment"
    ],
    additionalityCriteria: [
      "Financial barrier analysis",
      "Technology barrier analysis",
      "Institutional barrier analysis"
    ]
  },
  {
    id: "VM0009",
    name: "Avoided Conversion of Grasslands and Shrublands",
    standard: "Verra",
    projectTypes: ["forestry", "land-use"],
    countries: ["us", "ca", "br", "au"],
    minScale: 200,
    maxScale: 20000,
    technologyTypes: ["conservation", "grassland-management"],
    requirements: [
      "Grassland ecosystem documentation",
      "Conversion pressure assessment",
      "Carbon stock baseline",
      "Permanence risk assessment"
    ],
    exclusions: [
      "Projects in areas without conversion pressure",
      "Projects in protected areas"
    ],
    monitoringRequirements: [
      "Annual vegetation monitoring",
      "Land use change detection",
      "Carbon stock measurements"
    ],
    baselineRequirements: [
      "Historical land use analysis",
      "Conversion pressure analysis",
      "Reference region identification"
    ],
    additionalityCriteria: [
      "Financial barrier analysis",
      "Regulatory barrier analysis",
      "Institutional barrier analysis"
    ]
  }
];

export class MethodologyMatcher {
  private methodologies: Methodology[];

  constructor(methodologies: Methodology[] = METHODOLOGIES) {
    this.methodologies = methodologies;
  }

  // Match methodologies based on project inputs
  matchMethodologies(projectData: any, mode: 'discovery' | 'precise' = 'discovery'): MethodologyMatch[] {
    const matches: MethodologyMatch[] = [];

    for (const methodology of this.methodologies) {
      const match = this.evaluateMethodology(methodology, projectData, mode);
      if (match.matchScore > 0) {
        matches.push(match);
      }
    }

    // Sort by match score descending
    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  // Evaluate a single methodology against project data
  private evaluateMethodology(methodology: Methodology, projectData: any, mode: 'discovery' | 'precise'): MethodologyMatch {
    let score = 0;
    let reasoning = "";
    const suggestions: string[] = [];
    let eligible = true;

    // Check project type compatibility
    if (methodology.projectTypes.includes(projectData.projectType)) {
      score += 25;
      reasoning += "Project type matches methodology requirements. ";
    } else {
      score += 5;
      reasoning += "Project type partially compatible. ";
      suggestions.push("Consider alternative project types for better methodology match");
    }

    // Check country compatibility
    if (methodology.countries.includes(projectData.country)) {
      score += 20;
      reasoning += "Country is eligible for this methodology. ";
    } else {
      score -= 10;
      reasoning += "Country not eligible for this methodology. ";
      eligible = false;
    }

    // Check scale requirements
    const landArea = Number(projectData.landArea) || 0;
    if (landArea >= methodology.minScale && landArea <= methodology.maxScale) {
      score += 25;
      reasoning += "Project scale within methodology requirements. ";
    } else if (landArea < methodology.minScale) {
      score += Math.max(0, (landArea / methodology.minScale) * 15);
      reasoning += `Project scale below minimum requirement (${methodology.minScale} ha). `;
      suggestions.push(`Increase project scale to at least ${methodology.minScale} hectares`);
      eligible = false;
    } else {
      score += 15;
      reasoning += "Project scale exceeds maximum, may need to split into multiple projects. ";
      suggestions.push("Consider splitting project into smaller units");
    }

    // Check technology compatibility (for precise mode)
    if (mode === 'precise' && projectData.technology) {
      const techMatch = methodology.technologyTypes.some(tech => 
        projectData.technology.toLowerCase().includes(tech.toLowerCase())
      );
      if (techMatch) {
        score += 20;
        reasoning += "Technology aligns with methodology requirements. ";
      } else {
        score += 5;
        reasoning += "Technology may need adjustment for methodology compliance. ";
        suggestions.push("Review technology description for methodology alignment");
      }
    }

    // Check requirements (for precise mode)
    if (mode === 'precise') {
      const missingRequirements = methodology.requirements.filter(req => 
        !this.checkRequirement(req, projectData)
      );
      if (missingRequirements.length === 0) {
        score += 10;
        reasoning += "All methodology requirements can be met. ";
      } else {
        score += Math.max(0, 10 - missingRequirements.length * 2);
        reasoning += `Some requirements need attention: ${missingRequirements.join(", ")}. `;
        suggestions.push(...missingRequirements.map(req => `Address: ${req}`));
      }
    }

    // Check exclusions
    const exclusions = methodology.exclusions.filter(exclusion => 
      this.checkExclusion(exclusion, projectData)
    );
    if (exclusions.length > 0) {
      score = 0;
      eligible = false;
      reasoning += `Project excluded by: ${exclusions.join(", ")}. `;
    }

    return {
      id: methodology.id,
      name: methodology.name,
      standard: methodology.standard,
      eligibility: eligible && score >= 50,
      reasoning: reasoning.trim(),
      suggestions,
      matchScore: Math.min(100, Math.max(0, score)),
      requirements: methodology.requirements,
      exclusions: methodology.exclusions
    };
  }

  // Assess feasibility against major carbon standards
  assessFeasibility(projectData: any): Record<string, FeasibilityResult> {
    const standards = ['Verra', 'Gold Standard', 'American Carbon Registry', 'Climate Action Reserve'];
    const results: Record<string, FeasibilityResult> = {};

    for (const standard of standards) {
      const standardMethodologies = this.methodologies.filter(m => m.standard === standard);
      const matches = this.matchMethodologies(projectData, 'precise')
        .filter(m => m.standard === standard);

      const bestMatch = matches[0];
      const eligibleMatches = matches.filter(m => m.eligibility);

      if (eligibleMatches.length > 0) {
        const avgScore = eligibleMatches.reduce((sum, m) => sum + m.matchScore, 0) / eligibleMatches.length;
        results[standard.toLowerCase().replace(/\s+/g, '')] = {
          standard,
          eligible: true,
          score: Math.round(avgScore),
          reasoning: `${eligibleMatches.length} eligible methodology(ies) found`,
          improvements: bestMatch?.suggestions || [],
          requirements: bestMatch?.requirements || [],
          exclusions: bestMatch?.exclusions || []
        };
      } else if (matches.length > 0) {
        const bestMatch = matches[0];
        results[standard.toLowerCase().replace(/\s+/g, '')] = {
          standard,
          eligible: false,
          score: Math.round(bestMatch.matchScore),
          reasoning: bestMatch.reasoning,
          improvements: bestMatch.suggestions,
          requirements: bestMatch.requirements,
          exclusions: bestMatch.exclusions
        };
      } else {
        results[standard.toLowerCase().replace(/\s+/g, '')] = {
          standard,
          eligible: false,
          score: 0,
          reasoning: "No compatible methodologies found for this standard",
          improvements: ["Consider alternative project types or standards"],
          requirements: [],
          exclusions: []
        };
      }
    }

    // Calculate overall recommendation
    const eligibleStandards = Object.values(results).filter(r => r.eligible);
    const overallScore = eligibleStandards.length > 0 
      ? Math.round(eligibleStandards.reduce((sum, r) => sum + r.score, 0) / eligibleStandards.length)
      : 0;

    results.overall = {
      standard: "Overall",
      eligible: eligibleStandards.length > 0,
      score: overallScore,
      reasoning: eligibleStandards.length > 0 
        ? `Project is eligible for ${eligibleStandards.length} standard(s)`
        : "Project not eligible for any major standards",
      improvements: eligibleStandards.length > 0 
        ? ["Focus on highest-scoring standard", "Address improvement suggestions"]
        : ["Consider alternative project types", "Review project parameters"],
      requirements: [],
      exclusions: []
    };

    return results;
  }

  // Helper methods for requirement and exclusion checking
  private checkRequirement(requirement: string, projectData: any): boolean {
    // Simplified requirement checking logic
    // In a real implementation, this would be more sophisticated
    const req = requirement.toLowerCase();
    if (req.includes("ownership") && projectData.projectDeveloper) return true;
    if (req.includes("baseline") && projectData.landArea) return true;
    if (req.includes("monitoring") && projectData.monitoringPlan) return true;
    return false;
  }

  private checkExclusion(exclusion: string, projectData: any): boolean {
    // Simplified exclusion checking logic
    const excl = exclusion.toLowerCase();
    if (excl.includes("protected") && projectData.landUse === "protected") return true;
    if (excl.includes("primary") && projectData.landUse === "primary-forest") return true;
    return false;
  }

  // Get methodology by ID
  getMethodology(id: string): Methodology | undefined {
    return this.methodologies.find(m => m.id === id);
  }

  // Get all methodologies for a standard
  getMethodologiesForStandard(standard: string): Methodology[] {
    return this.methodologies.filter(m => m.standard === standard);
  }
}

// Export singleton instance
export const methodologyMatcher = new MethodologyMatcher(); 