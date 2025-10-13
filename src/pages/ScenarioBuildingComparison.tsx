import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Code, Zap, FileText } from 'lucide-react';

// Import both versions
import PCAFScenarioBuilding from './PCAFScenarioBuilding';
import SimpleScenarioBuilding from './SimpleScenarioBuilding';

const ScenarioBuildingComparison: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'simple' | 'complex'>('simple');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Scenario Building Comparison</h1>
              <p className="mt-2 text-gray-600">
                Compare the simplified TCFD workflow vs. the detailed PCAF approach
              </p>
            </div>
            <Badge variant="outline" className="text-sm">
              Comparison Mode
            </Badge>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('simple')}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === 'simple'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Zap className="h-4 w-4" />
                <span>Simple TCFD Workflow</span>
                <Badge variant="secondary" className="text-xs">Recommended</Badge>
              </button>
              <button
                onClick={() => setActiveTab('complex')}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === 'complex'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Code className="h-4 w-4" />
                <span>Complex PCAF Approach</span>
                <Badge variant="outline" className="text-xs">Detailed</Badge>
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="relative">
          {/* Simple Version */}
          {activeTab === 'simple' && (
            <div className="border-2 border-green-200 rounded-lg overflow-hidden">
              <SimpleScenarioBuilding />
            </div>
          )}

          {/* Complex Version */}
          {activeTab === 'complex' && (
            <div className="border-2 border-blue-200 rounded-lg overflow-hidden">
              <PCAFScenarioBuilding />
            </div>
          )}
        </div>

        {/* Back Button */}
        <div className="mt-8">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Portfolio</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ScenarioBuildingComparison;
