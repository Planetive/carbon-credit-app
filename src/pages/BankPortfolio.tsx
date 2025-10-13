import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormattedNumberInput } from './finance_facilitated/components/FormattedNumberInput';
import { ArrowLeft, Building2, Plus, Search, Wallet, MapPin, Shield, Calendar, TrendingUp, Upload, Download, FileSpreadsheet, Edit, Trash2, X } from 'lucide-react';

const currencyFormat = (value: number) =>
  (Number(value) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

interface PortfolioEntry {
  id: string;
  company: string;
  amount: number;
  counterparty: string;
  sector: string;
  geography: string;
  probabilityOfDefault: number;
  lossGivenDefault: number;
  tenor: number;
}

const BankPortfolio: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [entries, setEntries] = useState<PortfolioEntry[]>([
    { 
      id: '0001', 
      company: 'National Steel Limited', 
      amount: 250000000,
      counterparty: '0001',
      sector: 'Manufacturing',
      geography: 'Pakistan',
      probabilityOfDefault: 2.5,
      lossGivenDefault: 45,
      tenor: 36
    },
    { 
      id: '0002', 
      company: 'Sunrise Power Pvt. Ltd.', 
      amount: 450000000,
      counterparty: '0002',
      sector: 'Energy',
      geography: 'Pakistan',
      probabilityOfDefault: 1.8,
      lossGivenDefault: 40,
      tenor: 60
    },
    { 
      id: '0003', 
      company: 'Metro Retail Holdings', 
      amount: 150000000,
      counterparty: '0003',
      sector: 'Retail',
      geography: 'Pakistan',
      probabilityOfDefault: 3.2,
      lossGivenDefault: 50,
      tenor: 24
    }
  ]);

  const zeroPadId = (num: number, width = 4) => num.toString().padStart(width, '0');
  const getNextId = (): string => {
    const numericIds = entries
      .map(e => parseInt(e.id, 10))
      .filter(n => !isNaN(n));
    const max = numericIds.length ? Math.max(...numericIds) : 0;
    return zeroPadId(max + 1);
  };

  const zeroPadCounterparty = (num: number, width = 4) => num.toString().padStart(width, '0');
  const getNextCounterparty = (): string => {
    const numericCps = entries
      .map(e => parseInt(e.counterparty, 10))
      .filter(n => !isNaN(n));
    const max = numericCps.length ? Math.max(...numericCps) : 0;
    return zeroPadCounterparty(max + 1);
  };
  
  // Form state
  const [newCompany, setNewCompany] = useState('');
  const [newAmount, setNewAmount] = useState<number>(0);
  const [newCounterparty, setNewCounterparty] = useState('');
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(e => e.company.toLowerCase().includes(q));
  }, [entries, search]);

  const addEntry = () => {
    if (!newCompany.trim() || 
        (Number(newAmount) || 0) <= 0 || 
        !newSector || 
        !newGeography || 
        (Number(newPD) || 0) <= 0 || 
        (Number(newLGD) || 0) <= 0 || 
        (Number(newTenor) || 0) <= 0) return;
    
    setEntries(prev => [
      { 
        id: getNextId(), 
        company: newCompany.trim(), 
        amount: Number(newAmount) || 0,
        counterparty: getNextCounterparty(),
        sector: newSector,
        geography: newGeography,
        probabilityOfDefault: Number(newPD) || 0,
        lossGivenDefault: Number(newLGD) || 0,
        tenor: Number(newTenor) || 0
      },
      ...prev
    ]);
    
    // Reset form
    setNewCompany('');
    setNewAmount(0);
    setNewCounterparty('');
    setNewSector('');
    setNewGeography('');
    setNewPD(0);
    setNewLGD(0);
    setNewTenor(0);
  };

  const downloadTemplate = () => {
    const csvContent = [
      'Company Name,Counterparty ID,Loan Amount (PKR),Sector,Geography,Probability of Default (%),Loss Given Default (%),Tenor (months)',
      'National Steel Limited,0001,250000000,Manufacturing,Pakistan,2.5,45,36',
      'Sunrise Power Pvt. Ltd.,0002,450000000,Energy,Pakistan,1.8,40,60',
      'Metro Retail Holdings,0003,150000000,Retail,Pakistan,3.2,50,24'
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
      'Counterparty ID', 
      'Loan Amount (PKR)',
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
    let nextCpBase = (() => {
      const numericCps = entriesStateRef()
        .map(e => parseInt(e.counterparty, 10))
        .filter(n => !isNaN(n));
      const max = numericCps.length ? Math.max(...numericCps) : 0;
      return max;
    })();
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      if (values.length !== headers.length) {
        throw new Error(`Row ${i + 1}: Incorrect number of columns`);
      }

      nextIdBase += 1;
      const entry: PortfolioEntry = {
        id: zeroPadId(nextIdBase),
        company: values[headers.indexOf('Company Name')] || '',
        counterparty: zeroPadCounterparty(++nextCpBase),
        amount: Number(values[headers.indexOf('Loan Amount (PKR)')]) || 0,
        sector: values[headers.indexOf('Sector')] || '',
        geography: values[headers.indexOf('Geography')] || '',
        probabilityOfDefault: Number(values[headers.indexOf('Probability of Default (%)')]) || 0,
        lossGivenDefault: Number(values[headers.indexOf('Loss Given Default (%)')]) || 0,
        tenor: Number(values[headers.indexOf('Tenor (months)')]) || 0
      };

      // Validate required fields
      if (!entry.company || !entry.counterparty || entry.amount <= 0 || !entry.sector || !entry.geography || entry.probabilityOfDefault <= 0 || entry.lossGivenDefault <= 0 || entry.tenor <= 0) {
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

  const updateEntry = () => {
    if (!editingEntry) return;
    
    setEntries(prev => prev.map(entry => 
      entry.id === editingEntry.id ? editingEntry : entry
    ));
    setEditingEntry(null);
  };

  const deleteEntry = (id: string) => {
    setEntries(prev => prev.filter(entry => entry.id !== id));
    setShowDeleteConfirm(null);
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
              {filtered.length === 0 ? (
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
                                  Counterparty: {e.counterparty}
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
                  <Label htmlFor="counterparty">Counterparty ID *</Label>
                  <Input
                    id="counterparty"
                    placeholder="e.g., SUNRISE001"
                    value={newCounterparty}
                    onChange={(e) => setNewCounterparty(e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="amount">Loan Amount (PKR) *</Label>
                  <FormattedNumberInput
                    id="amount"
                    placeholder="0"
                    value={newAmount}
                    onChange={setNewAmount}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="sector">Sector *</Label>
                  <Select value={newSector} onValueChange={setNewSector}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select sector" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Energy">Energy</SelectItem>
                      <SelectItem value="Agriculture">Agriculture</SelectItem>
                      <SelectItem value="Real Estate">Real Estate</SelectItem>
                      <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="Retail">Retail</SelectItem>
                      <SelectItem value="Technology">Technology</SelectItem>
                      <SelectItem value="Healthcare">Healthcare</SelectItem>
                      <SelectItem value="Financial Services">Financial Services</SelectItem>
                      <SelectItem value="Transportation">Transportation</SelectItem>
                      <SelectItem value="Construction">Construction</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="geography">Geography *</Label>
                  <Select value={newGeography} onValueChange={setNewGeography}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select country/region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pakistan">Pakistan</SelectItem>
                      <SelectItem value="India">India</SelectItem>
                      <SelectItem value="Bangladesh">Bangladesh</SelectItem>
                      <SelectItem value="Sri Lanka">Sri Lanka</SelectItem>
                      <SelectItem value="Nepal">Nepal</SelectItem>
                      <SelectItem value="Afghanistan">Afghanistan</SelectItem>
                      <SelectItem value="China">China</SelectItem>
                      <SelectItem value="United States">United States</SelectItem>
                      <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                      <SelectItem value="Germany">Germany</SelectItem>
                      <SelectItem value="France">France</SelectItem>
                      <SelectItem value="Japan">Japan</SelectItem>
                      <SelectItem value="Australia">Australia</SelectItem>
                      <SelectItem value="Canada">Canada</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
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
                
                <Button onClick={addEntry} className="w-full">Add Company</Button>
                
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
                  <Label htmlFor="edit-counterparty">Counterparty ID *</Label>
                  <Input
                    id="edit-counterparty"
                    value={editingEntry.counterparty}
                    onChange={(e) => setEditingEntry({...editingEntry, counterparty: e.target.value})}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-amount">Loan Amount (PKR) *</Label>
                  <FormattedNumberInput
                    id="edit-amount"
                    value={editingEntry.amount}
                    onChange={(value) => setEditingEntry({...editingEntry, amount: value})}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-sector">Sector *</Label>
                  <Select value={editingEntry.sector} onValueChange={(value) => setEditingEntry({...editingEntry, sector: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select sector" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Energy">Energy</SelectItem>
                      <SelectItem value="Agriculture">Agriculture</SelectItem>
                      <SelectItem value="Real Estate">Real Estate</SelectItem>
                      <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="Retail">Retail</SelectItem>
                      <SelectItem value="Technology">Technology</SelectItem>
                      <SelectItem value="Healthcare">Healthcare</SelectItem>
                      <SelectItem value="Financial Services">Financial Services</SelectItem>
                      <SelectItem value="Transportation">Transportation</SelectItem>
                      <SelectItem value="Construction">Construction</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="edit-geography">Geography *</Label>
                  <Select value={editingEntry.geography} onValueChange={(value) => setEditingEntry({...editingEntry, geography: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select country/region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pakistan">Pakistan</SelectItem>
                      <SelectItem value="India">India</SelectItem>
                      <SelectItem value="Bangladesh">Bangladesh</SelectItem>
                      <SelectItem value="Sri Lanka">Sri Lanka</SelectItem>
                      <SelectItem value="Nepal">Nepal</SelectItem>
                      <SelectItem value="Afghanistan">Afghanistan</SelectItem>
                      <SelectItem value="China">China</SelectItem>
                      <SelectItem value="United States">United States</SelectItem>
                      <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                      <SelectItem value="Germany">Germany</SelectItem>
                      <SelectItem value="France">France</SelectItem>
                      <SelectItem value="Japan">Japan</SelectItem>
                      <SelectItem value="Australia">Australia</SelectItem>
                      <SelectItem value="Canada">Canada</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
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


