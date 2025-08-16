import React from 'react';
import { X, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { CALCULATOR_INFO } from '../../constants/calculatorInfo';

interface CalculatorInfoCardProps {
  calculatorId: string;
  isOpen: boolean;
  onClose: () => void;
  recommendation?: 'recommended' | 'caution' | 'not-recommended';
  reason?: string;
}

export const CalculatorInfoCard: React.FC<CalculatorInfoCardProps> = ({
  calculatorId,
  isOpen,
  onClose,
  recommendation,
  reason
}) => {
  if (!isOpen) return null;
  
  const info = CALCULATOR_INFO[calculatorId];
  if (!info) return null;

  const getRecommendationBadge = () => {
    if (!recommendation) return null;
    
    switch (recommendation) {
      case 'recommended':
        return (
          <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-1.5 rounded-lg">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Recommended</span>
          </div>
        );
      case 'caution':
        return (
          <div className="flex items-center gap-2 text-yellow-700 bg-yellow-50 px-3 py-1.5 rounded-lg">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">Use with Caution</span>
          </div>
        );
      case 'not-recommended':
        return (
          <div className="flex items-center gap-2 text-red-700 bg-red-50 px-3 py-1.5 rounded-lg">
            <XCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Not Recommended</span>
          </div>
        );
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 mb-4 relative animate-in slide-in-from-top-2">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Header */}
      <div className="mb-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span className="text-xl">{info.icon}</span>
              {info.fullName}
            </h3>
            <p className="text-sm text-gray-600 mt-1">{info.description}</p>
          </div>
        </div>
        
        {/* Recommendation Badge */}
        {recommendation && (
          <div className="mt-3 space-y-2">
            {getRecommendationBadge()}
            {reason && (
              <p className="text-xs text-gray-600 ml-1">{reason}</p>
            )}
          </div>
        )}
      </div>

      {/* Content Grid */}
      <div className="grid md:grid-cols-2 gap-4 text-sm">
        {/* Left Column */}
        <div className="space-y-3">
          {/* Valuation Type */}
          <div>
            <h4 className="font-medium text-gray-700 mb-1">Valuation Type</h4>
            <p className="text-gray-600">{info.valuationType}</p>
          </div>

          {/* Investment Style */}
          <div>
            <h4 className="font-medium text-gray-700 mb-1">Investment Style</h4>
            <div className="flex flex-wrap gap-1">
              {info.investmentStyle.map((style) => (
                <span key={style} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                  {style}
                </span>
              ))}
            </div>
          </div>

          {/* Best For */}
          <div>
            <h4 className="font-medium text-gray-700 mb-1">Best For</h4>
            <ul className="space-y-1">
              {info.bestFor.map((item) => (
                <li key={item} className="text-gray-600 flex items-start gap-1">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          {/* Ideal Businesses */}
          <div>
            <h4 className="font-medium text-gray-700 mb-1">Ideal Businesses</h4>
            <ul className="space-y-1">
              {info.idealBusinesses.slice(0, 3).map((item) => (
                <li key={item} className="text-gray-600 flex items-start gap-1">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span className="text-xs">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Not Ideal For */}
          <div>
            <h4 className="font-medium text-gray-700 mb-1">Not Ideal For</h4>
            <ul className="space-y-1">
              {info.notIdealFor.slice(0, 3).map((item) => (
                <li key={item} className="text-gray-600 flex items-start gap-1">
                  <span className="text-red-500 mt-0.5">✗</span>
                  <span className="text-xs">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Key Requirements */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <h4 className="font-medium text-gray-700 mb-2 text-sm">Key Requirements</h4>
        <div className="flex flex-wrap gap-2">
          {info.keyRequirements.map((req) => (
            <span key={req} className="px-2 py-1 bg-gray-50 text-gray-600 rounded text-xs">
              {req}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};