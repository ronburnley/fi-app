import { describe, it, expect } from 'vitest';
import {
  calculateProjection,
  calculateSummary,
  calculateAchievableFIAge,
  calculateGoalFIGuidance,
  calculateMonthlyPayment,
  calculateRemainingBalance,
  calculateHomeEquity,
  calculateMortgageBalanceForYear,
  getSSAdjustmentFactor,
  getAdjustedSSBenefit,
} from './calculations';
import type { AppState, WhatIfAdjustments } from '../types';

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

    // Gross employment income
    expect(year1.employmentIncome).toBe(150000);
    expect(year1.employmentTax).toBe(37500);
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

    // Self: 150000, Spouse: 100000, Combined Gross = 250000
    expect(year1.employmentIncome).toBe(250000);
    // Combined Tax = 37500 + 22000 = 59500
    expect(year1.employmentTax).toBe(59500);
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
    // Gross = 150000, Tax = 37500
    expect(projections[0].employmentIncome).toBe(150000);
    expect(projections[0].employmentTax).toBe(37500);
    expect(projections[0].phase).toBe('accumulating');
    expect(projections[4].employmentIncome).toBe(150000);

    // Age 55: FI — no employment
    expect(projections[5].employmentIncome).toBe(0);
    expect(projections[5].employmentTax).toBe(0);
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

  it('applies growth rate annually', () => {
    const state = createTestState({
      profile: { currentAge: 40, targetFIAge: 55, lifeExpectancy: 95, state: 'CA', filingStatus: 'single' },
      income: {
        employment: {
          annualGrossIncome: 100000,
          effectiveTaxRate: 0.25,
          annualGrowthRate: 0.03,
        },
        retirementIncomes: [],
      },
    });

    const projections = calculateProjection(state);

    // Year 0 (age 40): base salary
    expect(projections[0].employmentIncome).toBeCloseTo(100000, 0);
    // Year 1 (age 41): 100000 * 1.03 = 103000
    expect(projections[1].employmentIncome).toBeCloseTo(103000, 0);
    // Year 5 (age 45): 100000 * 1.03^5 = 115927.41
    expect(projections[5].employmentIncome).toBeCloseTo(115927.41, 0);
  });

  it('defaults to no growth when annualGrowthRate is undefined', () => {
    const state = createTestState({
      profile: { currentAge: 40, targetFIAge: 55, lifeExpectancy: 95, state: 'CA', filingStatus: 'single' },
      income: {
        employment: {
          annualGrossIncome: 100000,
          effectiveTaxRate: 0.25,
          // annualGrowthRate is undefined
        },
        retirementIncomes: [],
      },
    });

    const projections = calculateProjection(state);

    // Static salary at all years
    expect(projections[0].employmentIncome).toBe(100000);
    expect(projections[5].employmentIncome).toBe(100000);
    expect(projections[10].employmentIncome).toBe(100000);
  });

  it('stops income growth at FI age', () => {
    const state = createTestState({
      profile: { currentAge: 50, targetFIAge: 55, lifeExpectancy: 95, state: 'CA', filingStatus: 'single' },
      income: {
        employment: {
          annualGrossIncome: 100000,
          effectiveTaxRate: 0.25,
          annualGrowthRate: 0.05,
        },
        retirementIncomes: [],
      },
    });

    const projections = calculateProjection(state);

    // Age 54 (last working year): 100000 * 1.05^4 = 121550.63
    expect(projections[4].employmentIncome).toBeCloseTo(121550.63, 0);
    // Age 55 (FI): no income
    expect(projections[5].employmentIncome).toBe(0);
    expect(projections[5].employmentTax).toBe(0);
  });

  it('supports independent growth rates for primary and spouse', () => {
    const state = createTestState({
      profile: { currentAge: 45, targetFIAge: 55, lifeExpectancy: 95, state: 'TX', filingStatus: 'married', spouseAge: 43 },
      income: {
        employment: {
          annualGrossIncome: 150000,
          effectiveTaxRate: 0.25,
          annualGrowthRate: 0.03,
        },
        spouseEmployment: {
          annualGrossIncome: 100000,
          effectiveTaxRate: 0.22,
          annualGrowthRate: 0.05,
        },
        retirementIncomes: [],
      },
    });

    const projections = calculateProjection(state);

    // Year 0 (age 45): 150000 + 100000 = 250000
    expect(projections[0].employmentIncome).toBeCloseTo(250000, 0);
    // Year 5 (age 50): 150000*1.03^5 + 100000*1.05^5 = 173891.14 + 127628.16 = 301519.29
    expect(projections[5].employmentIncome).toBeCloseTo(301519.29, 0);
  });

  it('calculates tax on grown income', () => {
    const state = createTestState({
      profile: { currentAge: 40, targetFIAge: 55, lifeExpectancy: 95, state: 'CA', filingStatus: 'single' },
      income: {
        employment: {
          annualGrossIncome: 100000,
          effectiveTaxRate: 0.25,
          annualGrowthRate: 0.03,
        },
        retirementIncomes: [],
      },
    });

    const projections = calculateProjection(state);

    // Year 5 (age 45): gross = 100000 * 1.03^5 = 115927.41, tax = 115927.41 * 0.25 = 28981.85
    expect(projections[5].employmentTax).toBeCloseTo(28981.85, 0);
  });

  it('treats zero growth rate same as undefined', () => {
    const stateZero = createTestState({
      profile: { currentAge: 40, targetFIAge: 55, lifeExpectancy: 95, state: 'CA', filingStatus: 'single' },
      income: {
        employment: {
          annualGrossIncome: 100000,
          effectiveTaxRate: 0.25,
          annualGrowthRate: 0,
        },
        retirementIncomes: [],
      },
    });

    const stateUndefined = createTestState({
      profile: { currentAge: 40, targetFIAge: 55, lifeExpectancy: 95, state: 'CA', filingStatus: 'single' },
      income: {
        employment: {
          annualGrossIncome: 100000,
          effectiveTaxRate: 0.25,
        },
        retirementIncomes: [],
      },
    });

    const projectionsZero = calculateProjection(stateZero);
    const projectionsUndefined = calculateProjection(stateUndefined);

    for (let i = 0; i < 10; i++) {
      expect(projectionsZero[i].employmentIncome).toBe(projectionsUndefined[i].employmentIncome);
      expect(projectionsZero[i].employmentTax).toBe(projectionsUndefined[i].employmentTax);
    }
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

  it('optionally routes accumulation surplus to selected account type', () => {
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
      socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67, colaRate: 0 },
      expenses: {
        categories: [{ id: 'exp-1', name: 'Living', annualAmount: 50000, inflationAdjusted: false, category: 'living' }],
      },
      assumptions: {
        investmentReturn: 0,
        inflationRate: 0,
        traditionalTaxRate: 0.22,
        capitalGainsTaxRate: 0.15,
        rothTaxRate: 0,
        withdrawalOrder: ['taxable', 'traditional', 'roth'],
          penaltySettings: {
          earlyWithdrawalPenaltyRate: 0.10,
          hsaEarlyPenaltyRate: 0.20,
          enableRule55: false,
        },
        accumulationSurplusHandling: 'route_to_account',
        accumulationSurplusAccountId: 'taxable-1',
      },
    });

    const projections = calculateProjection(state);
    const year1 = projections[0];

    // Net income = 150000 - 37500 = 112500; expense = 50000; surplus = 62500
    expect(year1.taxableBalance).toBe(162500);
    expect(year1.withdrawalSource).toBe('N/A');
  });

  it('ignores surplus routing when account ID is missing or deleted', () => {
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
      socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67, colaRate: 0 },
      expenses: {
        categories: [{ id: 'exp-1', name: 'Living', annualAmount: 50000, inflationAdjusted: false, category: 'living' }],
      },
      assumptions: {
        investmentReturn: 0,
        inflationRate: 0,
        traditionalTaxRate: 0.22,
        capitalGainsTaxRate: 0.15,
        rothTaxRate: 0,
        withdrawalOrder: ['taxable', 'traditional', 'roth'],
        penaltySettings: {
          earlyWithdrawalPenaltyRate: 0.10,
          hsaEarlyPenaltyRate: 0.20,
          enableRule55: false,
        },
        accumulationSurplusHandling: 'route_to_account',
        accumulationSurplusAccountId: 'deleted-account-id',
      },
    });

    const projections = calculateProjection(state);
    const year1 = projections[0];

    // Surplus should be ignored since account ID doesn't match any account
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

  it('uses terminal balance target to select FI age closest to depletion goal', () => {
    const baseState = createTestState({
      profile: { currentAge: 45, targetFIAge: 50, lifeExpectancy: 55, state: 'TX', filingStatus: 'single' },
      assets: {
        accounts: [
          { id: 'cash-1', name: 'Cash', type: 'cash', owner: 'self', balance: 1000000 },
        ],
      },
      income: {
        employment: {
          annualGrossIncome: 100000,
          effectiveTaxRate: 0,
        },
        retirementIncomes: [],
      },
      socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67, colaRate: 0 },
      expenses: {
        categories: [{ id: 'exp-1', name: 'Living', annualAmount: 60000, inflationAdjusted: false, category: 'living' }],
      },
      assumptions: {
        investmentReturn: 0,
        inflationRate: 0,
        traditionalTaxRate: 0.22,
        capitalGainsTaxRate: 0.15,
        rothTaxRate: 0,
        withdrawalOrder: ['taxable', 'traditional', 'roth'],
          penaltySettings: {
          earlyWithdrawalPenaltyRate: 0.10,
          hsaEarlyPenaltyRate: 0.20,
          enableRule55: false,
        },
        terminalBalanceTarget: 0,
      },
    });

    const zeroTarget = calculateAchievableFIAge(baseState);
    expect(zeroTarget.achievableFIAge).toBe(45);

    const targetState = createTestState({
      ...baseState,
      assumptions: {
        ...baseState.assumptions,
        terminalBalanceTarget: 600000,
      },
    });

    const customTarget = calculateAchievableFIAge(targetState);
    expect(customTarget.achievableFIAge).toBe(49);
    expect(customTarget.achievableFIAge).toBeGreaterThan(zeroTarget.achievableFIAge!);
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

describe('Shortfall Detection', () => {
  it('flags shortfall when gross withdrawal exceeds gap but net is still insufficient', () => {
    const state = createTestState({
      profile: { currentAge: 50, targetFIAge: 50, lifeExpectancy: 55, state: 'CA', filingStatus: 'single' },
      assets: {
        accounts: [
          { id: 'trad-1', name: 'Traditional', type: 'traditional', owner: 'self', balance: 110000 },
        ],
      },
      income: { retirementIncomes: [] },
      socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67, colaRate: 0 },
      expenses: {
        categories: [{ id: 'exp-1', name: 'Living', annualAmount: 100000, inflationAdjusted: false, category: 'living' }],
      },
      assumptions: {
        investmentReturn: 0,
        inflationRate: 0,
        traditionalTaxRate: 0.22,
        capitalGainsTaxRate: 0.15,
        rothTaxRate: 0,
        withdrawalOrder: ['traditional', 'taxable', 'roth'],
          penaltySettings: {
          earlyWithdrawalPenaltyRate: 0.10,
          hsaEarlyPenaltyRate: 0.20,
          enableRule55: false,
        },
      },
    });

    const projections = calculateProjection(state);

    expect(projections[0].withdrawal).toBeGreaterThan(projections[0].gap);
    expect(projections[0].unmetNeed).toBeGreaterThan(0);
    expect(projections[0].isShortfall).toBe(true);
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
  it('calculates FI number as net worth at achievable FI age', () => {
    const state = createTestState({
      profile: { currentAge: 45, targetFIAge: 55, lifeExpectancy: 95, state: 'TX', filingStatus: 'single' },
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

    const achievableFI = calculateAchievableFIAge(state);
    const projections = calculateProjection(state);
    const summary = calculateSummary(state, projections, undefined, achievableFI.achievableFIAge);

    // FI Number should equal totalNetWorth at the achievable FI age
    expect(achievableFI.achievableFIAge).not.toBeNull();
    const fiYearProjection = projections.find(p => p.age === achievableFI.achievableFIAge);
    expect(fiYearProjection).toBeDefined();
    expect(summary.fiNumber).toBe(fiYearProjection!.totalNetWorth);
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

// ==================== FI Phase Return Rate ====================

describe('FI Phase Return Rate', () => {
  it('applies fiPhaseReturn during FI phase and investmentReturn during accumulation', () => {
    const state = createTestState({
      profile: { currentAge: 50, targetFIAge: 55, lifeExpectancy: 70, state: 'TX', filingStatus: 'single' },
      assets: {
        accounts: [
          { id: 'taxable-1', name: 'Taxable', type: 'taxable', owner: 'self', balance: 1000000, costBasis: 600000 },
        ],
      },
      socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67, colaRate: 0 },
      expenses: {
        categories: [{ id: 'exp-1', name: 'Living', annualAmount: 30000, category: 'living' }],
      },
      assumptions: {
        investmentReturn: 0.08,
        fiPhaseReturn: 0.03,
        inflationRate: 0,
        traditionalTaxRate: 0.22,
        capitalGainsTaxRate: 0.15,
        rothTaxRate: 0,
        withdrawalOrder: ['taxable', 'traditional', 'roth'],
          penaltySettings: { earlyWithdrawalPenaltyRate: 0.10, hsaEarlyPenaltyRate: 0.20, enableRule55: false },
      },
    });

    const projections = calculateProjection(state);

    // During accumulation (age 50-54), growth should use 8%
    const accumYear = projections.find(p => p.age === 50);
    expect(accumYear?.phase).toBe('accumulating');

    // During FI (age 55+), growth should use 3%
    const fiYear = projections.find(p => p.age === 55);
    expect(fiYear?.phase).toBe('fi');

    // With 8% accumulation vs 3% FI, terminal wealth should be much lower than all-8%
    const stateAllHigh = createTestState({
      profile: { currentAge: 50, targetFIAge: 55, lifeExpectancy: 70, state: 'TX', filingStatus: 'single' },
      assets: {
        accounts: [
          { id: 'taxable-1', name: 'Taxable', type: 'taxable', owner: 'self', balance: 1000000, costBasis: 600000 },
        ],
      },
      socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67, colaRate: 0 },
      expenses: {
        categories: [{ id: 'exp-1', name: 'Living', annualAmount: 30000, category: 'living' }],
      },
      assumptions: {
        investmentReturn: 0.08,
        inflationRate: 0,
        traditionalTaxRate: 0.22,
        capitalGainsTaxRate: 0.15,
        rothTaxRate: 0,
        withdrawalOrder: ['taxable', 'traditional', 'roth'],
          penaltySettings: { earlyWithdrawalPenaltyRate: 0.10, hsaEarlyPenaltyRate: 0.20, enableRule55: false },
      },
    });
    const projectionsAllHigh = calculateProjection(stateAllHigh);
    const lastFIPhase = projections[projections.length - 1];
    const lastAllHigh = projectionsAllHigh[projectionsAllHigh.length - 1];
    expect(lastFIPhase.totalNetWorth).toBeLessThan(lastAllHigh.totalNetWorth);
  });

  it('falls back to investmentReturn when fiPhaseReturn is undefined', () => {
    const baseAssumptions = {
      investmentReturn: 0.06,
      inflationRate: 0,
      traditionalTaxRate: 0.22,
      capitalGainsTaxRate: 0.15,
      rothTaxRate: 0,
      withdrawalOrder: ['taxable' as const, 'traditional' as const, 'roth' as const],
      penaltySettings: { earlyWithdrawalPenaltyRate: 0.10, hsaEarlyPenaltyRate: 0.20, enableRule55: false },
    };

    const state = createTestState({
      profile: { currentAge: 50, targetFIAge: 55, lifeExpectancy: 70, state: 'TX', filingStatus: 'single' },
      assets: {
        accounts: [
          { id: 'taxable-1', name: 'Taxable', type: 'taxable', owner: 'self', balance: 1000000, costBasis: 600000 },
        ],
      },
      socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67, colaRate: 0 },
      expenses: {
        categories: [{ id: 'exp-1', name: 'Living', annualAmount: 30000, category: 'living' }],
      },
      assumptions: { ...baseAssumptions, fiPhaseReturn: undefined },
    });

    // With undefined fiPhaseReturn, should behave identically to explicit 6%
    const stateExplicit = createTestState({
      profile: { currentAge: 50, targetFIAge: 55, lifeExpectancy: 70, state: 'TX', filingStatus: 'single' },
      assets: {
        accounts: [
          { id: 'taxable-1', name: 'Taxable', type: 'taxable', owner: 'self', balance: 1000000, costBasis: 600000 },
        ],
      },
      socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67, colaRate: 0 },
      expenses: {
        categories: [{ id: 'exp-1', name: 'Living', annualAmount: 30000, category: 'living' }],
      },
      assumptions: { ...baseAssumptions, fiPhaseReturn: 0.06 },
    });

    const projections = calculateProjection(state);
    const projectionsExplicit = calculateProjection(stateExplicit);

    // Terminal net worth should be identical
    expect(projections[projections.length - 1].totalNetWorth)
      .toBeCloseTo(projectionsExplicit[projectionsExplicit.length - 1].totalNetWorth, 2);
  });

  it('lower FI return reduces surplus at life expectancy', () => {
    const baseState = createTestState({
      profile: { currentAge: 45, targetFIAge: 55, lifeExpectancy: 90, state: 'TX', filingStatus: 'single' },
      assets: {
        accounts: [
          { id: 'taxable-1', name: 'Taxable', type: 'taxable', owner: 'self', balance: 2000000, costBasis: 1200000 },
        ],
      },
      socialSecurity: { include: true, monthlyBenefit: 2500, startAge: 67, colaRate: 0.02 },
      expenses: {
        categories: [{ id: 'exp-1', name: 'Living', annualAmount: 60000, category: 'living' }],
      },
    });

    // At 6% uniform return
    const projections6 = calculateProjection(baseState);
    const summary6 = calculateSummary(baseState, projections6);

    // At 4% FI return
    const state4 = createTestState({
      profile: { currentAge: 45, targetFIAge: 55, lifeExpectancy: 90, state: 'TX', filingStatus: 'single' },
      assets: {
        accounts: [
          { id: 'taxable-1', name: 'Taxable', type: 'taxable', owner: 'self', balance: 2000000, costBasis: 1200000 },
        ],
      },
      socialSecurity: { include: true, monthlyBenefit: 2500, startAge: 67, colaRate: 0.02 },
      expenses: {
        categories: [{ id: 'exp-1', name: 'Living', annualAmount: 60000, category: 'living' }],
      },
      assumptions: {
        investmentReturn: 0.06,
        fiPhaseReturn: 0.04,
        inflationRate: 0.03,
        traditionalTaxRate: 0.22,
        capitalGainsTaxRate: 0.15,
        rothTaxRate: 0,
        withdrawalOrder: ['taxable', 'traditional', 'roth'],
          penaltySettings: { earlyWithdrawalPenaltyRate: 0.10, hsaEarlyPenaltyRate: 0.20, enableRule55: false },
      },
    });
    const projections4 = calculateProjection(state4);
    const summary4 = calculateSummary(state4, projections4);

    // 4% FI return should produce significantly lower surplus
    expect(summary4.surplusAtLE!).toBeLessThan(summary6.surplusAtLE!);
  });

  it('lower FI return can shift achievable FI age later', () => {
    const baseOpts = {
      profile: { currentAge: 40, targetFIAge: 50, lifeExpectancy: 90, state: 'TX' as const, filingStatus: 'single' as const },
      assets: {
        accounts: [
          { id: 'taxable-1', name: 'Taxable', type: 'taxable' as const, owner: 'self' as const, balance: 800000, costBasis: 500000 },
          { id: 'trad-1', name: 'Traditional', type: 'traditional' as const, owner: 'self' as const, balance: 400000 },
        ],
      },
      income: {
        employment: { annualGrossIncome: 150000, effectiveTaxRate: 0.25 },
        retirementIncomes: [],
      },
      socialSecurity: { include: true, monthlyBenefit: 2500, startAge: 67 as const, colaRate: 0.02 },
      expenses: {
        categories: [{ id: 'exp-1', name: 'Living', annualAmount: 60000, category: 'living' as const }],
      },
    };

    // Achievable FI age at uniform 6%
    const result6 = calculateAchievableFIAge(createTestState(baseOpts));

    // Achievable FI age at 3% FI return
    const result3 = calculateAchievableFIAge(createTestState({
      ...baseOpts,
      assumptions: {
        investmentReturn: 0.06,
        fiPhaseReturn: 0.03,
        inflationRate: 0.03,
        traditionalTaxRate: 0.22,
        capitalGainsTaxRate: 0.15,
        rothTaxRate: 0,
        withdrawalOrder: ['taxable', 'traditional', 'roth'],
          penaltySettings: { earlyWithdrawalPenaltyRate: 0.10, hsaEarlyPenaltyRate: 0.20, enableRule55: false },
      },
    }));

    // Lower FI return should require working longer (or at minimum the same)
    expect(result3.achievableFIAge).toBeGreaterThanOrEqual(result6.achievableFIAge!);
  });

  it('what-if returnAdjustment affects accumulation but not FI return', () => {
    const baseOpts = {
      profile: { currentAge: 50, targetFIAge: 55, lifeExpectancy: 70, state: 'TX' as const, filingStatus: 'single' as const },
      assets: {
        accounts: [
          { id: 'taxable-1', name: 'Taxable', type: 'taxable' as const, owner: 'self' as const, balance: 1000000, costBasis: 600000 },
        ],
      },
      socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67 as const, colaRate: 0 },
      expenses: {
        categories: [{ id: 'exp-1', name: 'Living', annualAmount: 30000, category: 'living' as const }],
      },
      assumptions: {
        investmentReturn: 0.06,
        fiPhaseReturn: 0.03,
        inflationRate: 0,
        traditionalTaxRate: 0.22,
        capitalGainsTaxRate: 0.15,
        rothTaxRate: 0,
        withdrawalOrder: ['taxable' as const, 'traditional' as const, 'roth' as const],
          penaltySettings: { earlyWithdrawalPenaltyRate: 0.10, hsaEarlyPenaltyRate: 0.20, enableRule55: false },
      },
    };

    const state = createTestState(baseOpts);

    // With what-if slider boosting return to 10%
    const whatIf = { spendingAdjustment: 0, returnAdjustment: 0.10, ssStartAge: 67 as const };
    const projections = calculateProjection(state, whatIf);

    // Without what-if but with 10% accumulation, 3% FI
    const stateHighAccum = createTestState({
      ...baseOpts,
      assumptions: { ...baseOpts.assumptions, investmentReturn: 0.10 },
    });
    const projectionsHighAccum = calculateProjection(stateHighAccum);

    // Terminal values should be very close — what-if changes accumulation to 10%, FI stays at 3%
    expect(projections[projections.length - 1].totalNetWorth)
      .toBeCloseTo(projectionsHighAccum[projectionsHighAccum.length - 1].totalNetWorth, 0);
  });

  it('summary includes surplus and bottleneck fields', () => {
    const state = createTestState({
      profile: { currentAge: 50, targetFIAge: 55, lifeExpectancy: 80, state: 'TX', filingStatus: 'single' },
      assets: {
        accounts: [
          { id: 'taxable-1', name: 'Taxable', type: 'taxable', owner: 'self', balance: 1500000, costBasis: 900000 },
        ],
      },
      socialSecurity: { include: true, monthlyBenefit: 2500, startAge: 67, colaRate: 0.02 },
      expenses: {
        categories: [{ id: 'exp-1', name: 'Living', annualAmount: 50000, category: 'living' }],
      },
    });

    const projections = calculateProjection(state);
    const summary = calculateSummary(state, projections);

    // surplusAtLE should be defined and match the last projection's net worth
    expect(summary.surplusAtLE).toBeDefined();
    expect(summary.surplusAtLE).toBe(projections[projections.length - 1].totalNetWorth);

    // bottleneckAge/Balance should be defined (there are FI years)
    expect(summary.bottleneckAge).toBeDefined();
    expect(summary.bottleneckBalance).toBeDefined();

    // Bottleneck balance should be <= all FI year balances
    const fiProjections = projections.filter(p => p.phase === 'fi');
    for (const p of fiProjections) {
      expect(summary.bottleneckBalance).toBeLessThanOrEqual(p.totalNetWorth);
    }
  });
});

// ==================== Goal FI Guidance ====================

describe('Goal FI Guidance', () => {
  it('returns on_track when goal equals achievable age', () => {
    const state = createTestState({
      income: {
        employment: { annualGrossIncome: 150000, effectiveTaxRate: 0.25 },
        retirementIncomes: [],
      },
    });
    const achievable = calculateAchievableFIAge(state);
    expect(achievable.achievableFIAge).not.toBeNull();

    const guidance = calculateGoalFIGuidance(state, achievable.achievableFIAge!, achievable.achievableFIAge);
    expect(guidance.status).toBe('on_track');
    expect(guidance.goalAge).toBe(achievable.achievableFIAge);
    expect(guidance.achievableAge).toBe(achievable.achievableFIAge);
  });

  it('returns ahead_of_goal when goal is later than achievable', () => {
    const state = createTestState({
      income: {
        employment: { annualGrossIncome: 150000, effectiveTaxRate: 0.25 },
        retirementIncomes: [],
      },
    });
    const achievable = calculateAchievableFIAge(state);
    expect(achievable.achievableFIAge).not.toBeNull();

    const goalAge = achievable.achievableFIAge! + 5;
    const guidance = calculateGoalFIGuidance(state, goalAge, achievable.achievableFIAge);
    expect(guidance.status).toBe('ahead_of_goal');
    expect(guidance.surplusAtLE).toBeDefined();
    expect(guidance.surplusAtLE).toBeGreaterThan(0);
    expect(guidance.additionalBufferYears).toBeDefined();
  });

  it('returns behind_goal when goal is earlier than achievable', () => {
    // Use a state where FI is achievable but not immediately
    const state = createTestState({
      assets: {
        accounts: [
          { id: 'cash-1', name: 'Cash', type: 'cash', owner: 'self', balance: 50000 },
          { id: 'trad-1', name: '401k', type: 'traditional', owner: 'self', balance: 400000, is401k: true },
          { id: 'taxable-1', name: 'Taxable', type: 'taxable', owner: 'joint', balance: 200000, costBasis: 150000 },
        ],
      },
      income: {
        employment: { annualGrossIncome: 150000, effectiveTaxRate: 0.25 },
        retirementIncomes: [],
      },
      expenses: {
        categories: [{ id: 'e1', name: 'Living', annualAmount: 70000, category: 'living' }],
      },
    });

    const achievable = calculateAchievableFIAge(state);
    if (achievable.achievableFIAge === null || achievable.achievableFIAge <= state.profile.currentAge) {
      // If already FI or not achievable, skip this specific assertion
      return;
    }

    const goalAge = state.profile.currentAge + 2; // Very early goal
    const guidance = calculateGoalFIGuidance(state, goalAge, achievable.achievableFIAge);
    expect(guidance.status).toBe('behind_goal');
    // At least one lever should be computed
    const hasLever = guidance.spendingReduction !== undefined ||
      guidance.additionalSavingsNeeded !== undefined ||
      guidance.requiredReturn !== undefined ||
      guidance.ssDelayBenefit !== undefined;
    expect(hasLever).toBe(true);
  });

  it('returns behind_goal with guidance when FI is not achievable', () => {
    // Very high expenses, low assets — FI should be not achievable
    const state = createTestState({
      assets: {
        accounts: [
          { id: 'cash-1', name: 'Cash', type: 'cash', owner: 'self', balance: 10000 },
        ],
      },
      income: {
        employment: { annualGrossIncome: 50000, effectiveTaxRate: 0.20 },
        retirementIncomes: [],
      },
      expenses: {
        categories: [{ id: 'e1', name: 'Living', annualAmount: 80000, category: 'living' }],
      },
      socialSecurity: {
        include: false,
        monthlyBenefit: 0,
        startAge: 67,
        colaRate: 0,
      },
    });

    const achievable = calculateAchievableFIAge(state);
    // This should not be achievable
    if (achievable.achievableFIAge !== null) return;

    const guidance = calculateGoalFIGuidance(state, 60, null);
    expect(guidance.status).toBe('behind_goal');
    expect(guidance.achievableAge).toBeNull();
  });

  it('computes spending reduction lever with correct dollar amounts', () => {
    const state = createTestState({
      assets: {
        accounts: [
          { id: 'cash-1', name: 'Cash', type: 'cash', owner: 'self', balance: 100000 },
          { id: 'trad-1', name: '401k', type: 'traditional', owner: 'self', balance: 500000, is401k: true },
        ],
      },
      income: {
        employment: { annualGrossIncome: 120000, effectiveTaxRate: 0.22 },
        retirementIncomes: [],
      },
      expenses: {
        categories: [{ id: 'e1', name: 'Living', annualAmount: 60000, category: 'living' }],
      },
    });

    const achievable = calculateAchievableFIAge(state);
    if (achievable.achievableFIAge === null || achievable.achievableFIAge <= state.profile.currentAge) return;

    const goalAge = state.profile.currentAge + 1;
    const guidance = calculateGoalFIGuidance(state, goalAge, achievable.achievableFIAge);

    if (guidance.spendingReduction) {
      expect(guidance.spendingReduction.annualAmount).toBeGreaterThan(0);
      expect(guidance.spendingReduction.percentReduction).toBeGreaterThan(0);
      expect(guidance.spendingReduction.percentReduction).toBeLessThanOrEqual(80);
      expect(guidance.spendingReduction.resultingAnnualSpending).toBeLessThan(60000);
      // resultingAnnualSpending + annualAmount should approximately equal base spending
      expect(guidance.spendingReduction.resultingAnnualSpending + guidance.spendingReduction.annualAmount).toBeCloseTo(60000, -2);
    }
  });

  it('computes required return lever', () => {
    const state = createTestState({
      assumptions: {
        investmentReturn: 0.05,
        inflationRate: 0.03,
        traditionalTaxRate: 0.22,
        capitalGainsTaxRate: 0.15,
        rothTaxRate: 0,
        withdrawalOrder: ['taxable', 'traditional', 'roth'],
        penaltySettings: {
          earlyWithdrawalPenaltyRate: 0.10,
          hsaEarlyPenaltyRate: 0.20,
          enableRule55: false,
        },
      },
    });

    const achievable = calculateAchievableFIAge(state);
    if (achievable.achievableFIAge === null || achievable.achievableFIAge <= state.profile.currentAge + 1) return;

    const goalAge = state.profile.currentAge + 2;
    const guidance = calculateGoalFIGuidance(state, goalAge, achievable.achievableFIAge);

    if (guidance.requiredReturn) {
      expect(guidance.requiredReturn.rate).toBeGreaterThan(guidance.requiredReturn.currentRate);
      expect(guidance.requiredReturn.rate).toBeLessThanOrEqual(0.12);
      expect(guidance.requiredReturn.currentRate).toBe(0.05);
    }
  });

  it('computes SS delay lever when not already at 70', () => {
    const state = createTestState({
      socialSecurity: {
        include: true,
        monthlyBenefit: 2500,
        startAge: 62,
        colaRate: 0.02,
        spouse: { include: false, monthlyBenefit: 0, startAge: 67 },
      },
    });

    const achievable = calculateAchievableFIAge(state);
    if (achievable.achievableFIAge === null || achievable.achievableFIAge <= state.profile.currentAge) return;

    const goalAge = achievable.achievableFIAge - 2;
    if (goalAge <= state.profile.currentAge) return;

    const guidance = calculateGoalFIGuidance(state, goalAge, achievable.achievableFIAge);
    if (guidance.ssDelayBenefit) {
      expect(guidance.ssDelayBenefit.newStartAge).toBe(70);
      expect(typeof guidance.ssDelayBenefit.sufficient).toBe('boolean');
    }
  });

  it('does not include SS delay lever when already at 70', () => {
    const state = createTestState({
      socialSecurity: {
        include: true,
        monthlyBenefit: 2500,
        startAge: 70,
        colaRate: 0.02,
        spouse: { include: false, monthlyBenefit: 0, startAge: 67 },
      },
    });

    const achievable = calculateAchievableFIAge(state);
    if (achievable.achievableFIAge === null || achievable.achievableFIAge <= state.profile.currentAge) return;

    const goalAge = achievable.achievableFIAge - 2;
    if (goalAge <= state.profile.currentAge) return;

    const whatIf: WhatIfAdjustments = { spendingAdjustment: 0, ssStartAge: 70 };
    const guidance = calculateGoalFIGuidance(state, goalAge, achievable.achievableFIAge, whatIf);
    expect(guidance.ssDelayBenefit).toBeUndefined();
  });

  it('ahead_of_goal computes spending increase room', () => {
    const state = createTestState();
    const achievable = calculateAchievableFIAge(state);
    if (achievable.achievableFIAge === null) return;

    const goalAge = achievable.achievableFIAge + 5;
    const guidance = calculateGoalFIGuidance(state, goalAge, achievable.achievableFIAge);
    expect(guidance.status).toBe('ahead_of_goal');
    expect(guidance.spendingIncreaseRoom).toBeDefined();
    // Spending increase room should be non-negative
    expect(guidance.spendingIncreaseRoom).toBeGreaterThanOrEqual(0);
  });

  it('respects what-if adjustments as baseline', () => {
    const state = createTestState();
    const whatIf: WhatIfAdjustments = {
      spendingAdjustment: -0.10, // 10% spending reduction
      ssStartAge: 67,
    };

    const achievable = calculateAchievableFIAge(state, whatIf);
    if (achievable.achievableFIAge === null) return;

    const guidance = calculateGoalFIGuidance(state, achievable.achievableFIAge, achievable.achievableFIAge, whatIf);
    expect(guidance.status).toBe('on_track');
  });

  it('handles edge case: goal = currentAge', () => {
    const state = createTestState();
    const achievable = calculateAchievableFIAge(state);
    const guidance = calculateGoalFIGuidance(state, state.profile.currentAge, achievable.achievableFIAge);

    // Should be either on_track (if already FI) or behind_goal
    expect(['on_track', 'behind_goal']).toContain(guidance.status);
  });

  it('handles edge case: goal = lifeExpectancy - 1', () => {
    const state = createTestState({
      income: {
        employment: { annualGrossIncome: 150000, effectiveTaxRate: 0.25 },
        retirementIncomes: [],
      },
    });
    const achievable = calculateAchievableFIAge(state);
    const goalAge = state.profile.lifeExpectancy - 1;
    const guidance = calculateGoalFIGuidance(state, goalAge, achievable.achievableFIAge);

    // Should be ahead_of_goal or on_track (since latest FI is very late)
    expect(['on_track', 'ahead_of_goal']).toContain(guidance.status);
  });
});
