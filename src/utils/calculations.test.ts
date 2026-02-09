import { describe, it, expect } from 'vitest';
import {
  calculateProjection,
  calculateSummary,
  calculateAchievableFIAge,
  calculateMonthlyPayment,
  calculateRemainingBalance,
  calculateHomeEquity,
  calculateMortgageBalanceForYear,
  getSSAdjustmentFactor,
  getAdjustedSSBenefit,
} from './calculations';
import type { AppState } from '../types';

// Helper to create a minimal valid state for testing
function createTestState(overrides: Partial<AppState> = {}): AppState {
  return {
    profile: {
      currentAge: 45,
      targetFIAge: 55,
      lifeExpectancy: 95,
      state: 'CA',
      filingStatus: 'married',
      spouseAge: 43,
      ...overrides.profile,
    },
    assets: {
      accounts: [
        {
          id: 'taxable-1',
          name: 'Taxable Brokerage',
          type: 'taxable',
          owner: 'joint',
          balance: 500000,
          costBasis: 300000,
        },
        {
          id: 'trad-1',
          name: 'Traditional 401(k)',
          type: 'traditional',
          owner: 'self',
          balance: 800000,
          is401k: true,
        },
        {
          id: 'roth-1',
          name: 'Roth IRA',
          type: 'roth',
          owner: 'self',
          balance: 200000,
        },
      ],
      homeEquity: 400000,
      pension: undefined,
      ...overrides.assets,
    },
    income: {
      employment: undefined,
      spouseEmployment: undefined,
      retirementIncomes: [],
      ...overrides.income,
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
      ...overrides.socialSecurity,
    },
    expenses: {
      categories: [
        {
          id: 'exp-1',
          name: 'Living Expenses',
          annualAmount: 80000,
          category: 'living',
        },
      ],
      home: undefined,
      ...overrides.expenses,
    },
    lifeEvents: overrides.lifeEvents ?? [],
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
      ...overrides.assumptions,
    },
  };
}

// ==================== Mortgage Calculations ====================

describe('Mortgage Calculations', () => {
  describe('calculateMonthlyPayment', () => {
    it('calculates correct P&I for standard 30-year mortgage', () => {
      // $400,000 loan at 6.5% for 30 years
      const payment = calculateMonthlyPayment(400000, 0.065, 30);
      // Expected: ~$2,528/month
      expect(payment).toBeCloseTo(2528.27, 0);
    });

    it('calculates correct P&I for 15-year mortgage', () => {
      // $400,000 loan at 6% for 15 years
      const payment = calculateMonthlyPayment(400000, 0.06, 15);
      // Expected: ~$3,375/month
      expect(payment).toBeCloseTo(3375.43, 0);
    });

    it('returns 0 for invalid inputs', () => {
      expect(calculateMonthlyPayment(0, 0.065, 30)).toBe(0);
      expect(calculateMonthlyPayment(400000, 0, 30)).toBe(0);
      expect(calculateMonthlyPayment(400000, 0.065, 0)).toBe(0);
    });
  });

  describe('calculateRemainingBalance', () => {
    it('calculates remaining balance after 5 years', () => {
      // $400,000 loan at 6.5% for 30 years, 5 years elapsed
      const balance = calculateRemainingBalance(400000, 0.065, 30, 5);
      // After 5 years, balance should be ~$374,444 (verified with amortization calculator)
      expect(balance).toBeCloseTo(374444, -2); // Within $100
    });

    it('returns 0 after full term', () => {
      const balance = calculateRemainingBalance(400000, 0.065, 30, 30);
      expect(balance).toBe(0);
    });

    it('handles zero interest rate', () => {
      const balance = calculateRemainingBalance(300000, 0, 30, 15);
      // Linear reduction: 50% paid off
      expect(balance).toBe(150000);
    });
  });

  describe('calculateHomeEquity', () => {
    it('calculates equity correctly', () => {
      expect(calculateHomeEquity(650000, 400000)).toBe(250000);
    });

    it('returns 0 for underwater mortgage', () => {
      expect(calculateHomeEquity(300000, 400000)).toBe(0);
    });
  });

  describe('calculateMortgageBalanceForYear', () => {
    const mortgage = {
      homeValue: 650000,
      loanBalance: 400000,
      interestRate: 0.065,
      loanTermYears: 30 as const,
      originationYear: 2020,
      monthlyPayment: 2528,
      manualPaymentOverride: false,
    };

    it('calculates balance for year in middle of loan', () => {
      const balance = calculateMortgageBalanceForYear(mortgage, 2025);
      expect(balance).toBeGreaterThan(350000);
      expect(balance).toBeLessThan(400000);
    });

    it('returns 0 after loan term', () => {
      const balance = calculateMortgageBalanceForYear(mortgage, 2051);
      expect(balance).toBe(0);
    });

    it('handles early payoff', () => {
      const mortgageWithPayoff = {
        ...mortgage,
        earlyPayoff: { enabled: true, payoffYear: 2030 },
      };
      // Payoff year itself returns the remaining balance (needed for lump-sum expense)
      const payoffYearBalance = calculateMortgageBalanceForYear(mortgageWithPayoff, 2030);
      expect(payoffYearBalance).toBeGreaterThan(0);
      // Year after payoff returns 0
      expect(calculateMortgageBalanceForYear(mortgageWithPayoff, 2031)).toBe(0);
    });
  });
});

