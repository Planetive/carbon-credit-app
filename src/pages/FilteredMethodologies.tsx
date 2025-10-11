import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/ui/AppHeader";

const FilteredMethodologies = () => {
  const location = useLocation();
  const state = location.state as any;
  const [methodologies, setMethodologies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!state) {
      setError("No filter criteria provided.");
      setLoading(false);
      return;
    }
    async function fetchMethodologies() {
      setLoading(true);
      setError(null);
      const { areaOfInterest, type, goal } = state;
      try {
        const { data, error } = await supabase
          .from("global_projects" as any)
          .select("Methodology")
          .eq("Area of Interest", areaOfInterest)
          .eq("Type", type)
          .eq("End Goal", goal);
        if (error) {
          setError(error.message);
          setMethodologies([]);
        } else {
          const unique = Array.from(new Set((data || []).map((d: any) => d.Methodology).filter(Boolean)));
          setMethodologies(unique);
        }
      } catch (err: any) {
        setError(err.message || String(err));
        setMethodologies([]);
      }
      setLoading(false);
    }
    fetchMethodologies();
  }, [state]);

  return (
    <>
      <AppHeader />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex flex-col items-center py-10">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8 text-center">Recommended Methodologies</h1>
          {state && (
            <div className="flex flex-wrap gap-4 mb-8 justify-center">
              <div className="flex items-center gap-2 bg-white rounded px-3 py-1 shadow border">
                <span className="font-semibold text-gray-600">Area of Interest:</span>
                <span className="text-primary">{state.areaOfInterest || '-'}</span>
              </div>
              <div className="flex items-center gap-2 bg-white rounded px-3 py-1 shadow border">
                <span className="font-semibold text-gray-600">Type:</span>
                <span className="text-primary">{state.type || '-'}</span>
              </div>
              <div className="flex items-center gap-2 bg-white rounded px-3 py-1 shadow border">
                <span className="font-semibold text-gray-600">Goal:</span>
                <span className="text-primary">{state.goal || '-'}</span>
              </div>
            </div>
          )}
          {loading ? (
            <div className="text-lg text-gray-500 text-center">Loading methodologies...</div>
          ) : error ? (
            <div className="text-red-500 text-center">{error}</div>
          ) : methodologies.length === 0 ? (
            <div className="text-lg text-gray-500 text-center">No methodologies found for the selected criteria.</div>
          ) : (
            <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              {methodologies.map((method, idx) => (
                <li key={method} className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center hover:scale-105 transition-transform border-t-4 border-primary">
                  <span className="text-xl font-semibold text-primary mb-2">{method}</span>
                  <span className="text-gray-500">Methodology #{idx + 1}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
};

export default FilteredMethodologies; 