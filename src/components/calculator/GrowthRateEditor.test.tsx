import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GrowthRateEditor } from './GrowthRateEditor';

describe('GrowthRateEditor', () => {
  const defaultProps = {
    projectionYears: 5,
    growthRates: [0.075, 0.07, 0.065, 0.06, 0.055],
    scenario: 'base' as const,
    onGrowthRatesChange: vi.fn(),
    onScenarioChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<GrowthRateEditor {...defaultProps} />);
    expect(screen.getByLabelText(/Growth Scenario/i)).toBeInTheDocument();
  });

  it('displays growth scenario selector with correct options', () => {
    render(<GrowthRateEditor {...defaultProps} />);
    
    const scenarioSelect = screen.getByLabelText(/Growth Scenario/i);
    expect(scenarioSelect).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Bear Case/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Base Case/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Bull Case/i })).toBeInTheDocument();
  });

  it('renders quick pattern buttons', () => {
    render(<GrowthRateEditor {...defaultProps} />);
    
    expect(screen.getByText(/Conservative \(5%→3%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Balanced \(7\.5%→5%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Front-loaded \(12%→3%\)/i)).toBeInTheDocument();
  });

  it('displays current growth rates correctly', () => {
    render(<GrowthRateEditor {...defaultProps} />);
    
    // Should display growth rates as percentages
    expect(screen.getByDisplayValue('7.5')).toBeInTheDocument(); // 0.075 * 100
    expect(screen.getByDisplayValue('7.0')).toBeInTheDocument(); // 0.07 * 100
    expect(screen.getByDisplayValue('6.5')).toBeInTheDocument(); // 0.065 * 100
  });

  it('renders individual year inputs for all projection years', () => {
    render(<GrowthRateEditor {...defaultProps} />);
    
    for (let i = 1; i <= defaultProps.projectionYears; i++) {
      expect(screen.getByLabelText(new RegExp(`Year ${i}`, 'i'))).toBeInTheDocument();
    }
  });

  it('calls onScenarioChange when scenario is changed', () => {
    render(<GrowthRateEditor {...defaultProps} />);
    
    const scenarioSelect = screen.getByLabelText(/Growth Scenario/i);
    fireEvent.change(scenarioSelect, { target: { value: 'bull' } });
    
    expect(defaultProps.onScenarioChange).toHaveBeenCalledWith('bull');
  });

  it('calls onGrowthRatesChange when individual rate is changed', () => {
    render(<GrowthRateEditor {...defaultProps} />);
    
    const yearOneInput = screen.getByLabelText(/Year 1/i);
    fireEvent.change(yearOneInput, { target: { value: '8.0' } });
    
    expect(defaultProps.onGrowthRatesChange).toHaveBeenCalledWith([
      0.08, // Changed from 0.075 to 0.08
      0.07,
      0.065,
      0.06,
      0.055
    ]);
  });

  it('shows pattern description', () => {
    render(<GrowthRateEditor {...defaultProps} />);
    
    expect(screen.getByText(/Decaying from 7\.5% to 5\.5%/i)).toBeInTheDocument();
  });

  it('displays helpful tip for users', () => {
    render(<GrowthRateEditor {...defaultProps} />);
    
    expect(screen.getByText(/💡 Tip: Adjust any rate above to customize/i)).toBeInTheDocument();
  });

  it('applies quick pattern when button is clicked', () => {
    render(<GrowthRateEditor {...defaultProps} />);
    
    const balancedButton = screen.getByText(/Balanced \(7\.5%→5%\)/i);
    fireEvent.click(balancedButton);
    
    expect(defaultProps.onGrowthRatesChange).toHaveBeenCalled();
    // The exact values depend on the generateCustomPattern function
  });

  it('disables inputs when disabled prop is true', () => {
    render(<GrowthRateEditor {...defaultProps} disabled={true} />);
    
    const scenarioSelect = screen.getByLabelText(/Growth Scenario/i);
    const yearOneInput = screen.getByLabelText(/Year 1/i);
    
    expect(scenarioSelect).toBeDisabled();
    expect(yearOneInput).toBeDisabled();
  });
});