export interface UserProfile {
  currentAge: number;
  targetFIAge: number;
  lifeExpectancy: number;
  state: string;
  filingStatus: 'single' | 'married';
  spouseAge?: number;
}

export interface StateTaxInfo {
  code: string;
  name: string;
  hasIncomeTax: boolean;
  incomeRate: number;      // Effective rate for income/traditional withdrawals
  capitalGainsRate: number; // Rate for capital gains (taxable account withdrawals)
}

export interface Pension {
  annualBenefit: number;
  startAge: number;
}

// v3: Flexible asset types
export type AccountType = 'taxable' | 'traditional' | 'roth' | 'hsa' | 'cash';
export type AccountOwner = 'self' | 'spouse' | 'joint';

export interface Asset {
  id: string;
  name: string;
  type: AccountType;
  owner: AccountOwner;
  balance: number;
  costBasis?: number;          // Taxable accounts only
  is401k?: boolean;            // For Rule of 55 eligibility
  separatedFromService?: boolean; // Rule of 55: left employer at 55+
}

export interface Assets {
  accounts: Asset[];
  homeEquity?: number;
  pension?: Pension;
}

export interface PenaltySettings {
  earlyWithdrawalPenaltyRate: number;  // Default 0.10 (10%)
  hsaEarlyPenaltyRate: number;         // Default 0.20 (20%)
  enableRule55: boolean;                // Optional toggle
}

// Legacy interface for migration
export interface LegacyAssets {
  taxableBrokerage: { balance: number; costBasis: number };
  traditional401k: number;
  traditionalIRA: number;
  roth401k: number;
  rothIRA: number;
  hsa: number;
  cash: number;
  homeEquity?: number;
  pension?: Pension;
}

export interface SpouseSocialSecurity {
  include: boolean;
  monthlyBenefit: number;
  startAge: 62 | 67 | 70;
}

export interface SocialSecurity {
  include: boolean;
  monthlyBenefit: number;
  startAge: 62 | 67 | 70;
  colaRate: number;
  spouse?: SpouseSocialSecurity;
}

export interface Expenses {
  annualSpending: number;
}

export interface LifeEvent {
  id: string;
  name: string;
  year: number;
  amount: number; // positive = expense, negative = income
}

export type WithdrawalSource = 'taxable' | 'traditional' | 'roth';

export interface Assumptions {
  investmentReturn: number;
  inflationRate: number;
  traditionalTaxRate: number;
  capitalGainsTaxRate: number;
  rothTaxRate: number;
  withdrawalOrder: WithdrawalSource[];
  safeWithdrawalRate: number;
  penaltySettings: PenaltySettings;
}

export interface AppState {
  profile: UserProfile;
  assets: Assets;
  socialSecurity: SocialSecurity;
  expenses: Expenses;
  lifeEvents: LifeEvent[];
  assumptions: Assumptions;
}

export interface YearProjection {
  year: number;
  age: number;
  expenses: number;
  income: number;
  gap: number;
  withdrawal: number;
  withdrawalPenalty: number;
  federalTax: number;
  stateTax: number;
  withdrawalSource: string;
  taxableBalance: number;
  traditionalBalance: number;
  rothBalance: number;
  hsaBalance: number;
  cashBalance: number;
  totalNetWorth: number;
  isShortfall: boolean;
}

export interface ProjectionSummary {
  fiNumber: number;
  currentNetWorth: number;
  gap: number;
  runwayAge: number;
  hasShortfall: boolean;
  shortfallAge: number | null;
  bufferYears: number;
}

export interface WhatIfAdjustments {
  spendingAdjustment: number; // -0.2 to +0.2
  fiAgeAdjustment: number; // -5 to +5 years
  returnAdjustment: number; // override investment return
  ssStartAge: 62 | 67 | 70;
  spouseSSStartAge?: 62 | 67 | 70;
}

export interface WizardState {
  currentStep: number;
  maxVisitedStep: number;
}

export type AppAction =
  | { type: 'UPDATE_PROFILE'; payload: Partial<UserProfile> }
  | { type: 'UPDATE_ASSETS'; payload: Partial<Assets> }
  | { type: 'ADD_ASSET'; payload: Asset }
  | { type: 'UPDATE_ASSET'; payload: Asset }
  | { type: 'REMOVE_ASSET'; payload: string }
  | { type: 'UPDATE_SOCIAL_SECURITY'; payload: Partial<SocialSecurity> }
  | { type: 'UPDATE_EXPENSES'; payload: Partial<Expenses> }
  | { type: 'ADD_LIFE_EVENT'; payload: LifeEvent }
  | { type: 'UPDATE_LIFE_EVENT'; payload: LifeEvent }
  | { type: 'REMOVE_LIFE_EVENT'; payload: string }
  | { type: 'UPDATE_ASSUMPTIONS'; payload: Partial<Assumptions> }
  | { type: 'LOAD_STATE'; payload: AppState }
  | { type: 'RESET_STATE' };
