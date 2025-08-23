/**
 * Repository interface and Firestore implementation for calculation storage
 * Provides clean abstraction over data access with user isolation
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  Timestamp,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { errorHandler } from '../services/ErrorHandler';
import { sanitizeForFirestore } from '../utils/firestoreHelpers';
import { safeTimestampToDate } from '../utils/timestampHelpers';
import type {
  SavedCalculation,
  SaveCalculationRequest,
  ListOptions,
  CalculationFilter,
  CalculationInputs,
} from '../types/savedCalculation';

/**
 * Repository interface for calculation storage operations
 */
export interface ICalculationRepository {
  save<T extends CalculationInputs>(
    userId: string,
    calculation: SaveCalculationRequest<T>
  ): Promise<string>;
  
  load(
    userId: string,
    calculationId: string
  ): Promise<SavedCalculation | null>;
  
  loadBySymbol(
    userId: string,
    symbol: string,
    options?: Partial<ListOptions>
  ): Promise<SavedCalculation[]>;
  
  loadByType(
    userId: string,
    symbol: string,
    type: string
  ): Promise<SavedCalculation | null>;
  
  list(
    userId: string,
    filter?: CalculationFilter,
    options?: ListOptions
  ): Promise<SavedCalculation[]>;
  
  delete(userId: string, calculationId: string): Promise<void>;
  
  deleteBySymbol(userId: string, symbol: string): Promise<number>;
  
  batchSave<T extends CalculationInputs>(
    userId: string,
    calculations: SaveCalculationRequest<T>[]
  ): Promise<string[]>;
}

/**
 * Firestore implementation of calculation repository
 */
export class FirestoreCalculationRepository implements ICalculationRepository {
  private getCollectionRef(userId: string) {
    return collection(db, `users/${userId}/calculations`);
  }

  private getDocRef(userId: string, calculationId: string) {
    return doc(db, `users/${userId}/calculations/${calculationId}`);
  }

  private convertFromFirestore(
    doc: DocumentSnapshot,
    id?: string
  ): SavedCalculation | null {
    if (!doc.exists()) return null;
    
    const data = doc.data();
    if (!data) return null;
    
    // Use utility function for safe timestamp conversion
    
    return {
      id: id || doc.id,
      userId: data.userId || '',
      symbol: data.symbol || '',
      companyName: data.companyName || '',
      type: data.type || '',
      inputs: data.inputs || {},
      result: data.result || {},
      createdAt: safeTimestampToDate(data.createdAt),
      updatedAt: safeTimestampToDate(data.updatedAt),
      dataSnapshot: data.dataSnapshot || {},
      notes: data.notes,
      tags: data.tags || [],
    };
  }

  private convertToFirestore<T extends CalculationInputs>(
    userId: string,
    calculation: SaveCalculationRequest<T>
  ): Record<string, unknown> {
    const now = Timestamp.now();
    
    // Create initial data structure
    const data: Record<string, unknown> = {
      userId,
      symbol: calculation.symbol.toUpperCase(),
      companyName: calculation.companyName,
      type: calculation.type,
      inputs: calculation.inputs,
      result: calculation.result,
      createdAt: now,
      updatedAt: now,
      dataSnapshot: calculation.dataSnapshot,
      notes: calculation.notes,
      tags: calculation.tags,
    };
    
    // Sanitize data to prevent Firestore undefined field errors
    return sanitizeForFirestore(data);
  }

  async save<T extends CalculationInputs>(
    userId: string,
    calculation: SaveCalculationRequest<T>
  ): Promise<string> {
    if (!userId) {
      throw new Error('User ID is required for saving calculations');
    }

    // Use Firestore auto-generated IDs to prevent collisions
    const collectionRef = this.getCollectionRef(userId);
    const firestoreData = this.convertToFirestore(userId, calculation);
    
    try {
      const docRef = await addDoc(collectionRef, firestoreData);
      errorHandler.logSuccess(`Saved calculation with ID: ${docRef.id} for ${calculation.symbol} ${calculation.type}`, {
        operation: 'save',
        userId,
        symbol: calculation.symbol,
        calculationType: calculation.type,
      });
      return docRef.id;
    } catch (error) {
      throw errorHandler.handleRepositoryError(error, {
        operation: 'save calculation',
        userId,
        symbol: calculation.symbol,
        calculationType: calculation.type,
      });
    }
  }

