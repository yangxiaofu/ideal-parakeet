import React, { useState } from 'react';
import { Check, Calculator, TrendingUp, BarChart3, DollarSign, Info } from 'lucide-react';
import { CalculatorInfoCard } from './CalculatorInfoCard';
import { getRecommendedCalculators } from '../../constants/calculatorInfo';

export type CalculatorModel = 'DCF' | 'DDM' | 'RELATIVE' | 'NAV' | 'EPV' | 'SUMMARY';

interface CalculatorTab {
  id: CalculatorModel;
  name: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
  completed?: boolean;
  result?: number;
}

// Enhanced calculator result metadata interface
interface CalculatorResultMetadata {
  value: number;
  timestamp: Date;
  confidence?: 'high' | 'medium' | 'low';
  fromCache?: boolean;
  cacheAge?: string;
}

interface CalculatorTabsProps {
  activeTab: CalculatorModel;
  onTabChange: (tab: CalculatorModel) => void;
  completedCalculators: Set<CalculatorModel>;
  results: Partial<Record<CalculatorModel, CalculatorResultMetadata>>;
  companyData?: Record<string, unknown>; // For smart recommendations
}

export const CalculatorTabs: React.FC<CalculatorTabsProps> = ({
  activeTab,
  onTabChange,
  completedCalculators,
  results,
  companyData
}) => {
  const [infoCardOpen, setInfoCardOpen] = useState<string | null>(null);
  
  // Get recommendations if company data is available
  const recommendations = companyData ? getRecommendedCalculators(companyData) : null;
  const tabs: CalculatorTab[] = [
    {
      id: 'DCF',
      name: 'DCF',
      description: 'Discounted Cash Flow',
      icon: <TrendingUp className="h-4 w-4" />,
      available: true,
      completed: completedCalculators.has('DCF'),
      result: results.DCF?.value
    },
    {
      id: 'DDM',
      name: 'DDM',
      description: 'Dividend Discount',
      icon: <DollarSign className="h-4 w-4" />,
      available: true, // Now available!
      completed: completedCalculators.has('DDM'),
      result: results.DDM?.value
    },
    {
      id: 'RELATIVE',
      name: 'Relative',
      description: 'Peer Multiples',
      icon: <BarChart3 className="h-4 w-4" />,
      available: false, // Deactivated - reduces API calls
      completed: completedCalculators.has('RELATIVE'),
      result: results.RELATIVE?.value
    },
    {
      id: 'NAV',
      name: 'NAV',
      description: 'Net Asset Value',
      icon: <BarChart3 className="h-4 w-4" />,
      available: true, // Now available!
      completed: completedCalculators.has('NAV'),
      result: results.NAV?.value
    },
    {
      id: 'EPV',
      name: 'EPV',
      description: 'Earnings Power',
      icon: <Calculator className="h-4 w-4" />,
      available: true, // Now available!
      completed: completedCalculators.has('EPV'),
      result: results.EPV?.value
    },
    {
      id: 'SUMMARY',
      name: 'Summary',
      description: 'Compare All',
      icon: <BarChart3 className="h-4 w-4" />,
      available: completedCalculators.size > 0,
      completed: false,
      result: undefined
    }
  ];

  return (
    <div className="border-b border-gray-200 bg-white rounded-t-2xl overflow-hidden">
      <div className="flex flex-wrap gap-1 p-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => tab.available && onTabChange(tab.id)}
            disabled={!tab.available}
            className={`
              relative flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200
              ${activeTab === tab.id 
                ? 'bg-gray-900 text-white shadow-md' 
                : tab.available
                  ? 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-60'
              }
            `}
          >
            {/* Icon */}
            <span className={activeTab === tab.id ? 'text-white' : 'text-gray-500'}>
              {tab.icon}
            </span>
            
            {/* Tab Label */}
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-sm">{tab.name}</span>
                {tab.completed && (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                )}
                {/* Recommendation Badge */}
                {recommendations && tab.id !== 'SUMMARY' && (
                  <>
                    {recommendations.recommended.includes(tab.id) && (
                      <span className="text-green-600 text-xs">✓</span>
                    )}
                    {recommendations.caution.includes(tab.id) && (
                      <span className="text-yellow-600 text-xs">⚠</span>
                    )}
                    {recommendations.notRecommended.includes(tab.id) && (
                      <span className="text-red-600 text-xs">✗</span>
                    )}
                  </>
                )}
              </div>
              <span className={`text-xs ${
                activeTab === tab.id ? 'text-gray-300' : 'text-gray-500'
              }`}>
                {tab.description}
              </span>
            </div>
            
            {/* Result Badge */}
            {tab.result !== undefined && (
              <span className={`ml-2 text-xs font-semibold ${
                activeTab === tab.id ? 'text-gray-300' : 'text-gray-600'
              }`}>
                ${tab.result.toFixed(2)}
              </span>
            )}
            
            {/* Info Icon */}
            {tab.id !== 'SUMMARY' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setInfoCardOpen(infoCardOpen === tab.id ? null : tab.id);
                }}
                className={`ml-auto p-1 rounded-full transition-colors ${
                  activeTab === tab.id 
                    ? 'hover:bg-gray-800' 
                    : 'hover:bg-gray-200'
                }`}
              >
                <Info className={`h-3.5 w-3.5 ${
                  activeTab === tab.id ? 'text-gray-300' : 'text-gray-500'
                }`} />
              </button>
            )}
            
            {/* Coming Soon Badge */}
            {!tab.available && tab.id !== 'SUMMARY' && (
              <span className="absolute -top-1 -right-1 bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">
                Soon
              </span>
            )}
          </button>
        ))}
      </div>
      
      {/* Progress Indicator */}
      {completedCalculators.size > 0 && (
        <div className="px-4 pb-2">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Analysis Progress</span>
            <span>{completedCalculators.size} of {tabs.filter(tab => tab.available && tab.id !== 'SUMMARY').length} models completed</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(completedCalculators.size / tabs.filter(tab => tab.available && tab.id !== 'SUMMARY').length) * 100}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Info Cards */}
      {infoCardOpen && (
        <CalculatorInfoCard
          calculatorId={infoCardOpen}
          isOpen={true}
          onClose={() => setInfoCardOpen(null)}
          recommendation={
            recommendations?.recommended.includes(infoCardOpen as CalculatorModel) ? 'recommended' :
            recommendations?.caution.includes(infoCardOpen as CalculatorModel) ? 'caution' :
            recommendations?.notRecommended.includes(infoCardOpen as CalculatorModel) ? 'not-recommended' :
            undefined
          }
          reason={recommendations?.reasons[infoCardOpen]}
        />
      )}
    </div>
  );
};