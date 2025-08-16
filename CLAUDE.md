# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working Directory

**IMPORTANT**: The active project is located in `02WIP/intrinsic-value-calculator/`. Always navigate to this directory for all development work.

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
- **Frontend Framework**: React 19 with TypeScript 5.8
- **Build Tool**: Vite 7 with React plugin
- **UI Components**: Tailwind CSS 3.x + shadcn/ui design system
- **Testing**: Vitest with React Testing Library + jsdom
- **Authentication**: Firebase Auth (email/password + Google OAuth)
- **Database**: Firestore for user data persistence
- **External API**: Financial Modeling Prep for market data
- **State Management**: React Query (TanStack Query) for server state
- **Code Quality**: ESLint + TypeScript strict mode with Husky pre-commit hooks
- **Routing**: React Router v7
- **Charts**: Recharts for data visualization

### Project Structure

The application follows a feature-based architecture with clear separation of concerns:

```
02WIP/intrinsic-value-calculator/src/
├── components/           # UI components organized by feature
│   ├── analysis/        # MoatAnalysis component for competitive analysis
│   ├── auth/            # Authentication forms (LoginForm, RegisterForm)
│   ├── calculator/      # Valuation calculators (DCF, DDM, NAV, EPV, Relative)
│   ├── charts/          # Financial data visualizations
│   ├── dashboard/       # Main dashboard (FinancialHistoryTable, RecommendationBanner)
│   ├── layout/          # App layout (Header, ProtectedRoute)
│   └── ui/              # Base components (button, card, input, selectable-input, badge, label, checkbox)
├── constants/           # Application constants
│   ├── calculatorInfo.ts # Calculator descriptions and metadata
│   └── industryPeers.ts # Industry peer company mappings
├── contexts/            # React contexts (AuthContext for user state)
├── hooks/               # Custom React hooks
│   ├── useCalculationHistory.ts  # React Query hooks for saved calculations
│   ├── useFinancialData.ts       # Hook for fetching company financial data
│   ├── useMetricHighlighting.ts  # Hook for highlighting financial metrics
│   ├── usePeerData.ts            # Hook for peer company data management
│   └── useSmartCalculator.ts     # Hook for intelligent calculator recommendations
├── repositories/        # Data access layer
│   └── CalculationRepository.ts  # Firestore operations for saved calculations
├── services/            # External service integrations
│   ├── firebase.ts      # Firebase config and auth setup
│   ├── fmpApi.ts        # Financial Modeling Prep API client
│   └── peerDataService.ts # Peer company data service with batch fetching
├── types/               # TypeScript type definitions
│   ├── index.ts         # Core financial and valuation types
│   ├── ddm.ts           # Dividend Discount Model types
│   ├── epv.ts           # Earnings Power Value types
│   ├── nav.ts           # Net Asset Value types
│   ├── relativeValuation.ts # Relative valuation types
│   └── savedCalculation.ts  # Types for calculation persistence
├── utils/               # Utility functions and calculators
│   ├── dcfCalculator.ts # DCF valuation logic
│   ├── ddmCalculator.ts # DDM valuation logic
│   ├── epvCalculator.ts # EPV valuation logic
│   ├── navCalculator.ts # NAV valuation logic
│   ├── relativeValuationCalculator.ts # Relative valuation logic
│   ├── financialDataHelpers.ts # Financial data transformation utilities
│   ├── moatAnalysis.ts  # Competitive moat analysis utilities
│   ├── peerDataCache.ts # Caching for peer company data
│   ├── dateFormatters.ts # Date formatting utilities
│   ├── formatters.ts    # Number/currency formatters
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

### Data Persistence Layer
- `CalculationRepository`: Firestore integration for saving/loading calculations
- Auto-save functionality with optimistic updates
- React Query for caching and synchronization
- Type-safe document operations with TypeScript

### Custom Hooks
- `useCalculationHistory`: React Query hooks for managing saved calculations
- `useFinancialData`: Fetches and caches company financial data from FMP API
- `useMetricHighlighting`: Provides visual highlighting for financial metrics
- `usePeerData`: Manages peer company data with batch fetching and loading states
- `useSmartCalculator`: Intelligent calculator recommendations based on company characteristics

### Caching Strategy
- `peerDataCache.ts`: Implements in-memory caching for peer company data
- 5-minute cache duration to reduce API calls
- Automatic cache invalidation
- `peerDataService.ts`: Batch fetching service for efficient peer data retrieval
- React Query for server state caching with configurable stale times

### UI Component Patterns
- Base components from shadcn/ui in `components/ui/`
- Component props defined as TypeScript interfaces
- Tailwind utility classes with `cn()` helper for conditional styling
- Consistent use of Lucide icons throughout
- Custom `SelectableInput` component for enhanced user interaction
- `CalculatorTabs` component for navigation between valuation models
- `CalculatorSummary` component for aggregated valuation results

### MOAT Analysis System
The application includes a sophisticated competitive advantage (economic moat) analysis:

**How it works:**
- Automatically analyzes financial data to identify sustainable competitive advantages
- Evaluates 6 types of moats: Brand, Patents, Network Effects, Switching Costs, Scale, Location
- Calculates moat strength (wide/narrow/none) based on business stability and competitive position
- Assesses moat sustainability trends and competitive pressure levels

**Key metrics analyzed:**
- Revenue growth consistency (standard deviation of growth rates)
- Margin stability (coefficient of variation)
- Profitability trends (recent vs historical margins)
- Business size and scale (revenue + margins thresholds)
- Gross margins (for IP detection)
- Growth acceleration (for network effects)

**Detection thresholds:**
- Brand: >70% margin stability
- Scale: Dominant (>15% margin + >$10B revenue) or Strong position
- Switching Costs: >80% revenue consistency
- Patents: >60% gross margin with stability
- Network Effects: Accelerating growth + improving margins

For complete methodology details, see: `docs/moat-analysis-methodology.md`

## Environment Configuration

Required `.env` file in `02WIP/intrinsic-value-calculator/`:
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

## Firestore Database Configuration

### Required Composite Indexes
The application requires these Firestore composite indexes for the calculations collection:
1. `symbol (asc) + type (asc) + createdAt (desc)`
2. `symbol (asc) + createdAt (desc)`
3. `createdAt (desc)`

These can be created automatically when first accessing the calculations feature, or manually via Firebase console.

### Production Deployment
The app is configured for GitHub Pages deployment:
- Production base path: `/ideal-parakeet/` (configured in vite.config.ts)
- Build output optimized for static hosting

## Testing Strategy

### Test Setup
- **Unit Tests**: Vitest for utility functions and calculators
- **Component Tests**: React Testing Library for UI components
- **Integration Tests**: End-to-end testing for calculator workflows
- **Mocks**: Firebase and FMP API mocked in `setupTests.ts`
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
- Complete authentication system with Firebase
- FMP API integration for financial data
- Dashboard with company search and financial history
- DCF calculator with two-stage growth model
- DDM calculator with dividend analysis
- NAV (Net Asset Value) calculator with asset breakdown
- EPV (Earnings Power Value) calculator with normalized earnings
- Relative valuation with peer comparison
- Calculator tabs system for easy navigation between models
- Smart calculator recommendations based on company data
- Moat analysis for competitive advantage assessment
- Saved calculations with Firestore persistence
- React Query integration for server state management
- Auto-save functionality with optimistic updates
- Custom hooks for data fetching and UI interactions
- Peer data caching system with batch fetching
- Component testing infrastructure with comprehensive test coverage
- Husky pre-commit hooks with lint-staged integration
- Calculator summary view with aggregated results

### 🚧 In Progress
- Financial charts implementation with Recharts
- Advanced filtering and search for saved calculations

### 📋 Planned
- Scenario planning (bull/base/bear cases)
- Portfolio tracking and analysis history
- Data export functionality (PDF/Excel)
- Advanced charting features
- Mobile responsiveness optimization
- Performance optimizations for large datasets