  async load(userId: string, calculationId: string): Promise<SavedCalculation | null> {
    if (!userId || !calculationId) {
      throw new Error('User ID and calculation ID are required');
    }

    try {
      const docRef = this.getDocRef(userId, calculationId);
      const docSnap = await getDoc(docRef);
      return this.convertFromFirestore(docSnap, calculationId);
    } catch (error) {
      throw errorHandler.handleRepositoryError(error, {
        operation: 'load calculation',
        userId,
        metadata: { calculationId },
      });
    }
  }

  async loadBySymbol(
    userId: string,
    symbol: string,
    options: Partial<ListOptions> = {}
  ): Promise<SavedCalculation[]> {
    if (!userId || !symbol) {
      throw new Error('User ID and symbol are required');
    }

    try {
      const collectionRef = this.getCollectionRef(userId);
      let q = query(
        collectionRef,
        where('symbol', '==', symbol.toUpperCase()),
        orderBy(options.orderBy || 'createdAt', options.orderDirection || 'desc')
      );

      if (options.limit) {
        q = query(q, limit(options.limit));
      }

      const querySnap = await getDocs(q);
      return querySnap.docs
        .map(doc => this.convertFromFirestore(doc))
        .filter((calc): calc is SavedCalculation => calc !== null);
    } catch (error) {
      // Handle Firestore index missing errors gracefully
      if (error instanceof Error && error.message.includes('index')) {
        errorHandler.logWarning('Firestore index not available for loadBySymbol. Falling back to basic query.', {
          operation: 'loadBySymbol',
          userId,
          symbol,
        });
        
        try {
          // Fallback: Get all calculations for symbol without ordering
          const collectionRef = this.getCollectionRef(userId);
          const basicQuery = query(
            collectionRef,
            where('symbol', '==', symbol.toUpperCase())
            // No orderBy to avoid index requirement
          );
          
          const querySnap = await getDocs(basicQuery);
          const calculations = querySnap.docs
            .map(doc => this.convertFromFirestore(doc))
            .filter((calc): calc is SavedCalculation => calc !== null)
            .sort((a, b) => {
              // Sort by the requested field or default to createdAt
              const orderBy = options.orderBy || 'createdAt';
              const direction = options.orderDirection || 'desc';
              
              let aValue: any = a[orderBy as keyof SavedCalculation];
              let bValue: any = b[orderBy as keyof SavedCalculation];
              
              // Handle date objects
              if (aValue instanceof Date) aValue = aValue.getTime();
              if (bValue instanceof Date) bValue = bValue.getTime();
              
              if (direction === 'desc') {
                return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
              } else {
                return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
              }
            });
          
          // Apply limit if specified
          const limitedCalculations = options.limit ? calculations.slice(0, options.limit) : calculations;
          
          return limitedCalculations;
        } catch (fallbackError) {
          errorHandler.logWarning('Fallback query for loadBySymbol also failed, returning empty array', {
            operation: 'loadBySymbol-fallback',
            userId,
            symbol,
          });
          // Return empty array instead of throwing to allow app to continue
          return [];
        }
      }
      
      throw errorHandler.handleRepositoryError(error, {
        operation: 'load calculations by symbol',
        userId,
        symbol,
      });
    }
  }

