import React, { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormattedNumberInput } from './finance_facilitated/components/FormattedNumberInput';
import { ArrowLeft, Building2, Plus, Search, Wallet, MapPin, Shield, Calendar, TrendingUp, Upload, Download, FileSpreadsheet, Edit, Trash2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PortfolioClient, Counterparty, Exposure } from '@/integrations/supabase/portfolioClient';
import { supabase } from '@/integrations/supabase/client';

const currencyFormat = (value: number) =>
  (Number(value) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

interface PortfolioEntry {
  id: string;
  company: string;
  amount: number;
  counterpartyType: string; // User-facing counterparty type
  counterpartyId?: string; // UUID for database operations (optional for CSV uploads)
  sector: string;
  geography: string;
  probabilityOfDefault: number;
  lossGivenDefault: number;
  tenor: number;
}

const BankPortfolio: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [entries, setEntries] = useState<PortfolioEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const zeroPadId = (num: number, width = 4) => num.toString().padStart(width, '0');
  const getNextId = (): string => {
    const numericIds = entries
      .map(e => parseInt(e.id, 10))
      .filter(n => !isNaN(n));
    const max = numericIds.length ? Math.max(...numericIds) : 0;
    return zeroPadId(max + 1);
  };

  // No longer need counterparty code generation since we use UUIDs
  
  // Form state
  const [newCompany, setNewCompany] = useState('');
  const [newAmount, setNewAmount] = useState<number>(0);
  const [newCounterparty, setNewCounterparty] = useState('');
  const [newCounterpartyType, setNewCounterpartyType] = useState('SME');
  const [newSector, setNewSector] = useState('');
  const [newGeography, setNewGeography] = useState('');
  const [newPD, setNewPD] = useState<number>(0);
  const [newLGD, setNewLGD] = useState<number>(0);
  const [newTenor, setNewTenor] = useState<number>(0);
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<PortfolioEntry | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Load data from database on component mount
  useEffect(() => {
    loadPortfolioData();
  }, []);

  // Add refresh function to window for global access
  useEffect(() => {
    (window as any).refreshPortfolioData = loadPortfolioData;
    return () => {
      delete (window as any).refreshPortfolioData;
    };
  }, []);

  const loadPortfolioData = async () => {
    try {
      setLoading(true);
      const counterparties = await PortfolioClient.getCounterparties();
      const exposures = await PortfolioClient.getExposures();
      
      // Get outstanding amounts from finance emission calculations
      const counterpartyIds = counterparties.map(c => c.id);
      console.log('Loading portfolio data for counterparties:', counterpartyIds);
      
      const outstandingAmounts = await PortfolioClient.getOutstandingAmountsForCounterparties(counterpartyIds);
      console.log('Retrieved outstanding amounts:', outstandingAmounts);
      
      // Combine counterparty and exposure data into PortfolioEntry format
      const portfolioEntries: PortfolioEntry[] = counterparties
        .map(counterparty => {
          const exposure = exposures.find(e => e.counterparty_id === counterparty.id);
          if (!exposure) return null;
          
          // Get outstanding amount from exposures table (fallback to exposure.amount_pkr if no outstanding amount)
          const outstandingAmount = outstandingAmounts.get(counterparty.id) || exposure.amount_pkr || 0;
          
          // Include all entries, even with zero amount (indicates finance emission not calculated)
          return {
            id: exposure.exposure_id,
            company: counterparty.name,
            amount: outstandingAmount,
            counterpartyType: counterparty.counterparty_type || 'SME',
            counterpartyId: counterparty.id,
            sector: counterparty.sector,
            geography: counterparty.geography,
            probabilityOfDefault: exposure.probability_of_default,
            lossGivenDefault: exposure.loss_given_default,
            tenor: exposure.tenor_months
          };
        })
        .filter(Boolean) as PortfolioEntry[];

      setEntries(portfolioEntries);
    } catch (error) {
      console.error('Error loading portfolio data:', error);
      toast({
        title: "Error",
        description: "Failed to load portfolio data. Please ensure you have completed finance emission calculations for your companies.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(e => e.company.toLowerCase().includes(q));
  }, [entries, search]);

  const addEntry = async () => {
    if (!newCompany.trim() || 
        !newSector || 
        !newGeography || 
        (Number(newPD) || 0) <= 0 || 
        (Number(newLGD) || 0) <= 0 || 
        (Number(newTenor) || 0) <= 0) return;
    
    try {
      setSaving(true);
      
      const exposureId = getNextId();
      
      // Create counterparty and exposure in database
      const { counterparty, exposure } = await PortfolioClient.createCounterpartyWithExposure(
        {
          name: newCompany.trim(),
          sector: newSector,
          geography: newGeography,
          counterparty_type: newCounterpartyType
        },
        {
          exposure_id: exposureId,
          amount_pkr: 0, // Will be populated from finance emission calculations
          probability_of_default: Number(newPD) || 0,
          loss_given_default: Number(newLGD) || 0,
          tenor_months: Number(newTenor) || 0
        }
      );

      // Add to local state
      const newEntry: PortfolioEntry = {
        id: exposureId,
        company: newCompany.trim(),
        amount: 0, // Will be populated from finance emission calculations
        counterpartyType: newCounterpartyType,
        counterpartyId: counterparty.id,
        sector: newSector,
        geography: newGeography,
        probabilityOfDefault: Number(newPD) || 0,
        lossGivenDefault: Number(newLGD) || 0,
        tenor: Number(newTenor) || 0
      };
      
      setEntries(prev => [newEntry, ...prev]);
      
      // Reset form
      setNewCompany('');
      setNewAmount(0);
      setNewCounterparty('');
      setNewCounterpartyType('SME');
      setNewSector('');
      setNewGeography('');
      setNewPD(0);
      setNewLGD(0);
      setNewTenor(0);

      toast({
        title: "Success",
        description: "Company added to portfolio successfully",
      });
    } catch (error) {
      console.error('Error adding company:', error);
      toast({
        title: "Error",
        description: "Failed to add company to portfolio",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = [
      'Company Name,Counterparty Type,Sector,Geography,Probability of Default (%),Loss Given Default (%),Tenor (months)',
      'National Steel Limited,SME,Manufacturing,Pakistan,2.5,45,36',
      'Sunrise Power Pvt. Ltd.,Corporate,Energy,Pakistan,1.8,40,60',
      'Metro Retail Holdings,Retail,Retail,Pakistan,3.2,50,24'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'portfolio_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSV = (csvText: string): PortfolioEntry[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    const requiredHeaders = [
      'Company Name',
      'Counterparty Type', 
      'Sector',
      'Geography',
      'Probability of Default (%)',
      'Loss Given Default (%)',
      'Tenor (months)'
    ];

    // Validate headers
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
    }

    const entries: PortfolioEntry[] = [];
    let nextIdBase = (() => {
      const numericIds = entriesStateRef()
        .map(e => parseInt(e.id, 10))
        .filter(n => !isNaN(n));
      const max = numericIds.length ? Math.max(...numericIds) : 0;
      return max;
    })();
    // No longer need counterparty code generation for CSV parsing
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      if (values.length !== headers.length) {
        throw new Error(`Row ${i + 1}: Incorrect number of columns`);
      }

      nextIdBase += 1;
      const entry: PortfolioEntry = {
        id: zeroPadId(nextIdBase),
        company: values[headers.indexOf('Company Name')] || '',
        counterpartyType: values[headers.indexOf('Counterparty Type')] || 'SME',
        amount: 0, // Will be populated from finance emission calculations
        sector: values[headers.indexOf('Sector')] || '',
        geography: values[headers.indexOf('Geography')] || '',
        probabilityOfDefault: Number(values[headers.indexOf('Probability of Default (%)')]) || 0,
        lossGivenDefault: Number(values[headers.indexOf('Loss Given Default (%)')]) || 0,
        tenor: Number(values[headers.indexOf('Tenor (months)')]) || 0
      };

      // Validate required fields
      if (!entry.company || !entry.counterpartyType || !entry.sector || !entry.geography || entry.probabilityOfDefault <= 0 || entry.lossGivenDefault <= 0 || entry.tenor <= 0) {
        throw new Error(`Row ${i + 1}: Missing or invalid required data`);
      }

      entries.push(entry);
    }

    return entries;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const text = await file.text();
      const newEntries = parseCSV(text);
      
      setEntries(prev => [...newEntries, ...prev]);
      
      // Reset file input
      event.target.value = '';
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to parse file');
    } finally {
      setIsUploading(false);
    }
  };

  // Helper to safely access latest entries inside parseCSV closure
  const entriesStateRef = () => entries;

  const editEntry = (entry: PortfolioEntry) => {
    setEditingEntry(entry);
  };

  const updateEntry = async () => {
    if (!editingEntry) return;
    
    try {
      setSaving(true);
      
      // Update counterparty data (name, sector, geography, counterparty_type)
      if (editingEntry.counterpartyId) {
        await PortfolioClient.updateCounterparty(editingEntry.counterpartyId, {
          name: editingEntry.company,
          sector: editingEntry.sector,
          geography: editingEntry.geography,
          counterparty_type: editingEntry.counterpartyType
        });
      }
      
      // Update exposure data (amount, PD, LGD, tenor)
      // We need to find the exposure ID from the database
      const exposures = await PortfolioClient.getExposures();
      const exposure = exposures.find(e => e.exposure_id === editingEntry.id);
      
      if (exposure) {
        await PortfolioClient.updateExposure(exposure.id, {
          probability_of_default: editingEntry.probabilityOfDefault,
          loss_given_default: editingEntry.lossGivenDefault,
          tenor_months: editingEntry.tenor
        });
      }
      
      // Update local state
      setEntries(prev => prev.map(entry => 
        entry.id === editingEntry.id ? editingEntry : entry
      ));
      setEditingEntry(null);
      
      toast({
        title: "Success",
        description: "Company updated successfully",
      });
    } catch (error) {
      console.error('Error updating company:', error);
      toast({
        title: "Error",
        description: "Failed to update company. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      setSaving(true);
      
      // Find the entry to get the counterparty ID
      const entryToDelete = entries.find(e => e.id === id);
      if (!entryToDelete) return;
      
      // Delete from database
      if (entryToDelete.counterpartyId) {
        // Delete the counterparty (this will cascade delete the exposure due to foreign key)
        const { error } = await supabase
          .from('counterparties')
          .delete()
          .eq('id', entryToDelete.counterpartyId);
          
        if (error) throw error;
      }
      
      // Update local state
      setEntries(prev => prev.filter(entry => entry.id !== id));
      setShowDeleteConfirm(null);
      
      toast({
        title: "Success",
        description: "Company deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting company:', error);
      toast({
        title: "Error",
        description: "Failed to delete company. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditingEntry(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50/30">
      <div className="max-w-9xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8">
            {/* Main list */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Bank Portfolio
              </CardTitle>
              <CardDescription>
                List of companies and their loan amounts (PKR)
              </CardDescription>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 mt-3">
                <p className="text-xs text-gray-600">
                  <strong>Note:</strong> Loan amounts are now automatically retrieved from your Finance Emission calculations. 
                  Please ensure you have completed the Finance Emission form for each company to see their loan amounts.
                </p>
              </div>
            </CardHeader>
            <CardContent>
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
                <div className="relative w-full sm:w-80">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search company"
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Grid of entries */}
              {loading ? (
                <div className="text-center text-muted-foreground py-12">Loading portfolio data...</div>
              ) : filtered.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">No companies found.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {filtered.map((e) => (
                    <Card key={e.id} className="border-primary/10 hover:shadow transition-shadow">
                      <CardContent className="p-6">
                        <button
                          onClick={() => navigate(`/bank-portfolio/${e.id}`, { state: e })}
                          className="w-full text-left"
                        >
                          <div className="space-y-4">
                          <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="text-base font-semibold text-teal-700 hover:underline mb-2">
                                {e.company}
                                </div>
                                <div className="text-xs text-muted-foreground mb-3">
                                  Type: {e.counterpartyType}
                                </div>
                                
                                {/* Left side details - Geography and Tenor */}
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">Geography:</span>
                                    <span className="text-xs font-medium">{e.geography}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">Tenor:</span>
                                    <span className="text-xs font-medium">{e.tenor} months</span>
                                  </div>
                                </div>
                              </div>
                              
                            <div className="text-right">
                                <div className="text-sm text-muted-foreground flex items-center justify-end gap-1 mb-2">
                                <Wallet className="h-4 w-4" /> Loan Amount (PKR)
                                </div>
                                <div className="text-xl font-bold text-primary mb-3">{currencyFormat(e.amount)}</div>
                                
                                {/* Right side details - Sector and PD */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-end gap-2">
                                    <span className="text-xs text-muted-foreground">Sector:</span>
                                    <span className="text-xs font-medium">{e.sector}</span>
                                    <TrendingUp className="h-3 w-3 text-muted-foreground" />
                                  </div>
                                  <div className="flex items-center justify-end gap-2">
                                    <span className="text-xs text-muted-foreground">PD:</span>
                                    <span className="text-xs font-medium">{e.probabilityOfDefault}%</span>
                                    <Shield className="h-3 w-3 text-muted-foreground" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </button>

                        {/* Action icons */}
                        <div className="flex gap-2 mt-3 justify-end">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              editEntry(e);
                            }}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit company"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              setShowDeleteConfirm(e.id);
                            }}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete company"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right side add panel (separate from main card) */}
          <div>
            <Card className="border-teal-200/60 sticky top-6">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Add Company Loan
                </CardTitle>
                <CardDescription>Add a company with complete loan details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <Label htmlFor="company">Company Name *</Label>
                  <Input
                    id="company"
                    placeholder="e.g., Sunrise Textiles Ltd."
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="counterparty-type">Counterparty Type *</Label>
                  <Select value={newCounterpartyType} onValueChange={setNewCounterpartyType}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select counterparty type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SME">SME (Small & Medium Enterprise)</SelectItem>
                      <SelectItem value="Retail">Retail</SelectItem>
                      <SelectItem value="Corporate">Corporate</SelectItem>
                      <SelectItem value="Sovereign">Sovereign</SelectItem>
                      <SelectItem value="Bank">Bank</SelectItem>
                      <SelectItem value="Insurance">Insurance</SelectItem>
                      <SelectItem value="Asset_Management">Asset Management</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="sector">Sector *</Label>
                  <Select value={newSector} onValueChange={setNewSector}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select sector" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Oil & Gas (Upstream, Midstream, Downstream)">Oil & Gas (Upstream, Midstream, Downstream)</SelectItem>
                      <SelectItem value="Coal Mining">Coal Mining</SelectItem>
                      <SelectItem value="Power Generation – Fossil Fuel">Power Generation – Fossil Fuel</SelectItem>
                      <SelectItem value="Power Generation – Renewable">Power Generation – Renewable</SelectItem>
                      <SelectItem value="Power Transmission & Distribution">Power Transmission & Distribution</SelectItem>
                      <SelectItem value="Utilities (Integrated)">Utilities (Integrated)</SelectItem>
                      <SelectItem value="Steel & Iron">Steel & Iron</SelectItem>
                      <SelectItem value="Cement">Cement</SelectItem>
                      <SelectItem value="Chemicals & Petrochemicals">Chemicals & Petrochemicals</SelectItem>
                      <SelectItem value="Fertilizers">Fertilizers</SelectItem>
                      <SelectItem value="Pulp & Paper">Pulp & Paper</SelectItem>
                      <SelectItem value="Textile & Apparel">Textile & Apparel</SelectItem>
                      <SelectItem value="Automotive & Transport Equipment">Automotive & Transport Equipment</SelectItem>
                      <SelectItem value="Electronics & Machinery">Electronics & Machinery</SelectItem>
                      <SelectItem value="Aviation">Aviation</SelectItem>
                      <SelectItem value="Shipping / Marine Transport">Shipping / Marine Transport</SelectItem>
                      <SelectItem value="Rail Transport">Rail Transport</SelectItem>
                      <SelectItem value="Road Freight & Logistics">Road Freight & Logistics</SelectItem>
                      <SelectItem value="Public Transport & Mobility">Public Transport & Mobility</SelectItem>
                      <SelectItem value="Commercial Real Estate">Commercial Real Estate</SelectItem>
                      <SelectItem value="Residential Real Estate">Residential Real Estate</SelectItem>
                      <SelectItem value="Construction & Infrastructure">Construction & Infrastructure</SelectItem>
                      <SelectItem value="Agriculture">Agriculture</SelectItem>
                      <SelectItem value="Livestock & Dairy">Livestock & Dairy</SelectItem>
                      <SelectItem value="Forestry & Logging">Forestry & Logging</SelectItem>
                      <SelectItem value="Fisheries & Aquaculture">Fisheries & Aquaculture</SelectItem>
                      <SelectItem value="Food Processing & Packaging">Food Processing & Packaging</SelectItem>
                      <SelectItem value="Banking / Financial Services">Banking / Financial Services</SelectItem>
                      <SelectItem value="Insurance & Reinsurance">Insurance & Reinsurance</SelectItem>
                      <SelectItem value="Asset Management / Investment">Asset Management / Investment</SelectItem>
                      <SelectItem value="Retail & Consumer Goods">Retail & Consumer Goods</SelectItem>
                      <SelectItem value="Hospitality & Leisure">Hospitality & Leisure</SelectItem>
                      <SelectItem value="Healthcare & Pharma">Healthcare & Pharma</SelectItem>
                      <SelectItem value="Telecom & Data Centers">Telecom & Data Centers</SelectItem>
                      <SelectItem value="Public Sector & Sovereign">Public Sector & Sovereign</SelectItem>
                      <SelectItem value="Technology (IT & Cloud)">Technology (IT & Cloud)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="geography">Geography *</Label>
                  <Select value={newGeography} onValueChange={setNewGeography}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select Pakistan or district" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pakistan">Pakistan</SelectItem>
                      <SelectItem value="__heading_azad_kashmir" disabled>Azad Kashmir</SelectItem>
                      <SelectItem value="Muzaffarabad">Muzaffarabad</SelectItem>
                      <SelectItem value="Hattian Bala">Hattian Bala</SelectItem>
                      <SelectItem value="Neelum">Neelum</SelectItem>
                      <SelectItem value="Poonch (Rawalakot)">Poonch (Rawalakot)</SelectItem>
                      <SelectItem value="Bagh">Bagh</SelectItem>
                      <SelectItem value="Haveli">Haveli</SelectItem>
                      <SelectItem value="Mirpur">Mirpur</SelectItem>
                      <SelectItem value="Bhimber">Bhimber</SelectItem>
                      <SelectItem value="Kotli">Kotli</SelectItem>
                      <SelectItem value="Sudhnoti">Sudhnoti</SelectItem>
                      <SelectItem value="__heading_khyber_pakhtunkhwa" disabled>Khyber Pakhtunkhwa</SelectItem>
                      <SelectItem value="Abbottabad">Abbottabad</SelectItem>
                      <SelectItem value="Allai">Allai</SelectItem>
                      <SelectItem value="Battagram">Battagram</SelectItem>
                      <SelectItem value="Haripur">Haripur</SelectItem>
                      <SelectItem value="Kolai Palas">Kolai Palas</SelectItem>
                      <SelectItem value="Torghar">Torghar</SelectItem>
                      <SelectItem value="Upper Kohistan">Upper Kohistan</SelectItem>
                      <SelectItem value="Lower Kohistan">Lower Kohistan</SelectItem>
                      <SelectItem value="Mansehra">Mansehra</SelectItem>
                      <SelectItem value="Hangu">Hangu</SelectItem>
                      <SelectItem value="Karak">Karak</SelectItem>
                      <SelectItem value="Kohat">Kohat</SelectItem>
                      <SelectItem value="Kurram">Kurram</SelectItem>
                      <SelectItem value="Orakzai">Orakzai</SelectItem>
                      <SelectItem value="Bannu">Bannu</SelectItem>
                      <SelectItem value="Lakki Marwat">Lakki Marwat</SelectItem>
                      <SelectItem value="North Waziristan">North Waziristan</SelectItem>
                      <SelectItem value="Khyber">Khyber</SelectItem>
                      <SelectItem value="Mohmand">Mohmand</SelectItem>
                      <SelectItem value="Nowshera">Nowshera</SelectItem>
                      <SelectItem value="Peshawar">Peshawar</SelectItem>
                      <SelectItem value="Charsadda">Charsadda</SelectItem>
                      <SelectItem value="Dera Ismail Khan">Dera Ismail Khan</SelectItem>
                      <SelectItem value="Upper South Waziristan">Upper South Waziristan</SelectItem>
                      <SelectItem value="Lower South Waziristan">Lower South Waziristan</SelectItem>
                      <SelectItem value="Tank">Tank</SelectItem>
                      <SelectItem value="Paharpur">Paharpur</SelectItem>
                      <SelectItem value="Mardan">Mardan</SelectItem>
                      <SelectItem value="Swabi">Swabi</SelectItem>
                      <SelectItem value="Upper Chitral">Upper Chitral</SelectItem>
                      <SelectItem value="Upper Dir">Upper Dir</SelectItem>
                      <SelectItem value="Lower Chitral">Lower Chitral</SelectItem>
                      <SelectItem value="Lower Dir">Lower Dir</SelectItem>
                      <SelectItem value="Malakand">Malakand</SelectItem>
                      <SelectItem value="Shangla">Shangla</SelectItem>
                      <SelectItem value="Swat">Swat</SelectItem>
                      <SelectItem value="Upper Swat">Upper Swat</SelectItem>
                      <SelectItem value="Bajaur">Bajaur</SelectItem>
                      <SelectItem value="Buner">Buner</SelectItem>
                      <SelectItem value="Central Dir">Central Dir</SelectItem>
                      <SelectItem value="__heading_punjab" disabled>Punjab</SelectItem>
                      <SelectItem value="Attock">Attock</SelectItem>
                      <SelectItem value="Bahawalnagar">Bahawalnagar</SelectItem>
                      <SelectItem value="Bahawalpur">Bahawalpur</SelectItem>
                      <SelectItem value="Bhakkar">Bhakkar</SelectItem>
                      <SelectItem value="Chakwal">Chakwal</SelectItem>
                      <SelectItem value="Chiniot">Chiniot</SelectItem>
                      <SelectItem value="Dera Ghazi Khan">Dera Ghazi Khan</SelectItem>
                      <SelectItem value="Faisalabad">Faisalabad</SelectItem>
                      <SelectItem value="Gujranwala">Gujranwala</SelectItem>
                      <SelectItem value="Gujrat">Gujrat</SelectItem>
                      <SelectItem value="Hafizabad">Hafizabad</SelectItem>
                      <SelectItem value="Jhang">Jhang</SelectItem>
                      <SelectItem value="Jhelum">Jhelum</SelectItem>
                      <SelectItem value="Kasur">Kasur</SelectItem>
                      <SelectItem value="Khanewal">Khanewal</SelectItem>
                      <SelectItem value="Khushab">Khushab</SelectItem>
                      <SelectItem value="Lahore">Lahore</SelectItem>
                      <SelectItem value="Layyah">Layyah</SelectItem>
                      <SelectItem value="Lodhran">Lodhran</SelectItem>
                      <SelectItem value="Mandi Bahauddin">Mandi Bahauddin</SelectItem>
                      <SelectItem value="Mianwali">Mianwali</SelectItem>
                      <SelectItem value="Multan">Multan</SelectItem>
                      <SelectItem value="Muzaffargarh">Muzaffargarh</SelectItem>
                      <SelectItem value="Nankana Sahib">Nankana Sahib</SelectItem>
                      <SelectItem value="Narowal">Narowal</SelectItem>
                      <SelectItem value="Okara">Okara</SelectItem>
                      <SelectItem value="Pakpattan">Pakpattan</SelectItem>
                      <SelectItem value="Rahim Yar Khan">Rahim Yar Khan</SelectItem>
                      <SelectItem value="Rajanpur">Rajanpur</SelectItem>
                      <SelectItem value="Rawalpindi">Rawalpindi</SelectItem>
                      <SelectItem value="Sahiwal">Sahiwal</SelectItem>
                      <SelectItem value="Sargodha">Sargodha</SelectItem>
                      <SelectItem value="Sheikhupura">Sheikhupura</SelectItem>
                      <SelectItem value="Sialkot">Sialkot</SelectItem>
                      <SelectItem value="Toba Tek Singh">Toba Tek Singh</SelectItem>
                      <SelectItem value="Vehari">Vehari</SelectItem>
                      <SelectItem value="Talagang">Talagang</SelectItem>
                      <SelectItem value="Murree">Murree</SelectItem>
                      <SelectItem value="Taunsa">Taunsa</SelectItem>
                      <SelectItem value="Kot Addu">Kot Addu</SelectItem>
                      <SelectItem value="Wazirabad">Wazirabad</SelectItem>
                      <SelectItem value="__heading_sindh" disabled>Sindh</SelectItem>
                      <SelectItem value="Badin">Badin</SelectItem>
                      <SelectItem value="Dadu">Dadu</SelectItem>
                      <SelectItem value="Ghotki">Ghotki</SelectItem>
                      <SelectItem value="Hyderabad">Hyderabad</SelectItem>
                      <SelectItem value="Jacobabad">Jacobabad</SelectItem>
                      <SelectItem value="Jamshoro">Jamshoro</SelectItem>
                      <SelectItem value="Karachi Central">Karachi Central</SelectItem>
                      <SelectItem value="Karachi East">Karachi East</SelectItem>
                      <SelectItem value="Karachi South">Karachi South</SelectItem>
                      <SelectItem value="Karachi West">Karachi West</SelectItem>
                      <SelectItem value="Kashmore">Kashmore</SelectItem>
                      <SelectItem value="Keamari">Keamari</SelectItem>
                      <SelectItem value="Khairpur">Khairpur</SelectItem>
                      <SelectItem value="Korangi">Korangi</SelectItem>
                      <SelectItem value="Larkana">Larkana</SelectItem>
                      <SelectItem value="Malir">Malir</SelectItem>
                      <SelectItem value="Matiari">Matiari</SelectItem>
                      <SelectItem value="Mirpur Khas">Mirpur Khas</SelectItem>
                      <SelectItem value="Naushahro Feroze">Naushahro Feroze</SelectItem>
                      <SelectItem value="Qambar Shahdadkot">Qambar Shahdadkot</SelectItem>
                      <SelectItem value="Sanghar">Sanghar</SelectItem>
                      <SelectItem value="Shaheed Benazirabad">Shaheed Benazirabad</SelectItem>
                      <SelectItem value="Shikarpur">Shikarpur</SelectItem>
                      <SelectItem value="Sujawal">Sujawal</SelectItem>
                      <SelectItem value="Sukkur">Sukkur</SelectItem>
                      <SelectItem value="Tando Allahyar">Tando Allahyar</SelectItem>
                      <SelectItem value="Tando Muhammad Khan">Tando Muhammad Khan</SelectItem>
                      <SelectItem value="Tharparkar">Tharparkar</SelectItem>
                      <SelectItem value="Thatta">Thatta</SelectItem>
                      <SelectItem value="Umerkot">Umerkot</SelectItem>
                      <SelectItem value="__heading_capital_territory" disabled>Capital Territory</SelectItem>
                      <SelectItem value="Islamabad">Islamabad</SelectItem>
                      <SelectItem value="__heading_gilgit_baltistan" disabled>Gilgit-Baltistan</SelectItem>
                      <SelectItem value="Gilgit">Gilgit</SelectItem>
                      <SelectItem value="Hunza">Hunza</SelectItem>
                      <SelectItem value="Nagar">Nagar</SelectItem>
                      <SelectItem value="Ghizer">Ghizer</SelectItem>
                      <SelectItem value="Gupis–Yasin">Gupis–Yasin</SelectItem>
                      <SelectItem value="Astore">Astore</SelectItem>
                      <SelectItem value="Diamer">Diamer</SelectItem>
                      <SelectItem value="Darel">Darel</SelectItem>
                      <SelectItem value="Tangir">Tangir</SelectItem>
                      <SelectItem value="Skardu">Skardu</SelectItem>
                      <SelectItem value="Shigar">Shigar</SelectItem>
                      <SelectItem value="Kharmang">Kharmang</SelectItem>
                      <SelectItem value="Ghanche">Ghanche</SelectItem>
                      <SelectItem value="Roundu">Roundu</SelectItem>
                      <SelectItem value="__heading_balochistan" disabled>Balochistan</SelectItem>
                      <SelectItem value="Awaran">Awaran</SelectItem>
                      <SelectItem value="Hub">Hub</SelectItem>
                      <SelectItem value="Lasbela">Lasbela</SelectItem>
                      <SelectItem value="Surab">Surab</SelectItem>
                      <SelectItem value="Mastung">Mastung</SelectItem>
                      <SelectItem value="Khuzdar">Khuzdar</SelectItem>
                      <SelectItem value="Kalat">Kalat</SelectItem>
                      <SelectItem value="Chaman">Chaman</SelectItem>
                      <SelectItem value="Pishin">Pishin</SelectItem>
                      <SelectItem value="Quetta">Quetta</SelectItem>
                      <SelectItem value="Qila Abdullah">Qila Abdullah</SelectItem>
                      <SelectItem value="Sohbatpur">Sohbatpur</SelectItem>
                      <SelectItem value="Nasirabad">Nasirabad</SelectItem>
                      <SelectItem value="Usta Muhammad">Usta Muhammad</SelectItem>
                      <SelectItem value="Jafarabad">Jafarabad</SelectItem>
                      <SelectItem value="Jhal Magsi">Jhal Magsi</SelectItem>
                      <SelectItem value="Kachhi">Kachhi</SelectItem>
                      <SelectItem value="Chagai">Chagai</SelectItem>
                      <SelectItem value="Washuk">Washuk</SelectItem>
                      <SelectItem value="Kharan">Kharan</SelectItem>
                      <SelectItem value="Nushki">Nushki</SelectItem>
                      <SelectItem value="Ziarat">Ziarat</SelectItem>
                      <SelectItem value="Harnai">Harnai</SelectItem>
                      <SelectItem value="Kohlu">Kohlu</SelectItem>
                      <SelectItem value="Dera Bugti">Dera Bugti</SelectItem>
                      <SelectItem value="Sibi">Sibi</SelectItem>
                      <SelectItem value="Barkhan">Barkhan</SelectItem>
                      <SelectItem value="Duki">Duki</SelectItem>
                      <SelectItem value="Musakhel">Musakhel</SelectItem>
                      <SelectItem value="Loralai">Loralai</SelectItem>
                      <SelectItem value="Panjgur">Panjgur</SelectItem>
                      <SelectItem value="Gwadar">Gwadar</SelectItem>
                      <SelectItem value="Kech">Kech</SelectItem>
                      <SelectItem value="Zhob">Zhob</SelectItem>
                      <SelectItem value="Qilla Saifullah">Qilla Saifullah</SelectItem>
                      <SelectItem value="Sherani">Sherani</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="pd">Probability of Default (%) *</Label>
                    <Input
                      id="pd"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="2.5"
                      value={newPD || ''}
                      onChange={(e) => setNewPD(Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lgd">Loss Given Default (%) *</Label>
                    <Input
                      id="lgd"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="45"
                      value={newLGD || ''}
                      onChange={(e) => setNewLGD(Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="tenor">Tenor/Maturity (months) *</Label>
                  <Input
                    id="tenor"
                    type="number"
                    min="1"
                    placeholder="36"
                    value={newTenor || ''}
                    onChange={(e) => setNewTenor(Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
                
                <Button onClick={addEntry} className="w-full" disabled={saving}>
                  {saving ? 'Adding...' : 'Add Company'}
                </Button>
                
                <Separator />
                
                {/* Bulk Upload Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Bulk Upload</span>
                  </div>
                  
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      onClick={downloadTemplate}
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                    
                    <div className="relative">
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={isUploading}
                      />
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled={isUploading}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {isUploading ? 'Uploading...' : 'Upload CSV/Excel'}
                      </Button>
                    </div>
                  </div>
                  
                  {uploadError && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                      {uploadError}
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground">
                    Upload a CSV or Excel file with the template format. All required fields must be included.
                  </div>
                </div>
                
                <Separator />
                <div className="text-xs text-muted-foreground">
                  * Required fields. All fields must be completed to add a company.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Edit Modal */}
        {editingEntry && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Edit className="h-5 w-5" />
                    Edit Company
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={cancelEdit}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>Update company loan details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="edit-company">Company Name *</Label>
                  <Input
                    id="edit-company"
                    value={editingEntry.company}
                    onChange={(e) => setEditingEntry({...editingEntry, company: e.target.value})}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-counterparty-type">Counterparty Type *</Label>
                  <Select value={editingEntry.counterpartyType} onValueChange={(value) => setEditingEntry({...editingEntry, counterpartyType: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select counterparty type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SME">SME (Small & Medium Enterprise)</SelectItem>
                      <SelectItem value="Retail">Retail</SelectItem>
                      <SelectItem value="Corporate">Corporate</SelectItem>
                      <SelectItem value="Sovereign">Sovereign</SelectItem>
                      <SelectItem value="Bank">Bank</SelectItem>
                      <SelectItem value="Insurance">Insurance</SelectItem>
                      <SelectItem value="Asset_Management">Asset Management</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                
                <div>
                  <Label htmlFor="edit-sector">Sector *</Label>
                  <Select value={editingEntry.sector} onValueChange={(value) => setEditingEntry({...editingEntry, sector: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select sector" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Oil & Gas (Upstream, Midstream, Downstream)">Oil & Gas (Upstream, Midstream, Downstream)</SelectItem>
                      <SelectItem value="Coal Mining">Coal Mining</SelectItem>
                      <SelectItem value="Power Generation – Fossil Fuel">Power Generation – Fossil Fuel</SelectItem>
                      <SelectItem value="Power Generation – Renewable">Power Generation – Renewable</SelectItem>
                      <SelectItem value="Power Transmission & Distribution">Power Transmission & Distribution</SelectItem>
                      <SelectItem value="Utilities (Integrated)">Utilities (Integrated)</SelectItem>
                      <SelectItem value="Steel & Iron">Steel & Iron</SelectItem>
                      <SelectItem value="Cement">Cement</SelectItem>
                      <SelectItem value="Chemicals & Petrochemicals">Chemicals & Petrochemicals</SelectItem>
                      <SelectItem value="Fertilizers">Fertilizers</SelectItem>
                      <SelectItem value="Pulp & Paper">Pulp & Paper</SelectItem>
                      <SelectItem value="Textile & Apparel">Textile & Apparel</SelectItem>
                      <SelectItem value="Automotive & Transport Equipment">Automotive & Transport Equipment</SelectItem>
                      <SelectItem value="Electronics & Machinery">Electronics & Machinery</SelectItem>
                      <SelectItem value="Aviation">Aviation</SelectItem>
                      <SelectItem value="Shipping / Marine Transport">Shipping / Marine Transport</SelectItem>
                      <SelectItem value="Rail Transport">Rail Transport</SelectItem>
                      <SelectItem value="Road Freight & Logistics">Road Freight & Logistics</SelectItem>
                      <SelectItem value="Public Transport & Mobility">Public Transport & Mobility</SelectItem>
                      <SelectItem value="Commercial Real Estate">Commercial Real Estate</SelectItem>
                      <SelectItem value="Residential Real Estate">Residential Real Estate</SelectItem>
                      <SelectItem value="Construction & Infrastructure">Construction & Infrastructure</SelectItem>
                      <SelectItem value="Agriculture">Agriculture</SelectItem>
                      <SelectItem value="Livestock & Dairy">Livestock & Dairy</SelectItem>
                      <SelectItem value="Forestry & Logging">Forestry & Logging</SelectItem>
                      <SelectItem value="Fisheries & Aquaculture">Fisheries & Aquaculture</SelectItem>
                      <SelectItem value="Food Processing & Packaging">Food Processing & Packaging</SelectItem>
                      <SelectItem value="Banking / Financial Services">Banking / Financial Services</SelectItem>
                      <SelectItem value="Insurance & Reinsurance">Insurance & Reinsurance</SelectItem>
                      <SelectItem value="Asset Management / Investment">Asset Management / Investment</SelectItem>
                      <SelectItem value="Retail & Consumer Goods">Retail & Consumer Goods</SelectItem>
                      <SelectItem value="Hospitality & Leisure">Hospitality & Leisure</SelectItem>
                      <SelectItem value="Healthcare & Pharma">Healthcare & Pharma</SelectItem>
                      <SelectItem value="Telecom & Data Centers">Telecom & Data Centers</SelectItem>
                      <SelectItem value="Public Sector & Sovereign">Public Sector & Sovereign</SelectItem>
                      <SelectItem value="Technology (IT & Cloud)">Technology (IT & Cloud)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="edit-geography">Geography *</Label>
                  <Select value={editingEntry.geography} onValueChange={(value) => setEditingEntry({...editingEntry, geography: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select Pakistan or district" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pakistan">Pakistan</SelectItem>
                      <SelectItem value="__heading_azad_kashmir" disabled>Azad Kashmir</SelectItem>
                      <SelectItem value="Muzaffarabad">Muzaffarabad</SelectItem>
                      <SelectItem value="Hattian Bala">Hattian Bala</SelectItem>
                      <SelectItem value="Neelum">Neelum</SelectItem>
                      <SelectItem value="Poonch (Rawalakot)">Poonch (Rawalakot)</SelectItem>
                      <SelectItem value="Bagh">Bagh</SelectItem>
                      <SelectItem value="Haveli">Haveli</SelectItem>
                      <SelectItem value="Mirpur">Mirpur</SelectItem>
                      <SelectItem value="Bhimber">Bhimber</SelectItem>
                      <SelectItem value="Kotli">Kotli</SelectItem>
                      <SelectItem value="Sudhnoti">Sudhnoti</SelectItem>
                      <SelectItem value="__heading_khyber_pakhtunkhwa" disabled>Khyber Pakhtunkhwa</SelectItem>
                      <SelectItem value="Abbottabad">Abbottabad</SelectItem>
                      <SelectItem value="Allai">Allai</SelectItem>
                      <SelectItem value="Battagram">Battagram</SelectItem>
                      <SelectItem value="Haripur">Haripur</SelectItem>
                      <SelectItem value="Kolai Palas">Kolai Palas</SelectItem>
                      <SelectItem value="Torghar">Torghar</SelectItem>
                      <SelectItem value="Upper Kohistan">Upper Kohistan</SelectItem>
                      <SelectItem value="Lower Kohistan">Lower Kohistan</SelectItem>
                      <SelectItem value="Mansehra">Mansehra</SelectItem>
                      <SelectItem value="Hangu">Hangu</SelectItem>
                      <SelectItem value="Karak">Karak</SelectItem>
                      <SelectItem value="Kohat">Kohat</SelectItem>
                      <SelectItem value="Kurram">Kurram</SelectItem>
                      <SelectItem value="Orakzai">Orakzai</SelectItem>
                      <SelectItem value="Bannu">Bannu</SelectItem>
                      <SelectItem value="Lakki Marwat">Lakki Marwat</SelectItem>
                      <SelectItem value="North Waziristan">North Waziristan</SelectItem>
                      <SelectItem value="Khyber">Khyber</SelectItem>
                      <SelectItem value="Mohmand">Mohmand</SelectItem>
                      <SelectItem value="Nowshera">Nowshera</SelectItem>
                      <SelectItem value="Peshawar">Peshawar</SelectItem>
                      <SelectItem value="Charsadda">Charsadda</SelectItem>
                      <SelectItem value="Dera Ismail Khan">Dera Ismail Khan</SelectItem>
                      <SelectItem value="Upper South Waziristan">Upper South Waziristan</SelectItem>
                      <SelectItem value="Lower South Waziristan">Lower South Waziristan</SelectItem>
                      <SelectItem value="Tank">Tank</SelectItem>
                      <SelectItem value="Paharpur">Paharpur</SelectItem>
                      <SelectItem value="Mardan">Mardan</SelectItem>
                      <SelectItem value="Swabi">Swabi</SelectItem>
                      <SelectItem value="Upper Chitral">Upper Chitral</SelectItem>
                      <SelectItem value="Upper Dir">Upper Dir</SelectItem>
                      <SelectItem value="Lower Chitral">Lower Chitral</SelectItem>
                      <SelectItem value="Lower Dir">Lower Dir</SelectItem>
                      <SelectItem value="Malakand">Malakand</SelectItem>
                      <SelectItem value="Shangla">Shangla</SelectItem>
                      <SelectItem value="Swat">Swat</SelectItem>
                      <SelectItem value="Upper Swat">Upper Swat</SelectItem>
                      <SelectItem value="Bajaur">Bajaur</SelectItem>
                      <SelectItem value="Buner">Buner</SelectItem>
                      <SelectItem value="Central Dir">Central Dir</SelectItem>
                      <SelectItem value="__heading_punjab" disabled>Punjab</SelectItem>
                      <SelectItem value="Attock">Attock</SelectItem>
                      <SelectItem value="Bahawalnagar">Bahawalnagar</SelectItem>
                      <SelectItem value="Bahawalpur">Bahawalpur</SelectItem>
                      <SelectItem value="Bhakkar">Bhakkar</SelectItem>
                      <SelectItem value="Chakwal">Chakwal</SelectItem>
                      <SelectItem value="Chiniot">Chiniot</SelectItem>
                      <SelectItem value="Dera Ghazi Khan">Dera Ghazi Khan</SelectItem>
                      <SelectItem value="Faisalabad">Faisalabad</SelectItem>
                      <SelectItem value="Gujranwala">Gujranwala</SelectItem>
                      <SelectItem value="Gujrat">Gujrat</SelectItem>
                      <SelectItem value="Hafizabad">Hafizabad</SelectItem>
                      <SelectItem value="Jhang">Jhang</SelectItem>
                      <SelectItem value="Jhelum">Jhelum</SelectItem>
                      <SelectItem value="Kasur">Kasur</SelectItem>
                      <SelectItem value="Khanewal">Khanewal</SelectItem>
                      <SelectItem value="Khushab">Khushab</SelectItem>
                      <SelectItem value="Lahore">Lahore</SelectItem>
                      <SelectItem value="Layyah">Layyah</SelectItem>
                      <SelectItem value="Lodhran">Lodhran</SelectItem>
                      <SelectItem value="Mandi Bahauddin">Mandi Bahauddin</SelectItem>
                      <SelectItem value="Mianwali">Mianwali</SelectItem>
                      <SelectItem value="Multan">Multan</SelectItem>
                      <SelectItem value="Muzaffargarh">Muzaffargarh</SelectItem>
                      <SelectItem value="Nankana Sahib">Nankana Sahib</SelectItem>
                      <SelectItem value="Narowal">Narowal</SelectItem>
                      <SelectItem value="Okara">Okara</SelectItem>
                      <SelectItem value="Pakpattan">Pakpattan</SelectItem>
                      <SelectItem value="Rahim Yar Khan">Rahim Yar Khan</SelectItem>
                      <SelectItem value="Rajanpur">Rajanpur</SelectItem>
                      <SelectItem value="Rawalpindi">Rawalpindi</SelectItem>
                      <SelectItem value="Sahiwal">Sahiwal</SelectItem>
                      <SelectItem value="Sargodha">Sargodha</SelectItem>
                      <SelectItem value="Sheikhupura">Sheikhupura</SelectItem>
                      <SelectItem value="Sialkot">Sialkot</SelectItem>
                      <SelectItem value="Toba Tek Singh">Toba Tek Singh</SelectItem>
                      <SelectItem value="Vehari">Vehari</SelectItem>
                      <SelectItem value="Talagang">Talagang</SelectItem>
                      <SelectItem value="Murree">Murree</SelectItem>
                      <SelectItem value="Taunsa">Taunsa</SelectItem>
                      <SelectItem value="Kot Addu">Kot Addu</SelectItem>
                      <SelectItem value="Wazirabad">Wazirabad</SelectItem>
                      <SelectItem value="__heading_sindh" disabled>Sindh</SelectItem>
                      <SelectItem value="Badin">Badin</SelectItem>
                      <SelectItem value="Dadu">Dadu</SelectItem>
                      <SelectItem value="Ghotki">Ghotki</SelectItem>
                      <SelectItem value="Hyderabad">Hyderabad</SelectItem>
                      <SelectItem value="Jacobabad">Jacobabad</SelectItem>
                      <SelectItem value="Jamshoro">Jamshoro</SelectItem>
                      <SelectItem value="Karachi Central">Karachi Central</SelectItem>
                      <SelectItem value="Karachi East">Karachi East</SelectItem>
                      <SelectItem value="Karachi South">Karachi South</SelectItem>
                      <SelectItem value="Karachi West">Karachi West</SelectItem>
                      <SelectItem value="Kashmore">Kashmore</SelectItem>
                      <SelectItem value="Keamari">Keamari</SelectItem>
                      <SelectItem value="Khairpur">Khairpur</SelectItem>
                      <SelectItem value="Korangi">Korangi</SelectItem>
                      <SelectItem value="Larkana">Larkana</SelectItem>
                      <SelectItem value="Malir">Malir</SelectItem>
                      <SelectItem value="Matiari">Matiari</SelectItem>
                      <SelectItem value="Mirpur Khas">Mirpur Khas</SelectItem>
                      <SelectItem value="Naushahro Feroze">Naushahro Feroze</SelectItem>
                      <SelectItem value="Qambar Shahdadkot">Qambar Shahdadkot</SelectItem>
                      <SelectItem value="Sanghar">Sanghar</SelectItem>
                      <SelectItem value="Shaheed Benazirabad">Shaheed Benazirabad</SelectItem>
                      <SelectItem value="Shikarpur">Shikarpur</SelectItem>
                      <SelectItem value="Sujawal">Sujawal</SelectItem>
                      <SelectItem value="Sukkur">Sukkur</SelectItem>
                      <SelectItem value="Tando Allahyar">Tando Allahyar</SelectItem>
                      <SelectItem value="Tando Muhammad Khan">Tando Muhammad Khan</SelectItem>
                      <SelectItem value="Tharparkar">Tharparkar</SelectItem>
                      <SelectItem value="Thatta">Thatta</SelectItem>
                      <SelectItem value="Umerkot">Umerkot</SelectItem>
                      <SelectItem value="__heading_capital_territory" disabled>Capital Territory</SelectItem>
                      <SelectItem value="Islamabad">Islamabad</SelectItem>
                      <SelectItem value="__heading_gilgit_baltistan" disabled>Gilgit-Baltistan</SelectItem>
                      <SelectItem value="Gilgit">Gilgit</SelectItem>
                      <SelectItem value="Hunza">Hunza</SelectItem>
                      <SelectItem value="Nagar">Nagar</SelectItem>
                      <SelectItem value="Ghizer">Ghizer</SelectItem>
                      <SelectItem value="Gupis–Yasin">Gupis–Yasin</SelectItem>
                      <SelectItem value="Astore">Astore</SelectItem>
                      <SelectItem value="Diamer">Diamer</SelectItem>
                      <SelectItem value="Darel">Darel</SelectItem>
                      <SelectItem value="Tangir">Tangir</SelectItem>
                      <SelectItem value="Skardu">Skardu</SelectItem>
                      <SelectItem value="Shigar">Shigar</SelectItem>
                      <SelectItem value="Kharmang">Kharmang</SelectItem>
                      <SelectItem value="Ghanche">Ghanche</SelectItem>
                      <SelectItem value="Roundu">Roundu</SelectItem>
                      <SelectItem value="__heading_balochistan" disabled>Balochistan</SelectItem>
                      <SelectItem value="Awaran">Awaran</SelectItem>
                      <SelectItem value="Hub">Hub</SelectItem>
                      <SelectItem value="Lasbela">Lasbela</SelectItem>
                      <SelectItem value="Surab">Surab</SelectItem>
                      <SelectItem value="Mastung">Mastung</SelectItem>
                      <SelectItem value="Khuzdar">Khuzdar</SelectItem>
                      <SelectItem value="Kalat">Kalat</SelectItem>
                      <SelectItem value="Chaman">Chaman</SelectItem>
                      <SelectItem value="Pishin">Pishin</SelectItem>
                      <SelectItem value="Quetta">Quetta</SelectItem>
                      <SelectItem value="Qila Abdullah">Qila Abdullah</SelectItem>
                      <SelectItem value="Sohbatpur">Sohbatpur</SelectItem>
                      <SelectItem value="Nasirabad">Nasirabad</SelectItem>
                      <SelectItem value="Usta Muhammad">Usta Muhammad</SelectItem>
                      <SelectItem value="Jafarabad">Jafarabad</SelectItem>
                      <SelectItem value="Jhal Magsi">Jhal Magsi</SelectItem>
                      <SelectItem value="Kachhi">Kachhi</SelectItem>
                      <SelectItem value="Chagai">Chagai</SelectItem>
                      <SelectItem value="Washuk">Washuk</SelectItem>
                      <SelectItem value="Kharan">Kharan</SelectItem>
                      <SelectItem value="Nushki">Nushki</SelectItem>
                      <SelectItem value="Ziarat">Ziarat</SelectItem>
                      <SelectItem value="Harnai">Harnai</SelectItem>
                      <SelectItem value="Kohlu">Kohlu</SelectItem>
                      <SelectItem value="Dera Bugti">Dera Bugti</SelectItem>
                      <SelectItem value="Sibi">Sibi</SelectItem>
                      <SelectItem value="Barkhan">Barkhan</SelectItem>
                      <SelectItem value="Duki">Duki</SelectItem>
                      <SelectItem value="Musakhel">Musakhel</SelectItem>
                      <SelectItem value="Loralai">Loralai</SelectItem>
                      <SelectItem value="Panjgur">Panjgur</SelectItem>
                      <SelectItem value="Gwadar">Gwadar</SelectItem>
                      <SelectItem value="Kech">Kech</SelectItem>
                      <SelectItem value="Zhob">Zhob</SelectItem>
                      <SelectItem value="Qilla Saifullah">Qilla Saifullah</SelectItem>
                      <SelectItem value="Sherani">Sherani</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="edit-pd">Probability of Default (%) *</Label>
                    <Input
                      id="edit-pd"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={editingEntry.probabilityOfDefault || ''}
                      onChange={(e) => setEditingEntry({...editingEntry, probabilityOfDefault: Number(e.target.value)})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-lgd">Loss Given Default (%) *</Label>
                    <Input
                      id="edit-lgd"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={editingEntry.lossGivenDefault || ''}
                      onChange={(e) => setEditingEntry({...editingEntry, lossGivenDefault: Number(e.target.value)})}
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="edit-tenor">Tenor/Maturity (months) *</Label>
                  <Input
                    id="edit-tenor"
                    type="number"
                    min="1"
                    value={editingEntry.tenor || ''}
                    onChange={(e) => setEditingEntry({...editingEntry, tenor: Number(e.target.value)})}
                    className="mt-1"
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button onClick={updateEntry} className="flex-1">
                    Update Company
                  </Button>
                  <Button variant="outline" onClick={cancelEdit} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <Trash2 className="h-5 w-5" />
                  Delete Company
                </CardTitle>
                <CardDescription>
                  Are you sure you want to delete this company? This action cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Button 
                    variant="destructive" 
                    onClick={() => deleteEntry(showDeleteConfirm)}
                    className="flex-1"
                  >
                    Delete
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowDeleteConfirm(null)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default BankPortfolio;


