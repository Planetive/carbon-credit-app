import { Card, CardContent } from "@/components/ui/card";
import { Factory } from "lucide-react";

const SupplyChainIntelligence = () => {
  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center px-4 py-16">
      <Card className="w-full max-w-xl bg-white/90 backdrop-blur-sm border border-red-200/60 shadow-xl rounded-2xl">
        <CardContent className="p-8">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center border border-red-100 mb-2">
              <Factory className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Supply Chain intelligence access restricted
            </h2>
            <p className="text-sm text-red-700 max-w-md">
              You do not currently have access to the Supply Chain intelligence module in this account.
            </p>
            <p className="text-sm text-gray-600 max-w-md">
              Please contact your administrator if you believe you should have access to this part of the platform.
              Use the sidebar to return to Impact Overview or another module.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplyChainIntelligence;