// ==================== Employment Income ====================

describe('Employment Income Calculations', () => {
  it('calculates correct net income for single person', () => {
    const state = createTestState({
      profile: { currentAge: 45, targetFIAge: 55, lifeExpectancy: 95, state: 'CA', filingStatus: 'single' },
      income: {
        employment: {
          annualGrossIncome: 150000,
          effectiveTaxRate: 0.25,
        },
        retirementIncomes: [],
      },
    });

    const projections = calculateProjection(state);
    const year1 = projections[0];

    // Net = Gross - Tax
    // Net = 150000 - 37500 = 112500
    expect(year1.employmentIncome).toBe(112500);
    expect(year1.phase).toBe('accumulating');
  });

  it('calculates correct net income for married couple', () => {
    const state = createTestState({
      income: {
        employment: {
          annualGrossIncome: 150000,
          effectiveTaxRate: 0.25,
        },
        spouseEmployment: {
          annualGrossIncome: 100000,
          effectiveTaxRate: 0.22,
        },
        retirementIncomes: [],
      },
    });

    const projections = calculateProjection(state);
    const year1 = projections[0];

    // Self: Net = 150000 - 37500 = 112500
    // Spouse: Net = 100000 - 22000 = 78000
    // Combined Net = 190500
    expect(year1.employmentIncome).toBe(190500);
  });

  it('stops employment income at FI age', () => {
    const state = createTestState({
      profile: { currentAge: 50, targetFIAge: 55, lifeExpectancy: 95, state: 'CA', filingStatus: 'single' },
      income: {
        employment: {
          annualGrossIncome: 150000,
          effectiveTaxRate: 0.25,
        },
        retirementIncomes: [],
      },
    });

    const projections = calculateProjection(state);

    // Age 50-54: Still accumulating, employment active
    // Net = 150000 - 37500 = 112500
    expect(projections[0].employmentIncome).toBe(112500);
    expect(projections[0].phase).toBe('accumulating');
    expect(projections[4].employmentIncome).toBe(112500);

    // Age 55: FI — no employment
    expect(projections[5].employmentIncome).toBe(0);
    expect(projections[5].phase).toBe('fi');
  });

  it('supports spouse additional work years', () => {
    const state = createTestState({
      profile: { currentAge: 45, targetFIAge: 50, lifeExpectancy: 70, state: 'TX', filingStatus: 'married', spouseAge: 43 },
      income: {
        employment: {
          annualGrossIncome: 150000,
          effectiveTaxRate: 0.25,
        },
        spouseEmployment: {
          annualGrossIncome: 100000,
          effectiveTaxRate: 0.22,
        },
        spouseAdditionalWorkYears: 3,
        retirementIncomes: [],
      },
      expenses: {
        categories: [{ id: 'exp-1', name: 'Living', annualAmount: 80000, inflationAdjusted: false, category: 'living' }],
      },
      socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67, colaRate: 0 },
    });

    const projections = calculateProjection(state);

    // Age 49 (before FI): Both working
    expect(projections[4].employmentIncome).toBeGreaterThan(0);

    // Age 50 (FI): Primary stops, spouse still works (FI + 0 < 50 + 3 = 53)
    // Self employment = 0, spouse still contributes
    const fiYearProjection = projections[5]; // age 50
    // Spouse should still have income at age 50 (primary's FI age)
    // because spouseAdditionalWorkYears = 3, so spouse works until primary age 53
    expect(fiYearProjection.employmentIncome).toBeGreaterThan(0);

    // Age 53 (FI + 3): Spouse also stops
    const spouseStopProjection = projections[8]; // age 53
    expect(spouseStopProjection.employmentIncome).toBe(0);
  });
});

// ==================== Phase Determination ====================

describe('Phase Determination', () => {
  it('correctly identifies accumulating phase before FI age', () => {
    const state = createTestState({
      profile: { currentAge: 45, targetFIAge: 60, lifeExpectancy: 95, state: 'CA', filingStatus: 'single' },
      income: {
        employment: {
          annualGrossIncome: 100000,
          effectiveTaxRate: 0.25,
        },
        retirementIncomes: [],
      },
    });

    const projections = calculateProjection(state);

    // Ages 45-59: Accumulating (before FI age)
    for (let i = 0; i <= 14; i++) {
      expect(projections[i].phase).toBe('accumulating');
    }
  });

  it('correctly identifies FI phase at and after FI age', () => {
    const state = createTestState({
      profile: { currentAge: 45, targetFIAge: 60, lifeExpectancy: 95, state: 'CA', filingStatus: 'single' },
      income: {
        employment: {
          annualGrossIncome: 100000,
          effectiveTaxRate: 0.25,
        },
        retirementIncomes: [],
      },
    });

    const projections = calculateProjection(state);

    // Age 60+: FI
    for (let i = 15; i < projections.length; i++) {
      expect(projections[i].phase).toBe('fi');
    }
  });

  it('has no gap phase — only accumulating and fi', () => {
    const state = createTestState({
      profile: { currentAge: 45, targetFIAge: 55, lifeExpectancy: 70, state: 'TX', filingStatus: 'single' },
      income: {
        employment: {
          annualGrossIncome: 100000,
          effectiveTaxRate: 0.25,
        },
        retirementIncomes: [],
      },
    });

    const projections = calculateProjection(state);
    const phases = new Set(projections.map((p) => p.phase));

    expect(phases.has('accumulating')).toBe(true);
    expect(phases.has('fi')).toBe(true);
    expect(phases.size).toBe(2);
  });
});

