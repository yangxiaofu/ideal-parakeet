/**
 * Industry-based peer mappings for relative valuation analysis
 * Curated lists of high-quality comparable companies by industry/sector
 */

export interface IndustryPeerGroup {
  industry: string;
  sector: string;
  peers: string[];
  description: string;
}

/**
 * Comprehensive industry peer mappings
 * Each industry has 3-5 high-quality peers for relative valuation
 */
export const INDUSTRY_PEER_MAPPING: Record<string, IndustryPeerGroup> = {
  // Technology Sector
  'software': {
    industry: 'Software',
    sector: 'Technology',
    peers: ['MSFT', 'CRM', 'ADBE'],
    description: 'Enterprise software and cloud services'
  },
  'semiconductors': {
    industry: 'Semiconductors',
    sector: 'Technology',
    peers: ['NVDA', 'AMD', 'INTC'],
    description: 'Chip design and manufacturing'
  },
  'internet': {
    industry: 'Internet & Digital Services',
    sector: 'Technology',
    peers: ['GOOGL', 'META', 'AMZN'],
    description: 'Internet platforms and digital services'
  },
  'hardware': {
    industry: 'Technology Hardware',
    sector: 'Technology',
    peers: ['AAPL', 'MSFT', 'GOOGL'],
    description: 'Consumer and enterprise hardware'
  },
  'cybersecurity': {
    industry: 'Cybersecurity',
    sector: 'Technology',
    peers: ['CRWD', 'ZS', 'PANW'],
    description: 'Information security solutions'
  },

  // Healthcare Sector
  'pharmaceuticals': {
    industry: 'Pharmaceuticals',
    sector: 'Healthcare',
    peers: ['JNJ', 'PFE', 'MRK'],
    description: 'Drug discovery and manufacturing'
  },
  'biotech': {
    industry: 'Biotechnology',
    sector: 'Healthcare',
    peers: ['GILD', 'AMGN', 'BIIB'],
    description: 'Biotechnology and therapeutics'
  },
  'medical-devices': {
    industry: 'Medical Devices',
    sector: 'Healthcare',
    peers: ['MDT', 'ABT', 'TMO'],
    description: 'Medical equipment and devices'
  },
  'health-insurance': {
    industry: 'Health Insurance',
    sector: 'Healthcare',
    peers: ['UNH', 'ANTM', 'CI'],
    description: 'Health insurance and managed care'
  },

  // Financial Sector
  'banks': {
    industry: 'Banking',
    sector: 'Financial Services',
    peers: ['JPM', 'BAC', 'WFC'],
    description: 'Commercial and investment banking'
  },
  'insurance': {
    industry: 'Insurance',
    sector: 'Financial Services',
    peers: ['BRK.B', 'AIG', 'PGR'],
    description: 'Property, casualty, and life insurance'
  },
  'payment-processors': {
    industry: 'Payment Processing',
    sector: 'Financial Services',
    peers: ['V', 'MA', 'PYPL'],
    description: 'Digital and traditional payment processing'
  },
  'asset-management': {
    industry: 'Asset Management',
    sector: 'Financial Services',
    peers: ['BLK', 'MS', 'GS'],
    description: 'Investment management and advisory'
  },

  // Consumer Sector
  'retail': {
    industry: 'Retail',
    sector: 'Consumer Discretionary',
    peers: ['AMZN', 'WMT', 'TGT'],
    description: 'General merchandise and e-commerce'
  },
  'automotive': {
    industry: 'Automotive',
    sector: 'Consumer Discretionary',
    peers: ['TSLA', 'F', 'GM'],
    description: 'Automotive manufacturing'
  },
  'restaurants': {
    industry: 'Restaurants',
    sector: 'Consumer Discretionary',
    peers: ['MCD', 'SBUX', 'YUM'],
    description: 'Restaurant chains and food service'
  },
  'apparel': {
    industry: 'Apparel & Footwear',
    sector: 'Consumer Discretionary',
    peers: ['NKE', 'LULU', 'TJX'],
    description: 'Clothing and footwear brands'
  },

  // Consumer Staples
  'beverages': {
    industry: 'Beverages',
    sector: 'Consumer Staples',
    peers: ['KO', 'PEP', 'MNST'],
    description: 'Non-alcoholic beverages'
  },
  'food': {
    industry: 'Food Products',
    sector: 'Consumer Staples',
    peers: ['PG', 'UL', 'KHC'],
    description: 'Food products and brands'
  },

  // Industrial Sector
  'aerospace': {
    industry: 'Aerospace & Defense',
    sector: 'Industrials',
    peers: ['BA', 'LMT', 'RTX'],
    description: 'Aircraft and defense systems'
  },
  'logistics': {
    industry: 'Logistics & Transportation',
    sector: 'Industrials',
    peers: ['UPS', 'FDX', 'DAL'],
    description: 'Transportation and logistics services'
  },
  'manufacturing': {
    industry: 'Industrial Manufacturing',
    sector: 'Industrials',
    peers: ['GE', 'CAT', 'DE'],
    description: 'Industrial equipment and machinery'
  },

  // Energy Sector
  'oil-gas': {
    industry: 'Oil & Gas',
    sector: 'Energy',
    peers: ['XOM', 'CVX', 'COP'],
    description: 'Oil and gas exploration and production'
  },
  'renewable-energy': {
    industry: 'Renewable Energy',
    sector: 'Energy',
    peers: ['NEE', 'ENPH', 'SEDG'],
    description: 'Solar, wind, and renewable energy'
  },

  // Utilities
  'utilities': {
    industry: 'Electric Utilities',
    sector: 'Utilities',
    peers: ['NEE', 'SO', 'DUK'],
    description: 'Electric power generation and distribution'
  },

  // Real Estate
  'reits': {
    industry: 'REITs',
    sector: 'Real Estate',
    peers: ['AMT', 'PLD', 'CCI'],
    description: 'Real estate investment trusts'
  },

  // Communication Services
  'telecom': {
    industry: 'Telecommunications',
    sector: 'Communication Services',
    peers: ['VZ', 'T', 'TMUS'],
    description: 'Wireless and wireline communications'
  },
  'media': {
    industry: 'Media & Entertainment',
    sector: 'Communication Services',
    peers: ['DIS', 'NFLX', 'CMCSA'],
    description: 'Media content and entertainment'
  }
};

