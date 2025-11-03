import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { EmissionData } from "@/components/emissions/shared/types";
import { CheckCircle2, XCircle, ArrowRight, ArrowLeft } from "lucide-react";

interface Scope3QuestionnaireProps {
  emissionData: EmissionData;
  setEmissionData: React.Dispatch<React.SetStateAction<EmissionData>>;
  onComplete: (mode: 'lca' | 'manual') => void;
}

const Scope3Questionnaire: React.FC<Scope3QuestionnaireProps> = ({
  emissionData,
  setEmissionData,
  onComplete,
}) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [hasLCA, setHasLCA] = useState<boolean | null>(null);
  const [upstreamEmissions, setUpstreamEmissions] = useState<number | ''>('');
  const [downstreamEmissions, setDownstreamEmissions] = useState<number | ''>('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (currentStep > 0) {
      setIsMounted(false);
      setTimeout(() => setIsMounted(true), 50);
    }
  }, [currentStep]);

  const steps = [
    {
      id: 'lca',
      question: 'Do you have lifecycle assessment (LCA) data?',
      description: 'If you have completed LCA studies, you can enter upstream and downstream emissions directly.',
      type: 'yesno' as const,
    },
    {
      id: 'upstream',
      question: 'Enter Upstream Emissions',
      description: 'Please enter your upstream Scope 3 emissions (in kg CO2e)',
      type: 'number' as const,
      condition: hasLCA === true,
    },
    {
      id: 'downstream',
      question: 'Enter Downstream Emissions',
      description: 'Please enter your downstream Scope 3 emissions (in kg CO2e)',
      type: 'number' as const,
      condition: hasLCA === true,
    },
  ];

  const handleYesNoAnswer = (answer: boolean) => {
    setIsAnimating(true);
    setHasLCA(answer);
    
    // Animate out, then transition
    setTimeout(() => {
      setIsAnimating(false);
      if (answer) {
        setCurrentStep(1); // Go to upstream emissions
      } else {
        // Skip to manual calculation
        onComplete('manual');
      }
    }, 400);
  };

  const handleUpstreamSubmit = () => {
    const value = parseFloat(String(upstreamEmissions)) || 0;
    if (value <= 0) {
      toast({
        title: 'Invalid input',
        description: 'Please enter a valid positive number for upstream emissions.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsAnimating(true);
    setTimeout(() => {
      setIsAnimating(false);
      setCurrentStep(2); // Go to downstream emissions
    }, 400);
  };

  const handleDownstreamSubmit = () => {
    const downstream = parseFloat(String(downstreamEmissions)) || 0;
    const upstream = parseFloat(String(upstreamEmissions)) || 0;
    
    if (downstream < 0) {
      toast({
        title: 'Invalid input',
        description: 'Please enter a valid non-negative number for downstream emissions.',
        variant: 'destructive',
      });
      return;
    }

    // Save LCA emissions directly to scope3
    const totalScope3 = upstream + downstream;
    
    setEmissionData(prev => ({
      ...prev,
      scope3: [
        ...prev.scope3.filter(r => r.category !== 'lca_total'),
        {
          id: 'lca-total',
          category: 'lca_total',
          activity: `LCA: Upstream ${upstream} + Downstream ${downstream}`,
          unit: 'kg CO2e',
          quantity: totalScope3,
          emissions: totalScope3,
        }
      ]
    }));

    toast({
      title: 'LCA Data Saved',
      description: `Total Scope 3 emissions: ${totalScope3.toFixed(2)} kg CO2e`,
    });

    onComplete('lca');
  };

  const currentQuestion = steps[currentStep];

  if (!currentQuestion) {
    return null;
  }

  // Question 1: LCA Yes/No
  if (currentStep === 0) {
    return (
      <div className={`space-y-6 transition-all duration-500 ${isAnimating ? 'opacity-0 scale-95 translate-x-4' : isMounted ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-95 -translate-x-4'}`}>
        <div className="text-center space-y-4 py-8">
          {/* Progress Bar */}
          <div className="max-w-2xl mx-auto mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-teal-600">Step 1 of 3</span>
              <span className="text-xs font-medium text-gray-500">33%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-teal-500 to-cyan-500 h-2 rounded-full transition-all duration-500" style={{ width: '33%' }}></div>
            </div>
          </div>
          
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg transform transition-all duration-300 hover:scale-110">
              <span className="text-3xl font-bold text-white">1</span>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            {currentQuestion.question}
          </h3>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {currentQuestion.description}
          </p>
        </div>

        <div className="flex gap-4 justify-center mt-8">
          <Button
            onClick={() => handleYesNoAnswer(true)}
            className="group relative overflow-hidden bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5" />
              <span>Yes</span>
            </div>
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
          </Button>

          <Button
            onClick={() => handleYesNoAnswer(false)}
            variant="outline"
            className="group relative overflow-hidden border-2 border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 px-8 py-6 text-lg font-semibold rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
          >
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5" />
              <span>No</span>
            </div>
          </Button>
        </div>
      </div>
    );
  }

  // Question 2: Upstream Emissions
  if (currentStep === 1) {
    return (
      <div className={`space-y-6 transition-all duration-500 ${isAnimating ? 'opacity-0 scale-95 translate-x-4' : isMounted ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-95 -translate-x-4'}`}>
        <div className="text-center space-y-4 py-8">
          {/* Progress Bar */}
          <div className="max-w-2xl mx-auto mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-blue-600">Step 2 of 3</span>
              <span className="text-xs font-medium text-gray-500">67%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-500" style={{ width: '67%' }}></div>
            </div>
          </div>
          
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-lg transform transition-all duration-300 hover:scale-110">
              <span className="text-3xl font-bold text-white">2</span>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            {currentQuestion.question}
          </h3>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {currentQuestion.description}
          </p>
        </div>

        <div className="max-w-2xl mx-auto space-y-6 mt-8">
          <div className="space-y-2">
            <Label htmlFor="upstream-emissions" className="text-base font-semibold">
              Upstream Emissions (kg CO2e)
            </Label>
            <Input
              id="upstream-emissions"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={upstreamEmissions}
              onChange={(e) => setUpstreamEmissions(e.target.value === '' ? '' : parseFloat(e.target.value))}
              className="text-lg py-6 border-2 focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
            />
            <p className="text-sm text-gray-500">
              Enter total upstream Scope 3 emissions from your LCA data
            </p>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={() => {
                setIsAnimating(true);
                setTimeout(() => {
                  setIsAnimating(false);
                  setCurrentStep(0);
                  setUpstreamEmissions('');
                }, 400);
              }}
              variant="outline"
              className="flex-1 border-2 border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 px-8 py-6 text-lg font-semibold rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
            >
              <div className="flex items-center justify-center gap-3">
                <ArrowLeft className="h-5 w-5" />
                <span>Back</span>
              </div>
            </Button>
            <Button
              onClick={handleUpstreamSubmit}
              disabled={upstreamEmissions === '' || parseFloat(String(upstreamEmissions)) <= 0}
              className="flex-1 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <div className="flex items-center justify-center gap-3">
                <span>Continue</span>
                <ArrowRight className="h-5 w-5" />
              </div>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Question 3: Downstream Emissions
  if (currentStep === 2) {
    return (
      <div className={`space-y-6 transition-all duration-500 ${isAnimating ? 'opacity-0 scale-95 translate-x-4' : isMounted ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-95 -translate-x-4'}`}>
        <div className="text-center space-y-4 py-8">
          {/* Progress Bar */}
          <div className="max-w-2xl mx-auto mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-purple-600">Step 3 of 3</span>
              <span className="text-xs font-medium text-gray-500">100%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500" style={{ width: '100%' }}></div>
            </div>
          </div>
          
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg transform transition-all duration-300 hover:scale-110">
              <span className="text-3xl font-bold text-white">3</span>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            {currentQuestion.question}
          </h3>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {currentQuestion.description}
          </p>
        </div>

        <div className="max-w-2xl mx-auto space-y-6 mt-8">
          <div className="space-y-2">
            <Label htmlFor="downstream-emissions" className="text-base font-semibold">
              Downstream Emissions (kg CO2e)
            </Label>
            <Input
              id="downstream-emissions"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={downstreamEmissions}
              onChange={(e) => setDownstreamEmissions(e.target.value === '' ? '' : parseFloat(e.target.value))}
              className="text-lg py-6 border-2 focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
            />
            <p className="text-sm text-gray-500">
              Enter total downstream Scope 3 emissions from your LCA data
            </p>
          </div>

          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-teal-900">Upstream Emissions:</span>
              <span className="text-sm font-semibold text-teal-700">{parseFloat(String(upstreamEmissions)) || 0} kg CO2e</span>
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={() => {
                setIsAnimating(true);
                setTimeout(() => {
                  setIsAnimating(false);
                  setCurrentStep(1);
                  setDownstreamEmissions('');
                }, 400);
              }}
              variant="outline"
              className="flex-1 border-2 border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 px-8 py-6 text-lg font-semibold rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
            >
              <div className="flex items-center justify-center gap-3">
                <ArrowLeft className="h-5 w-5" />
                <span>Back</span>
              </div>
            </Button>
            <Button
              onClick={handleDownstreamSubmit}
              disabled={downstreamEmissions === '' || parseFloat(String(downstreamEmissions)) < 0}
              className="flex-1 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <div className="flex items-center justify-center gap-3">
                <span>Complete & Save</span>
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Scope3Questionnaire;

