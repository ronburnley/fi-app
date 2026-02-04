import type {
  Asset,
  Assets,
  LegacyAssets,
  AccountType,
  AccountOwner,
  Expenses,
  LegacyExpenses,
  MortgageDetails,
  LegacyMortgage,
  HomeExpense,
  Income,
  EmploymentIncome,
} from '../types';

// Generate a simple UUID
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Check if assets are in legacy format (fixed accounts) vs new format (array)
export function isLegacyAssetFormat(assets: unknown): assets is LegacyAssets {
  if (typeof assets !== 'object' || assets === null) return false;

  const obj = assets as Record<string, unknown>;

  // Legacy format has these fixed keys
  return (
    'taxableBrokerage' in obj &&
    typeof obj.taxableBrokerage === 'object' &&
    obj.taxableBrokerage !== null &&
    'balance' in (obj.taxableBrokerage as object) &&
    !('accounts' in obj)
  );
}

// Check if assets are in new format (array-based)
export function isNewAssetFormat(assets: unknown): assets is Assets {
  if (typeof assets !== 'object' || assets === null) return false;

  const obj = assets as Record<string, unknown>;
  return 'accounts' in obj && Array.isArray(obj.accounts);
}

// Create an asset with standard defaults
function createAsset(
  name: string,
  type: AccountType,
  balance: number,
  options?: {
    owner?: AccountOwner;
    costBasis?: number;
    is401k?: boolean;
  }
): Asset {
  const asset: Asset = {
    id: generateId(),
    name,
    type,
    owner: options?.owner ?? 'self',
    balance,
  };

  if (type === 'taxable' && options?.costBasis !== undefined) {
    asset.costBasis = options.costBasis;
  }

  if ((type === 'traditional' || type === 'roth') && options?.is401k) {
    asset.is401k = true;
  }

  return asset;
}

// Migrate legacy fixed-account format to new array-based format
export function migrateLegacyAssets(legacy: LegacyAssets): Assets {
  const accounts: Asset[] = [];

  // Taxable brokerage
  if (legacy.taxableBrokerage.balance > 0) {
    accounts.push(
      createAsset('Taxable Brokerage', 'taxable', legacy.taxableBrokerage.balance, {
        costBasis: legacy.taxableBrokerage.costBasis,
      })
    );
  }

  // Traditional 401(k)
  if (legacy.traditional401k > 0) {
    accounts.push(
      createAsset('Traditional 401(k)', 'traditional', legacy.traditional401k, {
        is401k: true,
      })
    );
  }

  // Traditional IRA
  if (legacy.traditionalIRA > 0) {
    accounts.push(createAsset('Traditional IRA', 'traditional', legacy.traditionalIRA));
  }

  // Roth 401(k)
  if (legacy.roth401k > 0) {
    accounts.push(
      createAsset('Roth 401(k)', 'roth', legacy.roth401k, {
        is401k: true,
      })
    );
  }

  // Roth IRA
  if (legacy.rothIRA > 0) {
    accounts.push(createAsset('Roth IRA', 'roth', legacy.rothIRA));
  }

  // HSA
  if (legacy.hsa > 0) {
    accounts.push(createAsset('HSA', 'hsa', legacy.hsa));
  }

  // Cash
  if (legacy.cash > 0) {
    accounts.push(createAsset('Cash / Emergency Fund', 'cash', legacy.cash));
  }

  return {
    accounts,
    homeEquity: legacy.homeEquity,
    pension: legacy.pension,
  };
}

// Check if expenses are in legacy format (single annualSpending)
export function isLegacyExpenseFormat(expenses: unknown): expenses is LegacyExpenses {
  if (typeof expenses !== 'object' || expenses === null) return false;
  const obj = expenses as Record<string, unknown>;
  return (
    'annualSpending' in obj &&
    typeof obj.annualSpending === 'number' &&
    !('categories' in obj)
  );
}

// Migrate legacy single-value expense format to new category-based format
export function migrateLegacyExpenses(legacy: LegacyExpenses, inflationRate: number = 0.03): Expenses {
  // Convert single annual spending to a single "General Living" expense
  // User can then break this down into categories
  return {
    categories: [
      {
        id: generateId(),
        name: 'General Living Expenses',
        annualAmount: legacy.annualSpending,
        inflationRate: inflationRate,
        category: 'living',
      },
    ],
    home: undefined,
  };
}

// Check if mortgage is in legacy format (monthlyPayment + endYear, no homeValue)
export function isLegacyMortgageFormat(mortgage: unknown): mortgage is LegacyMortgage {
  if (typeof mortgage !== 'object' || mortgage === null) return false;
  const obj = mortgage as Record<string, unknown>;
  return (
    'monthlyPayment' in obj &&
    'endYear' in obj &&
    !('homeValue' in obj) &&
    !('loanBalance' in obj)
  );
}

