import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Globe, TrendingUp, Building2, MapPin, Calendar, CheckCircle2, Clock, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import LoadingScreen from "@/components/LoadingScreen";
import { supabase } from "@/integrations/supabase/client";

const complianceColumns = [
  { key: 'Name', label: 'Name', sortable: true },
  { key: 'Instrument Type', label: 'Instrument Type', sortable: true },
  { key: 'Status', label: 'Status', sortable: true },
  { key: 'Country', label: 'Country', sortable: true },
  { key: 'Region', label: 'Region', sortable: true },
  { key: 'Price Rate', label: 'Price Rate', sortable: true },
  { key: 'Covered Gases', label: 'Covered Gases', sortable: false },
];

const marketColumns = [
  { key: 'Carbon Credit Instrument', label: 'Instrument', sortable: true },
  { key: 'Status', label: 'Status', sortable: true },
  { key: 'Year of implementation', label: 'Year', sortable: true },
  { key: 'Country', label: 'Country', sortable: true },
  { key: 'Region', label: 'Region', sortable: true },
  { key: 'Price range', label: 'Price Range', sortable: true },
  { key: 'Details', label: 'Details', sortable: false },
  { key: 'Cummulative Credits Issued', label: 'Credits Issued', sortable: true },
];

const MarketsMechanisms: React.FC = () => {
  const [tab, setTab] = useState<'compliance' | 'market'>('compliance');
  const [complianceData, setComplianceData] = useState<any[]>([]);
  const [marketData, setMarketData] = useState<any[]>([]);
  const [complianceFilter, setComplianceFilter] = useState('');
  const [marketFilter, setMarketFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [complianceResult, marketResult] = await Promise.all([
          supabase.from('compliance_mechanisms').select('*'),
          supabase.from('carbon_credit_markets').select('*')
        ]);
        setComplianceData(complianceResult.data || []);
        setMarketData(marketResult.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Get unique values for filters
  const uniqueStatuses = useMemo(() => {
    const data = tab === 'compliance' ? complianceData : marketData;
    const statusKey = 'Status';
    return Array.from(new Set(data.map(row => row[statusKey]).filter(Boolean))).sort();
  }, [tab, complianceData, marketData]);

  const uniqueCountries = useMemo(() => {
    const data = tab === 'compliance' ? complianceData : marketData;
    const countryKey = 'Country';
    return Array.from(new Set(data.map(row => row[countryKey]).filter(Boolean))).sort();
  }, [tab, complianceData, marketData]);

  const uniqueRegions = useMemo(() => {
    const data = tab === 'compliance' ? complianceData : marketData;
    const regionKey = 'Region';
    return Array.from(new Set(data.map(row => row[regionKey]).filter(Boolean))).sort();
  }, [tab, complianceData, marketData]);

  // Filter and sort data
  const processedData = useMemo(() => {
    const data = tab === 'compliance' ? complianceData : marketData;
    const filter = tab === 'compliance' ? complianceFilter : marketFilter;
    const columns = tab === 'compliance' ? complianceColumns : marketColumns;

    let filtered = data.filter(row => {
      // Text search
      const matchesSearch = !filter || columns.some(col =>
        String(row[col.key] ?? '').toLowerCase().includes(filter.toLowerCase())
      );

      // Status filter
      const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(row['Status']);

      // Country filter
      const matchesCountry = selectedCountries.length === 0 || selectedCountries.includes(row['Country']);

      // Region filter
      const matchesRegion = selectedRegions.length === 0 || selectedRegions.includes(row['Region']);

      return matchesSearch && matchesStatus && matchesCountry && matchesRegion;
    });

    // Sort
    if (sortColumn) {
      filtered.sort((a, b) => {
        const aVal = a[sortColumn] ?? '';
        const bVal = b[sortColumn] ?? '';
        const comparison = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [tab, complianceData, marketData, complianceFilter, marketFilter, selectedStatuses, selectedCountries, selectedRegions, sortColumn, sortDirection]);

  // Calculate stats
  const stats = useMemo(() => {
    const data = processedData;
    const total = data.length;
    const active = data.filter(row => String(row['Status'] || '').toLowerCase().includes('active')).length;
    const countries = new Set(data.map(row => row['Country']).filter(Boolean)).size;
    const regions = new Set(data.map(row => row['Region']).filter(Boolean)).size;

    return { total, active, countries, regions };
  }, [processedData]);

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusLower = String(status || '').toLowerCase();
    if (statusLower.includes('active')) {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Active</Badge>;
    } else if (statusLower.includes('pending') || statusLower.includes('planned')) {
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    } else if (statusLower.includes('inactive') || statusLower.includes('closed')) {
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-200"><XCircle className="w-3 h-3 mr-1" />Inactive</Badge>;
    }
    return <Badge variant="outline">{status || 'Unknown'}</Badge>;
  };

  const currentColumns = tab === 'compliance' ? complianceColumns : marketColumns;
  const currentFilter = tab === 'compliance' ? complianceFilter : marketFilter;
  const setCurrentFilter = tab === 'compliance' ? setComplianceFilter : setMarketFilter;

  if (loading) {
    return <LoadingScreen message="Loading Markets & Mechanisms" subMessage="Fetching compliance and market data..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/20">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-200/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 animate-in fade-in duration-500">
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
            Markets & Mechanisms
          </h1>
          <p className="text-gray-600 text-lg">Explore compliance mechanisms and carbon credit markets worldwide</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-teal-200/50 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 animate-in fade-in" style={{ animationDelay: '0.1s' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total {tab === 'compliance' ? 'Mechanisms' : 'Markets'}</p>
                  <p className="text-3xl font-bold text-teal-600 transition-all duration-300">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center transition-transform duration-300 hover:scale-110">
                  <Building2 className="w-6 h-6 text-teal-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-emerald-200/50 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 animate-in fade-in" style={{ animationDelay: '0.15s' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Active</p>
                  <p className="text-3xl font-bold text-emerald-600 transition-all duration-300">{stats.active}</p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center transition-transform duration-300 hover:scale-110">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-cyan-200/50 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 animate-in fade-in" style={{ animationDelay: '0.2s' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Countries</p>
                  <p className="text-3xl font-bold text-cyan-600 transition-all duration-300">{stats.countries}</p>
                </div>
                <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center transition-transform duration-300 hover:scale-110">
                  <Globe className="w-6 h-6 text-cyan-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-lime-200/50 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 animate-in fade-in" style={{ animationDelay: '0.25s' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Regions</p>
                  <p className="text-3xl font-bold text-lime-600 transition-all duration-300">{stats.regions}</p>
                </div>
                <div className="w-12 h-12 bg-lime-100 rounded-full flex items-center justify-center transition-transform duration-300 hover:scale-110">
                  <MapPin className="w-6 h-6 text-lime-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Card className="mb-6 bg-white/80 backdrop-blur-sm border-teal-200/50 shadow-lg animate-in fade-in duration-500" style={{ animationDelay: '0.3s' }}>
          <CardContent className="p-4">
            <div className="flex gap-4">
                <button
                  onClick={() => {
                    setTab('compliance');
                    setSortColumn('');
                    setSelectedStatuses([]);
                    setSelectedCountries([]);
                    setSelectedRegions([]);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ease-out ${
                    tab === 'compliance'
                      ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md'
                      : 'bg-white text-teal-600 border border-teal-200 hover:border-teal-300 hover:bg-teal-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Compliance Mechanisms
                  </div>
                </button>
                <button
                  onClick={() => {
                    setTab('market');
                    setSortColumn('');
                    setSelectedStatuses([]);
                    setSelectedCountries([]);
                    setSelectedRegions([]);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ease-out ${
                    tab === 'market'
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
                      : 'bg-white text-blue-600 border border-blue-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Carbon Credit Markets
                  </div>
                </button>
            </div>
          </CardContent>
        </Card>

        {/* Filters and Search */}
        <Card className="mb-6 bg-white/80 backdrop-blur-sm border-teal-200/50 shadow-lg animate-in fade-in duration-500" style={{ animationDelay: '0.4s' }}>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 transition-colors duration-300" />
                <Input
                  placeholder={`Search ${tab === 'compliance' ? 'compliance mechanisms' : 'carbon credit markets'}...`}
                  value={currentFilter}
                  onChange={(e) => setCurrentFilter(e.target.value)}
                  className="pl-10 border-teal-200 focus:border-teal-400 transition-all duration-300 focus:ring-2 focus:ring-teal-200"
                />
              </div>

              <Popover open={showFilters} onOpenChange={setShowFilters}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="border-teal-200 hover:bg-teal-50 transition-all duration-300 hover:scale-105">
                    <Filter className="w-4 h-4 mr-2 transition-transform duration-300" style={{ transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                    Filters
                    {(selectedStatuses.length > 0 || selectedCountries.length > 0 || selectedRegions.length > 0) && (
                      <Badge className="ml-2 bg-teal-500 animate-in fade-in duration-300">{selectedStatuses.length + selectedCountries.length + selectedRegions.length}</Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <div>
                      <p className="font-semibold mb-2 text-sm">Status</p>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {uniqueStatuses.map(status => (
                          <div key={status} className="flex items-center space-x-2">
                            <Checkbox
                              id={`status-${status}`}
                              checked={selectedStatuses.includes(status)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedStatuses([...selectedStatuses, status]);
                                } else {
                                  setSelectedStatuses(selectedStatuses.filter(s => s !== status));
                                }
                              }}
                            />
                            <label htmlFor={`status-${status}`} className="text-sm cursor-pointer">{status}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold mb-2 text-sm">Country</p>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {uniqueCountries.map(country => (
                          <div key={country} className="flex items-center space-x-2">
                            <Checkbox
                              id={`country-${country}`}
                              checked={selectedCountries.includes(country)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedCountries([...selectedCountries, country]);
                                } else {
                                  setSelectedCountries(selectedCountries.filter(c => c !== country));
                                }
                              }}
                            />
                            <label htmlFor={`country-${country}`} className="text-sm cursor-pointer">{country}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold mb-2 text-sm">Region</p>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {uniqueRegions.map(region => (
                          <div key={region} className="flex items-center space-x-2">
                            <Checkbox
                              id={`region-${region}`}
                              checked={selectedRegions.includes(region)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedRegions([...selectedRegions, region]);
                                } else {
                                  setSelectedRegions(selectedRegions.filter(r => r !== region));
                                }
                              }}
                            />
                            <label htmlFor={`region-${region}`} className="text-sm cursor-pointer">{region}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                    {(selectedStatuses.length > 0 || selectedCountries.length > 0 || selectedRegions.length > 0) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedStatuses([]);
                          setSelectedCountries([]);
                          setSelectedRegions([]);
                        }}
                        className="w-full text-red-600 hover:text-red-700"
                      >
                        Clear All Filters
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {/* Data Display */}
        <Card className="bg-white/80 backdrop-blur-sm border-teal-200/50 shadow-lg animate-in fade-in duration-500" style={{ animationDelay: '0.5s' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl transition-all duration-300">
                {tab === 'compliance' ? 'Compliance Mechanisms' : 'Carbon Credit Markets'}
              </CardTitle>
              <Badge variant="outline" className="text-sm animate-in fade-in duration-300">
                {processedData.length} {processedData.length === 1 ? 'result' : 'results'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-teal-200">
                    {currentColumns.map((col, colIndex) => (
                      <th
                        key={col.key}
                        className={`px-4 py-3 text-left text-sm font-semibold text-gray-700 transition-all duration-300 ${
                          col.sortable ? 'cursor-pointer hover:bg-teal-50 hover:shadow-sm' : ''
                        }`}
                        onClick={() => col.sortable && handleSort(col.key)}
                        style={{ animationDelay: `${0.6 + colIndex * 0.05}s` }}
                      >
                        <div className="flex items-center gap-2">
                          {col.label}
                          {col.sortable && sortColumn === col.key && (
                            <span className="text-teal-600 animate-in fade-in duration-300">
                              {sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {processedData.length === 0 ? (
                    <tr>
                      <td colSpan={currentColumns.length} className="px-4 py-12 text-center text-gray-500 animate-in fade-in duration-300">
                        No data found. Try adjusting your filters.
                      </td>
                    </tr>
                  ) : (
                    processedData.map((row, index) => (
                      <tr
                        key={index}
                        className="border-b border-gray-100 hover:bg-teal-50/50 transition-all duration-300 hover:shadow-sm animate-in fade-in slide-in"
                        style={{ 
                          animationDelay: `${0.7 + index * 0.02}s`,
                          animationDuration: '0.3s'
                        }}
                      >
                        {currentColumns.map(col => (
                          <td key={col.key} className="px-4 py-3 text-sm transition-colors duration-200">
                            {col.key === 'Status' ? (
                              <div className="animate-in fade-in duration-300" style={{ animationDelay: `${0.8 + index * 0.02}s` }}>
                                {getStatusBadge(row[col.key])}
                              </div>
                            ) : col.key === 'Country' || col.key === 'Region' ? (
                              <div className="flex items-center gap-1 group">
                                <MapPin className="w-3 h-3 text-gray-400 transition-transform duration-300 group-hover:scale-110 group-hover:text-teal-500" />
                                <span className="transition-colors duration-300 group-hover:text-teal-600">{row[col.key] || '-'}</span>
                              </div>
                            ) : col.key === 'Year of implementation' ? (
                              <div className="flex items-center gap-1 group">
                                <Calendar className="w-3 h-3 text-gray-400 transition-transform duration-300 group-hover:scale-110 group-hover:text-teal-500" />
                                <span className="transition-colors duration-300 group-hover:text-teal-600">{row[col.key] || '-'}</span>
                              </div>
                            ) : (
                              <span className={`transition-all duration-300 ${col.key === 'Price Rate' || col.key === 'Price range' ? 'font-semibold text-teal-600 hover:text-teal-700' : 'hover:text-teal-600'}`}>
                                {row[col.key] || '-'}
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MarketsMechanisms;