/**
 * Symbol-to-industry mapping for common stocks
 * Maps ticker symbols to industry keys for quick peer suggestions
 */
export const SYMBOL_TO_INDUSTRY: Record<string, string> = {
  // Technology
  'AAPL': 'hardware', 'MSFT': 'software', 'GOOGL': 'internet', 'GOOG': 'internet',
  'AMZN': 'internet', 'META': 'internet', 'NVDA': 'semiconductors',
  'AMD': 'semiconductors', 'INTC': 'semiconductors', 'CRM': 'software',
  'ADBE': 'software', 'ORCL': 'software', 'NFLX': 'internet',
  'CRWD': 'cybersecurity', 'ZS': 'cybersecurity', 'PANW': 'cybersecurity',

  // Healthcare
  'JNJ': 'pharmaceuticals', 'PFE': 'pharmaceuticals', 'UNH': 'health-insurance',
  'MRK': 'pharmaceuticals', 'ABT': 'medical-devices', 'TMO': 'medical-devices',
  'GILD': 'biotech', 'AMGN': 'biotech', 'BIIB': 'biotech',
  'MDT': 'medical-devices', 'ANTM': 'health-insurance', 'CI': 'health-insurance',

  // Financial
  'JPM': 'banks', 'BAC': 'banks', 'WFC': 'banks', 'C': 'banks',
  'BRK.B': 'insurance', 'BRK.A': 'insurance', 'AIG': 'insurance',
  'V': 'payment-processors', 'MA': 'payment-processors', 'PYPL': 'payment-processors',
  'BLK': 'asset-management', 'MS': 'asset-management', 'GS': 'asset-management',

  // Consumer Discretionary
  'TSLA': 'automotive', 'F': 'automotive', 'GM': 'automotive',
  'MCD': 'restaurants', 'SBUX': 'restaurants', 'YUM': 'restaurants',
  'NKE': 'apparel', 'LULU': 'apparel', 'TJX': 'apparel',
  'WMT': 'retail', 'TGT': 'retail', 'HD': 'retail',

  // Consumer Staples
  'KO': 'beverages', 'PEP': 'beverages', 'MNST': 'beverages',
  'PG': 'food', 'UL': 'food', 'KHC': 'food',

  // Industrial
  'BA': 'aerospace', 'LMT': 'aerospace', 'RTX': 'aerospace',
  'UPS': 'logistics', 'FDX': 'logistics', 'DAL': 'logistics',
  'GE': 'manufacturing', 'CAT': 'manufacturing', 'DE': 'manufacturing',

  // Energy
  'XOM': 'oil-gas', 'CVX': 'oil-gas', 'COP': 'oil-gas',
  'NEE': 'utilities', 'SO': 'utilities', 'DUK': 'utilities',

  // Communication Services
  'VZ': 'telecom', 'T': 'telecom', 'TMUS': 'telecom',
  'DIS': 'media', 'CMCSA': 'media'
};

/**
 * Get peer suggestions for a given company symbol
 * @param symbol - Company ticker symbol
 * @returns Array of peer ticker symbols (max 3)
 */
export function getPeerSuggestions(symbol: string): string[] {
  const industryKey = SYMBOL_TO_INDUSTRY[symbol.toUpperCase()];
  if (!industryKey) {
    // Default to large cap tech companies if industry not found
    return ['AAPL', 'MSFT', 'GOOGL'];
  }
  
  const industryGroup = INDUSTRY_PEER_MAPPING[industryKey];
  if (!industryGroup) {
    return ['AAPL', 'MSFT', 'GOOGL'];
  }
  
  // Filter out the target company itself from peers
  const peers = industryGroup.peers.filter(peer => 
    peer.toUpperCase() !== symbol.toUpperCase()
  );
  
  // Return up to 3 peers
  return peers.slice(0, 3);
}

/**
 * Get industry information for a company symbol
 * @param symbol - Company ticker symbol
 * @returns Industry group information or null if not found
 */
export function getIndustryInfo(symbol: string): IndustryPeerGroup | null {
  const industryKey = SYMBOL_TO_INDUSTRY[symbol.toUpperCase()];
  if (!industryKey) return null;
  
  return INDUSTRY_PEER_MAPPING[industryKey] || null;
}

/**
 * Get all available industries
 * @returns Array of industry keys
 */
export function getAllIndustries(): string[] {
  return Object.keys(INDUSTRY_PEER_MAPPING);
}

/**
 * Check if a symbol has predefined peer suggestions
 * @param symbol - Company ticker symbol
 * @returns True if peers are available
 */
export function hasPeerSuggestions(symbol: string): boolean {
  return symbol.toUpperCase() in SYMBOL_TO_INDUSTRY;
}