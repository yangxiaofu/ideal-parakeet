/**
 * Cache Status Panel Component
 * Provides user interface for monitoring and managing financial data cache
 */

import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  useFinancialCache, 
  useCacheStatistics, 
  useCachedSymbols, 
  useBulkFinancialCache 
} from '../../hooks/useFinancialCache';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';

interface CacheStatusPanelProps {
  /** Whether to show detailed statistics */
  showDetails?: boolean;
  /** Maximum number of symbols to display */
  maxSymbols?: number;
  /** Callback when symbol is selected */
  onSymbolSelect?: (symbol: string) => void;
}

export const CacheStatusPanel: React.FC<CacheStatusPanelProps> = ({
  showDetails = true,
  maxSymbols = 10,
  onSymbolSelect,
}) => {
  const [selectedSymbols, setSelectedSymbols] = useState<Set<string>>(new Set());
  const [showAllSymbols, setShowAllSymbols] = useState(false);
  
  const { 
    statistics, 
    loading: statsLoading, 
    error: statsError, 
    refresh: refreshStats 
  } = useCacheStatistics();
  
  const { 
    symbols, 
    loading: symbolsLoading, 
    refresh: refreshSymbols, 
    clearAll 
  } = useCachedSymbols();
  
  const { 
    loading: bulkLoading, 
    results: bulkResults, 
    refreshMultiple, 
    clearMultiple 
  } = useBulkFinancialCache();

  const handleSymbolToggle = (symbol: string) => {
    const newSelected = new Set(selectedSymbols);
    if (newSelected.has(symbol)) {
      newSelected.delete(symbol);
    } else {
      newSelected.add(symbol);
    }
    setSelectedSymbols(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedSymbols.size === symbols.length) {
      setSelectedSymbols(new Set());
    } else {
      setSelectedSymbols(new Set(symbols));
    }
  };

  const handleBulkRefresh = async () => {
    if (selectedSymbols.size === 0) return;
    await refreshMultiple(Array.from(selectedSymbols), { forceRefresh: true });
    setSelectedSymbols(new Set());
    await refreshStats();
    await refreshSymbols();
  };

  const handleBulkClear = async () => {
    if (selectedSymbols.size === 0) return;
    await clearMultiple(Array.from(selectedSymbols));
    setSelectedSymbols(new Set());
    await refreshStats();
    await refreshSymbols();
  };

  const handleClearAll = async () => {
    await clearAll();
    setSelectedSymbols(new Set());
    await refreshStats();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const displayedSymbols = showAllSymbols ? symbols : symbols.slice(0, maxSymbols);

  return (
    <div className="space-y-6">
      {/* Cache Statistics */}
      {showDetails && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Cache Statistics</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshStats}
              disabled={statsLoading}
            >
              {statsLoading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
          
          {statsError ? (
            <div className="text-red-600 text-sm">{statsError}</div>
          ) : statistics ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {statistics.totalEntries}
                </div>
                <div className="text-sm text-gray-600">Total Entries</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {statistics.freshEntries}
                </div>
                <div className="text-sm text-gray-600">Fresh</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {statistics.staleEntries}
                </div>
                <div className="text-sm text-gray-600">Stale</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(statistics.hitRatio * 100)}%
                </div>
                <div className="text-sm text-gray-600">Hit Ratio</div>
              </div>
              
              <div className="text-center col-span-2 md:col-span-1">
                <div className="text-lg font-bold text-gray-700">
                  {formatBytes(statistics.totalSize)}
                </div>
                <div className="text-sm text-gray-600">Cache Size</div>
              </div>
              
              <div className="text-center col-span-2 md:col-span-1">
                <div className="text-lg font-bold text-gray-700">
                  {Math.round(statistics.averageAge)}h
                </div>
                <div className="text-sm text-gray-600">Avg Age</div>
              </div>
              
              {statistics.newestEntry && (
                <div className="text-center col-span-2 md:col-span-1">
                  <div className="text-sm font-medium text-gray-700">
                    {statistics.newestEntry}
                  </div>
                  <div className="text-sm text-gray-600">Newest</div>
                </div>
              )}
              
              {statistics.oldestEntry && (
                <div className="text-center col-span-2 md:col-span-1">
                  <div className="text-sm font-medium text-gray-700">
                    {statistics.oldestEntry}
                  </div>
                  <div className="text-sm text-gray-600">Oldest</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-4">
              No cache statistics available
            </div>
          )}
        </Card>
      )}

      {/* Cached Symbols Management */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            Cached Companies ({symbols.length})
          </h3>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshSymbols}
              disabled={symbolsLoading}
            >
              Refresh List
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              disabled={symbolsLoading || symbols.length === 0}
              className="text-red-600 hover:text-red-700"
            >
              Clear All
            </Button>
          </div>
        </div>

        {/* Bulk Actions */}
        {symbols.length > 0 && (
          <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedSymbols.size === symbols.length && symbols.length > 0}
                onChange={handleSelectAll}
                className="rounded border-gray-300"
              />
              <span className="text-sm">
                Select All ({selectedSymbols.size} selected)
              </span>
            </div>
            
            {selectedSymbols.size > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkRefresh}
                  disabled={bulkLoading}
                >
                  {bulkLoading ? 'Refreshing...' : 'Refresh Selected'}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkClear}
                  disabled={bulkLoading}
                  className="text-red-600 hover:text-red-700"
                >
                  Clear Selected
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Symbol List */}
        {symbolsLoading ? (
          <div className="text-center py-8">
            <div className="text-gray-500">Loading cached symbols...</div>
          </div>
        ) : symbols.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-2">No cached companies found</div>
            <div className="text-sm text-gray-400">
              Companies will appear here after you search for them
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {displayedSymbols.map((symbol) => (
              <CachedSymbolRow
                key={symbol}
                symbol={symbol}
                selected={selectedSymbols.has(symbol)}
                onToggle={() => handleSymbolToggle(symbol)}
                onClick={() => onSymbolSelect?.(symbol)}
                bulkResult={bulkResults[symbol]}
              />
            ))}
            
            {symbols.length > maxSymbols && (
              <div className="text-center pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllSymbols(!showAllSymbols)}
                >
                  {showAllSymbols 
                    ? 'Show Less' 
                    : `Show All (${symbols.length - maxSymbols} more)`
                  }
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

interface CachedSymbolRowProps {
  symbol: string;
  selected: boolean;
  onToggle: () => void;
  onClick?: () => void;
  bulkResult?: { success: boolean; error?: string };
}

const CachedSymbolRow: React.FC<CachedSymbolRowProps> = ({
  symbol,
  selected,
  onToggle,
  onClick,
  bulkResult,
}) => {
  const { loading, isFresh, refresh, clearCache, lastRefresh } = useFinancialCache(
    symbol, 
    { enabled: false } // Don't auto-fetch, just use for cache info
  );

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await refresh({ forceRefresh: true });
  };

  const handleClear = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await clearCache();
  };

  const getStatusInfo = () => {
    if (bulkResult) {
      return bulkResult.success 
        ? { status: 'fresh' as const, text: 'Updated' }
        : { status: 'unknown' as const, text: 'Error' };
    }
    
    return isFresh 
      ? { status: 'fresh' as const, text: 'Fresh' }
      : { status: 'stale' as const, text: 'Stale' };
  };

  const statusInfo = getStatusInfo();

  const getStatusBadgeVariant = (status: 'fresh' | 'stale' | 'unknown') => {
    switch (status) {
      case 'fresh': return 'default';
      case 'stale': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div 
      className={`flex items-center p-3 rounded-lg border transition-colors ${
        selected 
          ? 'bg-blue-50 border-blue-200' 
          : 'bg-white border-gray-200 hover:bg-gray-50'
      } ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        onClick={(e) => e.stopPropagation()}
        className="mr-3 rounded border-gray-300"
      />
      
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{symbol}</span>
          <Badge variant={getStatusBadgeVariant(statusInfo.status)}>
            {statusInfo.text}
          </Badge>
        </div>
        
        {lastRefresh && (
          <div className="text-sm text-gray-500 mt-1">
            Cached {formatDistanceToNow(lastRefresh, { addSuffix: true })}
          </div>
        )}
        
        {bulkResult?.error && (
          <div className="text-sm text-red-600 mt-1">
            {bulkResult.error}
          </div>
        )}
      </div>
      
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
        >
          {loading ? '...' : 'Refresh'}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleClear}
          className="text-red-600 hover:text-red-700"
        >
          Clear
        </Button>
      </div>
    </div>
  );
};