// ==================== Social Security COLA ====================

describe('Social Security COLA', () => {
  it('applies COLA correctly from start age', () => {
    const state = createTestState({
      profile: { currentAge: 67, targetFIAge: 67, lifeExpectancy: 80, state: 'TX', filingStatus: 'single' },
      socialSecurity: {
        include: true,
        monthlyBenefit: 2500,
        startAge: 67,
        colaRate: 0.02,
      },
      expenses: {
        categories: [{ id: 'exp-1', name: 'Living', annualAmount: 40000, inflationAdjusted: false, category: 'living' }],
      },
    });

    const projections = calculateProjection(state);

    // Year 0 (age 67): Base SS = 2500 * 12 = 30000
    expect(projections[0].income).toBeCloseTo(30000, 0);

    // Year 3 (age 70): SS = 30000 * (1.02)^3 = 31836
    expect(projections[3].income).toBeCloseTo(31836, 0);

    // Year 10 (age 77): SS = 30000 * (1.02)^10 = 36570
    expect(projections[10].income).toBeCloseTo(36570, -1);
  });

  it('combines self and spouse SS with independent timing', () => {
    const state = createTestState({
      profile: { currentAge: 65, targetFIAge: 65, lifeExpectancy: 75, state: 'TX', filingStatus: 'married', spouseAge: 67 },
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
        categories: [{ id: 'exp-1', name: 'Living', annualAmount: 40000, inflationAdjusted: false, category: 'living' }],
      },
    });

    const projections = calculateProjection(state);

    // Age 65 (spouse 67): Only spouse SS = 2000 * 12 = 24000
    expect(projections[0].income).toBeCloseTo(24000, 0);

    // Age 67 (spouse 69): Both collecting
    // Self: 2500 * 12 = 30000 (year 0)
    // Spouse: 2000 * 12 * 1.02^2 = 24970 (2 years of COLA)
    expect(projections[2].income).toBeCloseTo(30000 + 24970, -1);
  });
});

// ==================== Social Security FRA Adjustment ====================

