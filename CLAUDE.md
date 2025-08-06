# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Working Directory**: Always work from `02WIP/intrinsic-value-calculator/` directory

- `npm run dev` - Start development server with Vite
- `npm run build` - Production build (runs TypeScript compilation then Vite build)
- `npm run lint` - Run ESLint for code quality checks
- `npm run preview` - Preview production build locally
- `npm install` - Install dependencies

## Architecture Overview

This is a React TypeScript application for intrinsic stock valuation with the following architecture:

### Core Technologies
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS 4.x with custom components
- **Authentication**: Firebase Auth (email/password + Google OAuth)
- **Database**: Firestore for user data and saved analyses
- **API**: Financial Modeling Prep API for real-time financial data
- **Charts**: Recharts for data visualization
- **Routing**: React Router v7

### Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── auth/           # LoginForm, RegisterForm
│   ├── calculator/     # Valuation modules (DCF, DDM, NAV, EPV) - NOT YET IMPLEMENTED
│   ├── charts/         # Financial data visualization
│   ├── dashboard/      # Main dashboard components
│   ├── layout/         # Header, ProtectedRoute navigation
│   └── ui/            # Base UI components (button, card, input)
├── contexts/           # AuthContext for user management
├── hooks/             # Custom React hooks
├── pages/             # AuthPage, Dashboard page components
├── services/          # firebase.ts, fmpApi.ts API services
├── types/             # TypeScript definitions for financial data & valuation
└── utils/             # Utility functions (cn.ts for className merging)
```

### Key Components & Services

**Authentication Flow:**
- `AuthContext` provides user state and auth methods
- `ProtectedRoute` guards authenticated routes
- Firebase handles email/password and Google OAuth

**API Integration:**
- `FMPApiService` class handles Financial Modeling Prep API calls
- Fetches company profiles, financial statements (income, balance sheet, cash flow)
- Includes error handling with custom `FMPApiError` class

**Data Types:**
- `CompanyFinancials` - Main data structure for financial analysis
- `ValuationInputs` - Base inputs for valuation models
- `ValuationResult` - Output from intrinsic value calculations
- `SavedAnalysis` - User's saved valuation analyses

### Environment Configuration

Required environment variables in `.env`:
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

VITE_FMP_API_KEY=
VITE_FMP_API_URL=https://financialmodelingprep.com/api/v3
```

### Development Status
**Completed**: Project setup, Firebase auth, FMP API integration, basic dashboard
**In Progress**: Financial charts, valuation calculator modules
**Planned**: DCF/DDM/NAV/EPV calculators, scenario projections, portfolio tracking

### Code Conventions
- Uses TypeScript strict mode
- ESLint with React hooks and refresh plugins
- Tailwind CSS for styling with utility classes
- Custom UI components following shadcn/ui patterns
- Async/await for API calls with proper error handling