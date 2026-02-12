import { useNavigate, useSearchParams } from "react-router-dom";
import { Factory, Leaf, Building2, Globe2, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const EmissionCalculatorChoice = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from");
  const mode = searchParams.get("mode");
  const counterpartyId = searchParams.get("counterpartyId");
  const query = [from, mode, counterpartyId].filter(Boolean).length
    ? `?${searchParams.toString()}`
    : "";

  const goToEPA = () => navigate(`/emission-calculator-epa${query}`);
  const goToUK = () => navigate(`/emission-calculator-uk${query}`);
  const goToIPCC = () => navigate(`/emission-calculator-ipcc${query}`);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <div className="text-center mb-10">
          <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 shadow-lg mb-4">
            <Factory className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Emission Calculator
          </h1>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">
            Choose the version that matches your reporting standard or region.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <Card
            className="group cursor-pointer border-2 border-emerald-200/60 hover:border-emerald-400 hover:shadow-xl transition-all duration-300 overflow-hidden"
            onClick={goToIPCC}
          >
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-emerald-100 group-hover:bg-emerald-200 transition-colors flex-shrink-0">
                  <Globe2 className="h-8 w-8 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-gray-900 mb-1">IPCC Version</h2>
                  <p className="text-sm text-gray-600 mb-4">
                    IPCC emission factors and methodology for globally aligned reporting and national inventories.
                  </p>
                  <Button
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white group-hover:shadow-md"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToIPCC();
                    }}
                  >
                    Open IPCC Calculator
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="group cursor-pointer border-2 border-blue-200/60 hover:border-blue-400 hover:shadow-xl transition-all duration-300 overflow-hidden"
            onClick={goToUK}
          >
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-blue-100 group-hover:bg-blue-200 transition-colors flex-shrink-0">
                  <Building2 className="h-8 w-8 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-gray-900 mb-1">UK Version</h2>
                  <p className="text-sm text-gray-600 mb-4">
                    UK/EBT emission factors and methodology. Best for UK and international reporting standards.
                  </p>
                  <Button
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white group-hover:shadow-md"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToUK();
                    }}
                  >
                    Open UK Calculator
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="group cursor-pointer border-2 border-teal-200/60 hover:border-teal-400 hover:shadow-xl transition-all duration-300 overflow-hidden"
            onClick={goToEPA}
          >
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-teal-100 group-hover:bg-teal-200 transition-colors flex-shrink-0">
                  <Leaf className="h-8 w-8 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-gray-900 mb-1">EPA Version</h2>
                  <p className="text-sm text-gray-600 mb-4">
                    US EPA emission factors and methodology. Best for US reporting and EPA-aligned disclosures.
                  </p>
                  <Button
                    className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white group-hover:shadow-md"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToEPA();
                    }}
                  >
                    Open EPA Calculator
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-sm text-gray-400 mt-8">
          You can switch between versions anytime from this page.
        </p>
      </div>
    </div>
  );
};

export default EmissionCalculatorChoice;
