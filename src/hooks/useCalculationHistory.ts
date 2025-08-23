/**
 * React Query hooks for calculation history management
 * Provides caching, synchronization, and optimistic updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { calculationRepository } from '../repositories/CalculationRepository';
import type {
  SavedCalculation,
  SaveCalculationRequest,
  CalculatorType,
  ListOptions,
  CalculationFilter,
} from '../types/savedCalculation';

// Query keys for consistent caching
export const calculationKeys = {
  all: ['calculations'] as const,
  user: (userId: string) => [...calculationKeys.all, userId] as const,
  symbol: (userId: string, symbol: string) => [...calculationKeys.user(userId), 'symbol', symbol] as const,
  type: (userId: string, symbol: string, type: CalculatorType) => 
    [...calculationKeys.symbol(userId, symbol), 'type', type] as const,
  list: (userId: string, filter?: CalculationFilter, options?: ListOptions) => 
    [...calculationKeys.user(userId), 'list', filter, options] as const,
};

/**
 * Hook to fetch calculation history for a specific symbol
 */
export function useCalculationHistory(symbol: string, options?: Partial<ListOptions>) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: calculationKeys.symbol(user?.uid || '', symbol),
    queryFn: () => calculationRepository.loadBySymbol(user!.uid, symbol, options),
    enabled: !!user && !!symbol,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch a specific calculation by type for a symbol
 */
export function useCalculationByType(symbol: string, type: CalculatorType) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: calculationKeys.type(user?.uid || '', symbol, type),
    queryFn: async () => {
      try {
        return await calculationRepository.loadByType(user!.uid, symbol, type);
      } catch (error) {
        console.warn(`Failed to load calculation for ${symbol} ${type}:`, error);
        // Return null instead of throwing to prevent React Query error state
        return null;
      }
    },
    enabled: !!user && !!symbol && !!type,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1, // Only retry once for database issues
    retryDelay: 2000, // Wait 2 seconds before retry
  });
}

/**
 * Hook to list all calculations with filtering and pagination
 */
export function useCalculationList(filter?: CalculationFilter, options?: ListOptions) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: calculationKeys.list(user?.uid || '', filter, options),
    queryFn: () => calculationRepository.list(user!.uid, filter, options),
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for auto-saving calculations with optimistic updates
 */
export function useAutoSaveCalculation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (calculation: SaveCalculationRequest<any>) => {
      if (!user) throw new Error('User must be authenticated to save calculations');
      return calculationRepository.save(user.uid, calculation);
    },
    onMutate: async (calculation: SaveCalculationRequest<any>) => {
      if (!user) return;

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: calculationKeys.symbol(user.uid, calculation.symbol)
      });

      // Snapshot the previous value
      const previousCalculations = queryClient.getQueryData(
        calculationKeys.symbol(user.uid, calculation.symbol)
      );

      // Generate a temporary ID that won't conflict with Firestore auto-IDs
      // Firestore auto-IDs are 20 characters long and use specific character set
      // Our temp IDs use a different pattern to avoid conflicts
      const tempId = `temp_optimistic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Optimistically update to the new value
      const optimisticCalculation: SavedCalculation = {
        id: tempId,
        userId: user.uid,
        symbol: calculation.symbol,
        companyName: calculation.companyName,
        type: calculation.type,
        inputs: calculation.inputs,
        result: calculation.result,
        createdAt: new Date(),
        updatedAt: new Date(),
        dataSnapshot: calculation.dataSnapshot,
        notes: calculation.notes,
        tags: calculation.tags,
      };

      queryClient.setQueryData(
        calculationKeys.symbol(user.uid, calculation.symbol),
        (old: SavedCalculation[] | undefined) => [optimisticCalculation, ...(old || [])]
      );

      // Also update the specific type query
      queryClient.setQueryData(
        calculationKeys.type(user.uid, calculation.symbol, calculation.type),
        optimisticCalculation
      );

      return { previousCalculations, optimisticCalculation };
    },
    onError: (err: any, calculation: SaveCalculationRequest<any>, context: any) => {
      if (!user || !context) return;

      // Rollback optimistic update
      queryClient.setQueryData(
        calculationKeys.symbol(user.uid, calculation.symbol),
        context.previousCalculations
      );
      
      console.error('Failed to save calculation:', err);
    },
    onSuccess: (calculationId: string, calculation: SaveCalculationRequest<any>, context: any) => {
      if (!user || !context) return;

      // Update the optimistic calculation with the real ID
      queryClient.setQueryData(
        calculationKeys.symbol(user.uid, calculation.symbol),
        (old: SavedCalculation[] | undefined) => {
          if (!old) return old;
          return old.map(calc => 
            calc.id === context.optimisticCalculation.id 
              ? { ...calc, id: calculationId }
              : calc
          );
        }
      );

      // Invalidate both symbol-specific and list queries to ensure consistency
      queryClient.invalidateQueries({
        queryKey: calculationKeys.symbol(user.uid, calculation.symbol)
      });
      
      // Also invalidate the global list query used by history panel
      queryClient.invalidateQueries({
        queryKey: calculationKeys.user(user.uid)
      });
    },
  });
}

/**
 * Hook for deleting calculations
 */
export function useDeleteCalculation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (calculationId: string) => {
      if (!user) throw new Error('User must be authenticated to delete calculations');
      return calculationRepository.delete(user.uid, calculationId);
    },
    onSuccess: () => {
      if (!user) return;
      
      // Invalidate all user calculations - could be more targeted
      queryClient.invalidateQueries({
        queryKey: calculationKeys.user(user.uid)
      });
    },
  });
}

/**
 * Hook for batch saving multiple calculations
 */
export function useBatchSaveCalculations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (calculations: SaveCalculationRequest<any>[]) => {
      if (!user) throw new Error('User must be authenticated to save calculations');
      return calculationRepository.batchSave(user.uid, calculations);
    },
    onSuccess: (_, calculations: SaveCalculationRequest<any>[]) => {
      if (!user) return;
      
      // Invalidate affected symbol queries
      const symbols = [...new Set(calculations.map(calc => calc.symbol))];
      symbols.forEach(symbol => {
        queryClient.invalidateQueries({
          queryKey: calculationKeys.symbol(user.uid, symbol)
        });
      });
    },
  });
}

/**
 * Hook for deleting all calculations for a symbol
 */
export function useDeleteCalculationsBySymbol() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (symbol: string) => {
      if (!user) throw new Error('User must be authenticated to delete calculations');
      return calculationRepository.deleteBySymbol(user.uid, symbol);
    },
    onSuccess: (deletedCount, symbol) => {
      if (!user) return;
      
      // Remove the data from cache
      queryClient.removeQueries({
        queryKey: calculationKeys.symbol(user.uid, symbol)
      });
      
      // Invalidate list queries
      queryClient.invalidateQueries({
        queryKey: calculationKeys.user(user.uid)
      });
      
      console.log(`Deleted ${deletedCount} calculations for ${symbol}`);
    },
  });
}