describe('Social Security FRA Adjustment', () => {
  describe('getSSAdjustmentFactor', () => {
    it('returns 0.70 for age 62', () => {
      expect(getSSAdjustmentFactor(62)).toBe(0.70);
    });

    it('returns 1.00 for age 67', () => {
      expect(getSSAdjustmentFactor(67)).toBe(1.00);
    });

    it('returns 1.24 for age 70', () => {
      expect(getSSAdjustmentFactor(70)).toBe(1.24);
    });
  });

  describe('getAdjustedSSBenefit', () => {
    it('reduces $2,500 FRA benefit to $1,750 at age 62', () => {
      expect(getAdjustedSSBenefit(2500, 62)).toBe(1750);
    });

    it('keeps $2,500 FRA benefit unchanged at age 67', () => {
      expect(getAdjustedSSBenefit(2500, 67)).toBe(2500);
    });

    it('increases $2,500 FRA benefit to $3,100 at age 70', () => {
      expect(getAdjustedSSBenefit(2500, 70)).toBe(3100);
    });
  });

  describe('projection integration', () => {
    it('uses adjusted benefit at age 62 in projections', () => {
      const state = createTestState({
        profile: { currentAge: 62, targetFIAge: 62, lifeExpectancy: 70, state: 'TX', filingStatus: 'single' },
        socialSecurity: {
          include: true,
          monthlyBenefit: 2500, // FRA benefit
          startAge: 62,
          colaRate: 0,
        },
        expenses: {
          categories: [{ id: 'exp-1', name: 'Living', annualAmount: 20000, inflationAdjusted: false, category: 'living' }],
        },
      });

      const projections = calculateProjection(state);

      // Adjusted: 2500 * 0.70 = 1750/mo = 21000/yr
      expect(projections[0].income).toBeCloseTo(21000, 0);
    });

    it('uses adjusted benefit at age 70 in projections', () => {
      const state = createTestState({
        profile: { currentAge: 70, targetFIAge: 70, lifeExpectancy: 75, state: 'TX', filingStatus: 'single' },
        socialSecurity: {
          include: true,
          monthlyBenefit: 2500, // FRA benefit
          startAge: 70,
          colaRate: 0,
        },
        expenses: {
          categories: [{ id: 'exp-1', name: 'Living', annualAmount: 30000, inflationAdjusted: false, category: 'living' }],
        },
      });

      const projections = calculateProjection(state);

      // Adjusted: 2500 * 1.24 = 3100/mo = 37200/yr
      expect(projections[0].income).toBeCloseTo(37200, 0);
    });

    it('applies COLA on adjusted (not FRA) benefit', () => {
      const state = createTestState({
        profile: { currentAge: 62, targetFIAge: 62, lifeExpectancy: 70, state: 'TX', filingStatus: 'single' },
        socialSecurity: {
          include: true,
          monthlyBenefit: 2500, // FRA benefit
          startAge: 62,
          colaRate: 0.02,
        },
        expenses: {
          categories: [{ id: 'exp-1', name: 'Living', annualAmount: 20000, inflationAdjusted: false, category: 'living' }],
        },
      });

      const projections = calculateProjection(state);

      // Year 0: Adjusted = 1750/mo = 21000/yr (no COLA yet)
      expect(projections[0].income).toBeCloseTo(21000, 0);

      // Year 3: 21000 * 1.02^3 = 22285
      expect(projections[3].income).toBeCloseTo(22285, 0);
    });

    it('applies What-If SS age override with correct adjustment', () => {
      const state = createTestState({
        profile: { currentAge: 62, targetFIAge: 62, lifeExpectancy: 75, state: 'TX', filingStatus: 'single' },
        socialSecurity: {
          include: true,
          monthlyBenefit: 2500, // FRA benefit
          startAge: 67, // Stored age
          colaRate: 0,
        },
        expenses: {
          categories: [{ id: 'exp-1', name: 'Living', annualAmount: 20000, inflationAdjusted: false, category: 'living' }],
        },
      });

      // Override to age 62 via What-If
      const projections = calculateProjection(state, { spendingAdjustment: 0, returnAdjustment: 0.06, ssStartAge: 62 });

      // With What-If age 62: adjusted = 2500 * 0.70 = 1750/mo = 21000/yr
      expect(projections[0].income).toBeCloseTo(21000, 0);
    });

    it('adjusts spouse SS independently', () => {
      const state = createTestState({
        profile: { currentAge: 67, targetFIAge: 67, lifeExpectancy: 75, state: 'TX', filingStatus: 'married', spouseAge: 62 },
        socialSecurity: {
          include: true,
          monthlyBenefit: 2500, // FRA benefit
          startAge: 67, // Self claims at FRA
          colaRate: 0,
          spouse: {
            include: true,
            monthlyBenefit: 2000, // Spouse FRA benefit
            startAge: 62, // Spouse claims early
          },
        },
        expenses: {
          categories: [{ id: 'exp-1', name: 'Living', annualAmount: 40000, inflationAdjusted: false, category: 'living' }],
        },
      });

      const projections = calculateProjection(state);

      // Year 0 (self 67, spouse 62):
      // Self: 2500 * 1.00 * 12 = 30000
      // Spouse: 2000 * 0.70 * 12 = 16800
      // Total: 46800
      expect(projections[0].income).toBeCloseTo(46800, 0);
    });
  });
});

// ==================== Pension COLA ====================

describe('Pension COLA', () => {
  it('applies pension COLA from start age', () => {
    const state = createTestState({
      profile: { currentAge: 60, targetFIAge: 60, lifeExpectancy: 70, state: 'TX', filingStatus: 'single' },
      assets: {
        accounts: [{ id: 'cash-1', name: 'Cash', type: 'cash', owner: 'self', balance: 1000000 }],
        pension: {
          annualBenefit: 30000,
          startAge: 62,
          colaRate: 0.02,
        },
      },
      socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67, colaRate: 0 },
      expenses: {
        categories: [{ id: 'exp-1', name: 'Living', annualAmount: 40000, inflationAdjusted: false, category: 'living' }],
      },
    });

    const projections = calculateProjection(state);

    // Age 60-61: No pension
    expect(projections[0].income).toBe(0);
    expect(projections[1].income).toBe(0);

    // Age 62: Pension starts = 30000
    expect(projections[2].income).toBeCloseTo(30000, 0);

    // Age 65: Pension with 3 years COLA = 30000 * 1.02^3 = 31836
    expect(projections[5].income).toBeCloseTo(31836, 0);
  });
});

// ==================== Withdrawal Penalties ====================

