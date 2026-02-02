import type { AppState, WhatIfAdjustments, Asset } from '../types';
import { generateId } from '../utils/migration';

// Helper to create default assets
function createDefaultAsset(
  name: string,
  type: Asset['type'],
  balance: number,
  options?: Partial<Omit<Asset, 'id' | 'name' | 'type' | 'balance'>>
): Asset {
  return {
    id: generateId(),
    name,
    type,
    owner: options?.owner ?? 'self',
    balance,
    ...options,
  };
}

export const DEFAULT_STATE: AppState = {
  profile: {
    currentAge: 45,
    targetFIAge: 50,
    lifeExpectancy: 95,
    state: 'CA',
    filingStatus: 'married',
    spouseAge: 43,
  },
  assets: {
    accounts: [
      createDefaultAsset('Taxable Brokerage', 'taxable', 500000, {
        owner: 'joint',
        costBasis: 300000,
      }),
      createDefaultAsset('Traditional 401(k)', 'traditional', 800000, {
        is401k: true,
      }),
      createDefaultAsset('Roth IRA', 'roth', 200000),
      createDefaultAsset('HSA', 'hsa', 50000),
      createDefaultAsset('Cash / Emergency Fund', 'cash', 50000, {
        owner: 'joint',
      }),
    ],
    homeEquity: 400000,
    pension: undefined,
  },
  socialSecurity: {
    include: true,
    monthlyBenefit: 2500,
    startAge: 67,
    colaRate: 0.02,
    spouse: {
      include: true,
      monthlyBenefit: 2000,
      startAge: 67,
    },
  },
  expenses: {
    annualSpending: 80000,
  },
  lifeEvents: [],
  assumptions: {
    investmentReturn: 0.06,
    inflationRate: 0.03,
    traditionalTaxRate: 0.22,
    capitalGainsTaxRate: 0.15,
    rothTaxRate: 0,
    withdrawalOrder: ['taxable', 'traditional', 'roth'],
    safeWithdrawalRate: 0.04,
    penaltySettings: {
      earlyWithdrawalPenaltyRate: 0.10,
      hsaEarlyPenaltyRate: 0.20,
      enableRule55: false,
    },
  },
};

export const DEFAULT_WHAT_IF: WhatIfAdjustments = {
  spendingAdjustment: 0,
  returnAdjustment: 0.06,
  ssStartAge: 67,
};

export const STORAGE_KEY = 'fi-runway-state';

// Account type display names
export const ACCOUNT_TYPE_LABELS: Record<Asset['type'], string> = {
  taxable: 'Taxable',
  traditional: 'Traditional',
  roth: 'Roth',
  hsa: 'HSA',
  cash: 'Cash',
  '529': '529',
  other: 'Other',
};

// Account type colors for visual identification
export const ACCOUNT_TYPE_COLORS: Record<Asset['type'], string> = {
  taxable: '#a78bfa',    // purple
  traditional: '#60a5fa', // blue
  roth: '#34d399',       // green
  hsa: '#fbbf24',        // yellow
  cash: '#94a3b8',       // gray
  '529': '#f472b6',      // pink
  other: '#71717a',      // dark gray
};

// Account owner display names
export const ACCOUNT_OWNER_LABELS: Record<Asset['owner'], string> = {
  self: 'Self',
  spouse: 'Spouse',
  joint: 'Joint',
};

// Penalty-free ages by account type
export const PENALTY_FREE_AGES: Record<Asset['type'], number> = {
  taxable: 0,    // No penalty ever
  cash: 0,       // No penalty ever
  traditional: 59.5,
  roth: 59.5,
  hsa: 65,
  '529': 0,      // No penalty (treated like taxable)
  other: 0,      // No penalty (treated like taxable)
};
