import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import ReactCountryFlag from "react-country-flag";

// Add a normalization function for country names
function normalizeCountryName(name: string) {
  if (!name) return "";
  const map: Record<string, string> = {
    // United Kingdom
    "UK": "United Kingdom",
    "United Kingdom": "United Kingdom",
    // European Union
    "EU": "European Union",
    "European Union": "European Union",
    // UAE
    "UAE": "UAE",
    "United Arab Emirates": "UAE",
    // Saudi Arabia
    "Saudi Arabia": "Saudi Arabia",
    // Norway
    "Norway": "Norway",
    // Nigeria
    "Nigeria": "Nigeria",
    // Netherlands
    "Netherlands": "Netherlands",
    // Japan
    "Japan": "Japan",
    // China
    "China": "China",
    // Canada
    "Canada": "Canada",
    // Australia
    "Australia": "Australia",
    // South Africa
    "South Africa": "South Africa",
    // United States
    "United States": "United States",
    "USA": "United States",
    "US": "United States",
  };
  return map[name.trim()] || name.trim();
}

// Function to get country code for react-country-flag
function getCountryCode(country: string) {
  const countryCodeMap: Record<string, string> = {
    "United Kingdom": "GB",
    "UK": "GB",
    "European Union": "EU",
    "EU": "EU",
    "UAE": "AE",
    "United Arab Emirates": "AE",
    "Saudi Arabia": "SA",
    "Norway": "NO",
    "Nigeria": "NG",
    "Netherlands": "NL",
    "Japan": "JP",
    "China": "CN",
    "United States": "US",
    "USA": "US",
    "US": "US",
    "Canada": "CA",
    "Australia": "AU",
    "South Africa": "ZA",
    "United States": "US",
    "USA": "US",
    "US": "US",
    "Brazil": "BR",
    "Mexico": "MX",
    "Argentina": "AR",
    "Chile": "CL",
    "Peru": "PE",
    "Venezuela": "VE",
    "Spain": "ES",
    "Portugal": "PT",
    "Sweden": "SE",
    "Switzerland": "CH",
    "Austria": "AT",
    "Belgium": "BE",
    "Poland": "PL",
    "Czech Republic": "CZ",
    "Hungary": "HU",
    "Romania": "RO",
    "Bulgaria": "BG",
    "Greece": "GR",
    "Turkey": "TR",
    "Ukraine": "UA",
    "Russia": "RU",
    "Belarus": "BY",
    "Estonia": "EE",
    "Latvia": "LV",
    "Lithuania": "LT",
    "Slovakia": "SK",
    "Slovenia": "SI",
    "Croatia": "HR",
    "Serbia": "RS",
    "Bosnia and Herzegovina": "BA",
    "Montenegro": "ME",
    "North Macedonia": "MK",
    "Albania": "AL",
    "Kosovo": "XK",
    "Moldova": "MD",
    "Georgia": "GE",
    "Armenia": "AM",
    "Azerbaijan": "AZ",
    "Kyrgyzstan": "KG",
    "Tajikistan": "TJ",
    "Turkmenistan": "TM",
    "Uzbekistan": "UZ",
    "Mongolia": "MN",
    "North Korea": "KP",
    "South Korea": "KR",
    "Taiwan": "TW",
    "Hong Kong": "HK",
    "Macau": "MO",
    "Vietnam": "VN",
    "Thailand": "TH",
    "Cambodia": "KH",
    "Laos": "LA",
    "Myanmar": "MM",
    "Malaysia": "MY",
    "Singapore": "SG",
    "Philippines": "PH",
    "Brunei": "BN",
    "East Timor": "TL",
    "Papua New Guinea": "PG",
    "Fiji": "FJ",
    "New Zealand": "NZ",
    "Vanuatu": "VU",
    "Solomon Islands": "SB",
    "Samoa": "WS",
    "Tonga": "TO",
    "Kiribati": "KI",
    "Tuvalu": "TV",
    "Nauru": "NR",
    "Palau": "PW",
    "Marshall Islands": "MH",
    "Micronesia": "FM",
    "Israel": "IL",
    "Palestine": "PS",
    "Lebanon": "LB",
    "Syria": "SY",
    "Iraq": "IQ",
    "Iran": "IR",
    "Afghanistan": "AF",
    "Pakistan": "PK",
    "Bangladesh": "BD",
    "Sri Lanka": "LK",
    "Nepal": "NP",
    "Bhutan": "BT",
    "Maldives": "MV",
    "Yemen": "YE",
    "Oman": "OM",
    "Qatar": "QA",
    "Bahrain": "BH",
    "Jordan": "JO",
    "Morocco": "MA",
    "Algeria": "DZ",
    "Tunisia": "TN",
    "Libya": "LY",
    "Sudan": "SD",
    "South Sudan": "SS",
    "Ethiopia": "ET",
    "Eritrea": "ER",
    "Djibouti": "DJ",
    "Somalia": "SO",
    "Kenya": "KE",
    "Uganda": "UG",
    "Tanzania": "TZ",
    "Rwanda": "RW",
    "Burundi": "BI",
    "Democratic Republic of the Congo": "CD",
    "Republic of the Congo": "CG",
    "Central African Republic": "CF",
    "Chad": "TD",
    "Cameroon": "CM",
    "Gabon": "GA",
    "Equatorial Guinea": "GQ",
    "São Tomé and Príncipe": "ST",
    "Angola": "AO",
    "Zambia": "ZM",
    "Zimbabwe": "ZW",
    "Botswana": "BW",
    "Namibia": "NA",
    "Lesotho": "LS",
    "Eswatini": "SZ",
    "Madagascar": "MG",
    "Mauritius": "MU",
    "Seychelles": "SC",
    "Comoros": "KM",
    "Cape Verde": "CV",
    "Guinea-Bissau": "GW",
    "Guinea": "GN",
    "Sierra Leone": "SL",
    "Liberia": "LR",
    "Ivory Coast": "CI",
    "Ghana": "GH",
    "Togo": "TG",
    "Benin": "BJ",
    "Mali": "ML",
    "Burkina Faso": "BF",
    "Niger": "NE",
    "Mauritania": "MR",
    "Senegal": "SN",
    "Gambia": "GM",
    "Colombia": "CO",
    "Denmark": "DK",
    "Egypt": "EG",
    "Finland": "FI",
    "France": "FR",
    "Germany": "DE",
    "Iceland": "IS",
    "India": "IN",
    "Indonesia": "ID",
    "Italy": "IT",
    "Kazakhstan": "KZ",
    "Kuwait": "KW",
  };

  return countryCodeMap[country] || null;
}

