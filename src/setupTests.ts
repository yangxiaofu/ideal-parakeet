import '@testing-library/jest-dom';

// Mock Firebase Auth
const mockAuth = {
  currentUser: null,
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  signInWithPopup: vi.fn(),
  updateProfile: vi.fn(),
};

const mockFirestore = {
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
};

// Mock Firebase modules
vi.mock('firebase/auth', () => ({
  getAuth: () => mockAuth,
  onAuthStateChanged: mockAuth.onAuthStateChanged,
  signInWithEmailAndPassword: mockAuth.signInWithEmailAndPassword,
  createUserWithEmailAndPassword: mockAuth.createUserWithEmailAndPassword,
  signOut: mockAuth.signOut,
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: mockAuth.signInWithPopup,
  updateProfile: mockAuth.updateProfile,
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: () => mockFirestore,
  collection: mockFirestore.collection,
  doc: mockFirestore.doc,
  getDoc: mockFirestore.getDoc,
  setDoc: mockFirestore.setDoc,
  updateDoc: mockFirestore.updateDoc,
  deleteDoc: mockFirestore.deleteDoc,
}));

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
}));

// Mock FMP API
vi.mock('../services/fmpApi', () => ({
  fmpApi: {
    searchCompany: vi.fn(),
    getCompanyProfile: vi.fn(),
    getIncomeStatement: vi.fn(),
    getBalanceSheet: vi.fn(),
    getCashFlowStatement: vi.fn(),
    getCompanyFinancials: vi.fn(),
    getDividendHistory: vi.fn(),
  },
  FMPApiError: class FMPApiError extends Error {
    constructor(message: string, public status?: number) {
      super(message);
      this.name = 'FMPApiError';
    }
  },
}));

// Global test utilities
export { mockAuth, mockFirestore };