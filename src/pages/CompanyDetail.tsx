import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Building2, Wallet, Calculator, TrendingUp, BarChart3, MapPin, Shield, Calendar, Hash, AlertTriangle, Layers } from 'lucide-react';

const currencyFormat = (value: number) => (Number(value) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

interface PortfolioEntry {
  id: string;
  company: string;
  amount: number;
  counterparty: string;
  sector: string;
  geography: string;
  probabilityOfDefault: number;
  lossGivenDefault: number;
  tenor: number;
}

const CompanyDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation() as any;
  
  // Handle both old and new data structures for backward compatibility
  const portfolioData: PortfolioEntry = location?.state || {
    company: 'Company',
    amount: 0,
    counterparty: 'N/A',
    sector: 'N/A',
    geography: 'N/A',
    probabilityOfDefault: 0,
    lossGivenDefault: 0,
    tenor: 0
  };
  
  const {
    company,
    amount,
    counterparty,
    sector,
    geography,
    probabilityOfDefault,
    lossGivenDefault,
    tenor
  } = portfolioData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50/30">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate('/bank-portfolio')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Portfolio
          </Button>
        </div>

        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-600/90 to-cyan-600/90"></div>
          <div className="relative p-8 md:p-12">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-16 w-16 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Building2 className="h-8 w-8" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">{company}</h1>
                    <p className="text-teal-100 text-lg">Loan Portfolio Management</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet className="h-5 w-5" />
                      <span className="text-sm font-medium">Loan Amount</span>
                    </div>
                    <div className="text-xl md:text-2xl font-bold">{currencyFormat(amount)} PKR</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Hash className="h-5 w-5" />
                      <span className="text-sm font-medium">Counterparty ID</span>
                    </div>
                    <div className="text-xl md:text-2xl font-bold">{counterparty}</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5" />
                      <span className="text-sm font-medium">Sector</span>
                    </div>
                    <div className="text-xl md:text-2xl font-bold">{sector}</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-5 w-5" />
                      <span className="text-sm font-medium">Geography</span>
                    </div>
                    <div className="text-xl md:text-2xl font-bold">{geography}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Credit Risk Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Credit Risk & Loan Details
            </CardTitle>
            <CardDescription>Key risk metrics and loan terms for this counterparty</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium text-red-700">Probability of Default</span>
                </div>
                <div className="text-3xl font-bold text-red-600">{probabilityOfDefault}%</div>
                <div className="text-xs text-red-500 mt-1">Baseline PD</div>
              </div>
              
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-orange-600" />
                  <span className="text-sm font-medium text-orange-700">Loss Given Default</span>
                </div>
                <div className="text-3xl font-bold text-orange-600">{lossGivenDefault}%</div>
                <div className="text-xs text-orange-500 mt-1">Baseline LGD</div>
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">Tenor/Maturity</span>
                </div>
                <div className="text-3xl font-bold text-blue-600">{tenor}</div>
                <div className="text-xs text-blue-500 mt-1">months</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Calculator className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Finance Emission</CardTitle>
                  <CardDescription>Calculate financed emissions for this loan</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Assess the carbon footprint associated with this specific loan using PCAF methodology.
              </p>
              <Button
                onClick={() => navigate('/finance-emission', { state: { mode: 'finance', ...portfolioData } })}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Open Finance Emission Calculator
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Facilitated Emission</CardTitle>
                  <CardDescription>Calculate facilitated emissions for this loan</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Evaluate the environmental impact of facilitating this loan using advanced metrics.
              </p>
              <Button
                variant="secondary"
                onClick={() => navigate('/finance-emission', { state: { mode: 'facilitated', ...portfolioData } })}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Open Facilitated Emission Calculator
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-red-50 to-rose-50">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Risk Assessment</CardTitle>
                  <CardDescription>Analyze credit and climate risks for this loan</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Comprehensive risk analysis including credit risk, climate risk, and portfolio impact assessment.
              </p>
              <Button
                onClick={() => navigate('/risk-assessment', { state: { ...portfolioData } })}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                Open Risk Assessment
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-purple-50 to-violet-50">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Layers className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Scenario Building</CardTitle>
                  <CardDescription>Build and analyze different risk scenarios</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Create and evaluate various scenarios including stress testing, climate scenarios, and market conditions.
              </p>
              <Button
                onClick={() => navigate('/pcaf-scenario-building', { state: { ...portfolioData } })}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                Open PCAF Scenario Builder
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CompanyDetail;


