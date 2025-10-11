import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { LogOut, Home, BarChart3, Compass } from "lucide-react";
import { Link } from "react-router-dom";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const complianceColumns = [
  { key: 'Name', label: 'Name' },
  { key: 'Instrument Type', label: 'Instrument Type' },
  { key: 'Status', label: 'Status' },
  { key: 'Country', label: 'Country' },
  { key: 'Region', label: 'Region' },
  { key: 'Price Rate', label: 'Price Rate' },
  { key: 'Covered Gases', label: 'Covered Gases' },
];

const marketColumns = [
  { key: 'Carbon Credit Instrument', label: 'Carbon Credit Instrument' },
  { key: 'Status', label: 'Status' },
  { key: 'Year of implementation', label: 'Year of implementation' },
  { key: 'Country', label: 'Country' },
  { key: 'Region', label: 'Region' },
  { key: 'Price range', label: 'Price range' },
  { key: 'Details', label: 'Details' },
  { key: 'Cummulative Credits Issued', label: 'Cummulative Credits Issued' },
];

const MarketsMechanisms: React.FC = () => {
  const [tab, setTab] = useState<'compliance' | 'market'>('compliance');
  const [complianceData, setComplianceData] = useState<any[]>([]);
  const [marketData, setMarketData] = useState<any[]>([]);
  const [complianceFilter, setComplianceFilter] = useState('');
  const [marketFilter, setMarketFilter] = useState('');

  useEffect(() => {
    const fetchCompliance = async () => {
      const { data } = await supabase.from('compliance_mechanisms').select('*');
      setComplianceData(data || []);
    };
    const fetchMarket = async () => {
      const { data } = await supabase.from('carbon_credit_markets').select('*');
      setMarketData(data || []);
    };
    fetchCompliance();
    fetchMarket();
  }, []);

  const filteredCompliance = complianceData.filter(row =>
    complianceColumns.some(col =>
      String(row[col.key] ?? '').toLowerCase().includes(complianceFilter.toLowerCase())
    )
  );
  const filteredMarket = marketData.filter(row =>
    marketColumns.some(col =>
      String(row[col.key] ?? '').toLowerCase().includes(marketFilter.toLowerCase())
    )
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex flex-col">
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center bg-white py-8 sm:py-10 px-4 sm:px-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-gray-800 text-center drop-shadow">Markets & Mechanisms</h1>
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mb-6 sm:mb-8 w-full sm:w-auto">
          <button
            className={`px-4 sm:px-6 py-2 rounded-full font-semibold transition-all text-sm sm:text-base ${
              tab === 'compliance' 
                ? 'bg-green-500 text-white shadow-lg' 
                : 'bg-white text-green-600 border border-green-300'
            }`}
            onClick={() => setTab('compliance')}
          >
            Compliance Mechanisms
          </button>
          <button
            className={`px-4 sm:px-6 py-2 rounded-full font-semibold transition-all text-sm sm:text-base ${
              tab === 'market' 
                ? 'bg-blue-500 text-white shadow-lg' 
                : 'bg-white text-blue-600 border border-blue-300'
            }`}
            onClick={() => setTab('market')}
          >
            Carbon Credit Markets
          </button>
        </div>
        <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl p-4 sm:p-6">
          {tab === 'compliance' ? (
            <>
              <div className="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
                <h2 className="text-lg sm:text-xl font-semibold text-green-700 text-center sm:text-left">Compliance Mechanisms</h2>
                <input
                  type="text"
                  placeholder="Search..."
                  className="border rounded px-3 py-2 text-sm w-full sm:w-auto"
                  value={complianceFilter}
                  onChange={e => setComplianceFilter(e.target.value)}
                />
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full border rounded-lg">
                  <thead>
                    <tr>
                      {complianceColumns.map(col => (
                        <th key={col.key} className="px-2 sm:px-4 py-2 bg-green-100 text-green-800 font-semibold border-b text-xs sm:text-sm">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompliance.map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        {complianceColumns.map(col => (
                          <td key={col.key} className="px-2 sm:px-4 py-2 border-b text-xs sm:text-sm">
                            {row[col.key] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              <div className="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
                <h2 className="text-lg sm:text-xl font-semibold text-blue-700 text-center sm:text-left">Carbon Credit Markets</h2>
                <input
                  type="text"
                  placeholder="Search..."
                  className="border rounded px-3 py-2 text-sm w-full sm:w-auto"
                  value={marketFilter}
                  onChange={e => setMarketFilter(e.target.value)}
                />
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full border rounded-lg">
                  <thead>
                    <tr>
                      {marketColumns.map(col => (
                        <th key={col.key} className="px-2 sm:px-4 py-2 bg-blue-100 text-blue-800 font-semibold border-b text-xs sm:text-sm">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMarket.map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        {marketColumns.map(col => (
                          <td key={col.key} className="px-2 sm:px-4 py-2 border-b text-xs sm:text-sm">
                            {row[col.key] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketsMechanisms; 