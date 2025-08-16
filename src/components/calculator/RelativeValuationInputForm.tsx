import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Trash2, Plus, AlertTriangle, Info, Download, Sparkles, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { validateRelativeValuationInputs } from '../../utils/relativeValuationCalculator';
import { getIndustryInfo } from '../../constants/industryPeers';
import { usePeerData } from '../../hooks/usePeerData';
import type { 
  RelativeValuationInputs, 
  PeerCompany, 
  ValuationMultipleType,
  RelativeValuationValidation 
} from '../../types/relativeValuation';

interface RelativeValuationInputFormProps {
  onCalculate: (inputs: RelativeValuationInputs) => void;
  defaultCompanyData?: {
    symbol: string;
    name: string;
    marketCap: number;
    enterpriseValue: number;
    revenue: number;
    ebitda: number;
    netIncome: number;
    bookValue: number;
    sharesOutstanding: number;
    debt: number;
    cash: number;
  };
  suggestedPeers?: PeerCompany[];
  // historicalData removed - not currently used
}

const MULTIPLE_OPTIONS: Array<{ value: ValuationMultipleType; label: string; description: string; suitable: string[] }> = [
  { 
    value: 'PE', 
    label: 'P/E Ratio', 
    description: 'Price-to-Earnings', 
    suitable: ['Profitable companies', 'Mature businesses', 'Stable earnings'] 
  },
  { 
    value: 'PEG', 
    label: 'PEG Ratio', 
    description: 'P/E-to-Growth', 
    suitable: ['Growth companies', 'Consistent growth', 'Forward-looking analysis'] 
  },
  { 
    value: 'PS', 
    label: 'P/S Ratio', 
    description: 'Price-to-Sales', 
    suitable: ['High-growth companies', 'Loss-making companies', 'Revenue-focused'] 
  },
  { 
    value: 'EV_SALES', 
    label: 'EV/Sales', 
    description: 'Enterprise Value-to-Sales', 
    suitable: ['Capital-intensive businesses', 'Cross-sector comparison', 'M&A analysis'] 
  },
  { 
    value: 'EV_EBITDA', 
    label: 'EV/EBITDA', 
    description: 'Enterprise Value-to-EBITDA', 
    suitable: ['Mature companies', 'Operating leverage', 'Cash generation focus'] 
  },
  { 
    value: 'PB', 
    label: 'P/B Ratio', 
    description: 'Price-to-Book', 
    suitable: ['Asset-heavy companies', 'Financial services', 'Value investing'] 
  }
];

const DEFAULT_PEER_COMPANY: Omit<PeerCompany, 'multiples'> = {
  symbol: '',
  name: '',
  industry: 'Technology',
  marketCap: 0,
  enterpriseValue: 0,
  revenue: 0,
  ebitda: 0,
  netIncome: 0,
  bookValue: 0,
  sharesOutstanding: 0,
  growthRate: 0.10,
  debt: 0,
  cash: 0
};

