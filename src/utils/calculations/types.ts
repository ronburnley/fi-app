import type { Asset } from '../../types';

export interface AccountBalances {
  taxable: number;
  taxableCostBasis: number;
  traditional: number;
  roth: number;
  hsa: number;
  cash: number;
}

export interface AssetWithBalance extends Asset {
  currentBalance: number;
  currentCostBasis?: number;
}

export interface WithdrawalResult {
  amount: number;
  penalty: number;
  federalTax: number;
  stateTax: number;
  source: string;
  balances: AccountBalances;
  assetBalances: Map<string, { balance: number; costBasis?: number }>; // Track individual asset balances
}

export interface EmploymentIncomeResult {
  grossIncome: number;
  netIncome: number;
  tax: number;
  contributions: number;        // Total contributions (self + spouse)
  selfContributions: number;    // Self contributions only
  spouseContributions: number;  // Spouse contributions only
}

export interface YearExpenseResult {
  totalExpenses: number;
  mortgageBalance: number | undefined;
  mortgagePayoffAmount: number | undefined; // Amount needed for early payoff this year
}
