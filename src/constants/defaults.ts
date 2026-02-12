import type { AppState, WhatIfAdjustments, Asset, ExpenseCategory, Income } from '../types';

// Expense category display names
export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  housing: 'Housing',
  living: 'Living',
  healthcare: 'Healthcare',
  discretionary: 'Discretionary',
  other: 'Other',
};

// Expense category colors for visual identification
export const EXPENSE_CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  housing: '#60a5fa',      // blue-400
  living: '#34d399',       // emerald-400
  healthcare: '#f472b6',   // pink-400
  discretionary: '#fbbf24', // amber-400
  other: '#a1a1aa',        // zinc-400
};

// Default income state (empty - user optionally adds employment/retirement income)
export const DEFAULT_INCOME: Income = {
  employment: undefined,
  spouseEmployment: undefined,
  retirementIncomes: [],
};

export const DEFAULT_STATE: AppState = {
  profile: {
    currentAge: 0,
    targetFIAge: 0,
    lifeExpectancy: 95,
    state: 'CA',
    filingStatus: 'single',
  },
  assets: {
    accounts: [],
    homeEquity: undefined,
    pension: undefined,
  },
  income: DEFAULT_INCOME,
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
    categories: [],
    home: undefined,
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
    terminalBalanceTarget: 0,
    accumulationSurplusHandling: 'ignore',
    accumulationSurplusAccountType: 'taxable',
    fiPhaseReturn: 0.03,
  },
};

export const DEFAULT_WHAT_IF: WhatIfAdjustments = {
  spendingAdjustment: 0,
  ssStartAge: 67,
};

export const STORAGE_KEY = 'fi-runway-state';
export const GUEST_MODE_KEY = 'fi-runway-guest-mode';

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