export const RelativeValuationInputForm: React.FC<RelativeValuationInputFormProps> = ({
  onCalculate,
  defaultCompanyData,
  suggestedPeers = []
}) => {
  // Use the peer data hook for better state management
  const {
    peerData,
    suggestedPeers: hookSuggestedPeers,
    isLoading: isLoadingPeers,
    loadingStates,
    errors: peerErrors,
    lastFetchResult,
    fetchPeers,
    fetchSinglePeer,
    clearErrors,
    getSuggestedPeers: updateSuggestedPeers
  } = usePeerData(defaultCompanyData?.symbol);

  // Form state
  const [targetCompany, setTargetCompany] = useState<RelativeValuationInputs['targetCompany']>({
    symbol: defaultCompanyData?.symbol || '',
    name: defaultCompanyData?.name || '',
    marketCap: defaultCompanyData?.marketCap || 0,
    enterpriseValue: defaultCompanyData?.enterpriseValue || 0,
    revenue: defaultCompanyData?.revenue || 0,
    ebitda: defaultCompanyData?.ebitda || 0,
    netIncome: defaultCompanyData?.netIncome || 0,
    bookValue: defaultCompanyData?.bookValue || 0,
    sharesOutstanding: defaultCompanyData?.sharesOutstanding || 0,
    growthRate: 0.15, // Default 15% growth
    debt: defaultCompanyData?.debt || 0,
    cash: defaultCompanyData?.cash || 0
  });

  const [peerCompanies, setPeerCompanies] = useState<PeerCompany[]>(
    suggestedPeers.length > 0 ? suggestedPeers : [{ ...DEFAULT_PEER_COMPANY }]
  );
  
  const [selectedMultiples, setSelectedMultiples] = useState<ValuationMultipleType[]>(['PE', 'PS', 'EV_EBITDA']);
  const [useGrowthAdjustments, setUseGrowthAdjustments] = useState(false);
  const [outlierRemoval, setOutlierRemoval] = useState(true);
  const [minimumPeers, setMinimumPeers] = useState(3);
  
  const [peerSelectionCriteria] = useState({
    industryMatch: true,
    sizeRange: { min: 500000000, max: 5000000000 }, // $500M - $5B
    growthSimilarity: false,
    profitabilityThreshold: 0.05 // 5%
  });

  const [validation, setValidation] = useState<RelativeValuationValidation>({
    isValid: false,
    errors: [],
    warnings: []
  });

  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [suggestedIndustry, setSuggestedIndustry] = useState<string>('');
  
  // Use hook suggested peers instead of local state
  const peerSuggestions = hookSuggestedPeers;

  // Auto-populate data when defaultCompanyData changes
  useEffect(() => {
    if (defaultCompanyData) {
      setTargetCompany(prev => ({
        ...prev,
        ...defaultCompanyData,
        growthRate: prev.growthRate // Keep user-set growth rate
      }));

      // Generate peer suggestions based on target company symbol
      if (defaultCompanyData.symbol) {
        updateSuggestedPeers(defaultCompanyData.symbol);
        const industryInfo = getIndustryInfo(defaultCompanyData.symbol);
        
        setSuggestedIndustry(industryInfo?.industry || '');
        
        // Auto-populate peer companies with suggested symbols (empty data initially)
        if (hookSuggestedPeers.length > 0 && peerCompanies.length === 1 && !peerCompanies[0].symbol) {
          const suggestedPeerCompanies = hookSuggestedPeers.map(symbol => ({
            ...DEFAULT_PEER_COMPANY,
            symbol,
            industry: industryInfo?.industry || 'Technology'
          }));
          setPeerCompanies(suggestedPeerCompanies);
        }
      }
    }
  }, [defaultCompanyData, peerCompanies, hookSuggestedPeers, updateSuggestedPeers]);

  // Validate inputs whenever they change
  useEffect(() => {
    const inputs: RelativeValuationInputs = {
      targetCompany,
      peerCompanies,
      selectedMultiples,
      useGrowthAdjustments,
      outlierRemoval,
      minimumPeers,
      peerSelectionCriteria
    };

    const newValidation = validateRelativeValuationInputs(inputs);
    setValidation(newValidation);
  }, [targetCompany, peerCompanies, selectedMultiples, useGrowthAdjustments, outlierRemoval, minimumPeers, peerSelectionCriteria]);

  // Smart multiple suggestions based on company characteristics
  const getSuggestedMultiples = (): ValuationMultipleType[] => {
    const suggestions: ValuationMultipleType[] = [];
    
    // Always include P/E if profitable
    if (targetCompany.netIncome > 0) {
      suggestions.push('PE');
      if (targetCompany.growthRate > 0.10) {
        suggestions.push('PEG'); // Add PEG for growth companies
      }
    }
    
    // Always include P/S for revenue comparison
    if (targetCompany.revenue > 0) {
      suggestions.push('PS', 'EV_SALES');
    }
    
    // Include EV/EBITDA if EBITDA positive
    if (targetCompany.ebitda > 0) {
      suggestions.push('EV_EBITDA');
    }
    
    // Include P/B for asset-heavy businesses
    if (targetCompany.bookValue > 0) {
      suggestions.push('PB');
    }
    
    return suggestions;
  };

  const handleTargetCompanyChange = (field: keyof RelativeValuationInputs['targetCompany'], value: number | string) => {
    setTargetCompany(prev => ({
      ...prev,
      [field]: typeof value === 'string' ? value : Number(value)
    }));
  };

  const handlePeerChange = (index: number, field: keyof PeerCompany, value: number | string) => {
    setPeerCompanies(prev => prev.map((peer, i) => 
      i === index ? { ...peer, [field]: typeof value === 'string' ? value : Number(value) } : peer
    ));
  };

  const addPeerCompany = () => {
    setPeerCompanies(prev => [...prev, { ...DEFAULT_PEER_COMPANY }]);
  };

  const removePeerCompany = (index: number) => {
    if (peerCompanies.length > 1) {
      setPeerCompanies(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleMultipleToggle = (multiple: ValuationMultipleType, checked: boolean) => {
    setSelectedMultiples(prev => 
      checked 
        ? [...prev, multiple]
        : prev.filter(m => m !== multiple)
    );
  };

  const applySuggestedMultiples = () => {
    const suggested = getSuggestedMultiples();
    setSelectedMultiples(suggested);
  };

  const handleFetchPeerData = async () => {
    // Extract ALL peer symbols that have been entered (not just suggestions)
    const allPeerSymbols = peerCompanies
      .filter(peer => peer.symbol && peer.symbol.trim() !== '')
      .map(peer => peer.symbol.trim().toUpperCase());
    
    // Remove duplicates
    const uniqueSymbols = [...new Set(allPeerSymbols)];
    
    if (uniqueSymbols.length === 0) {
      console.log('No peer symbols to fetch');
      return;
    }
    
    // Clear previous errors
    clearErrors();
    
    // Fetch using the hook
    await fetchPeers(uniqueSymbols);
    
    // Update peer companies with fetched data from the hook
    const updatedPeers = peerCompanies.map(peer => {
      if (peer.symbol) {
        const normalizedSymbol = peer.symbol.trim().toUpperCase();
        const fetchedData = peerData.get(normalizedSymbol);
        if (fetchedData) {
          return {
            ...peer,
            ...fetchedData,
            // Keep user-modified fields if they exist and are different from defaults
            symbol: normalizedSymbol, // Keep normalized symbol
            name: peer.name || fetchedData.name,
            // Always use the freshly calculated growth rate to ensure accuracy
            growthRate: fetchedData.growthRate
          };
        }
      }
      return peer;
    });
    
    setPeerCompanies(updatedPeers);
  };

  // Handle fetching individual peer
  const handleFetchSinglePeer = async (symbol: string) => {
    if (!symbol || !symbol.trim()) return;
    
    await fetchSinglePeer(symbol);
    
    // Update the specific peer company with fetched data
    const normalizedSymbol = symbol.trim().toUpperCase();
    const fetchedData = peerData.get(normalizedSymbol);
    
    if (fetchedData) {
      setPeerCompanies(prev => prev.map(peer => {
        if (peer.symbol?.trim().toUpperCase() === normalizedSymbol) {
          return {
            ...peer,
            ...fetchedData,
            symbol: normalizedSymbol,
            name: peer.name || fetchedData.name,
            // Always use the freshly calculated growth rate to ensure accuracy
            growthRate: fetchedData.growthRate
          };
        }
        return peer;
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validation.isValid) {
      return;
    }

    const inputs: RelativeValuationInputs = {
      targetCompany,
      peerCompanies,
      selectedMultiples,
      useGrowthAdjustments,
      outlierRemoval,
      minimumPeers,
      peerSelectionCriteria
    };

    onCalculate(inputs);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Target Company Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Target Company</span>
            {targetCompany.symbol && (
              <Badge variant="outline">{targetCompany.symbol}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Financial metrics for the company you want to value
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol</Label>
              <Input
                id="symbol"
                value={targetCompany.symbol}
                onChange={(e) => handleTargetCompanyChange('symbol', e.target.value)}
                placeholder="AAPL"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Company Name</Label>
              <Input
                id="name"
                value={targetCompany.name}
                onChange={(e) => handleTargetCompanyChange('name', e.target.value)}
                placeholder="Apple Inc."
              />
            </div>
          </div>

          {/* Financial Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="marketCap">Market Cap ($)</Label>
              <Input
                id="marketCap"
                type="number"
                value={targetCompany.marketCap || ''}
                onChange={(e) => handleTargetCompanyChange('marketCap', parseFloat(e.target.value) || 0)}
                placeholder="1000000000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="revenue">Revenue ($)</Label>
              <Input
                id="revenue"
                type="number"
                value={targetCompany.revenue || ''}
                onChange={(e) => handleTargetCompanyChange('revenue', parseFloat(e.target.value) || 0)}
                placeholder="500000000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="netIncome">Net Income ($)</Label>
              <Input
                id="netIncome"
                type="number"
                value={targetCompany.netIncome || ''}
                onChange={(e) => handleTargetCompanyChange('netIncome', parseFloat(e.target.value) || 0)}
                placeholder="50000000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ebitda">EBITDA ($)</Label>
              <Input
                id="ebitda"
                type="number"
                value={targetCompany.ebitda || ''}
                onChange={(e) => handleTargetCompanyChange('ebitda', parseFloat(e.target.value) || 0)}
                placeholder="100000000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bookValue">Book Value ($)</Label>
              <Input
                id="bookValue"
                type="number"
                value={targetCompany.bookValue || ''}
                onChange={(e) => handleTargetCompanyChange('bookValue', parseFloat(e.target.value) || 0)}
                placeholder="200000000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="growthRate">Growth Rate (%)</Label>
              <Input
                id="growthRate"
                type="number"
                step="0.01"
                min="-50"
                max="100"
                value={(targetCompany.growthRate * 100) || ''}
                onChange={(e) => handleTargetCompanyChange('growthRate', (parseFloat(e.target.value) || 0) / 100)}
                placeholder="15"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Valuation Multiples Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Valuation Multiples</span>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={applySuggestedMultiples}
            >
              Use Suggested
            </Button>
          </CardTitle>
          <CardDescription>
            Select the valuation ratios most relevant for this analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MULTIPLE_OPTIONS.map(option => (
              <div key={option.value} className="flex items-start space-x-3 p-3 rounded-lg border">
                <Checkbox
                  id={option.value}
                  checked={selectedMultiples.includes(option.value)}
                  onCheckedChange={(checked) => handleMultipleToggle(option.value, checked as boolean)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Label 
                      htmlFor={option.value} 
                      className="text-sm font-medium cursor-pointer"
                    >
                      {option.label}
                    </Label>
                    {getSuggestedMultiples().includes(option.value) && (
                      <Badge variant="secondary" className="text-xs">Suggested</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{option.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {option.suitable.map(suitable => (
                      <span key={suitable} className="inline-block text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {suitable}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Peer Companies Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Peer Companies ({peerCompanies.length})</span>
            <div className="flex gap-2">
              {peerCompanies.some(peer => peer.symbol && peer.symbol.trim() !== '') && (
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleFetchPeerData}
                  disabled={isLoadingPeers}
                >
                  {isLoadingPeers ? (
                    <div className="h-4 w-4 mr-1 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                  ) : (
                    <Download className="h-4 w-4 mr-1" />
                  )}
                  {isLoadingPeers ? 'Fetching...' : 'Fetch Peer Data'}
                </Button>
              )}
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={addPeerCompany}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Peer
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Comparable companies for relative valuation analysis
            {suggestedIndustry && (
              <span className="block text-xs text-blue-600 mt-1">
                Industry: {suggestedIndustry} • {peerSuggestions.length} peers suggested
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Show fetch summary if available */}
          {lastFetchResult && lastFetchResult.totalRequested > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-800">
                    Fetched {lastFetchResult.successful.length} of {lastFetchResult.totalRequested} peers successfully
                    ({lastFetchResult.successRate.toFixed(0)}% success rate)
                  </span>
                </div>
                {lastFetchResult.failed.length > 0 && (
                  <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-300">
                    {lastFetchResult.failed.length} failed
                  </Badge>
                )}
              </div>
            </div>
          )}
          {peerCompanies.map((peer, index) => {
            const isSuggested = peerSuggestions.includes(peer.symbol);
            const normalizedSymbol = peer.symbol?.trim().toUpperCase();
            const loadingState = normalizedSymbol ? loadingStates.get(normalizedSymbol) : null;
            const error = normalizedSymbol ? peerErrors.get(normalizedSymbol) : null;
            const hasFetchedData = normalizedSymbol ? peerData.has(normalizedSymbol) : false;
            
            return (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">Peer {index + 1}</h4>
                    {isSuggested && (
                      <Badge variant="secondary" className="text-xs flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Suggested
                      </Badge>
                    )}
                    {peer.symbol && (
                      <Badge variant="outline" className="text-xs font-mono">
                        {peer.symbol}
                      </Badge>
                    )}
                    {/* Status indicators */}
                    {loadingState?.isLoading && (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                    )}
                    {!loadingState?.isLoading && hasFetchedData && !error && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {!loadingState?.isLoading && error && (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {peer.symbol && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFetchSinglePeer(peer.symbol)}
                        disabled={loadingState?.isLoading}
                        title={hasFetchedData ? "Refresh data" : "Fetch data"}
                      >
                        {loadingState?.isLoading ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                        ) : (
                          <RefreshCw className={`h-4 w-4 ${hasFetchedData ? 'text-green-600' : ''}`} />
                        )}
                      </Button>
                    )}
                    {peerCompanies.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePeerCompany(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">Symbol</Label>
                  <Input
                    placeholder="e.g., AAPL"
                    value={peer.symbol}
                    onChange={(e) => handlePeerChange(index, 'symbol', e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">Company Name</Label>
                  <Input
                    placeholder="e.g., Apple Inc."
                    value={peer.name}
                    onChange={(e) => handlePeerChange(index, 'name', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">Market Cap ($)</Label>
                  <Input
                    placeholder="1000000000"
                    type="number"
                    value={peer.marketCap || ''}
                    onChange={(e) => handlePeerChange(index, 'marketCap', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">Revenue ($)</Label>
                  <Input
                    placeholder="500000000"
                    type="number"
                    value={peer.revenue || ''}
                    onChange={(e) => handlePeerChange(index, 'revenue', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">Net Income ($)</Label>
                  <Input
                    placeholder="50000000"
                    type="number"
                    value={peer.netIncome || ''}
                    onChange={(e) => handlePeerChange(index, 'netIncome', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">EBITDA ($)</Label>
                  <Input
                    placeholder="100000000"
                    type="number"
                    value={peer.ebitda || ''}
                    onChange={(e) => handlePeerChange(index, 'ebitda', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">Book Value ($)</Label>
                  <Input
                    placeholder="200000000"
                    type="number"
                    value={peer.bookValue || ''}
                    onChange={(e) => handlePeerChange(index, 'bookValue', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">Growth Rate (%)</Label>
                  <Input
                    placeholder="15"
                    type="number"
                    step="0.01"
                    min="-50"
                    max="100"
                    value={(peer.growthRate * 100) || ''}
                    onChange={(e) => handlePeerChange(index, 'growthRate', (parseFloat(e.target.value) || 0) / 100)}
                  />
                </div>
              </div>
              
              {/* Show error message if there's an error for this peer */}
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Failed to fetch data: {error}</span>
                </div>
              )}
            </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle 
            className="flex items-center cursor-pointer" 
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
          >
            <span>Advanced Settings</span>
            <Info className="h-4 w-4 ml-2 text-gray-400" />
          </CardTitle>
        </CardHeader>
        {showAdvancedSettings && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minimumPeers">Minimum Peers Required</Label>
                <Input
                  id="minimumPeers"
                  type="number"
                  min="2"
                  max="10"
                  value={minimumPeers}
                  onChange={(e) => setMinimumPeers(parseInt(e.target.value) || 3)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="outlierRemoval"
                    checked={outlierRemoval}
                    onCheckedChange={(checked) => setOutlierRemoval(checked as boolean)}
                  />
                  <Label htmlFor="outlierRemoval">Remove Statistical Outliers</Label>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="useGrowthAdjustments"
                    checked={useGrowthAdjustments}
                    onCheckedChange={(checked) => setUseGrowthAdjustments(checked as boolean)}
                  />
                  <Label htmlFor="useGrowthAdjustments">Apply Growth Adjustments (PEG)</Label>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Validation Messages */}
      {(validation.errors.length > 0 || validation.warnings.length > 0) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            {validation.errors.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 text-red-800 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Errors:</span>
                </div>
                <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                  {validation.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {validation.warnings.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-yellow-800 mb-2">
                  <Info className="h-4 w-4" />
                  <span className="font-medium">Warnings:</span>
                </div>
                <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
                  {validation.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      <div className="flex justify-center">
        <Button 
          type="submit" 
          size="lg"
          disabled={!validation.isValid}
          className="px-8"
        >
          Calculate Relative Valuation
        </Button>
      </div>
    </form>
  );
};