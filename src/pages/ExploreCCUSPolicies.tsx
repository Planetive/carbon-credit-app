import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex flex-col">
      <div className="container mx-auto px-4 py-8">
        
        <h1 className="text-2xl font-bold mb-6">Explore CCUS Policies in Different Regions</h1>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {sortedCountries.map((country) => {
              const displayCountry = normalizeCountryName(country);
              const countryCode = getCountryCode(displayCountry);
              const hasStrategy = !!getStrategyForCountry(country);
              return (
                <Card
                  key={country}
                  // className={`bg-white/80 cursor-pointer transition-shadow hover:shadow-lg hover:scale-105 hover:bg-teal-50 relative`}
                  className="bg-white/80 cursor-pointer relative transition-all duration-500 ease-in-out hover:shadow-lg hover:scale-105 hover:bg-teal-50"

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
      </div>
    </div>
  );
};

export default ExploreCCUSPolicies; 