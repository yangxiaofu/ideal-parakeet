/**
 * PriceContext - Centralized price caching to minimize API calls
 * Implements smart caching strategy for current market prices
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

interface PriceData {
  symbol: string;
  price: number;
  timestamp: Date;
  currency?: string;
}

interface PriceContextType {
  // Get cached price for a symbol
  getPrice: (symbol: string) => PriceData | null;
  
  // Set/update price for a symbol
  setPrice: (symbol: string, price: number, currency?: string) => void;
  
  // Check if cached price is fresh (within threshold)
  isFresh: (symbol: string, freshnessMinutes?: number) => boolean;
  
  // Get all cached prices
  getAllPrices: () => Record<string, PriceData>;
  
  // Clear cache for a symbol or all
  clearPrice: (symbol?: string) => void;
  
  // Get cache statistics
  getCacheStats: () => {
    totalSymbols: number;
    freshSymbols: number;
    oldestCacheAge: number | null;
  };
}

const PriceContext = createContext<PriceContextType | undefined>(undefined);

interface PriceProviderProps {
  children: React.ReactNode;
  defaultFreshnessMinutes?: number;
}

export const PriceProvider: React.FC<PriceProviderProps> = ({ 
  children, 
  defaultFreshnessMinutes = 15 
}) => {
  const [priceCache, setPriceCache] = useState<Record<string, PriceData>>({});

  const getPrice = useCallback((symbol: string): PriceData | null => {
    const key = symbol.toUpperCase();
    return priceCache[key] || null;
  }, [priceCache]);

  const setPrice = useCallback((symbol: string, price: number, currency = 'USD') => {
    const key = symbol.toUpperCase();
    const priceData: PriceData = {
      symbol: key,
      price,
      currency,
      timestamp: new Date(),
    };
    
    setPriceCache(prev => ({
      ...prev,
      [key]: priceData,
    }));
  }, []);

  const isFresh = useCallback((symbol: string, freshnessMinutes = defaultFreshnessMinutes): boolean => {
    const priceData = getPrice(symbol);
    if (!priceData) return false;
    
    const now = Date.now();
    const cacheTime = priceData.timestamp.getTime();
    const ageMinutes = (now - cacheTime) / (1000 * 60);
    
    return ageMinutes <= freshnessMinutes;
  }, [getPrice, defaultFreshnessMinutes]);

  const getAllPrices = useCallback((): Record<string, PriceData> => {
    return { ...priceCache };
  }, [priceCache]);

  const clearPrice = useCallback((symbol?: string) => {
    if (symbol) {
      const key = symbol.toUpperCase();
      setPriceCache(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    } else {
      setPriceCache({});
    }
  }, []);

  const getCacheStats = useCallback(() => {
    const symbols = Object.keys(priceCache);
    const now = Date.now();
    
    let freshCount = 0;
    let oldestAge: number | null = null;
    
    symbols.forEach(symbol => {
      const priceData = priceCache[symbol];
      const ageMinutes = (now - priceData.timestamp.getTime()) / (1000 * 60);
      
      if (ageMinutes <= defaultFreshnessMinutes) {
        freshCount++;
      }
      
      if (oldestAge === null || ageMinutes > oldestAge) {
        oldestAge = ageMinutes;
      }
    });
    
    return {
      totalSymbols: symbols.length,
      freshSymbols: freshCount,
      oldestCacheAge: oldestAge,
    };
  }, [priceCache, defaultFreshnessMinutes]);

  const value: PriceContextType = {
    getPrice,
    setPrice,
    isFresh,
    getAllPrices,
    clearPrice,
    getCacheStats,
  };

  return (
    <PriceContext.Provider value={value}>
      {children}
    </PriceContext.Provider>
  );
};

export const usePrice = (): PriceContextType => {
  const context = useContext(PriceContext);
  if (context === undefined) {
    throw new Error('usePrice must be used within a PriceProvider');
  }
  return context;
};

/**
 * Hook for getting price with automatic staleness detection
 */
export const usePriceWithFreshness = (symbol: string, freshnessMinutes?: number) => {
  const { getPrice, isFresh } = usePrice();
  
  const priceData = getPrice(symbol);
  const isDataFresh = priceData ? isFresh(symbol, freshnessMinutes) : false;
  
  return {
    priceData,
    isFresh: isDataFresh,
    needsRefresh: priceData && !isDataFresh,
    isEmpty: !priceData,
  };
};

