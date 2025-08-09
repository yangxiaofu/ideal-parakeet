import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Shield, TrendingUp, AlertTriangle, CheckCircle, Info, HelpCircle } from 'lucide-react';
import type { MoatAnalysis as MoatAnalysisType } from '../../types/epv';

interface MoatAnalysisProps {
  analysis: MoatAnalysisType;
  companySymbol?: string;
  className?: string;
}

export const MoatAnalysis: React.FC<MoatAnalysisProps> = ({ 
  analysis, 
  companySymbol,
  className = "" 
}) => {
  const getMoatIcon = () => {
    if (analysis.hasEconomicMoat) {
      return analysis.moatStrength === 'wide' 
        ? <Shield className="h-5 w-5 text-green-600" />
        : <Shield className="h-5 w-5 text-blue-600" />;
    }
    return <AlertTriangle className="h-5 w-5 text-gray-400" />;
  };

  const getMoatColor = (hasEconomicMoat: boolean, strength?: string) => {
    if (!hasEconomicMoat) return 'bg-gray-100 text-gray-800';
    if (strength === 'wide') return 'bg-green-100 text-green-800';
    if (strength === 'narrow') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getSustainabilityIcon = (sustainability: string) => {
    switch (sustainability) {
      case 'strengthening': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSustainabilityColor = (sustainability: string) => {
    switch (sustainability) {
      case 'strengthening': return 'bg-green-100 text-green-800';
      case 'declining': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getPressureColor = (pressure: string) => {
    switch (pressure) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
            {getMoatIcon()}
            <span className="ml-2">
              Competitive Moat Analysis
              {companySymbol && <span className="text-blue-600 ml-2">({companySymbol})</span>}
            </span>
          </CardTitle>
          <a 
            href="/docs/moat-analysis-methodology.md" 
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
          >
            <Info className="h-3 w-3" />
            Methodology
          </a>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Economic Moat */}
          <div className="text-center">
            <div className="text-sm font-medium text-gray-600 mb-2">Economic Moat</div>
            <Badge className={getMoatColor(analysis.hasEconomicMoat, analysis.moatStrength)}>
              {analysis.hasEconomicMoat ? 'Present' : 'None'}
            </Badge>
            {analysis.hasEconomicMoat && (
              <div className="text-xs text-gray-500 mt-1 capitalize">
                {analysis.moatStrength}
              </div>
            )}
          </div>

          {/* Moat Strength */}
          <div className="text-center">
            <div className="text-sm font-medium text-gray-600 mb-2">Moat Strength</div>
            <Badge 
              variant="outline" 
              className={analysis.moatStrength === 'wide' ? 'border-green-300 text-green-700' : 
                        analysis.moatStrength === 'narrow' ? 'border-blue-300 text-blue-700' : 
                        'border-gray-300 text-gray-700'}
            >
              {analysis.moatStrength === 'none' ? 'No Moat' : analysis.moatStrength}
            </Badge>
          </div>

          {/* Sustainability */}
          <div className="text-center">
            <div className="text-sm font-medium text-gray-600 mb-2">Sustainability</div>
            <div className="flex items-center justify-center space-x-1">
              {getSustainabilityIcon(analysis.moatSustainability)}
              <Badge className={getSustainabilityColor(analysis.moatSustainability)}>
                {analysis.moatSustainability}
              </Badge>
            </div>
          </div>

          {/* Competitive Pressure */}
          <div className="text-center">
            <div className="text-sm font-medium text-gray-600 mb-2">Competitive Pressure</div>
            <Badge className={getPressureColor(analysis.competitivePressure)}>
              {analysis.competitivePressure}
            </Badge>
          </div>
        </div>

        {/* Moat Sources (if available) */}
        {analysis.moatSources && analysis.moatSources.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-600">Moat Sources</span>
              <div className="group relative">
                <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10 w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
                  <div className="space-y-2">
                    <div><strong>Brand:</strong> Pricing power from customer loyalty and brand recognition</div>
                    <div><strong>Scale:</strong> Cost advantages from large-scale operations</div>
                    <div><strong>Switching Costs:</strong> Customer retention from high costs of changing providers</div>
                    <div><strong>Patents:</strong> Legal protection of intellectual property</div>
                    <div><strong>Network Effects:</strong> Value increases as more users join</div>
                    <div><strong>Location:</strong> Geographic or regulatory advantages</div>
                  </div>
                  <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {analysis.moatSources.map((source, index) => {
                const moatDescriptions: Record<string, string> = {
                  'brand': 'Strong brand loyalty and pricing power',
                  'scale': 'Cost advantages from size',
                  'switching_costs': 'High customer retention',
                  'patents': 'Protected intellectual property',
                  'network_effects': 'Platform value grows with users',
                  'location': 'Geographic or regulatory advantage'
                };
                
                return (
                  <div key={index} className="group relative inline-block">
                    <Badge variant="outline" className="text-xs cursor-help">
                      {source.replace('_', ' ')}
                    </Badge>
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 hidden group-hover:block z-10 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap">
                      {moatDescriptions[source] || source}
                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Summary Assessment */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-start space-x-2">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-700">
              <span className="font-medium">Assessment:</span>{' '}
              {analysis.hasEconomicMoat 
                ? `This company has ${analysis.moatStrength === 'wide' ? 'a strong' : 'a moderate'} competitive advantage. ${
                    analysis.moatSustainability === 'strengthening' ? 'The moat appears to be strengthening over time.' :
                    analysis.moatSustainability === 'declining' ? 'However, the competitive advantage may be weakening.' :
                    'The competitive position appears stable.'
                  } Competitive pressure is ${analysis.competitivePressure}.`
                : 'No significant competitive moat detected. The company operates in a competitive environment with limited barriers to entry.'
              }
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};