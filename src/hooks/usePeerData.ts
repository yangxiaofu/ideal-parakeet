/**
 * Custom hook for managing peer company data
 * Handles fetching, loading states, and error management
 * Follows React best practices for data fetching hooks
 */

import { useState, useCallback, useEffect } from 'react';
import { peerDataService, type BatchFetchResult } from '../services/peerDataService';
import type { PeerCompany } from '../types/relativeValuation';

export interface PeerLoadingState {
  symbol: string;
  isLoading: boolean;
  error?: string;
}

export interface UsePeerDataReturn {
  // Data
  peerData: Map<string, PeerCompany>;
  suggestedPeers: string[];
  
  // Loading states
  isLoading: boolean;
  loadingStates: Map<string, PeerLoadingState>;
  
  // Error handling
  errors: Map<string, string>;
  lastFetchResult: BatchFetchResult | null;
  
  // Actions
  fetchPeers: (symbols: string[]) => Promise<void>;
  fetchSinglePeer: (symbol: string) => Promise<void>;
  refetchPeer: (symbol: string) => Promise<void>;
  clearErrors: () => void;
  getSuggestedPeers: (targetSymbol: string) => void;
}

export function usePeerData(initialTargetSymbol?: string): UsePeerDataReturn {
  // Data state
  const [peerData, setPeerData] = useState<Map<string, PeerCompany>>(new Map());
  const [suggestedPeers, setSuggestedPeers] = useState<string[]>([]);
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStates, setLoadingStates] = useState<Map<string, PeerLoadingState>>(new Map());
  
  // Error state
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [lastFetchResult, setLastFetchResult] = useState<BatchFetchResult | null>(null);

  // Get suggested peers for a target symbol
  const getSuggestedPeers = useCallback((targetSymbol: string) => {
    const suggestions = peerDataService.getSuggestedPeers(targetSymbol);
    setSuggestedPeers(suggestions);
  }, []);

  // Initialize suggested peers if target symbol provided
  useEffect(() => {
    if (initialTargetSymbol) {
      getSuggestedPeers(initialTargetSymbol);
    }
  }, [initialTargetSymbol, getSuggestedPeers]);

  // Update loading state for specific symbols
  const updateLoadingState = useCallback((symbol: string, isLoading: boolean, error?: string) => {
    setLoadingStates(prev => new Map(prev).set(symbol, { symbol, isLoading, error }));
  }, []);

  // Fetch multiple peers
  const fetchPeers = useCallback(async (symbols: string[]) => {
    if (!symbols || symbols.length === 0) {
      console.log('[usePeerData] No symbols to fetch');
      return;
    }

    setIsLoading(true);
    setErrors(new Map());

    // Set loading state for each symbol
    symbols.forEach(symbol => {
      updateLoadingState(symbol, true);
    });

    try {
      console.log('[usePeerData] Fetching peers:', symbols);
      const result = await peerDataService.fetchPeerDataBatch(symbols);
      setLastFetchResult(result);

      // Update peer data
      const newPeerData = new Map(peerData);
      result.successful.forEach(peer => {
        newPeerData.set(peer.symbol, peer);
        updateLoadingState(peer.symbol, false);
      });
      setPeerData(newPeerData);

      // Update errors
      const newErrors = new Map<string, string>();
      result.failed.forEach(({ symbol, error }) => {
        newErrors.set(symbol, error);
        updateLoadingState(symbol, false, error);
      });
      setErrors(newErrors);

      console.log(`[usePeerData] Fetch complete: ${result.successful.length}/${result.totalRequested} successful`);
    } catch (error) {
      console.error('[usePeerData] Batch fetch failed:', error);
      
      // Set error for all symbols
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch peer data';
      const newErrors = new Map<string, string>();
      symbols.forEach(symbol => {
        newErrors.set(symbol, errorMessage);
        updateLoadingState(symbol, false, errorMessage);
      });
      setErrors(newErrors);
    } finally {
      setIsLoading(false);
    }
  }, [peerData, updateLoadingState]);

  // Fetch a single peer
  const fetchSinglePeer = useCallback(async (symbol: string) => {
    if (!symbol || !symbol.trim()) {
      console.log('[usePeerData] Invalid symbol provided');
      return;
    }

    const normalizedSymbol = symbol.trim().toUpperCase();
    updateLoadingState(normalizedSymbol, true);

    try {
      console.log('[usePeerData] Fetching single peer:', normalizedSymbol);
      const peerCompany = await peerDataService.fetchSinglePeerData(normalizedSymbol);
      
      if (peerCompany) {
        setPeerData(prev => new Map(prev).set(normalizedSymbol, peerCompany));
        updateLoadingState(normalizedSymbol, false);
        
        // Clear any previous error for this symbol
        setErrors(prev => {
          const newErrors = new Map(prev);
          newErrors.delete(normalizedSymbol);
          return newErrors;
        });
      } else {
        throw new Error('No data returned');
      }
    } catch (error) {
      console.error(`[usePeerData] Failed to fetch ${normalizedSymbol}:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch peer data';
      setErrors(prev => new Map(prev).set(normalizedSymbol, errorMessage));
      updateLoadingState(normalizedSymbol, false, errorMessage);
    }
  }, [updateLoadingState]);

  // Refetch a peer (force refresh, bypass cache)
  const refetchPeer = useCallback(async (symbol: string) => {
    if (!symbol || !symbol.trim()) return;

    const normalizedSymbol = symbol.trim().toUpperCase();
    
    // Clear cache for this symbol
    // Note: We'd need to add a method to peerDataService to clear specific cache entries
    // For now, we'll just fetch again which will update the cache
    
    await fetchSinglePeer(normalizedSymbol);
  }, [fetchSinglePeer]);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors(new Map());
    setLoadingStates(new Map());
  }, []);

  return {
    // Data
    peerData,
    suggestedPeers,
    
    // Loading states
    isLoading,
    loadingStates,
    
    // Error handling
    errors,
    lastFetchResult,
    
    // Actions
    fetchPeers,
    fetchSinglePeer,
    refetchPeer,
    clearErrors,
    getSuggestedPeers
  };
}

// Helper hook to get peer data as an array instead of Map
export function usePeerDataArray(initialTargetSymbol?: string) {
  const peerDataHook = usePeerData(initialTargetSymbol);
  
  const peerDataArray = Array.from(peerDataHook.peerData.values());
  const loadingStatesArray = Array.from(peerDataHook.loadingStates.values());
  const errorsArray = Array.from(peerDataHook.errors.entries()).map(([symbol, error]) => ({ symbol, error }));
  
  return {
    ...peerDataHook,
    peerDataArray,
    loadingStatesArray,
    errorsArray
  };
}