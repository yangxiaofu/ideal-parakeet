# BedRock Value

A comprehensive, multi-model intrinsic valuation tool for publicly traded companies. This application provides professional-grade financial analysis with interactive charts, scenario planning, and persistent user accounts.

## Features

- 🔐 **User Authentication** - Firebase Auth with email/password and Google sign-in
- 📊 **Four Valuation Models**:
  - DCF (Discounted Cash Flow)
  - DDM (Dividend Discount Model) 
  - NAV (Net Asset Value)
  - EPV (Earnings Power Value)
- 📈 **Interactive Charts** - Historical and projected financial data visualization
- 🎯 **Scenario Planning** - Bull, Base, and Bear case projections
- 💾 **Persistent Storage** - Save and track investment analyses over time
- 🌐 **Live Financial Data** - Integration with Financial Modeling Prep API

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: Tailwind CSS with custom components
- **Charts**: Recharts for interactive visualizations
- **Backend**: Firebase (Authentication + Firestore)
- **API**: Financial Modeling Prep for real-time financial data
- **Routing**: React Router v6

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Firebase account
- Financial Modeling Prep API key

### Installation

1. **Clone and install dependencies**:
   ```bash
   cd bedrock-value
   npm install
   ```

2. **Configure Firebase**:
   - Create a new Firebase project at https://console.firebase.google.com
   - Enable Authentication (Email/Password and Google)
   - Create a Firestore database
   - Get your Firebase config from Project Settings

3. **Configure Financial Modeling Prep**:
   - Sign up at https://financialmodelingprep.com
   - Get your API key from the dashboard

4. **Environment Setup**:
   ```bash
   cp .env.example .env
   ```
   
   Fill in your `.env` file:
   ```env
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   
   VITE_FMP_API_KEY=your_fmp_api_key
   VITE_FMP_API_URL=https://financialmodelingprep.com/api/v3
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```

6. **Build for production**:
   ```bash
   npm run build
   ```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── auth/           # Authentication forms
│   ├── calculator/     # Valuation calculator modules
│   ├── charts/         # Financial data visualization
│   ├── dashboard/      # Main dashboard components
│   ├── layout/         # Layout and navigation
│   └── ui/            # Base UI components
├── contexts/           # React contexts (Auth, etc.)
├── hooks/             # Custom React hooks
├── pages/             # Page components
├── services/          # API services (Firebase, FMP)
├── types/             # TypeScript type definitions
└── utils/             # Utility functions
```

## Development Status

### ✅ Completed (Phase 1-2)
- [x] Project setup with React + TypeScript + Vite
- [x] Firebase configuration and authentication system
- [x] Financial Modeling Prep API integration
- [x] User authentication (email/password + Google)
- [x] Main dashboard with ticker search
- [x] Protected routes and navigation
- [x] Basic UI component library

### 🚧 In Progress
- [ ] Financial data visualization with charts
- [ ] Valuation calculator modules (DCF, DDM, NAV, EPV)
- [ ] Scenario-based projections
- [ ] Save/load analysis functionality

### 📋 Planned
- [ ] Advanced charting with historical/projected data
- [ ] Portfolio tracking and analysis history
- [ ] Export functionality
- [ ] Mobile responsiveness
- [ ] Performance optimization

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