describe('Withdrawal Penalties', () => {
  it('applies 10% penalty for traditional withdrawal before 59.5', () => {
    const state = createTestState({
      profile: { currentAge: 50, targetFIAge: 50, lifeExpectancy: 65, state: 'TX', filingStatus: 'single' },
      assets: {
        accounts: [
          { id: 'trad-1', name: 'Traditional', type: 'traditional', owner: 'self', balance: 1000000 },
        ],
      },
      socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67, colaRate: 0 },
      expenses: {
        categories: [{ id: 'exp-1', name: 'Living', annualAmount: 50000, inflationAdjusted: false, category: 'living' }],
      },
    });

    const projections = calculateProjection(state);

    // Age 50-59: Should have penalties
    for (let i = 0; i < 10; i++) {
      if (projections[i].withdrawal > 0) {
        expect(projections[i].withdrawalPenalty).toBeGreaterThan(0);
      }
    }

    // Age 60+: No penalties (age >= 59.5 in whole years)
    for (let i = 10; i < projections.length; i++) {
      expect(projections[i].withdrawalPenalty).toBe(0);
    }
  });

  it('applies 20% penalty for HSA withdrawal before 65', () => {
    const state = createTestState({
      profile: { currentAge: 60, targetFIAge: 60, lifeExpectancy: 70, state: 'TX', filingStatus: 'single' },
      assets: {
        accounts: [
          { id: 'hsa-1', name: 'HSA', type: 'hsa', owner: 'self', balance: 100000 },
        ],
      },
      socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67, colaRate: 0 },
      expenses: {
        categories: [{ id: 'exp-1', name: 'Living', annualAmount: 20000, inflationAdjusted: false, category: 'living' }],
      },
    });

    const projections = calculateProjection(state);

    // Age 60-64: Should have 20% penalty on HSA
    for (let i = 0; i < 5; i++) {
      if (projections[i].withdrawalSource.includes('HSA')) {
        expect(projections[i].withdrawalPenalty).toBeGreaterThan(0);
      }
    }

    // Age 65+: No HSA penalty
    expect(projections[5].withdrawalPenalty).toBe(0);
  });

  it('traditional penalty is funded by the gross-up withdrawal', () => {
    const state = createTestState({
      profile: { currentAge: 50, targetFIAge: 50, lifeExpectancy: 65, state: 'TX', filingStatus: 'single' },
      assets: {
        accounts: [
          { id: 'trad-1', name: 'Traditional', type: 'traditional', owner: 'self', balance: 1000000 },
        ],
      },
      socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67, colaRate: 0 },
      expenses: {
        categories: [{ id: 'exp-1', name: 'Living', annualAmount: 50000, inflationAdjusted: false, category: 'living' }],
      },
      assumptions: {
        investmentReturn: 0, inflationRate: 0,
        traditionalTaxRate: 0.22, capitalGainsTaxRate: 0.15, rothTaxRate: 0,
        withdrawalOrder: ['traditional'],
        safeWithdrawalRate: 0.04,
        penaltySettings: { earlyWithdrawalPenaltyRate: 0.10, hsaEarlyPenaltyRate: 0.20, enableRule55: false },
      },
    });

    const projections = calculateProjection(state);
    const year = projections[0]; // age 50, penalty applies

    // Withdrawal must be larger than expenses to cover tax + penalty
    expect(year.withdrawal).toBeGreaterThan(year.expenses);
    // Net after tax + penalty must cover expenses
    const net = year.withdrawal - year.federalTax - year.stateTax - year.withdrawalPenalty;
    expect(net).toBeCloseTo(year.expenses, 0);

    // After penalty-free age (60+), gross-up only covers taxes
    const yearAt60 = projections[10]; // age 60
    expect(yearAt60.withdrawalPenalty).toBe(0);
    const net60 = yearAt60.withdrawal - yearAt60.federalTax - yearAt60.stateTax;
    expect(net60).toBeCloseTo(yearAt60.expenses, 0);
  });

  it('roth penalty is funded by the gross-up withdrawal', () => {
    const state = createTestState({
      profile: { currentAge: 50, targetFIAge: 50, lifeExpectancy: 65, state: 'TX', filingStatus: 'single' },
      assets: {
        accounts: [
          { id: 'roth-1', name: 'Roth', type: 'roth', owner: 'self', balance: 1000000 },
        ],
      },
      socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67, colaRate: 0 },
      expenses: {
        categories: [{ id: 'exp-1', name: 'Living', annualAmount: 50000, inflationAdjusted: false, category: 'living' }],
      },
      assumptions: {
        investmentReturn: 0, inflationRate: 0,
        traditionalTaxRate: 0.22, capitalGainsTaxRate: 0.15, rothTaxRate: 0,
        withdrawalOrder: ['roth'],
        safeWithdrawalRate: 0.04,
        penaltySettings: { earlyWithdrawalPenaltyRate: 0.10, hsaEarlyPenaltyRate: 0.20, enableRule55: false },
      },
    });

    const projections = calculateProjection(state);
    const year = projections[0]; // age 50, penalty applies

    // Roth withdrawal must be larger than expenses to cover penalty
    expect(year.withdrawal).toBeGreaterThan(year.expenses);
    // Net after penalty must cover expenses
    const net = year.withdrawal - year.withdrawalPenalty;
    expect(net).toBeCloseTo(year.expenses, 0);
  });

  it('HSA penalty is funded by the gross-up withdrawal', () => {
    const state = createTestState({
      profile: { currentAge: 60, targetFIAge: 60, lifeExpectancy: 70, state: 'TX', filingStatus: 'single' },
      assets: {
        accounts: [
          { id: 'hsa-1', name: 'HSA', type: 'hsa', owner: 'self', balance: 500000 },
        ],
      },
      socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67, colaRate: 0 },
      expenses: {
        categories: [{ id: 'exp-1', name: 'Living', annualAmount: 20000, inflationAdjusted: false, category: 'living' }],
      },
      assumptions: {
        investmentReturn: 0, inflationRate: 0,
        traditionalTaxRate: 0.22, capitalGainsTaxRate: 0.15, rothTaxRate: 0,
        withdrawalOrder: ['taxable', 'traditional', 'roth'],
        safeWithdrawalRate: 0.04,
        penaltySettings: { earlyWithdrawalPenaltyRate: 0.10, hsaEarlyPenaltyRate: 0.20, enableRule55: false },
      },
    });

    const projections = calculateProjection(state);
    const year = projections[0]; // age 60, HSA penalty applies

    // HSA withdrawal must be larger than expenses to cover penalty
    expect(year.withdrawal).toBeGreaterThan(year.expenses);
    // Net after penalty must cover expenses
    const net = year.withdrawal - year.withdrawalPenalty;
    expect(net).toBeCloseTo(year.expenses, 0);
  });
});

