/**
 * Company search form component
 * Extracted from Dashboard following SoC principles
 */

import React from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

interface CompanySearchFormProps {
  ticker: string;
  onTickerChange: (ticker: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClear?: () => void;
  loading: boolean;
  error: string | null;
  compact?: boolean;
}

export const CompanySearchForm: React.FC<CompanySearchFormProps> = ({
  ticker,
  onTickerChange,
  onSubmit,
  onClear,
  loading,
  error,
  compact = false
}) => {
  if (compact) {
    return (
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search new company (e.g., AAPL, DEMO)"
              value={ticker}
              onChange={(e) => onTickerChange(e.target.value.toUpperCase())}
              disabled={loading}
              className="h-10"
            />
          </div>
          <Button 
            type="submit" 
            disabled={loading || !ticker.trim()}
            size="sm"
            className="px-6"
          >
            {loading ? 'Searching...' : 'Search'}
          </Button>
          {onClear && (
            <Button 
              type="button" 
              variant="outline"
              size="sm"
              onClick={onClear}
              disabled={loading}
            >
              Clear
            </Button>
          )}
        </div>
        
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}
      </form>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>Start Your Analysis</CardTitle>
        <CardDescription>
          Enter a ticker symbol to calculate intrinsic value
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            type="text"
            placeholder="AAPL, MSFT, GOOGL..."
            value={ticker}
            onChange={(e) => onTickerChange(e.target.value.toUpperCase())}
            disabled={loading}
            className="text-center text-lg px-6 py-4 rounded-xl"
          />
          <Button 
            type="submit" 
            disabled={loading || !ticker.trim()}
            className="w-full py-4 rounded-xl"
          >
            {loading ? 'Analyzing...' : 'Analyze Company'}
          </Button>
          
          {error && (
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
              <p className="text-red-700 text-sm">
                <strong>Unable to fetch data:</strong> {error}
              </p>
            </div>
          )}
          
          <div className="text-xs text-gray-400 text-center">
            💡 Tip: Enter "DEMO" to test with sample data (no API calls)
          </div>
        </form>
      </CardContent>
    </Card>
  );
};