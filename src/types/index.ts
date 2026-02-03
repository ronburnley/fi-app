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
  colaRate?: number;  // Optional COLA rate, stored as decimal (0.02 = 2%)
}

// v3: Flexible asset types
export type AccountType = 'taxable' | 'traditional' | 'roth' | 'hsa' | 'cash' | '529' | 'other';
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

// Expense categories for visual grouping
export type ExpenseCategory = 'housing' | 'living' | 'healthcare' | 'discretionary' | 'other';

export interface Expense {
  id: string;
  name: string;
  annualAmount: number;
  startYear?: number;      // undefined = current year
  endYear?: number;        // undefined = perpetual (through life expectancy)
  inflationRate: number;   // per-expense inflation (decimal, e.g., 0.03 = 3%)
  category: ExpenseCategory;
}

export interface MortgageDetails {
  // Core inputs
  homeValue: number;              // Current market value
  loanBalance: number;            // Outstanding principal
  interestRate: number;           // Annual rate as decimal (0.065 = 6.5%)
  loanTermYears: 15 | 20 | 30;    // Original term
  originationYear: number;        // When loan started (to calculate years elapsed)

  // Calculated (with manual override option)
  monthlyPayment: number;         // P&I - auto-calculated but editable
  manualPaymentOverride: boolean; // If true, user's custom payment preserved

  // Early payoff
  earlyPayoff?: {
    enabled: boolean;
    payoffYear: number;           // Year to pay off mortgage
  };
}

// Legacy mortgage format for migration
export interface LegacyMortgage {
  monthlyPayment: number;
  endYear: number;
}

export interface HomeExpense {
  mortgage?: MortgageDetails;
  propertyTax: number;         // Annual amount
  insurance: number;           // Annual homeowners insurance
  inflationRate: number;       // For taxes/insurance only (default 0.03)
}

export interface Expenses {
  categories: Expense[];       // Array of expense categories
  home?: HomeExpense;          // Special housing expense structure
}

// Legacy interface for migration
export interface LegacyExpenses {
  annualSpending: number;
}

export interface LifeEvent {
  id: string;
  name: string;
  year: number;
  amount: number; // positive = expense, negative = income
}

// ==================== Income Modeling ====================

// Employment income during working years
export interface EmploymentIncome {
  annualGrossIncome: number;      // Pre-tax salary
  annualContributions: number;    // Total 401k/IRA/HSA contributions
  endAge: number;                 // Age when employment ends (retirement age)
  effectiveTaxRate: number;       // Combined fed+state (decimal, e.g., 0.25)
}

// Retirement income streams beyond SS/pension (consulting, rentals, etc.)
export interface RetirementIncome {
  id: string;
  name: string;                   // "Consulting", "Rental income"
  annualAmount: number;
  startAge: number;
  endAge?: number;                // undefined = perpetual
  inflationAdjusted: boolean;
  taxable: boolean;
}

// Financial phase indicator for each projection year
export type FinancialPhase = 'working' | 'gap' | 'fi';

// Combined income section
export interface Income {
  employment?: EmploymentIncome;
  spouseEmployment?: EmploymentIncome;
  retirementIncomes: RetirementIncome[];
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
  income: Income;
  socialSecurity: SocialSecurity;
  expenses: Expenses;
  lifeEvents: LifeEvent[];
  assumptions: Assumptions;
}

export interface YearProjection {
  year: number;
  age: number;
  phase: FinancialPhase;          // 'working' | 'gap' | 'fi'
  expenses: number;
  income: number;                 // SS + pension + retirement income streams
  employmentIncome: number;       // Net after-tax employment income
  contributions: number;          // Added to retirement accounts
  retirementIncome: number;       // Non-SS/pension retirement streams
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
  mortgageBalance?: number;      // Remaining mortgage balance (if applicable)
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
  returnAdjustment: number; // override investment return
  ssStartAge: 62 | 67 | 70;
  spouseSSStartAge?: 62 | 67 | 70;
}

export interface WizardState {
  currentStep: number;
  maxVisitedStep: number;
}

export interface AchievableFIResult {
  achievableFIAge: number | null;  // null if never achievable
  confidenceLevel: 'high' | 'moderate' | 'tight' | 'not_achievable';
  bufferYears: number;
  yearsUntilFI: number | null;
  fiAtCurrentAge: boolean;
}

export type AppAction =
  | { type: 'UPDATE_PROFILE'; payload: Partial<UserProfile> }
  | { type: 'UPDATE_ASSETS'; payload: Partial<Assets> }
  | { type: 'ADD_ASSET'; payload: Asset }
  | { type: 'UPDATE_ASSET'; payload: Asset }
  | { type: 'REMOVE_ASSET'; payload: string }
  | { type: 'UPDATE_INCOME'; payload: Partial<Income> }
  | { type: 'UPDATE_EMPLOYMENT'; payload: EmploymentIncome | undefined }
  | { type: 'UPDATE_SPOUSE_EMPLOYMENT'; payload: EmploymentIncome | undefined }
  | { type: 'ADD_RETIREMENT_INCOME'; payload: RetirementIncome }
  | { type: 'UPDATE_RETIREMENT_INCOME'; payload: RetirementIncome }
  | { type: 'REMOVE_RETIREMENT_INCOME'; payload: string }
  | { type: 'UPDATE_SOCIAL_SECURITY'; payload: Partial<SocialSecurity> }
  | { type: 'UPDATE_EXPENSES'; payload: Partial<Expenses> }
  | { type: 'ADD_EXPENSE'; payload: Expense }
  | { type: 'UPDATE_EXPENSE'; payload: Expense }
  | { type: 'REMOVE_EXPENSE'; payload: string }
  | { type: 'UPDATE_HOME_EXPENSE'; payload: HomeExpense | undefined }
  | { type: 'ADD_LIFE_EVENT'; payload: LifeEvent }
  | { type: 'UPDATE_LIFE_EVENT'; payload: LifeEvent }
  | { type: 'REMOVE_LIFE_EVENT'; payload: string }
  | { type: 'UPDATE_ASSUMPTIONS'; payload: Partial<Assumptions> }
  | { type: 'LOAD_STATE'; payload: AppState }
  | { type: 'RESET_STATE' };