// ==================== Contribution Distribution ====================

describe('Per-Account Contributions', () => {
  it('adds contributions to accounts based on annualContribution field', () => {
    const state = createTestState({
      profile: { currentAge: 45, targetFIAge: 55, lifeExpectancy: 60, state: 'TX', filingStatus: 'single' },
      assets: {
        accounts: [
          { id: 'trad-1', name: 'Traditional 401k', type: 'traditional', owner: 'self', balance: 100000, is401k: true, annualContribution: 23000 },
          { id: 'roth-1', name: 'Roth IRA', type: 'roth', owner: 'self', balance: 100000 },
          { id: 'taxable-1', name: 'Taxable', type: 'taxable', owner: 'self', balance: 50000, costBasis: 40000 },
        ],
      },
      income: {
        employment: {
          annualGrossIncome: 150000,
          effectiveTaxRate: 0.25,
        },
        retirementIncomes: [],
      },
      expenses: {
        categories: [{ id: 'exp-1', name: 'Living', annualAmount: 50000, inflationAdjusted: false, category: 'living' }],
      },
      socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67, colaRate: 0 },
    });

    const projections = calculateProjection(state);
    const year1 = projections[0];

    // Traditional: 100000 + 23000 contribution = 123000
    expect(year1.traditionalBalance).toBe(123000);
    // Roth should not receive contributions (stays at 100000)
    expect(year1.rothBalance).toBe(100000);
    expect(year1.contributions).toBe(23000);
  });

  it('respects contributionStartYear and contributionEndYear bounds', () => {
    const currentYear = new Date().getFullYear();
    const state = createTestState({
      profile: { currentAge: 45, targetFIAge: 45, lifeExpectancy: 55, state: 'TX', filingStatus: 'single' },
      assets: {
        accounts: [
          {
            id: 'trad-1', name: 'Traditional', type: 'traditional', owner: 'self', balance: 100000,
            annualContribution: 20000,
            contributionStartYear: currentYear + 2,
            contributionEndYear: currentYear + 4,
          },
        ],
      },
      socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67, colaRate: 0 },
      expenses: {
        categories: [{ id: 'exp-1', name: 'Living', annualAmount: 30000, inflationAdjusted: false, category: 'living' }],
      },
      assumptions: {
        investmentReturn: 0, inflationRate: 0,
        traditionalTaxRate: 0.22, capitalGainsTaxRate: 0.15, rothTaxRate: 0,
        withdrawalOrder: ['taxable', 'traditional', 'roth'],
        safeWithdrawalRate: 0.04,
        penaltySettings: { earlyWithdrawalPenaltyRate: 0.10, hsaEarlyPenaltyRate: 0.20, enableRule55: false },
      },
    });

    const projections = calculateProjection(state);

    // Year 0-1: Before start year, no contributions
    expect(projections[0].contributions).toBe(0);
    expect(projections[1].contributions).toBe(0);

    // Year 2-4: Within range, contributions active
    expect(projections[2].contributions).toBe(20000);
    expect(projections[3].contributions).toBe(20000);
    expect(projections[4].contributions).toBe(20000);

    // Year 5+: After end year, no contributions
    expect(projections[5].contributions).toBe(0);
  });

  it('multiple accounts with overlapping contribution schedules', () => {
    const state = createTestState({
      profile: { currentAge: 45, targetFIAge: 55, lifeExpectancy: 60, state: 'TX', filingStatus: 'single' },
      assets: {
        accounts: [
          { id: 'trad-1', name: 'Traditional', type: 'traditional', owner: 'self', balance: 200000, annualContribution: 23000 },
          { id: 'roth-1', name: 'Roth', type: 'roth', owner: 'self', balance: 100000, annualContribution: 7000 },
        ],
      },
      income: {
        employment: { annualGrossIncome: 200000, effectiveTaxRate: 0.25 },
        retirementIncomes: [],
      },
      socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67, colaRate: 0 },
      expenses: {
        categories: [{ id: 'exp-1', name: 'Living', annualAmount: 50000, inflationAdjusted: false, category: 'living' }],
      },
    });

    const projections = calculateProjection(state);
    const year1 = projections[0];

    expect(year1.contributions).toBe(30000);
    expect(year1.traditionalBalance).toBe(223000);
    expect(year1.rothBalance).toBe(107000);
  });
});

