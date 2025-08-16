# MOAT Analysis Methodology

## Overview

The MOAT analysis feature evaluates a company's competitive advantages (economic moats) using financial data to determine if the business has sustainable competitive advantages that protect its profits from competition. This document explains the methodology, metrics, and logic used in the analysis.

## What is an Economic Moat?

An economic moat refers to a business's ability to maintain competitive advantages over its competitors to protect its long-term profits and market share. Companies with wide moats can sustain high returns on invested capital for extended periods.

## MOAT Sources Identified

The system identifies six types of competitive advantages using sophisticated financial metrics:

### 1. Brand Power 💪
**Enhanced Detection Logic:**
- **Primary Indicators:**
  - Gross margin > 60% OR Gross margin stability > 70%
  - AND (SG&A efficiency improving OR Net margin stability > 70%)
- **Rationale:** Strong brands command pricing power (high gross margins) and require less marketing over time (declining SG&A as % of revenue)
- **Financial Indicators:**
  - High and stable gross profit margins
  - Declining SG&A expenses as percentage of revenue
  - Consistent net profit margins over 3+ years
  - Premium pricing ability
- **Examples:** Luxury goods, consumer staples with brand loyalty

### 2. Patents & Intellectual Property
**Detection Logic:** Currently not auto-detected (planned enhancement)
- **Rationale:** Legal protection prevents competitors from copying products/services
- **Planned Indicators:**
  - High R&D spending relative to revenue (>5%)
  - Technology or pharmaceutical industry classification
  - High gross margins (>60%) suggesting unique products
- **Examples:** Pharmaceutical companies, technology innovators

### 3. Network Effects
**Detection Logic:** Currently not auto-detected (planned enhancement)
- **Rationale:** Service becomes more valuable as more users join the network
- **Planned Indicators:**
  - Accelerating revenue growth with stable/declining customer acquisition costs
  - Platform or marketplace business model
  - High customer retention rates
- **Examples:** Social networks, payment platforms, marketplaces

### 4. Switching Costs Lock-In 🔁
**Enhanced Detection Logic:**
- **Primary Indicators:**
  - Revenue growth consistency > 80% OR
  - Deferred revenue growth > 10% year-over-year
- **Rationale:** High switching costs create customer lock-in, visible in predictable revenue and prepayments
- **Financial Indicators:**
  - Very consistent revenue growth (low standard deviation)
  - Growing deferred revenue balance (customers paying in advance)
  - High revenue retention rates
  - Recurring revenue model
- **Examples:** Enterprise software, specialized industrial suppliers, subscription services

### 5. Scale Advantages 🏭
**Enhanced Detection Logic:**
- **Primary Indicators:**
  - (Dominant or Strong competitive position) AND
  - (Asset turnover > 1.5 OR Average ROIC > 15%)
- **Rationale:** True scale advantages manifest in superior operational efficiency and returns on capital
- **Financial Indicators:**
  - High asset turnover ratio (revenue/assets)
  - Superior ROIC compared to industry
  - Operating leverage improving with scale
  - Market share dominance (relative to competitors)
- **Examples:** Large retailers, cloud infrastructure providers, manufacturing leaders

### 6. Location/Regulatory Advantages
**Detection Logic:** Currently not auto-detected (planned enhancement)
- **Rationale:** Geographic monopolies or regulatory barriers limit competition
- **Planned Indicators:**
  - Utility or infrastructure classification
  - Stable margins despite commodity inputs
  - Limited geographic competition
- **Examples:** Utilities, local service monopolies, regulated industries

## ROIC-Based MOAT Classification (Primary Method)

The system now uses **Return on Invested Capital (ROIC) vs Weighted Average Cost of Capital (WACC)** as the primary method for moat classification, making it more financially rigorous.

### ROIC Calculation
```
ROIC = NOPAT / Invested Capital
Where:
- NOPAT = Operating Income × (1 - Tax Rate)
- Invested Capital = Total Assets - Cash - Current Liabilities + Short-term Debt
```

### WACC Calculation
```
WACC = (E/V × Re) + (D/V × Rd × (1 - Tc))
Where:
- E/V = Equity weight in capital structure
- Re = Cost of Equity (Risk-free Rate + Beta × Market Risk Premium)
- D/V = Debt weight in capital structure
- Rd = Cost of Debt
- Tc = Tax Rate
```

## MOAT Strength Classification

### Wide Moat
- **Primary Criteria:** ROIC > WACC + 8% for 5+ years with consistency > 70%
- **Alternative Criteria:** Average ROIC > 20% with consistency > 70%
- **Characteristics:**
  - Multiple moat sources present
  - Sustained high returns on capital
  - Clear competitive advantages lasting 10+ years
  - Market leadership position

### Narrow Moat
- **Primary Criteria:** ROIC > WACC + 2% for 3+ years with consistency > 50%
- **Alternative Criteria:** Average ROIC > 12% with consistency > 50%
- **Characteristics:**
  - At least one clear moat source
  - Above-average returns on capital
  - Competitive advantages lasting 5-10 years
  - Strong market position but not dominant

### No Moat
- **Primary Criteria:** ROIC ≈ WACC or ROIC < WACC
- **Alternative Criteria:** Average ROIC < 12% or low consistency
- **Characteristics:**
  - No clear competitive advantages
  - Returns on capital near or below cost of capital
  - Highly competitive market
  - Commodity-like products/services

## Supporting Metrics

### Business Stability Assessment
Calculated from financial consistency metrics:
- **Very Stable:** Combined stability score > 0.8
- **Stable:** Score 0.6-0.8
- **Moderate:** Score 0.4-0.6
- **Volatile:** Score 0.2-0.4
- **Very Volatile:** Score < 0.2

