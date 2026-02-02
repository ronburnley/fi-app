import type { StateTaxInfo } from '../types';

// State tax data for all 50 states + DC
// Rates are simplified effective rates for retirement withdrawal planning
// No income tax states: AK, FL, NV, NH, SD, TN, TX, WA, WY
// Note: NH taxes only interest/dividends (not wages), treated as no general income tax

export const STATE_TAX_DATA: StateTaxInfo[] = [
  // No income tax states
  { code: 'AK', name: 'Alaska', hasIncomeTax: false, incomeRate: 0, capitalGainsRate: 0 },
  { code: 'FL', name: 'Florida', hasIncomeTax: false, incomeRate: 0, capitalGainsRate: 0 },
  { code: 'NV', name: 'Nevada', hasIncomeTax: false, incomeRate: 0, capitalGainsRate: 0 },
  { code: 'NH', name: 'New Hampshire', hasIncomeTax: false, incomeRate: 0, capitalGainsRate: 0 },
  { code: 'SD', name: 'South Dakota', hasIncomeTax: false, incomeRate: 0, capitalGainsRate: 0 },
  { code: 'TN', name: 'Tennessee', hasIncomeTax: false, incomeRate: 0, capitalGainsRate: 0 },
  { code: 'TX', name: 'Texas', hasIncomeTax: false, incomeRate: 0, capitalGainsRate: 0 },
  { code: 'WA', name: 'Washington', hasIncomeTax: false, incomeRate: 0, capitalGainsRate: 0.07 }, // WA has 7% cap gains tax
  { code: 'WY', name: 'Wyoming', hasIncomeTax: false, incomeRate: 0, capitalGainsRate: 0 },

  // Flat tax states (exact rates)
  { code: 'AZ', name: 'Arizona', hasIncomeTax: true, incomeRate: 0.025, capitalGainsRate: 0.025 },
  { code: 'CO', name: 'Colorado', hasIncomeTax: true, incomeRate: 0.044, capitalGainsRate: 0.044 },
  { code: 'ID', name: 'Idaho', hasIncomeTax: true, incomeRate: 0.058, capitalGainsRate: 0.058 },
  { code: 'IL', name: 'Illinois', hasIncomeTax: true, incomeRate: 0.0495, capitalGainsRate: 0.0495 },
  { code: 'IN', name: 'Indiana', hasIncomeTax: true, incomeRate: 0.0305, capitalGainsRate: 0.0305 },
  { code: 'KY', name: 'Kentucky', hasIncomeTax: true, incomeRate: 0.04, capitalGainsRate: 0.04 },
  { code: 'MA', name: 'Massachusetts', hasIncomeTax: true, incomeRate: 0.05, capitalGainsRate: 0.09 }, // MA has 9% short-term cap gains
  { code: 'MI', name: 'Michigan', hasIncomeTax: true, incomeRate: 0.0425, capitalGainsRate: 0.0425 },
  { code: 'NC', name: 'North Carolina', hasIncomeTax: true, incomeRate: 0.0475, capitalGainsRate: 0.0475 },
  { code: 'ND', name: 'North Dakota', hasIncomeTax: true, incomeRate: 0.0195, capitalGainsRate: 0.0195 },
  { code: 'PA', name: 'Pennsylvania', hasIncomeTax: true, incomeRate: 0.0307, capitalGainsRate: 0.0307 },
  { code: 'UT', name: 'Utah', hasIncomeTax: true, incomeRate: 0.0465, capitalGainsRate: 0.0465 },

  // Progressive tax states (simplified effective rates for ~$80-150k income range)
  { code: 'AL', name: 'Alabama', hasIncomeTax: true, incomeRate: 0.05, capitalGainsRate: 0.05 },
  { code: 'AR', name: 'Arkansas', hasIncomeTax: true, incomeRate: 0.044, capitalGainsRate: 0.044 },
  { code: 'CA', name: 'California', hasIncomeTax: true, incomeRate: 0.093, capitalGainsRate: 0.093 },
  { code: 'CT', name: 'Connecticut', hasIncomeTax: true, incomeRate: 0.055, capitalGainsRate: 0.07 },
  { code: 'DE', name: 'Delaware', hasIncomeTax: true, incomeRate: 0.066, capitalGainsRate: 0.066 },
  { code: 'DC', name: 'District of Columbia', hasIncomeTax: true, incomeRate: 0.085, capitalGainsRate: 0.085 },
  { code: 'GA', name: 'Georgia', hasIncomeTax: true, incomeRate: 0.0549, capitalGainsRate: 0.0549 },
  { code: 'HI', name: 'Hawaii', hasIncomeTax: true, incomeRate: 0.0825, capitalGainsRate: 0.075 },
  { code: 'IA', name: 'Iowa', hasIncomeTax: true, incomeRate: 0.057, capitalGainsRate: 0.057 },
  { code: 'KS', name: 'Kansas', hasIncomeTax: true, incomeRate: 0.057, capitalGainsRate: 0.057 },
  { code: 'LA', name: 'Louisiana', hasIncomeTax: true, incomeRate: 0.0425, capitalGainsRate: 0.0425 },
  { code: 'ME', name: 'Maine', hasIncomeTax: true, incomeRate: 0.0715, capitalGainsRate: 0.0715 },
  { code: 'MD', name: 'Maryland', hasIncomeTax: true, incomeRate: 0.0575, capitalGainsRate: 0.0575 },
  { code: 'MN', name: 'Minnesota', hasIncomeTax: true, incomeRate: 0.0785, capitalGainsRate: 0.0785 },
  { code: 'MS', name: 'Mississippi', hasIncomeTax: true, incomeRate: 0.05, capitalGainsRate: 0.05 },
  { code: 'MO', name: 'Missouri', hasIncomeTax: true, incomeRate: 0.048, capitalGainsRate: 0.048 },
  { code: 'MT', name: 'Montana', hasIncomeTax: true, incomeRate: 0.059, capitalGainsRate: 0.046 }, // MT has preferential cap gains
  { code: 'NE', name: 'Nebraska', hasIncomeTax: true, incomeRate: 0.0584, capitalGainsRate: 0.0584 },
  { code: 'NJ', name: 'New Jersey', hasIncomeTax: true, incomeRate: 0.0637, capitalGainsRate: 0.0637 },
  { code: 'NM', name: 'New Mexico', hasIncomeTax: true, incomeRate: 0.049, capitalGainsRate: 0.049 },
  { code: 'NY', name: 'New York', hasIncomeTax: true, incomeRate: 0.0685, capitalGainsRate: 0.0685 },
  { code: 'OH', name: 'Ohio', hasIncomeTax: true, incomeRate: 0.035, capitalGainsRate: 0.035 },
  { code: 'OK', name: 'Oklahoma', hasIncomeTax: true, incomeRate: 0.0475, capitalGainsRate: 0.0475 },
  { code: 'OR', name: 'Oregon', hasIncomeTax: true, incomeRate: 0.09, capitalGainsRate: 0.09 },
  { code: 'RI', name: 'Rhode Island', hasIncomeTax: true, incomeRate: 0.0599, capitalGainsRate: 0.0599 },
  { code: 'SC', name: 'South Carolina', hasIncomeTax: true, incomeRate: 0.064, capitalGainsRate: 0.064 },
  { code: 'VT', name: 'Vermont', hasIncomeTax: true, incomeRate: 0.0675, capitalGainsRate: 0.0675 },
  { code: 'VA', name: 'Virginia', hasIncomeTax: true, incomeRate: 0.0575, capitalGainsRate: 0.0575 },
  { code: 'WV', name: 'West Virginia', hasIncomeTax: true, incomeRate: 0.055, capitalGainsRate: 0.055 },
  { code: 'WI', name: 'Wisconsin', hasIncomeTax: true, incomeRate: 0.0627, capitalGainsRate: 0.0627 },
];

