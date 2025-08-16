/**
 * Repository interface and Firestore implementation for calculation storage
 * Provides clean abstraction over data access with user isolation
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
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
    return {
      id: id || doc.id,
      userId: data.userId,
      symbol: data.symbol,
      companyName: data.companyName,
      type: data.type,
      inputs: data.inputs,
      result: data.result,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      dataSnapshot: data.dataSnapshot,
      notes: data.notes,
      tags: data.tags,
    };
  }

  private convertToFirestore<T extends CalculationInputs>(
    userId: string,
    calculation: SaveCalculationRequest<T>
  ): Record<string, unknown> {
    const now = Timestamp.now();
    
    return {
      userId,
      symbol: calculation.symbol.toUpperCase(),
      companyName: calculation.companyName,
      type: calculation.type,
      inputs: calculation.inputs,
      result: calculation.result,
      createdAt: now,
      updatedAt: now,
      dataSnapshot: calculation.dataSnapshot || {},
      notes: calculation.notes,
      tags: calculation.tags || [],
    };
  }

  async save<T extends CalculationInputs>(
    userId: string,
    calculation: SaveCalculationRequest<T>
  ): Promise<string> {
    if (!userId) {
      throw new Error('User ID is required for saving calculations');
    }

    // Generate unique ID based on symbol, type, and timestamp
    const timestamp = Date.now();
    const calculationId = `${calculation.symbol}_${calculation.type}_${timestamp}`;
    
    const docRef = this.getDocRef(userId, calculationId);
    const firestoreData = this.convertToFirestore(userId, calculation);
    
    try {
      await setDoc(docRef, firestoreData);
      return calculationId;
    } catch (error) {
      console.error('Failed to save calculation:', error);
      throw new Error(`Failed to save calculation: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      console.error('Failed to load calculation:', error);
      throw new Error(`Failed to load calculation: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      console.error('Failed to load calculations by symbol:', error);
      throw new Error(`Failed to load calculations: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      const collectionRef = this.getCollectionRef(userId);
      const q = query(
        collectionRef,
        where('symbol', '==', symbol.toUpperCase()),
        where('type', '==', type),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      const querySnap = await getDocs(q);
      if (querySnap.empty) return null;

      const doc = querySnap.docs[0];
      return this.convertFromFirestore(doc);
    } catch (error) {
      console.error('Failed to load calculation by type:', error);
      
      // Handle Firestore index missing errors gracefully
      if (error instanceof Error && error.message.includes('index')) {
        console.warn('Firestore index not available yet. Falling back to client-side filtering.');
        
        // Fallback: Get all calculations for symbol and filter client-side
        try {
          const symbolCalculations = await this.loadBySymbol(userId, symbol, { limit: 50 });
          const filteredByType = symbolCalculations.filter(calc => calc.type === type);
          return filteredByType.length > 0 ? filteredByType[0] : null;
        } catch (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
          return null; // Return null instead of throwing to allow app to continue
        }
      }
      
      throw new Error(`Failed to load calculation: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      let q = query(collectionRef);

      // Apply filters
      if (filter.symbol) {
        q = query(q, where('symbol', '==', filter.symbol.toUpperCase()));
      }
      if (filter.type) {
        q = query(q, where('type', '==', filter.type));
      }
      if (filter.createdAfter) {
        q = query(q, where('createdAt', '>=', Timestamp.fromDate(filter.createdAfter)));
      }
      if (filter.createdBefore) {
        q = query(q, where('createdAt', '<=', Timestamp.fromDate(filter.createdBefore)));
      }

      // Apply ordering
      q = query(q, orderBy(options.orderBy || 'createdAt', options.orderDirection || 'desc'));

      // Apply pagination
      if (options.startAfter) {
        // This would require the actual document for startAfter - simplified for now
        console.warn('Pagination startAfter not implemented in this version');
      }
      if (options.limit) {
        q = query(q, limit(options.limit));
      }

      const querySnap = await getDocs(q);
      return querySnap.docs
        .map(doc => this.convertFromFirestore(doc))
        .filter((calc): calc is SavedCalculation => calc !== null);
    } catch (error) {
      console.error('Failed to list calculations:', error);
      throw new Error(`Failed to list calculations: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      const batch = writeBatch(db);
      const calculationIds: string[] = [];

      calculations.forEach(calculation => {
        const timestamp = Date.now();
        const calculationId = `${calculation.symbol}_${calculation.type}_${timestamp}`;
        const docRef = this.getDocRef(userId, calculationId);
        const firestoreData = this.convertToFirestore(userId, calculation);
        
        batch.set(docRef, firestoreData);
        calculationIds.push(calculationId);
      });

      await batch.commit();
      return calculationIds;
    } catch (error) {
      console.error('Failed to batch save calculations:', error);
      throw new Error(`Failed to batch save calculations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const calculationRepository = new FirestoreCalculationRepository();