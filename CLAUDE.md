# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working Directory

**IMPORTANT**: The active project is located in the root directory `/Users/fudong/Library/CloudStorage/GoogleDrive-fudaviddong@gmail.com/My Drive/1.GG-Projects/00 Active/ideal-parakeet-clean/`. All development work should be done here, not in any subdirectories.

## Development Commands

```bash
# Install dependencies
npm install

# Development
npm run dev          # Start Vite dev server at http://localhost:5173
npm run build        # TypeScript check + production build
npm run preview      # Preview production build

# Testing
npm run test         # Run Vitest tests
npm run test:ui      # Run tests with UI interface
npm run test:coverage # Generate test coverage report

# Code Quality
npm run lint         # Run ESLint for TypeScript/React code

# Git Hooks (auto-configured)
npm run prepare      # Setup Husky for pre-commit hooks
```

### Running Single Tests
```bash
# Run specific test file
npx vitest src/components/calculator/DCFCalculator.test.tsx

# Run tests matching pattern
npx vitest --run DCF

# Watch mode for specific file
npx vitest src/utils/dcfCalculator.test.ts --watch

# Run tests related to changed files (used by lint-staged)
npx vitest related --run
```

### Pre-commit Hooks
Husky + lint-staged automatically runs on git commit:
- `eslint --fix` on all TypeScript files
- `vitest related --run` to test files related to changes

## Architecture Overview

### Tech Stack
- **Frontend Framework**: React 19.1 with TypeScript 5.8
- **Build Tool**: Vite 7.0 with React plugin
- **UI Components**: Tailwind CSS 3.x + shadcn/ui design system
- **Testing**: Vitest with React Testing Library + jsdom
- **Authentication**: Firebase Auth (email/password + Google OAuth)
- **Database**: Firestore for user data persistence
- **External API**: Financial Modeling Prep for market data
- **Routing**: React Router v7
- **Charts**: Recharts for data visualization

### Project Structure

The application follows a feature-based architecture with clear separation of concerns:

```
src/
├── components/           # UI components organized by feature
│   ├── auth/            # Authentication forms (LoginForm, RegisterForm)
│   ├── calculator/      # Valuation calculators (DCF, DDM, Relative Valuation)
│   ├── analysis/        # Financial analysis components (MoatAnalysis)
│   ├── dashboard/       # Dashboard components (CalculationHistoryPanel, CompanySearchForm, HistoryTable)
│   ├── layout/          # App layout (Header, ProtectedRoute)
│   └── ui/              # Base components (button, card, input, selectable-input, badge, label, checkbox)
├── constants/           # Application constants
│   ├── calculatorInfo.ts # Calculator descriptions and metadata
│   └── industryPeers.ts # Industry peer company mappings
├── contexts/            # React contexts (AuthContext for user state)
├── hooks/               # Custom React hooks
│   ├── useCalculationHistory.ts  # Hook for managing calculation history
│   ├── useCompanySearch.ts       # Hook for company search functionality
│   ├── useDashboardState.ts      # Hook for dashboard state management
│   ├── useFinancialData.ts       # Hook for fetching company financial data
│   ├── useMetricHighlighting.ts  # Hook for highlighting financial metrics
│   ├── usePeerData.ts            # Hook for peer company data management
│   └── useSmartCalculator.ts     # Hook for smart calculator functionality
├── services/            # External service integrations
│   ├── firebase.ts      # Firebase config and auth setup
│   ├── fmpApi.ts        # Financial Modeling Prep API client
│   └── peerDataService.ts # Peer company data service with batch fetching
├── repositories/        # Data access layer
│   └── CalculationRepository.ts # Repository for saved calculations
├── types/               # TypeScript type definitions
│   ├── index.ts         # Core financial and valuation types
│   ├── ddm.ts           # Dividend Discount Model types
│   ├── epv.ts           # Earnings Power Value types
│   ├── nav.ts           # Net Asset Value types
│   ├── relativeValuation.ts # Relative valuation types
│   └── savedCalculation.ts # Saved calculation types
├── utils/               # Utility functions and calculators
│   ├── dcfCalculator.ts # DCF valuation logic
│   ├── ddmCalculator.ts # DDM valuation logic
│   ├── epvCalculator.ts # EPV valuation logic
│   ├── navCalculator.ts # NAV valuation logic
│   ├── relativeValuationCalculator.ts # Relative valuation logic
│   ├── financialDataHelpers.ts # Financial data transformation utilities
│   ├── peerDataCache.ts # Caching for peer company data
│   ├── formatters.ts    # Number/currency formatters
│   ├── moatAnalysis.ts  # Economic moat analysis utilities
│   ├── capitalAllocationScore.ts # Capital allocation scoring
│   ├── dateFormatters.ts # Date formatting utilities
│   ├── roicCalculator.ts # Return on Invested Capital calculations
│   ├── mockData.ts      # Mock data for development/testing
│   ├── testMockData.ts  # Additional test mock data
│   ├── debugHelper.ts   # Development debugging utilities
│   └── cn.ts            # Tailwind className merger
└── pages/               # Page-level components
    ├── AuthPage.tsx     # Login/Register page
    └── Dashboard.tsx    # Main dashboard with calculator tabs
```

## Key Services and Patterns

### FMP API Integration (`services/fmpApi.ts`)
- Singleton `FMPApiService` class with comprehensive error handling
- Methods: `searchCompany`, `getCompanyProfile`, `getIncomeStatement`, `getBalanceSheet`, `getCashFlowStatement`, `getPeerCompanies`
- Custom `FMPApiError` class for API-specific errors
- Response transformation to application-friendly types
- Rate limiting and caching considerations

