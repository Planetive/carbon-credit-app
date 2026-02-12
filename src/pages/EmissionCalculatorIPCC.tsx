import { useNavigate, useSearchParams } from "react-router-dom";
import { Factory, Globe2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const RESTRICTED_IPCC_EMAILS = ["asghar.hayat@marienergies.com.pk"];

const EmissionCalculatorIPCC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const email = user?.email?.toLowerCase() || "";
  const isRestrictedUser = RESTRICTED_IPCC_EMAILS.includes(email);

  const from = searchParams.get("from");
  const mode = searchParams.get("mode");
  const counterpartyId = searchParams.get("counterpartyId");
  const query = [from, mode, counterpartyId].filter(Boolean).length
    ? `?${searchParams.toString()}`
    : "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex flex-col">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 px-6 sm:px-8 py-4 sm:py-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate(`/emission-calculator${query}`)}
            className="text-gray-600 hover:text-teal-600 hover:bg-teal-50/50 rounded-lg px-3 py-2 transition-all duration-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="text-sm font-medium">Back to version choice</span>
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl shadow-lg">
            <Globe2 className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              IPCC Emission Calculator
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              IPCC emission factors and global climate methodology. Based on Intergovernmental Panel on Climate Change guidelines.
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 sm:p-8 bg-gradient-to-br from-gray-50/50 via-white to-gray-50/50 flex items-center justify-center">
        <div className="w-full max-w-3xl">
          <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/60 shadow-xl rounded-2xl">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-50">
                    <Factory className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      IPCC methodology overview
                    </h2>
                    <p className="text-sm text-gray-600">
                      Best for international reporting, national inventories, and globally aligned carbon accounting frameworks.
                    </p>
                  </div>
                </div>

                {isRestrictedUser ? (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50/70 px-4 py-3 text-sm text-red-700">
                    You do not currently have access to the IPCC emission factors and methodology in this calculator.
                    Please contact your administrator if you believe you should have access to this part of the tool.
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-800">
                    The IPCC calculator module is being rolled out to selected accounts.
                    For now, please continue using the UK or EPA versions for your detailed calculations.
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    onClick={() => navigate(`/emission-calculator${query}`)}
                  >
                    Choose another version
                  </Button>
                  <Button
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                    onClick={() => navigate(`/emission-calculator-uk${query}`)}
                  >
                    Go to UK Calculator
                  </Button>
                  <Button
                    variant="outline"
                    className="border-teal-200 text-teal-700 hover:bg-teal-50"
                    onClick={() => navigate(`/emission-calculator-epa${query}`)}
                  >
                    Go to EPA Calculator
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default EmissionCalculatorIPCC;