  async loadByType(
    userId: string,
    symbol: string,
    type: string
  ): Promise<SavedCalculation | null> {
    if (!userId || !symbol || !type) {
      throw new Error('User ID, symbol, and type are required');
    }

    try {
      // Use simpler query strategy to avoid composite index requirements
      // Strategy: Query by symbol first, then filter by type client-side
      const collectionRef = this.getCollectionRef(userId);
      const q = query(
        collectionRef,
        where('symbol', '==', symbol.toUpperCase())
        // No multiple where clauses + orderBy to avoid composite index requirement
      );

      const querySnap = await getDocs(q);
      if (querySnap.empty) return null;

      // Filter by type and find the most recent calculation client-side
      const calculations = querySnap.docs
        .map(doc => this.convertFromFirestore(doc))
        .filter((calc): calc is SavedCalculation => calc !== null && calc.type === type)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Sort by newest first

      return calculations.length > 0 ? calculations[0] : null;
    } catch (error) {
      // Handle any remaining errors with the simplified fallback
      if (error instanceof Error && error.message.includes('index')) {
        errorHandler.logWarning('Firestore index issue with loadByType. Using client-side filtering.', {
          operation: 'loadByType',
          userId,
          symbol,
          metadata: { type },
        });
        
        try {
          // Ultimate fallback: Get ALL user calculations and filter completely client-side
          const collectionRef = this.getCollectionRef(userId);
          const allQuery = query(collectionRef); // No filters at all
          
          const allSnap = await getDocs(allQuery);
          const filteredCalculations = allSnap.docs
            .map(doc => this.convertFromFirestore(doc))
            .filter((calc): calc is SavedCalculation => 
              calc !== null && 
              calc.symbol === symbol.toUpperCase() && 
              calc.type === type
            )
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          
          return filteredCalculations.length > 0 ? filteredCalculations[0] : null;
        } catch (fallbackError) {
          errorHandler.logWarning('All fallback queries failed for loadByType', {
            operation: 'loadByType-ultimate-fallback',
            userId,
            symbol,
            metadata: { type },
          });
          return null; // Give up gracefully
        }
      }
      
      throw errorHandler.handleRepositoryError(error, {
        operation: 'load calculation by type',
        userId,
        symbol,
        calculationType: type,
      });
    }
  }

  async list(
    userId: string,
    filter: CalculationFilter = {},
    options: ListOptions = {}
  ): Promise<SavedCalculation[]> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const collectionRef = this.getCollectionRef(userId);
      
      // Use simplified query strategy to avoid complex composite indexes
      // Strategy: Start with basic query and apply filters client-side when needed
      let q = query(collectionRef);
      
      // Only apply one filter at database level to avoid composite index requirements
      const hasMultipleFilters = Object.keys(filter).filter(key => filter[key as keyof CalculationFilter] !== undefined).length > 1;
      
      if (!hasMultipleFilters) {
        // Safe to apply single filters
        if (filter.symbol) {
          q = query(q, where('symbol', '==', filter.symbol.toUpperCase()));
        } else if (filter.type) {
          q = query(q, where('type', '==', filter.type));
        } else if (filter.createdAfter) {
          q = query(q, where('createdAt', '>=', Timestamp.fromDate(filter.createdAfter)));
        } else if (filter.createdBefore) {
          q = query(q, where('createdAt', '<=', Timestamp.fromDate(filter.createdBefore)));
        }

        // Add ordering only if no complex filters
        q = query(q, orderBy(options.orderBy || 'createdAt', options.orderDirection || 'desc'));
        
        if (options.limit && !hasMultipleFilters) {
          q = query(q, limit(options.limit));
        }
      }
      // For multiple filters, we'll get all documents and filter client-side

      const querySnap = await getDocs(q);
      let calculations = querySnap.docs
        .map(doc => this.convertFromFirestore(doc))
        .filter((calc): calc is SavedCalculation => calc !== null);

      // Apply remaining filters client-side
      if (hasMultipleFilters || (filter.symbol && Object.keys(filter).length > 1)) {
        calculations = calculations.filter(calc => {
          if (filter.symbol && calc.symbol !== filter.symbol.toUpperCase()) return false;
          if (filter.type && calc.type !== filter.type) return false;
          if (filter.createdAfter && calc.createdAt < filter.createdAfter) return false;
          if (filter.createdBefore && calc.createdAt > filter.createdBefore) return false;
          return true;
        });
      }

      // Apply sorting client-side if we have multiple filters
      if (hasMultipleFilters) {
        const orderBy = options.orderBy || 'createdAt';
        const direction = options.orderDirection || 'desc';
        
        calculations.sort((a, b) => {
          let aValue: unknown = a[orderBy as keyof SavedCalculation];
          let bValue: unknown = b[orderBy as keyof SavedCalculation];
          
          // Handle date objects
          if (aValue instanceof Date) aValue = aValue.getTime();
          if (bValue instanceof Date) bValue = bValue.getTime();
          
          if (direction === 'desc') {
            return (bValue as number) > (aValue as number) ? 1 : (bValue as number) < (aValue as number) ? -1 : 0;
          } else {
            return (aValue as number) > (bValue as number) ? 1 : (aValue as number) < (bValue as number) ? -1 : 0;
          }
        });
      }