### Authentication System
- `AuthContext` provides: `user`, `signIn`, `signUp`, `logout`, `signInWithGoogle`
- `ProtectedRoute` component guards authenticated routes
- Firebase handles session persistence automatically
- User state accessible throughout app via `useAuth` hook

### Valuation Calculator Pattern
Each calculator follows a consistent three-component pattern:
- `[Model]Calculator` - Main container component
- `[Model]InputForm` - Form for user inputs
- `[Model]Results` - Display of calculation results

Implemented calculators:
- **DCF Calculator**: Two-stage growth model with sensitivity analysis
- **DDM Calculator**: Dividend discount model with growth projections
- **NAV Calculator**: Net Asset Value calculation for asset-heavy companies
- **EPV Calculator**: Earnings Power Value calculation for normalized earnings
- **Relative Valuation**: Peer comparison using P/E, P/B, EV/EBITDA ratios

### Custom Hooks
- `useCalculationHistory`: Manages calculation history state and persistence
- `useCompanySearch`: Handles company search functionality with FMP API
- `useDashboardState`: Manages dashboard state including filters and pagination
- `useFinancialData`: Fetches and caches company financial data from FMP API
- `useMetricHighlighting`: Provides visual highlighting for financial metrics
- `usePeerData`: Manages peer company data with batch fetching and loading states
- `useSmartCalculator`: Provides intelligent calculator functionality

### Caching Strategy
- `peerDataCache.ts`: Implements in-memory caching for peer company data
- 5-minute cache duration to reduce API calls
- Automatic cache invalidation
- `peerDataService.ts`: Batch fetching service for efficient peer data retrieval

### UI Component Patterns
- Base components from shadcn/ui in `components/ui/`
- Component props defined as TypeScript interfaces
- Tailwind utility classes with `cn()` helper for conditional styling
- Consistent use of Lucide icons throughout
- Custom `SelectableInput` component for enhanced user interaction

## Environment Configuration

Required `.env` file in the root directory:
```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

VITE_FMP_API_KEY=
VITE_FMP_API_URL=https://financialmodelingprep.com/api/v3
```

## Deployment Configuration

The application is configured for GitHub Pages deployment:
- **Production Base Path**: `/bedrock-value/` (configured in vite.config.ts)
- **Development Base Path**: `/` (root)
- The base path is automatically set based on NODE_ENV

## Testing Strategy

### Test Setup
- **Unit Tests**: Vitest for utility functions and calculators
- **Component Tests**: React Testing Library for UI components
- **Integration Tests**: End-to-end testing for calculator workflows
- **Mocks**: Firebase Auth, Firestore, and FMP API comprehensively mocked in `setupTests.ts`
  - Firebase Auth mock includes: `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `signOut`, `signInWithPopup`, `updateProfile`
  - Firestore mock includes: `collection`, `doc`, `getDoc`, `setDoc`, `updateDoc`, `deleteDoc`
  - FMP API mock includes all service methods with custom error handling
- **Coverage Target**: 80% for critical business logic

### Test File Patterns
- Component tests: `[component].test.tsx`
- Integration tests: `[feature].integration.test.tsx`
- Utility tests: `[utility].test.ts`
- Test utilities in `test-utils/index.tsx`

### Running Tests
```bash
# Run all tests
npm run test

# Run specific test file
npx vitest DCFCalculator.test.tsx

# Run with coverage
npm run test:coverage

# Interactive UI mode
npm run test:ui
```

## TypeScript Configuration

- **Strict Mode**: Full strict type checking enabled
- **Target**: ES2022 with DOM libraries
- **Module Resolution**: Bundler mode for Vite compatibility
- **Path Aliases**: None configured (use relative imports)
- **Test Files**: Excluded from production build via tsconfig.app.json

## Code Conventions

- TypeScript strict mode for all code
- React functional components with hooks
- Async/await for asynchronous operations
- Error boundaries for UI error handling
- Custom hooks prefixed with `use`
- Consistent error handling with try/catch blocks
- No console.logs in production code
- Component files use PascalCase
- Utility files use camelCase
- Type definitions centralized in `types/` directory

## Current Development Status

### ✅ Implemented
- Complete authentication system with Firebase (email/password + Google OAuth)
- FMP API integration for financial data with comprehensive error handling
- Enhanced dashboard with company search, calculation history, and filtering
- DCF calculator with input form, results, and sensitivity analysis
- DDM calculator with dividend analysis and growth projections  
- NAV (Net Asset Value) calculator with asset breakdown
- EPV (Earnings Power Value) calculator with normalized earnings
- Relative valuation with peer comparison (P/E, P/B, EV/EBITDA ratios)
- Economic moat analysis functionality with scoring
- Capital allocation scoring system
- Comprehensive custom hooks for state management and API interactions
- Calculation history panel with status tracking and filters
- Peer data caching system with batch fetching (5-minute cache)
- Component testing infrastructure with comprehensive test coverage
- Husky pre-commit hooks with lint-staged integration
- Calculator tabs system for easy navigation between models
- ROIC (Return on Invested Capital) calculations
- Comprehensive mock data and debugging utilities
- GitHub Pages deployment configuration

### 🚧 In Progress
- Financial charts implementation with Recharts
- Advanced analysis features

### 📋 Planned
- Scenario planning (bull/base/bear cases)
- Portfolio tracking and analysis history
- Data export functionality (PDF/Excel)
- Advanced charting features
- Mobile responsiveness optimization
- Performance optimizations for large datasets
- Use KISS, DRY, SOLID, SoC principles in my coding.

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.