// ==================== Surplus Handling ====================

describe('Surplus Handling', () => {
  it('does NOT auto-deposit surplus — surplus is ignored', () => {
    const state = createTestState({
      profile: { currentAge: 45, targetFIAge: 50, lifeExpectancy: 60, state: 'TX', filingStatus: 'single' },
      assets: {
        accounts: [
          { id: 'taxable-1', name: 'Taxable', type: 'taxable', owner: 'self', balance: 100000, costBasis: 80000 },
        ],
      },
      income: {
        employment: {
          annualGrossIncome: 150000,
          effectiveTaxRate: 0.25,
        },
        retirementIncomes: [],
      },
      expenses: {
        categories: [{ id: 'exp-1', name: 'Living', annualAmount: 50000, inflationAdjusted: false, category: 'living' }],
      },
    });

    const projections = calculateProjection(state);
    const year1 = projections[0];

    // Net income = 150000 - 37500 = 112500 > expenses 50000
    // Surplus is NOT deposited — balance stays at 100000 (before growth)
    expect(year1.taxableBalance).toBe(100000);
    expect(year1.withdrawalSource).toBe('N/A');
  });
});

// ==================== Achievable FI Age ====================

describe('Achievable FI Age', () => {
  it('finds correct FI age with binary search', () => {
    const state = createTestState({
      profile: { currentAge: 45, targetFIAge: 50, lifeExpectancy: 95, state: 'TX', filingStatus: 'single' },
      assets: {
        accounts: [
          { id: 'taxable-1', name: 'Taxable', type: 'taxable', owner: 'self', balance: 2000000, costBasis: 1200000 },
        ],
      },
      socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67, colaRate: 0 },
      expenses: {
        categories: [{ id: 'exp-1', name: 'Living', annualAmount: 50000, category: 'living' }],
      },
    });

    const result = calculateAchievableFIAge(state);

    expect(result.achievableFIAge).not.toBeNull();
    expect(result.achievableFIAge).toBeGreaterThanOrEqual(45);
    expect(result.achievableFIAge).toBeLessThan(95);
  });

  it('returns fiAtCurrentAge true when already FI', () => {
    const state = createTestState({
      profile: { currentAge: 45, targetFIAge: 45, lifeExpectancy: 95, state: 'TX', filingStatus: 'single' },
      assets: {
        accounts: [
          { id: 'taxable-1', name: 'Taxable', type: 'taxable', owner: 'self', balance: 5000000, costBasis: 3000000 },
        ],
      },
      expenses: {
        categories: [{ id: 'exp-1', name: 'Living', annualAmount: 40000, category: 'living' }],
      },
    });

    const result = calculateAchievableFIAge(state);

    expect(result.fiAtCurrentAge).toBe(true);
    expect(result.achievableFIAge).toBe(45);
    expect(result.yearsUntilFI).toBe(0);
  });

  it('returns not_achievable when FI is impossible', () => {
    const state = createTestState({
      profile: { currentAge: 80, targetFIAge: 80, lifeExpectancy: 95, state: 'CA', filingStatus: 'single' },
      assets: {
        accounts: [
          { id: 'cash-1', name: 'Cash', type: 'cash', owner: 'self', balance: 10000 },
        ],
      },
      socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67, colaRate: 0 },
      expenses: {
        categories: [{ id: 'exp-1', name: 'Living', annualAmount: 100000, category: 'living' }],
      },
    });

    const result = calculateAchievableFIAge(state);

    expect(result.confidenceLevel).toBe('not_achievable');
    expect(result.achievableFIAge).toBeNull();
  });

  it('provides shortfall guidance when not achievable', () => {
    const state = createTestState({
      profile: { currentAge: 80, targetFIAge: 80, lifeExpectancy: 95, state: 'TX', filingStatus: 'single' },
      assets: {
        accounts: [
          { id: 'cash-1', name: 'Cash', type: 'cash', owner: 'self', balance: 10000 },
        ],
      },
      socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67, colaRate: 0 },
      expenses: {
        categories: [{ id: 'exp-1', name: 'Living', annualAmount: 100000, category: 'living' }],
      },
    });

    const result = calculateAchievableFIAge(state);

    expect(result.confidenceLevel).toBe('not_achievable');
    expect(result.shortfallGuidance).toBeDefined();
    expect(result.shortfallGuidance!.runsOutAtAge).toBeGreaterThanOrEqual(80);
    expect(result.shortfallGuidance!.runsOutAtAge).toBeLessThan(95);
  });

  it('employment income makes FI achievable earlier', () => {
    // Without employment: need FI later
    const stateNoEmployment = createTestState({
      profile: { currentAge: 45, targetFIAge: 50, lifeExpectancy: 95, state: 'TX', filingStatus: 'single' },
      assets: {
        accounts: [
          { id: 'taxable-1', name: 'Taxable', type: 'taxable', owner: 'self', balance: 500000, costBasis: 300000 },
        ],
      },
      socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67, colaRate: 0 },
      expenses: {
        categories: [{ id: 'exp-1', name: 'Living', annualAmount: 50000, category: 'living' }],
      },
    });

    // With employment: accumulates wealth, FI earlier
    const stateWithEmployment = createTestState({
      profile: { currentAge: 45, targetFIAge: 50, lifeExpectancy: 95, state: 'TX', filingStatus: 'single' },
      assets: {
        accounts: [
          { id: 'taxable-1', name: 'Taxable', type: 'taxable', owner: 'self', balance: 500000, costBasis: 300000 },
        ],
      },
      income: {
        employment: {
          annualGrossIncome: 200000,
          effectiveTaxRate: 0.25,
        },
        retirementIncomes: [],
      },
      socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67, colaRate: 0 },
      expenses: {
        categories: [{ id: 'exp-1', name: 'Living', annualAmount: 50000, category: 'living' }],
      },
    });

    const noEmploymentResult = calculateAchievableFIAge(stateNoEmployment);
    const withEmploymentResult = calculateAchievableFIAge(stateWithEmployment);

    // With employment, FI should be achievable at an earlier age
    if (noEmploymentResult.achievableFIAge !== null && withEmploymentResult.achievableFIAge !== null) {
      expect(withEmploymentResult.achievableFIAge).toBeLessThanOrEqual(noEmploymentResult.achievableFIAge);
    }
  });
});

