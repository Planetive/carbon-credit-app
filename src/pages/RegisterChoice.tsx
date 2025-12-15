import MainHeader from "@/components/ui/MainHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Building2, Banknote } from "lucide-react";

const RegisterChoice = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50">
      <MainHeader />
      <div className="max-w-5xl mx-auto px-4 pt-28 pb-16">
        <div className="text-center mb-10">
          <p className="text-sm uppercase tracking-[0.2em] text-teal-600 font-semibold">Sign Up</p>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mt-3">
            Choose your experience
          </h1>
          <p className="text-slate-600 mt-3 max-w-2xl mx-auto">
            Pick the product path that matches your organization. You can switch later if needed.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border border-teal-100 shadow-sm hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="space-y-3">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-teal-50 text-teal-700">
                <Building2 className="h-6 w-6" />
              </div>
              <CardTitle>Carbon Intelligence for Corporates</CardTitle>
              <CardDescription>
                Project initiation, decarbonization planning, and reporting workflows tailored for corporate teams.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-sm text-slate-600 space-y-2 list-disc list-inside">
                <li>Project wizard & reporting</li>
                <li>Portfolio & climate risk views for corporates</li>
                <li>Collaboration with sustainability teams</li>
              </ul>
              <Button asChild className="w-full">
                <Link to="/register?user_type=corporate">Sign up as Corporate</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border border-cyan-100 shadow-sm hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="space-y-3">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-cyan-50 text-cyan-700">
                <Banknote className="h-6 w-6" />
              </div>
              <CardTitle>Carbon Intelligence for Financial Institutions</CardTitle>
              <CardDescription>
                Finance emission calculations, scenario analysis, and portfolio oversight for banks and FIs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-sm text-slate-600 space-y-2 list-disc list-inside">
                <li>Finance & facilitated emissions</li>
                <li>Portfolio climate risk scenarios</li>
                <li>Counterparty and exposure views</li>
              </ul>
              <Button asChild variant="outline" className="w-full">
                <Link to="/register?user_type=financial_institution">Sign up as Financial Institution</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-10">
          <Link to="/" className="text-sm text-slate-500 hover:text-teal-600 transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterChoice;