// Sort by name for dropdown
const sortedStates = [...STATE_TAX_DATA].sort((a, b) => a.name.localeCompare(b.name));

// Get options for dropdown (value = code, label = name with rate indicator)
export function getStateOptions(): { value: string; label: string }[] {
  return sortedStates.map((state) => ({
    value: state.code,
    label: state.name,
  }));
}

// Get tax info for a state code
export function getStateTaxInfo(code: string): StateTaxInfo {
  const state = STATE_TAX_DATA.find((s) => s.code === code);
  if (!state) {
    // Default to California if unknown
    return STATE_TAX_DATA.find((s) => s.code === 'CA')!;
  }
  return state;
}

// Format state tax rate as percentage string
export function formatStateTaxHint(code: string): string {
  const state = getStateTaxInfo(code);
  if (!state.hasIncomeTax && state.capitalGainsRate === 0) {
    return 'No state income tax';
  }
  if (!state.hasIncomeTax && state.capitalGainsRate > 0) {
    return `No income tax, ${(state.capitalGainsRate * 100).toFixed(1)}% capital gains`;
  }
  if (state.incomeRate === state.capitalGainsRate) {
    return `${(state.incomeRate * 100).toFixed(1)}% state tax rate`;
  }
  return `${(state.incomeRate * 100).toFixed(1)}% income / ${(state.capitalGainsRate * 100).toFixed(1)}% cap gains`;
}