### Competitive Position Ranking
Based on profitability and company size:
- **Dominant:** Industry leader with exceptional margins
- **Strong:** Top-tier competitor with strong profitability
- **Average:** Mid-tier competitor with moderate margins
- **Weak:** Below-average profitability
- **Poor:** Struggling with profitability

### Moat Sustainability Trends
Analyzes whether the moat is strengthening or weakening:
- **Strengthening:** Improving margins + strong competitive position
- **Stable:** Consistent performance metrics
- **Declining:** Deteriorating margins or weakening position

### Competitive Pressure Level
Based on business volatility:
- **Low:** Very stable business environment
- **Medium:** Moderate business stability
- **High:** Volatile or very volatile conditions

## Capital Allocation Assessment

A great business with a wide moat can still be a poor investment if management makes poor capital allocation decisions. The system evaluates capital allocation quality through multiple metrics:

### Capital Allocation Grading (A-F)

**Grade Components (100-point scale):**
1. **ROIC Trend (30 points)**
   - Improving ROIC: Full points
   - Stable high ROIC: 20 points
   - Declining ROIC: 5 points

2. **Incremental ROIC (25 points)**
   - New investments earning > 120% of average ROIC: Full points
   - Maintaining return levels: 20 points
   - Sub-par returns: 5 points

3. **Reinvestment Efficiency (20 points)**
   - Balanced reinvestment (30-70% of OCF) with high returns: Full points
   - Capital-light model with high ROIC: 15 points
   - Excessive capital intensity: 5 points

4. **Shareholder Returns (15 points)**
   - Consistent dividends (>80% consistency): Full points
   - Moderate consistency: 10 points
   - Irregular returns: 5 points

5. **Debt Management (10 points)**
   - Conservative balance sheet (D/E < 0.3): Full points
   - Moderate leverage (D/E < 0.6): 7 points
   - High leverage (D/E > 1.0): 0 points

**Grade Thresholds:**
- **A:** 85+ points - Excellent capital allocation
- **B:** 70-84 points - Good capital allocation
- **C:** 55-69 points - Adequate capital allocation
- **D:** 40-54 points - Poor capital allocation
- **F:** <40 points - Value-destructive allocation

### Impact on Moat Sustainability
- **Grade A-B:** Moat likely strengthening
- **Grade C:** Moat stable
- **Grade D-F:** Moat potentially declining

## Calculation Process

1. **Data Collection**
   - Gather 3-5 years of financial statements
   - Calculate growth rates and margins
   - Assess consistency metrics

2. **Metric Calculation**
   - Revenue growth consistency (standard deviation)
   - Margin stability (coefficient of variation)
   - Profitability trends (period comparisons)
   - Size and scale metrics

3. **MOAT Source Inference**
   - Apply detection rules for each moat type
   - Identify all applicable moat sources
   - Weight sources by strength of evidence

4. **Overall Assessment**
   - Combine metrics into moat strength rating
   - Determine sustainability trend
   - Assess competitive pressure
   - Generate final moat classification

## Limitations and Considerations

### Current Limitations
1. **Financial Data Dependency:** Analysis relies entirely on quantitative financial metrics
2. **Industry Context:** Doesn't account for industry-specific factors
3. **Qualitative Factors:** Cannot assess management quality, corporate culture, or strategic positioning
4. **Limited Moat Detection:** Only 3 of 6 moat types are currently auto-detected

### Important Considerations
- **Historical Bias:** Past performance doesn't guarantee future moat sustainability
- **Disruption Risk:** Technology changes can rapidly erode traditional moats
- **Time Lag:** Financial data may not reflect recent competitive changes
- **Regional Differences:** Moats may vary by geographic market

### Planned Enhancements
1. Industry-specific moat detection rules
2. Incorporation of qualitative factors via user input
3. Detection logic for patents, network effects, and regulatory advantages
4. Integration with industry comparison data
5. Machine learning-based moat prediction models

## Using MOAT Analysis in Investment Decisions

### When to Trust the Analysis
- Company has 5+ years of consistent financial data
- Operating in stable, mature industries
- Traditional business models with clear competitive dynamics

### When to Supplement with Additional Research
- Young or rapidly growing companies
- Technology or disruption-prone industries
- Companies undergoing strategic transitions
- Regulatory or political risk factors

### Integration with Valuation Models
- **Wide Moat:** Consider using higher terminal growth rates in DCF
- **Narrow Moat:** Use moderate growth assumptions
- **No Moat:** Conservative growth rates, focus on asset-based valuation

## Technical Implementation Details

### Data Sources
- Income statements: Revenue, net income, margins
- Balance sheets: Total assets, equity (for scale assessment)
- Cash flow statements: Operating cash flow consistency

### Calculation Formulas

**Revenue Growth Consistency:**
```
Standard Deviation of YoY Growth Rates
Consistency Score = MAX(0, 1 - (StdDev × 2))
```

**Margin Stability:**
```
Coefficient of Variation = StdDev(Net Margins) / Mean(Net Margins)
Stability Score = MAX(0, 1 - (CV × 5))
```

**Business Stability:**
```
Combined Score = (Revenue Consistency + Margin Stability) / 2
```

### Thresholds and Parameters
All thresholds are configurable and based on empirical analysis:
- Brand detection: 70% margin stability
- Switching costs: 80% revenue consistency
- Scale thresholds: Industry-relative percentiles

## References and Further Reading

- "The Little Book That Builds Wealth" by Pat Dorsey
- "Competitive Strategy" by Michael Porter
- Morningstar's Economic Moat Rating Methodology
- "Good to Great" by Jim Collins (sustainable competitive advantages)

---

*Last Updated: 2024*
*Version: 1.0*