// Migrate legacy mortgage format to new MortgageDetails format
export function migrateLegacyMortgage(legacy: LegacyMortgage): MortgageDetails {
  const currentYear = new Date().getFullYear();

  // Calculate years remaining from endYear
  const yearsRemaining = Math.max(0, legacy.endYear - currentYear);

  // Assume 30-year term and work backwards to find origination year
  // If years remaining is odd, we'll round up to closest common term
  let loanTermYears: 15 | 20 | 30 = 30;
  if (yearsRemaining <= 15) {
    loanTermYears = 15;
  } else if (yearsRemaining <= 20) {
    loanTermYears = 20;
  }

  // Calculate approximate origination year
  const originationYear = currentYear - (loanTermYears - yearsRemaining);

  return {
    // User must enter these values (they're essential for calculations)
    homeValue: 0,
    loanBalance: 0,
    interestRate: 0.065, // Sensible default

    // Derived/assumed values
    loanTermYears,
    originationYear,

    // Preserve the user's payment as a manual override
    monthlyPayment: legacy.monthlyPayment,
    manualPaymentOverride: true,

    earlyPayoff: undefined,
  };
}

// Check if home expense needs mortgage migration
export function needsMortgageMigration(home: unknown): boolean {
  if (typeof home !== 'object' || home === null) return false;
  const obj = home as Record<string, unknown>;
  return 'mortgage' in obj && obj.mortgage !== null && isLegacyMortgageFormat(obj.mortgage);
}

// Migrate home expense with legacy mortgage to new format
export function migrateHomeExpense(home: HomeExpense & { mortgage?: LegacyMortgage | MortgageDetails }): HomeExpense {
  if (!home.mortgage || !isLegacyMortgageFormat(home.mortgage)) {
    return home as HomeExpense;
  }

  return {
    ...home,
    mortgage: migrateLegacyMortgage(home.mortgage as LegacyMortgage),
  };
}

// Check if employment income needs contribution linking
export function needsEmploymentContributionMigration(employment: EmploymentIncome | undefined): boolean {
  if (!employment) return false;
  // Needs migration if has contributions but no link and no type set
  return (
    employment.annualContributions > 0 &&
    !employment.contributionAccountId &&
    !employment.contributionType
  );
}

// Find the best matching account for employment contributions
function findBestContributionAccount(
  accounts: Asset[],
  owner: AccountOwner
): string | undefined {
  // Filter accounts by owner
  const ownerAccounts = accounts.filter(
    (a) => a.owner === owner || a.owner === 'joint'
  );

  // Priority: traditional 401k > traditional IRA > roth 401k > roth IRA > any retirement
  const traditional401k = ownerAccounts.find(
    (a) => a.type === 'traditional' && a.is401k
  );
  if (traditional401k) return traditional401k.id;

  const traditional = ownerAccounts.find((a) => a.type === 'traditional');
  if (traditional) return traditional.id;

  const roth401k = ownerAccounts.find((a) => a.type === 'roth' && a.is401k);
  if (roth401k) return roth401k.id;

  const roth = ownerAccounts.find((a) => a.type === 'roth');
  if (roth) return roth.id;

  const hsa = ownerAccounts.find((a) => a.type === 'hsa');
  if (hsa) return hsa.id;

  return undefined;
}

// Migrate employment income to link contributions to accounts
export function migrateEmploymentContributions(
  income: Income,
  accounts: Asset[]
): Income {
  let updatedEmployment = income.employment;
  let updatedSpouseEmployment = income.spouseEmployment;

  // Migrate self employment
  if (needsEmploymentContributionMigration(income.employment)) {
    const bestAccount = findBestContributionAccount(accounts, 'self');
    if (bestAccount) {
      updatedEmployment = {
        ...income.employment!,
        contributionAccountId: bestAccount,
      };
    } else {
      // No matching account found, set type for auto-creation
      updatedEmployment = {
        ...income.employment!,
        contributionType: 'traditional',
      };
    }
  }

  // Migrate spouse employment
  if (needsEmploymentContributionMigration(income.spouseEmployment)) {
    const bestAccount = findBestContributionAccount(accounts, 'spouse');
    if (bestAccount) {
      updatedSpouseEmployment = {
        ...income.spouseEmployment!,
        contributionAccountId: bestAccount,
      };
    } else {
      // No matching account found, set type for auto-creation
      updatedSpouseEmployment = {
        ...income.spouseEmployment!,
        contributionType: 'traditional',
      };
    }
  }

  return {
    ...income,
    employment: updatedEmployment,
    spouseEmployment: updatedSpouseEmployment,
  };
}

// Export generateId for use in creating new assets
export { generateId };
