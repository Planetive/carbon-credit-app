import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, ArrowRight, ArrowLeft } from "lucide-react";

interface InitialQuestionnaireProps {
  onComplete: (hasLCA: boolean) => void;
}

const InitialQuestionnaire: React.FC<InitialQuestionnaireProps> = ({ onComplete }) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [hasLCA, setHasLCA] = useState<boolean | null>(null);
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

  const handleYesNoAnswer = (answer: boolean) => {
    setIsAnimating(true);
    setHasLCA(answer);
    
    // Animate out, then transition
    setTimeout(() => {
      setIsAnimating(false);
      if (!answer) {
        // Skip to manual calculation
        onComplete(false);
      } else {
        // For now, just complete with LCA = true
        // The LCAInputForm will handle the actual data entry
        onComplete(true);
      }
    }, 400);
  };

  // Question 1: LCA Yes/No
  return (
    <div className={`space-y-6 transition-all duration-500 ${isAnimating ? 'opacity-0 scale-95 translate-x-4' : isMounted ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-95 -translate-x-4'}`}>
      <div className="text-center space-y-4 py-8">
        {/* Progress Bar */}
        <div className="max-w-2xl mx-auto mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-teal-600">Step 1 of 1</span>
            <span className="text-xs font-medium text-gray-500">100%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-500 h-2 rounded-full transition-all duration-500" style={{ width: '100%' }}></div>
          </div>
        </div>
        
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg transform transition-all duration-300 hover:scale-110">
            <span className="text-3xl font-bold text-white">?</span>
          </div>
        </div>
        <h3 className="text-2xl font-bold text-gray-900">
          Do you have lifecycle assessment (LCA) data?
        </h3>
        <p className="text-gray-600 max-w-2xl mx-auto">
          If you have completed LCA studies for all scopes, you can enter your Scope 1, 2, and 3 (Upstream & Downstream) emissions directly. Otherwise, you can calculate emissions manually using our detailed forms.
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
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
    </div>
  );
};

export default InitialQuestionnaire;