// ==================== Expense Inflation ====================

describe('Expense Inflation', () => {
  it('inflates expenses from current year', () => {
    const state = createTestState({
      profile: { currentAge: 45, targetFIAge: 45, lifeExpectancy: 50, state: 'TX', filingStatus: 'single' },
      assets: {
        accounts: [
          { id: 'cash-1', name: 'Cash', type: 'cash', owner: 'self', balance: 1000000 },
        ],
      },
      socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67, colaRate: 0 },
      expenses: {
        categories: [{ id: 'exp-1', name: 'Living', annualAmount: 50000, category: 'living' }],
      },
    });

    const projections = calculateProjection(state);

    // Year 0: 50000
    expect(projections[0].expenses).toBeCloseTo(50000, 0);

    // Year 5: 50000 * 1.03^5 = 57964
    expect(projections[5].expenses).toBeCloseTo(57964, 0);
  });

  it('respects inflationAdjusted flag (fixed vs inflating)', () => {
    const state = createTestState({
      profile: { currentAge: 45, targetFIAge: 45, lifeExpectancy: 50, state: 'TX', filingStatus: 'single' },
      assets: {
        accounts: [
          { id: 'cash-1', name: 'Cash', type: 'cash', owner: 'self', balance: 1000000 },
        ],
      },
      socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67, colaRate: 0 },
      expenses: {
        categories: [
          { id: 'exp-1', name: 'Fixed Cost', annualAmount: 10000, inflationAdjusted: false, category: 'other' },
          { id: 'exp-2', name: 'Living', annualAmount: 40000, category: 'living' },
        ],
      },
    });

    const projections = calculateProjection(state);

    // Year 5:
    // Fixed: 10000 (no inflation)
    // Living: 40000 * 1.03^5 = 46371
    // Total: 56371
    expect(projections[5].expenses).toBeCloseTo(56371, 0);
  });
});

// ==================== Summary Calculations ====================

describe('Summary Calculations', () => {
  it('calculates FI number correctly', () => {
    const state = createTestState({
      expenses: {
        categories: [{ id: 'exp-1', name: 'Living', annualAmount: 80000, category: 'living' }],
      },
      assumptions: {
        investmentReturn: 0.06,
        inflationRate: 0.03,
        traditionalTaxRate: 0.22,
        capitalGainsTaxRate: 0.15,
        rothTaxRate: 0,
        withdrawalOrder: ['taxable', 'traditional', 'roth'],
        safeWithdrawalRate: 0.04,
        penaltySettings: { earlyWithdrawalPenaltyRate: 0.10, hsaEarlyPenaltyRate: 0.20, enableRule55: false },
      },
    });

    const projections = calculateProjection(state);
    const summary = calculateSummary(state, projections);

    // FI Number = 80000 / 0.04 = 2,000,000
    expect(summary.fiNumber).toBe(2000000);
  });

  it('calculates current net worth correctly', () => {
    const state = createTestState({
      assets: {
        accounts: [
          { id: 'taxable-1', name: 'Taxable', type: 'taxable', owner: 'self', balance: 500000, costBasis: 300000 },
          { id: 'trad-1', name: 'Traditional', type: 'traditional', owner: 'self', balance: 300000 },
          { id: 'roth-1', name: 'Roth', type: 'roth', owner: 'self', balance: 200000 },
        ],
      },
    });

    const projections = calculateProjection(state);
    const summary = calculateSummary(state, projections);

    expect(summary.currentNetWorth).toBe(1000000);
  });
});
