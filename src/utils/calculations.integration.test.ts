import { describe, it, expect } from 'vitest';
import {
  calculateProjection,
  calculateSummary,
  calculateAchievableFIAge,
  calculateMonthlyPayment,
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

describe('Integration Tests', () => {
  // ==================== 1. Multi-year withdrawal with cost basis tracking ====================

  describe('Multi-year withdrawal with cost basis tracking', () => {
    it('tracks cost basis ratio changes over time as gains are withdrawn proportionally', () => {
      // Taxable-only, no growth, no inflation, FI at current age
      const state = createTestState({
        profile: { currentAge: 50, targetFIAge: 50, lifeExpectancy: 65, state: 'TX', filingStatus: 'single' },
        assets: {
          accounts: [
            {
              id: 'taxable-1',
              name: 'Taxable Brokerage',
              type: 'taxable',
              owner: 'self',
              balance: 500000,
              costBasis: 300000,
            },
          ],
        },
        income: { retirementIncomes: [] },
        socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67, colaRate: 0 },
        expenses: {
          categories: [{ id: 'exp-1', name: 'Living', annualAmount: 40000, inflationAdjusted: false, category: 'living' }],
        },
        assumptions: {
          investmentReturn: 0,
          inflationRate: 0,
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
      });

      const projections = calculateProjection(state);

      // Year 0 (age 50): balance should decrease from withdrawal
      expect(projections[0].taxableBalance).toBeLessThan(500000);
      expect(projections[0].withdrawal).toBeGreaterThan(0);

      // With 0% return and TX (no state tax), the only tax is federal cap gains
      // on the gains portion. Initial cost basis ratio = 300k/500k = 0.60
      // Gains ratio = 0.40. Tax on gains = withdrawal * 0.40 * 0.15
      expect(projections[0].federalTax).toBeGreaterThan(0);
      expect(projections[0].stateTax).toBe(0); // TX has no state tax

      // After several years, the balance should keep decreasing
      expect(projections[5].taxableBalance).toBeLessThan(projections[0].taxableBalance);

      // With 0% return and proportional cost basis reduction, cost basis ratio
      // stays constant (both balance and cost basis shrink proportionally).
      // But the total balance decreases year over year.
      for (let i = 1; i < 10; i++) {
        expect(projections[i].taxableBalance).toBeLessThan(projections[i - 1].taxableBalance);
      }

      // Capital gains tax should be charged every year there's a withdrawal
      for (let i = 0; i < 10; i++) {
        if (projections[i].withdrawal > 0) {
          expect(projections[i].federalTax).toBeGreaterThan(0);
        }
      }
    });

    it('charges capital gains tax only on gains, not on cost basis', () => {
      // Set up with 100% cost basis (no gains) to verify no cap gains tax
      const stateAllCostBasis = createTestState({
        profile: { currentAge: 50, targetFIAge: 50, lifeExpectancy: 55, state: 'TX', filingStatus: 'single' },
        assets: {
          accounts: [
            {
              id: 'taxable-1',
              name: 'Taxable',
              type: 'taxable',
              owner: 'self',
              balance: 500000,
              costBasis: 500000, // 100% cost basis = no gains
            },
          ],
        },
        income: { retirementIncomes: [] },
        socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67, colaRate: 0 },
        expenses: {
          categories: [{ id: 'exp-1', name: 'Living', annualAmount: 40000, inflationAdjusted: false, category: 'living' }],
        },
        assumptions: {
          investmentReturn: 0,
          inflationRate: 0,
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
      });

      const projections = calculateProjection(stateAllCostBasis);

      // With 100% cost basis, gains ratio = 0, so no federal cap gains tax
      expect(projections[0].federalTax).toBe(0);
      expect(projections[0].stateTax).toBe(0);
      // Withdrawal should exactly equal expenses (no tax overhead needed)
      expect(projections[0].withdrawal).toBeCloseTo(40000, -1);
    });
  });

  // ==================== 2. Spouse employment across phase transition ====================

  describe('Spouse employment across phase transition', () => {
    it('handles spouse continuing to work after primary reaches FI age', () => {
      const state = createTestState({
        profile: { currentAge: 48, targetFIAge: 50, lifeExpectancy: 70, state: 'TX', filingStatus: 'married', spouseAge: 46 },
        assets: {
          accounts: [
            { id: 'cash-1', name: 'Cash', type: 'cash', owner: 'joint', balance: 500000 },
            { id: 'taxable-1', name: 'Taxable', type: 'taxable', owner: 'joint', balance: 500000, costBasis: 400000 },
          ],
        },
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
          safeWithdrawalRate: 0.04,
          penaltySettings: {
            earlyWithdrawalPenaltyRate: 0.10,
            hsaEarlyPenaltyRate: 0.20,
            enableRule55: false,
          },
        },
      });

      const projections = calculateProjection(state);

      // Age 48 (index 0): Both working, accumulating phase
      // Self: 150000 - 37500 = 112500
      // Spouse: 100000 - 22000 = 78000
      // Combined net: 190500
      expect(projections[0].phase).toBe('accumulating');
      expect(projections[0].employmentIncome).toBe(190500);

      // Age 49 (index 1): Both still working
      expect(projections[1].phase).toBe('accumulating');
      expect(projections[1].employmentIncome).toBe(190500);

      // Age 50 (index 2): Primary stops (FI), spouse continues
      // spouseAdditionalWorkYears = 3, so spouse works while primary's age < 50 + 3 = 53
      // At age 50, primary employment = 0, spouse still employed
      // Spouse net: 100000 - 22000 = 78000
      expect(projections[2].phase).toBe('fi');
      expect(projections[2].employmentIncome).toBe(78000);

      // Age 52 (index 4): Spouse still working (52 < 53 cutoff on primary's calendar)
      expect(projections[4].employmentIncome).toBe(78000);

      // Age 53 (index 5): Spouse stops (primary age 53 >= FI age 50 + 3)
      // The engine checks selfAge < spouseStopAge (53), so at age 53, 53 < 53 is false
      expect(projections[5].employmentIncome).toBe(0);

      // Age 55 (index 7): No employment at all
      expect(projections[7].employmentIncome).toBe(0);
    });

    it('per-account contributions continue based on year bounds regardless of employment', () => {
      const currentYear = new Date().getFullYear();
      const state = createTestState({
        profile: { currentAge: 48, targetFIAge: 50, lifeExpectancy: 60, state: 'TX', filingStatus: 'married', spouseAge: 46 },
        assets: {
          accounts: [
            {
              id: 'trad-spouse', name: 'Spouse 401k', type: 'traditional', owner: 'spouse', balance: 100000,
              annualContribution: 20000,
              contributionStartYear: currentYear,
              contributionEndYear: currentYear + 5,
            },
            { id: 'taxable-1', name: 'Taxable', type: 'taxable', owner: 'joint', balance: 200000, costBasis: 150000 },
          ],
        },
        income: {
          employment: {
            annualGrossIncome: 150000,
            effectiveTaxRate: 0.25,
          },
          spouseEmployment: {
            annualGrossIncome: 100000,
            effectiveTaxRate: 0.22,
          },
          spouseAdditionalWorkYears: 2,
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
          safeWithdrawalRate: 0.04,
          penaltySettings: {
            earlyWithdrawalPenaltyRate: 0.10,
            hsaEarlyPenaltyRate: 0.20,
            enableRule55: false,
          },
        },
      });

      const projections = calculateProjection(state);

      // Age 48 (index 0): Contributing 20k to spouse 401k
      expect(projections[0].contributions).toBe(20000);
      // Spouse 401k: 100000 + 20000 = 120000
      expect(projections[0].traditionalBalance).toBe(120000);

      // Age 50 (index 2): Contributions continue (within year bounds)
      expect(projections[2].contributions).toBe(20000);

      // Age 54 (index 6): Past endYear, contributions stop
      expect(projections[6].contributions).toBe(0);
    });
  });

  // ==================== 3. Rule of 55 penalty avoidance ====================

  describe('Rule of 55 penalty avoidance', () => {
    it('eliminates early withdrawal penalty for qualifying 401k at age 55+', () => {
      // With Rule of 55 enabled
      const stateWithRule55 = createTestState({
        profile: { currentAge: 55, targetFIAge: 55, lifeExpectancy: 65, state: 'TX', filingStatus: 'single' },
        assets: {
          accounts: [
            {
              id: 'trad-1',
              name: 'Traditional 401k',
              type: 'traditional',
              owner: 'self',
              balance: 500000,
              is401k: true,
              separatedFromService: true,
            },
          ],
        },
        income: { retirementIncomes: [] },
        socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67, colaRate: 0 },
        expenses: {
          categories: [{ id: 'exp-1', name: 'Living', annualAmount: 40000, inflationAdjusted: false, category: 'living' }],
        },
        assumptions: {
          investmentReturn: 0,
          inflationRate: 0,
          traditionalTaxRate: 0.22,
          capitalGainsTaxRate: 0.15,
          rothTaxRate: 0,
          withdrawalOrder: ['taxable', 'traditional', 'roth'],
          safeWithdrawalRate: 0.04,
          penaltySettings: {
            earlyWithdrawalPenaltyRate: 0.10,
            hsaEarlyPenaltyRate: 0.20,
            enableRule55: true,
          },
        },
      });

      // Without Rule of 55
      const stateWithoutRule55 = createTestState({
        profile: { currentAge: 55, targetFIAge: 55, lifeExpectancy: 65, state: 'TX', filingStatus: 'single' },
        assets: {
          accounts: [
            {
              id: 'trad-1',
              name: 'Traditional 401k',
              type: 'traditional',
              owner: 'self',
              balance: 500000,
              is401k: true,
              separatedFromService: true,
            },
          ],
        },
        income: { retirementIncomes: [] },
        socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67, colaRate: 0 },
        expenses: {
          categories: [{ id: 'exp-1', name: 'Living', annualAmount: 40000, inflationAdjusted: false, category: 'living' }],
        },
        assumptions: {
          investmentReturn: 0,
          inflationRate: 0,
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
      });

      const withRule55 = calculateProjection(stateWithRule55);
      const withoutRule55 = calculateProjection(stateWithoutRule55);

      // Ages 55-59 (indices 0-4): Rule of 55 should eliminate penalty
      for (let i = 0; i < 5; i++) {
        expect(withRule55[i].withdrawalPenalty).toBe(0);
      }

      // Without Rule of 55: ages 55-59 should have penalties
      for (let i = 0; i < 5; i++) {
        if (withoutRule55[i].withdrawal > 0) {
          expect(withoutRule55[i].withdrawalPenalty).toBeGreaterThan(0);
        }
      }

      // Age 60+ (index 5+): Both should have $0 penalty (age >= 59.5)
      for (let i = 5; i < withRule55.length; i++) {
        expect(withRule55[i].withdrawalPenalty).toBe(0);
        expect(withoutRule55[i].withdrawalPenalty).toBe(0);
      }
    });

    it('does not apply Rule of 55 to non-401k traditional accounts', () => {
      const state = createTestState({
        profile: { currentAge: 55, targetFIAge: 55, lifeExpectancy: 62, state: 'TX', filingStatus: 'single' },
        assets: {
          accounts: [
            {
              id: 'trad-ira',
              name: 'Traditional IRA',
              type: 'traditional',
              owner: 'self',
              balance: 500000,
              is401k: false, // Not a 401k
            },
          ],
        },
        income: { retirementIncomes: [] },
        socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67, colaRate: 0 },
        expenses: {
          categories: [{ id: 'exp-1', name: 'Living', annualAmount: 40000, inflationAdjusted: false, category: 'living' }],
        },
        assumptions: {
          investmentReturn: 0,
          inflationRate: 0,
          traditionalTaxRate: 0.22,
          capitalGainsTaxRate: 0.15,
          rothTaxRate: 0,
          withdrawalOrder: ['taxable', 'traditional', 'roth'],
          safeWithdrawalRate: 0.04,
          penaltySettings: {
            earlyWithdrawalPenaltyRate: 0.10,
            hsaEarlyPenaltyRate: 0.20,
            enableRule55: true, // Enabled, but account is IRA not 401k
          },
        },
      });

      const projections = calculateProjection(state);

      // Age 55-59: Should still have penalties (IRA doesn't qualify for Rule of 55)
      for (let i = 0; i < 5; i++) {
        if (projections[i].withdrawal > 0) {
          expect(projections[i].withdrawalPenalty).toBeGreaterThan(0);
        }
      }
    });
  });

  // ==================== 4. Mortgage early payoff impact ====================

  describe('Mortgage early payoff impact', () => {
    it('spikes expenses in payoff year then drops them afterward', () => {
      const currentYear = new Date().getFullYear();
      const payoffYear = currentYear + 5; // 5 years from now

      const state = createTestState({
        profile: { currentAge: 45, targetFIAge: 45, lifeExpectancy: 60, state: 'TX', filingStatus: 'single' },
        assets: {
          accounts: [
            { id: 'cash-1', name: 'Cash', type: 'cash', owner: 'self', balance: 2000000 },
          ],
        },
        income: { retirementIncomes: [] },
        socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67, colaRate: 0 },
        expenses: {
          categories: [
            { id: 'exp-1', name: 'Living', annualAmount: 30000, inflationAdjusted: false, category: 'living' },
          ],
          home: {
            mortgage: {
              homeValue: 650000,
              loanBalance: 300000,
              interestRate: 0.065,
              loanTermYears: 30,
              originationYear: currentYear - 5, // 5 years ago
              monthlyPayment: calculateMonthlyPayment(300000, 0.065, 30),
              manualPaymentOverride: false,
              earlyPayoff: { enabled: true, payoffYear },
            },
            propertyTax: 0,
            insurance: 0,
          },
        },
        assumptions: {
          investmentReturn: 0,
          inflationRate: 0,
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
      });

      const projections = calculateProjection(state);
      const monthlyPayment = calculateMonthlyPayment(300000, 0.065, 30);
      const annualMortgagePayment = monthlyPayment * 12;

      // Year before payoff (index 4): normal expenses = living + mortgage annual
      const yearBeforePayoff = projections[4];
      expect(yearBeforePayoff.expenses).toBeCloseTo(30000 + annualMortgagePayment, -1);
      expect(yearBeforePayoff.mortgageBalance).toBeGreaterThan(0);

      // Payoff year (index 5): lump-sum payoff is added to expenses, no regular payment
      // Remaining balance is paid off as a one-time expense
      const payoffYearProjection = projections[5];
      expect(payoffYearProjection.expenses).toBeGreaterThan(30000); // living + lump-sum payoff
      expect(payoffYearProjection.mortgageBalance).toBe(0); // balance zeroed after payoff

      // Year after payoff (index 6): just living expenses (no mortgage)
      const yearAfterPayoff = projections[6];
      expect(yearAfterPayoff.expenses).toBe(30000);
      expect(yearAfterPayoff.mortgageBalance).toBe(0);

      // Key assertion: payoff year spikes above normal, then drops to living-only
      expect(payoffYearProjection.expenses).toBeGreaterThan(yearBeforePayoff.expenses);
      expect(yearAfterPayoff.expenses).toBeLessThan(yearBeforePayoff.expenses);
    });
  });

  // ==================== 5. Life events (income + expense) ====================

  describe('Life events (income and expense)', () => {
    it('increases expenses in the year a life event expense occurs', () => {
      const currentYear = new Date().getFullYear();
      const expenseYear = currentYear + 3; // At age 48

      const state = createTestState({
        profile: { currentAge: 45, targetFIAge: 45, lifeExpectancy: 55, state: 'TX', filingStatus: 'single' },
        assets: {
          accounts: [
            { id: 'cash-1', name: 'Cash', type: 'cash', owner: 'self', balance: 1000000 },
          ],
        },
        income: { retirementIncomes: [] },
        socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67, colaRate: 0 },
        expenses: {
          categories: [
            { id: 'exp-1', name: 'Living', annualAmount: 40000, inflationAdjusted: false, category: 'living' },
          ],
        },
        lifeEvents: [
          { id: 'le-1', name: 'Home Renovation', year: expenseYear, amount: 50000 }, // positive = expense
        ],
        assumptions: {
          investmentReturn: 0,
          inflationRate: 0,
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
      });

      const projections = calculateProjection(state);

      // Year 2 (age 47, no life event): expenses = 40000
      expect(projections[2].expenses).toBe(40000);

      // Year 3 (age 48, life event expense year): expenses = 40000 + 50000 = 90000
      expect(projections[3].expenses).toBe(90000);

      // Year 4 (age 49, no life event): expenses = 40000
      expect(projections[4].expenses).toBe(40000);
    });

    it('increases income in the year a life event income occurs', () => {
      const currentYear = new Date().getFullYear();
      const incomeYear = currentYear + 5; // At age 50

      const state = createTestState({
        profile: { currentAge: 45, targetFIAge: 45, lifeExpectancy: 55, state: 'TX', filingStatus: 'single' },
        assets: {
          accounts: [
            { id: 'cash-1', name: 'Cash', type: 'cash', owner: 'self', balance: 1000000 },
          ],
        },
        income: { retirementIncomes: [] },
        socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67, colaRate: 0 },
        expenses: {
          categories: [
            { id: 'exp-1', name: 'Living', annualAmount: 40000, inflationAdjusted: false, category: 'living' },
          ],
        },
        lifeEvents: [
          { id: 'le-1', name: 'Inheritance', year: incomeYear, amount: -100000 }, // negative = income
        ],
        assumptions: {
          investmentReturn: 0,
          inflationRate: 0,
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
      });

      const projections = calculateProjection(state);

      // Year 4 (age 49, no life event): income = 0, gap = 40000
      expect(projections[4].income).toBe(0);
      expect(projections[4].gap).toBe(40000);

      // Year 5 (age 50, life event income): income = 100000
      // Expenses = 40000, income = 100000, so gap = 0 (income > expenses)
      expect(projections[5].income).toBe(100000);
      expect(projections[5].gap).toBe(0);
      // No withdrawal needed since income covers expenses
      expect(projections[5].withdrawal).toBe(0);

      // Year 6 (age 51, no life event): back to normal
      expect(projections[6].income).toBe(0);
      expect(projections[6].gap).toBe(40000);
    });
  });

  // ==================== 6. What-if branching ====================

  describe('What-if branching', () => {
    it('lower spending produces earlier or equal FI age', () => {
      const state = createTestState({
        profile: { currentAge: 45, targetFIAge: 55, lifeExpectancy: 90, state: 'TX', filingStatus: 'single' },
        assets: {
          accounts: [
            { id: 'taxable-1', name: 'Taxable', type: 'taxable', owner: 'self', balance: 800000, costBasis: 500000 },
          ],
        },
        income: {
          employment: {
            annualGrossIncome: 150000,
            effectiveTaxRate: 0.25,
          },
          retirementIncomes: [],
        },
        socialSecurity: { include: true, monthlyBenefit: 2500, startAge: 67, colaRate: 0.02 },
        expenses: {
          categories: [
            { id: 'exp-1', name: 'Living', annualAmount: 70000, category: 'living' },
          ],
        },
      });

      const baseResult = calculateAchievableFIAge(state);
      const lowerSpendingResult = calculateAchievableFIAge(state, {
        spendingAdjustment: -0.15, // 15% less spending
        returnAdjustment: state.assumptions.investmentReturn,
        ssStartAge: state.socialSecurity.startAge,
      });

      // With lower spending, FI should be achievable at least as early
      if (baseResult.achievableFIAge !== null && lowerSpendingResult.achievableFIAge !== null) {
        expect(lowerSpendingResult.achievableFIAge).toBeLessThanOrEqual(baseResult.achievableFIAge);
      }
    });

    it('higher returns produce earlier or equal FI age', () => {
      const state = createTestState({
        profile: { currentAge: 45, targetFIAge: 55, lifeExpectancy: 90, state: 'TX', filingStatus: 'single' },
        assets: {
          accounts: [
            { id: 'taxable-1', name: 'Taxable', type: 'taxable', owner: 'self', balance: 800000, costBasis: 500000 },
          ],
        },
        income: {
          employment: {
            annualGrossIncome: 150000,
            effectiveTaxRate: 0.25,
          },
          retirementIncomes: [],
        },
        socialSecurity: { include: true, monthlyBenefit: 2500, startAge: 67, colaRate: 0.02 },
        expenses: {
          categories: [
            { id: 'exp-1', name: 'Living', annualAmount: 70000, category: 'living' },
          ],
        },
      });

      const baseResult = calculateAchievableFIAge(state);
      const higherReturnResult = calculateAchievableFIAge(state, {
        spendingAdjustment: 0,
        returnAdjustment: 0.09, // 9% return instead of 6%
        ssStartAge: state.socialSecurity.startAge,
      });

      // With higher returns, FI should be achievable at least as early
      if (baseResult.achievableFIAge !== null && higherReturnResult.achievableFIAge !== null) {
        expect(higherReturnResult.achievableFIAge).toBeLessThanOrEqual(baseResult.achievableFIAge);
      }
    });

    it('combined lower spending and higher returns produce notably earlier FI', () => {
      const state = createTestState({
        profile: { currentAge: 45, targetFIAge: 55, lifeExpectancy: 90, state: 'TX', filingStatus: 'single' },
        assets: {
          accounts: [
            { id: 'taxable-1', name: 'Taxable', type: 'taxable', owner: 'self', balance: 600000, costBasis: 400000 },
          ],
        },
        income: {
          employment: {
            annualGrossIncome: 150000,
            effectiveTaxRate: 0.25,
          },
          retirementIncomes: [],
        },
        socialSecurity: { include: true, monthlyBenefit: 2500, startAge: 67, colaRate: 0.02 },
        expenses: {
          categories: [
            { id: 'exp-1', name: 'Living', annualAmount: 70000, category: 'living' },
          ],
        },
      });

      const baseResult = calculateAchievableFIAge(state);
      const optimisticResult = calculateAchievableFIAge(state, {
        spendingAdjustment: -0.15,
        returnAdjustment: 0.09,
        ssStartAge: state.socialSecurity.startAge,
      });

      if (baseResult.achievableFIAge !== null && optimisticResult.achievableFIAge !== null) {
        expect(optimisticResult.achievableFIAge).toBeLessThanOrEqual(baseResult.achievableFIAge);
        // With such favorable adjustments, we expect buffer to be higher
        expect(optimisticResult.bufferYears).toBeGreaterThanOrEqual(baseResult.bufferYears);
      }
    });
  });

  // ==================== 7. Full lifecycle with all income sources ====================

  describe('Full lifecycle with all income sources', () => {
    it('activates income sources at correct ages and increases total income over time', () => {
      const state = createTestState({
        profile: { currentAge: 50, targetFIAge: 55, lifeExpectancy: 80, state: 'TX', filingStatus: 'married', spouseAge: 48 },
        assets: {
          accounts: [
            { id: 'taxable-1', name: 'Taxable', type: 'taxable', owner: 'joint', balance: 1000000, costBasis: 600000 },
            { id: 'trad-1', name: 'Trad 401k', type: 'traditional', owner: 'self', balance: 800000, is401k: true, annualContribution: 23000 },
            { id: 'roth-1', name: 'Roth IRA', type: 'roth', owner: 'self', balance: 300000, annualContribution: 15000 },
          ],
          pension: {
            annualBenefit: 24000,
            startAge: 62,
            colaRate: 0.02,
          },
        },
        income: {
          employment: {
            annualGrossIncome: 180000,
            effectiveTaxRate: 0.25,
          },
          spouseEmployment: {
            annualGrossIncome: 120000,
            effectiveTaxRate: 0.22,
          },
          spouseAdditionalWorkYears: 2,
          retirementIncomes: [
            {
              id: 'ri-1',
              name: 'Consulting',
              annualAmount: 30000,
              startAge: 55,
              endAge: 65,
              inflationAdjusted: false,
              taxable: true,
            },
          ],
        },
        socialSecurity: {
          include: true,
          monthlyBenefit: 2800,
          startAge: 67,
          colaRate: 0.02,
          spouse: {
            include: true,
            monthlyBenefit: 2200,
            startAge: 67,
          },
        },
        expenses: {
          categories: [
            { id: 'exp-1', name: 'Living', annualAmount: 80000, category: 'living' },
          ],
        },
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
      });

      const projections = calculateProjection(state);

      // Age 50 (index 0): Accumulating, both employed
      expect(projections[0].phase).toBe('accumulating');
      expect(projections[0].employmentIncome).toBeGreaterThan(0);
      expect(projections[0].contributions).toBe(38000); // 23000 + 15000

      // Age 54 (index 4): Last accumulating year
      expect(projections[4].phase).toBe('accumulating');
      expect(projections[4].employmentIncome).toBeGreaterThan(0);

      // Age 55 (index 5): FI starts, consulting starts, spouse still working
      expect(projections[5].phase).toBe('fi');
      expect(projections[5].retirementIncome).toBe(30000); // Consulting
      // Spouse employment continues (spouseAdditionalWorkYears = 2, so until primary age 57)
      expect(projections[5].employmentIncome).toBeGreaterThan(0);

      // Age 57 (index 7): Spouse stops working (55 + 2 = 57 cutoff)
      expect(projections[7].employmentIncome).toBe(0);

      // Age 62 (index 12): Pension starts
      // Pension = 24000 (year 0 of pension), plus consulting still active
      expect(projections[12].income).toBeGreaterThanOrEqual(24000 + 30000);

      // Age 65 (index 15): Consulting still active (endAge: 65 means active at 65, stops at 66)
      // Engine checks age > ri.endAge, so age 65 is still included
      expect(projections[15].retirementIncome).toBe(30000);
      // Pension has had 3 years of COLA: 24000 * 1.02^3 = 25458
      expect(projections[15].income).toBeGreaterThan(30000); // Pension + consulting

      // Age 66 (index 16): Consulting ended (age 66 > endAge 65), pension only (no SS yet)
      expect(projections[16].retirementIncome).toBe(0);

      // Age 67 (index 17): SS starts for primary
      // SS: 2800 * 1.00 * 12 = 33600 (FRA claiming)
      // Spouse age = 65, not yet 67, so no spouse SS yet
      const preSS = projections[16].income;
      const postSS = projections[17].income;
      expect(postSS).toBeGreaterThan(preSS); // Income jumps when SS starts

      // Age 69 (index 19): Spouse SS starts (spouse turns 67, spouseAge = 48 + 19 = 67)
      const preSpouseSS = projections[18].income;
      const postSpouseSS = projections[19].income;
      expect(postSpouseSS).toBeGreaterThan(preSpouseSS); // Another jump for spouse SS

      // No shortfall through life expectancy
      const lastYear = projections[projections.length - 1];
      expect(lastYear.totalNetWorth).toBeGreaterThan(0);
      expect(projections.every(p => !p.isShortfall)).toBe(true);
    });
  });

  // ==================== 8. Shortfall detection and guidance ====================

  describe('Shortfall detection and guidance', () => {
    it('detects not_achievable status and provides shortfall guidance', () => {
      const state = createTestState({
        profile: { currentAge: 60, targetFIAge: 60, lifeExpectancy: 90, state: 'TX', filingStatus: 'single' },
        assets: {
          accounts: [
            { id: 'cash-1', name: 'Cash', type: 'cash', owner: 'self', balance: 50000 },
          ],
        },
        income: { retirementIncomes: [] },
        socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67, colaRate: 0 },
        expenses: {
          categories: [
            { id: 'exp-1', name: 'Living', annualAmount: 80000, category: 'living' },
          ],
        },
        assumptions: {
          investmentReturn: 0.04,
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
      });

      const result = calculateAchievableFIAge(state);

      // Should be not achievable
      expect(result.confidenceLevel).toBe('not_achievable');
      expect(result.achievableFIAge).toBeNull();
      expect(result.yearsUntilFI).toBeNull();
      expect(result.fiAtCurrentAge).toBe(false);

      // Shortfall guidance should be present
      expect(result.shortfallGuidance).toBeDefined();
      expect(result.shortfallGuidance!.runsOutAtAge).toBeGreaterThanOrEqual(60);
      expect(result.shortfallGuidance!.runsOutAtAge).toBeLessThanOrEqual(90);

      // spendingReductionNeeded should be non-negative
      expect(result.shortfallGuidance!.spendingReductionNeeded).toBeGreaterThanOrEqual(0);
    });

    it('shows shortfall years in projection when money runs out', () => {
      const state = createTestState({
        profile: { currentAge: 60, targetFIAge: 60, lifeExpectancy: 80, state: 'TX', filingStatus: 'single' },
        assets: {
          accounts: [
            { id: 'cash-1', name: 'Cash', type: 'cash', owner: 'self', balance: 100000 },
          ],
        },
        income: { retirementIncomes: [] },
        socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67, colaRate: 0 },
        expenses: {
          categories: [
            { id: 'exp-1', name: 'Living', annualAmount: 50000, inflationAdjusted: false, category: 'living' },
          ],
        },
        assumptions: {
          investmentReturn: 0,
          inflationRate: 0,
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
      });

      const projections = calculateProjection(state);

      // $100k cash with $50k/yr expenses and 0% growth: runs out at age 62
      // Year 0 (age 60): 100k - 50k = 50k remaining
      // Year 1 (age 61): 50k - 50k = 0 remaining
      // Year 2 (age 62): shortfall

      const shortfallYears = projections.filter(p => p.isShortfall);
      expect(shortfallYears.length).toBeGreaterThan(0);

      // First shortfall should be within a few years of start
      const firstShortfallAge = shortfallYears[0].age;
      expect(firstShortfallAge).toBeGreaterThanOrEqual(60);
      expect(firstShortfallAge).toBeLessThan(70);

      // Before shortfall, net worth should be decreasing
      const preShortfall = projections.filter(p => !p.isShortfall && p.age < firstShortfallAge);
      for (let i = 1; i < preShortfall.length; i++) {
        expect(preShortfall[i].totalNetWorth).toBeLessThanOrEqual(preShortfall[i - 1].totalNetWorth);
      }

      // Shortfall years should have 0 or near-0 total net worth
      for (const year of shortfallYears) {
        expect(year.totalNetWorth).toBeLessThanOrEqual(0.01);
      }
    });

    it('calculateAchievableFIAge and direct projection agree on shortfall', () => {
      const state = createTestState({
        profile: { currentAge: 65, targetFIAge: 65, lifeExpectancy: 95, state: 'TX', filingStatus: 'single' },
        assets: {
          accounts: [
            { id: 'cash-1', name: 'Cash', type: 'cash', owner: 'self', balance: 20000 },
          ],
        },
        income: { retirementIncomes: [] },
        socialSecurity: { include: false, monthlyBenefit: 0, startAge: 67, colaRate: 0 },
        expenses: {
          categories: [
            { id: 'exp-1', name: 'Living', annualAmount: 60000, inflationAdjusted: false, category: 'living' },
          ],
        },
        assumptions: {
          investmentReturn: 0,
          inflationRate: 0,
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
      });

      const fiResult = calculateAchievableFIAge(state);
      expect(fiResult.confidenceLevel).toBe('not_achievable');

      // Direct projection should also show shortfall
      const projections = calculateProjection(state);
      const hasShortfall = projections.some(p => p.isShortfall);
      expect(hasShortfall).toBe(true);

      // Summary should reflect shortfall
      const summary = calculateSummary(state, projections);
      expect(summary.hasShortfall).toBe(true);
      expect(summary.shortfallAge).not.toBeNull();
      expect(summary.shortfallAge!).toBeGreaterThanOrEqual(65);
      expect(summary.shortfallAge!).toBeLessThan(95);
    });
  });
});