const ExploreCCUSPolicies = () => {
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [managementStrategies, setManagementStrategies] = useState<Database["public"]["Tables"]["ccus_management_strategies"]["Row"][]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [{ data: policiesData, error: policiesError }, { data: strategiesData, error: strategiesError }] = await Promise.all([
        supabase.from("ccus_policies").select("*"),
        supabase.from("ccus_management_strategies").select("*")
      ]);
      if (!policiesError && policiesData) {
        setPolicies(policiesData);
      }
      if (!strategiesError && strategiesData) {
        setManagementStrategies(strategiesData);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // Get unique countries
  const countries = Array.from(new Set(policies.map((p: any) => p["Country"]).filter(Boolean)));

  // Helper to get Regulatory Landscapes for a country
  const getStrategyForCountry = (country: string) => {
    const norm = normalizeCountryName(country);
    const found = managementStrategies.find((s: any) => normalizeCountryName(s.country) === norm);
    return found;
  };

  // Sort countries: those with regulatory landscapes first, then others
  const sortedCountries = countries.sort((a, b) => {
    const aHasStrategy = !!getStrategyForCountry(a);
    const bHasStrategy = !!getStrategyForCountry(b);
    
    if (aHasStrategy && !bHasStrategy) return -1; // a comes first
    if (!aHasStrategy && bHasStrategy) return 1;  // b comes first
    return a.localeCompare(b); // alphabetical order for same type
  });

  // Filter countries based on search query
  const filteredCountries = sortedCountries.filter((country) => {
    const displayCountry = normalizeCountryName(country);
    return displayCountry.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/20 relative">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-200/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-cyan-200/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 text-teal-600 hover:text-teal-700 hover:bg-teal-50 transition-all duration-300"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">Explore CCUS Policies in Different Regions</h1>
        <p className="text-gray-600 mb-6">Select a country to view detailed CCUS policies and regulatory landscapes</p>
        
        {/* Search Bar */}
        <div className="mb-6 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search countries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border-teal-200 focus:border-teal-400 focus:ring-teal-400 rounded-lg"
            />
          </div>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : (
          <>
            {filteredCountries.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No countries found matching "{searchQuery}"</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {filteredCountries.map((country) => {
              const displayCountry = normalizeCountryName(country);
              const countryCode = getCountryCode(displayCountry);
              const hasStrategy = !!getStrategyForCountry(country);
              return (
                <Card
                  key={country}
                  className="bg-white/90 backdrop-blur-sm border-teal-200/50 cursor-pointer relative transition-all duration-300 hover:shadow-xl hover:scale-105 hover:border-teal-300 shadow-md"

                  onClick={() => navigate(`/ccus-management-strategy/${encodeURIComponent(country)}`)}
                >
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>{displayCountry}</CardTitle>
                    <span className="text-2xl">
                      {countryCode ? (
                        <div className="inline-block shadow-md rounded-sm">
                          <ReactCountryFlag countryCode={countryCode} svg />
                        </div>
                      ) : (
                        "🏳️"
                      )}
                    </span>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-600">
                      {hasStrategy ? (
                        <span className="text-green-600 font-medium">✓ Has Regulatory Landscapes</span>
                      ) : (
                        <span className="text-gray-500">Basic policies available</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ExploreCCUSPolicies; 