      // Apply limit client-side if needed
      if (options.limit && (hasMultipleFilters || calculations.length > options.limit)) {
        calculations = calculations.slice(0, options.limit);
      }

      return calculations;
    } catch (error) {
      // Handle index errors gracefully by falling back to basic query
      if (error instanceof Error && error.message.includes('index')) {
        errorHandler.logWarning('Firestore index issue with list. Falling back to basic query with client-side filtering.', {
          operation: 'list',
          userId,
          metadata: { filter, options },
        });
        
        try {
          // Fallback: Get all user calculations and filter completely client-side
          const collectionRef = this.getCollectionRef(userId);
          const basicQuery = query(collectionRef);
          
          const querySnap = await getDocs(basicQuery);
          let calculations = querySnap.docs
            .map(doc => this.convertFromFirestore(doc))
            .filter((calc): calc is SavedCalculation => calc !== null);

          // Apply all filters client-side
          calculations = calculations.filter(calc => {
            if (filter.symbol && calc.symbol !== filter.symbol.toUpperCase()) return false;
            if (filter.type && calc.type !== filter.type) return false;
            if (filter.createdAfter && calc.createdAt < filter.createdAfter) return false;
            if (filter.createdBefore && calc.createdAt > filter.createdBefore) return false;
            return true;
          });

          // Apply sorting client-side
          const orderBy = options.orderBy || 'createdAt';
          const direction = options.orderDirection || 'desc';
          
          calculations.sort((a, b) => {
            let aValue: unknown = a[orderBy as keyof SavedCalculation];
            let bValue: unknown = b[orderBy as keyof SavedCalculation];
            
            if (aValue instanceof Date) aValue = aValue.getTime();
            if (bValue instanceof Date) bValue = bValue.getTime();
            
            if (direction === 'desc') {
              return (bValue as number) > (aValue as number) ? 1 : (bValue as number) < (aValue as number) ? -1 : 0;
            } else {
              return (aValue as number) > (bValue as number) ? 1 : (aValue as number) < (bValue as number) ? -1 : 0;
            }
          });

          // Apply limit
          if (options.limit) {
            calculations = calculations.slice(0, options.limit);
          }

          return calculations;
        } catch (fallbackError) {
          errorHandler.logWarning('Fallback query also failed for list', {
            operation: 'list-fallback',
            userId,
            metadata: { filter, options },
          });
          return []; // Return empty array to allow app to continue
        }
      }
      
      throw errorHandler.handleRepositoryError(error, {
        operation: 'list calculations',
        userId,
        metadata: { filter, options },
      });
    }
  }

  async delete(userId: string, calculationId: string): Promise<void> {
    if (!userId || !calculationId) {
      throw new Error('User ID and calculation ID are required');
    }

    try {
      const docRef = this.getDocRef(userId, calculationId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Failed to delete calculation:', error);
      throw new Error(`Failed to delete calculation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteBySymbol(userId: string, symbol: string): Promise<number> {
    if (!userId || !symbol) {
      throw new Error('User ID and symbol are required');
    }

    try {
      const calculations = await this.loadBySymbol(userId, symbol);
      if (calculations.length === 0) return 0;

      const batch = writeBatch(db);
      calculations.forEach(calc => {
        const docRef = this.getDocRef(userId, calc.id);
        batch.delete(docRef);
      });

      await batch.commit();
      return calculations.length;
    } catch (error) {
      console.error('Failed to delete calculations by symbol:', error);
      throw new Error(`Failed to delete calculations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async batchSave<T extends CalculationInputs>(
    userId: string,
    calculations: SaveCalculationRequest<T>[]
  ): Promise<string[]> {
    if (!userId || !calculations.length) {
      throw new Error('User ID and calculations array are required');
    }

    try {
      // For batch operations, use individual save calls to get auto-generated IDs
      // Firestore batch operations don't support addDoc, so we can't get auto-IDs in batches
      const calculationIds: string[] = [];
      
      for (const calculation of calculations) {
        const calculationId = await this.save(userId, calculation);
        calculationIds.push(calculationId);
      }

      console.log(`✅ Batch saved ${calculationIds.length} calculations`);
      return calculationIds;
    } catch (error) {
      console.error('Failed to batch save calculations:', error);
      throw new Error(`Failed to batch save calculations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const calculationRepository = new FirestoreCalculationRepository();