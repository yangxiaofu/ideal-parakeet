# Dividend Discount Model (DDM) Documentation

## Overview

The Dividend Discount Model (DDM) is a valuation method that estimates the value of a company's stock based on the theory that its worth is the sum of all future dividend payments, discounted back to their present value. This model is particularly useful for valuing stable, mature companies that pay regular dividends.

## Mathematical Formulas

### 1. Gordon Growth Model (Constant Growth DDM)

The most common DDM variant, assumes dividends grow at a constant rate indefinitely.

**Formula:**
```
P₀ = D₁ / (r - g)
```

Where:
- P₀ = Intrinsic value of the stock today
- D₁ = Expected dividend per share one year from now (D₀ × (1 + g))
- r = Required rate of return
- g = Constant dividend growth rate

**Key Constraint:** r > g (required return must exceed growth rate)

### 2. Zero Growth DDM

Used for companies with constant dividends (no growth).

**Formula:**
```
P₀ = D / r
```

Where:
- D = Annual dividend per share (constant)
- r = Required rate of return

### 3. Two-Stage DDM

For companies with an initial high-growth period followed by stable growth.

**Stage 1 (High Growth):**
```
PV₁ = Σ[t=1 to n] D₀(1+g₁)^t / (1+r)^t
```

**Stage 2 (Terminal Value):**
```
PV₂ = [D_n(1+g₂) / (r-g₂)] / (1+r)^n
```

**Total Value:**
```
P₀ = PV₁ + PV₂
```

Where:
- g₁ = Initial high growth rate
- g₂ = Stable terminal growth rate
- n = Number of years in high-growth period

### 4. Multi-Stage DDM

Extends the two-stage model for multiple growth phases.

```
P₀ = Σ[all phases] PV(dividends) + PV(terminal value)
```

## Implementation Details

### Input Validation

The calculator performs comprehensive validation:
- Ensures r > g for Gordon and terminal growth models
- Validates positive dividend and share values
- Warns about unrealistic growth assumptions (>15% long-term)
- Checks for negative growth rates (declining dividends)

### Calculation Process

1. **Input Processing**
   - Convert percentage inputs to decimals
   - Validate all constraints
   - Select appropriate model

2. **Dividend Projection**
   - Calculate future dividends based on growth rates
   - Apply phase transitions for multi-stage models
   - Generate 10-year projections for visualization

3. **Present Value Calculation**
   - Discount each future dividend to present value
   - Calculate terminal value for perpetual growth
   - Sum all present values

4. **Results Generation**
   - Calculate intrinsic value per share
   - Compute dividend yields
   - Generate sensitivity analysis
   - Prepare projection tables

## Use Cases and Examples

### Example 1: Gordon Growth Model

**Company:** Stable utility company
- Current dividend: $2.00
- Expected growth: 3% perpetually
- Required return: 8%

**Calculation:**
```
D₁ = $2.00 × 1.03 = $2.06
P₀ = $2.06 / (0.08 - 0.03) = $41.20
```

### Example 2: Two-Stage Model

**Company:** Growing tech company transitioning to maturity
- Current dividend: $1.00
- High growth: 15% for 5 years
- Stable growth: 4% thereafter
- Required return: 10%

**Stage 1 Calculation:**
- Year 1: $1.15 / 1.10 = $1.045
- Year 2: $1.32 / 1.21 = $1.093
- ... (continue for 5 years)
- Stage 1 PV ≈ $5.73

**Stage 2 Calculation:**
- Terminal dividend: $2.01 × 1.04 = $2.09
- Terminal value: $2.09 / (0.10 - 0.04) = $34.86
- Terminal PV: $34.86 / 1.61 = $21.65

**Total Value:** $5.73 + $21.65 = $27.38

## Model Selection Guidelines

### Gordon Growth Model
**Best for:**
- Mature, stable companies
- Consistent dividend growth history
- Blue-chip stocks
- Utilities and consumer staples

**Not suitable for:**
- High-growth companies
- Irregular dividend payers
- Companies with volatile earnings

### Zero Growth Model
**Best for:**
- Preferred stocks
- Very mature companies
- Companies in declining industries
- REITs with stable distributions

### Two-Stage Model
**Best for:**
- Growing companies approaching maturity
- Companies with clear growth trajectory changes
- Firms transitioning business models

### Multi-Stage Model
**Best for:**
- Complex growth scenarios
- Companies with multiple business phases
- Detailed analyst projections available

## Sensitivity Analysis

The calculator provides sensitivity analysis for key variables:

### Growth Rate Sensitivity
Shows how valuation changes with different growth assumptions:
- ±2% variations from base case
- Helps understand growth risk

### Discount Rate Sensitivity
Shows impact of required return changes:
- Reflects market risk perception
- Interest rate environment effects

### Matrix Analysis
Two-dimensional sensitivity table:
- Growth rate vs. discount rate
- Identifies valuation ranges
- Highlights key assumption impacts

## Common Pitfalls and Limitations

### 1. Growth Rate > Required Return
- Mathematically impossible in Gordon model
- Indicates unrealistic assumptions
- Solution: Use multi-stage model with declining growth

### 2. Non-Dividend Paying Companies
- DDM not applicable
- Consider DCF or other models
- Some growth companies may initiate dividends later

### 3. Cyclical Companies
- Dividend volatility challenges model
- Use normalized dividends
- Consider averaging over cycle

### 4. Terminal Growth Assumptions
- Most sensitive input
- Should not exceed GDP growth long-term
- Typically 2-4% for mature companies

## Integration with Financial Data

The calculator integrates with company financial data:

### Automatic Data Population
- Latest dividend per share from cash flow statements
- Historical dividend growth calculation
- Shares outstanding from income statements

### Historical Analysis
- 5-year dividend history
- CAGR calculation for growth rate estimation
- Payout ratio trends

### Validation Against Market
- Compare to current stock price
- Calculate implied growth rate
- Identify over/undervaluation

## Best Practices

1. **Use Conservative Assumptions**
   - Better to underestimate than overestimate growth
   - Include margin of safety

2. **Consider Multiple Models**
   - Run different scenarios
   - Compare results across models
   - Understand sensitivity to assumptions

3. **Validate Against Reality**
   - Check if growth rates are sustainable
   - Compare to industry averages
   - Consider competitive position

4. **Regular Updates**
   - Revisit assumptions quarterly
   - Update with new dividend announcements
   - Adjust for changing market conditions

## Technical Implementation

### Calculation Precision
- All calculations use full decimal precision
- Display rounds to 2-3 decimal places
- Prevents rounding error accumulation

### Performance Optimization
- Memoized calculations for sensitivity analysis
- Efficient array operations for projections
- Lazy loading of complex visualizations

### Error Handling
- Graceful handling of edge cases
- Clear error messages for users
- Validation before calculation

## References

1. Gordon, M.J. (1962). "The Investment, Financing, and Valuation of the Corporation"
2. Williams, J.B. (1938). "The Theory of Investment Value"
3. Damodaran, A. "Investment Valuation" (3rd Edition)

## Version History

- v1.0.0 - Initial implementation with four DDM variants
- Comprehensive testing with 20+ unit tests
- Full integration with financial data pipeline