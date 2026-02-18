import { describe, it } from 'vitest';
import type { AppState } from '../types';
import { calculateProjection } from './calculations/projection';
import { calculateAchievableFIAge } from './calculations/fiSearch';

// Exact user scenario for audit
const buildScenarioState = (targetFIAge: number, surplusHandling: 'ignore' | 'route_to_account' = 'ignore'): AppState => ({
  profile: {
    currentAge: 48,
    targetFIAge,
    lifeExpectancy: 95,
    state: 'CA',
    filingStatus: 'married',
    spouseAge: 44,
  },
  assets: {
    accounts: [
      { id: '1', name: 'Brokerage', type: 'taxable', owner: 'self', balance: 207000, costBasis: 130000 },
      { id: '2', name: '401k', type: 'traditional', owner: 'self', balance: 120000 },
      { id: '3', name: 'IRA', type: 'traditional', owner: 'self', balance: 550000 },
      { id: '4', name: 'brokerage', type: 'taxable', owner: 'self', balance: 300000, costBasis: 150000 },
      { id: '5', name: 'retirement accounts', type: 'traditional', owner: 'self', balance: 1200000 },
    ],
  },
  income: {
    employment: { annualGrossIncome: 220000, effectiveTaxRate: 0.25, annualGrowthRate: 0.02 },
    spouseEmployment: { annualGrossIncome: 150000, effectiveTaxRate: 0.25, annualGrowthRate: 0.02 },
    retirementIncomes: [],
  },
  socialSecurity: {
    include: true,
    monthlyBenefit: 2500,
    startAge: 67,
    colaRate: 0.02,
    spouse: { include: true, monthlyBenefit: 2000, startAge: 67 },
  },
  expenses: {
    categories: [
      { id: '1', name: 'all', annualAmount: 80000, category: 'living', endYear: 2031 },
      { id: '2', name: 'all', annualAmount: 100000, category: 'living', startYear: 2031 },
    ],
    home: {
      propertyTax: 15000,
      insurance: 2500,
      mortgage: {
        homeValue: 1100000,
        loanBalance: 400000,
        interestRate: 0.071,
        loanTermYears: 30,
        originationYear: 2023,
        monthlyPayment: 2688.13,
        manualPaymentOverride: false,
        earlyPayoff: { enabled: true, payoffYear: 2031 },
      },
    },
  },
  lifeEvents: [{ id: '1', name: 'Car payoff', year: 2026, amount: 20000 }],
  assumptions: {
    investmentReturn: 0.06,
    inflationRate: 0.03,
    traditionalTaxRate: 0.22,
    capitalGainsTaxRate: 0.15,
    rothTaxRate: 0,
    withdrawalOrder: ['taxable', 'traditional', 'roth'],
    penaltySettings: { earlyWithdrawalPenaltyRate: 0.1, hsaEarlyPenaltyRate: 0.2, enableRule55: false },
    terminalBalanceTarget: 0,
    accumulationSurplusHandling: surplusHandling,
    accumulationSurplusAccountId: surplusHandling === 'route_to_account' ? '1' : undefined,
    fiPhaseReturn: 0.02,
  },
});

function formatCurrency(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US');
}

function logProjectionTable(projections: import('../types').YearProjection[], label: string) {
  console.log(`\n${'='.repeat(120)}`);
  console.log(`  ${label}`);
  console.log(`${'='.repeat(120)}`);

  // Header
  console.log(
    'Age'.padStart(4) + ' | ' +
    'Year'.padStart(5) + ' | ' +
    'Phase'.padEnd(6) + ' | ' +
    'Emp Gross'.padStart(12) + ' | ' +
    'Emp Net'.padStart(12) + ' | ' +
    'Expenses'.padStart(12) + ' | ' +
    'SS'.padStart(10) + ' | ' +
    'Gap'.padStart(12) + ' | ' +
    'Withdrawal'.padStart(12) + ' | ' +
    'Penalty'.padStart(8) + ' | ' +
    'Fed Tax'.padStart(9) + ' | ' +
    'St Tax'.padStart(8) + ' | ' +
    'Taxable'.padStart(12) + ' | ' +
    'Trad'.padStart(12) + ' | ' +
    'Net Worth'.padStart(14) + ' | ' +
    'Shortfall'
  );
  console.log('-'.repeat(190));

  // First 15 years
  const firstN = Math.min(15, projections.length);
  for (let i = 0; i < firstN; i++) {
    logRow(projections[i]);
  }

  // Then every 5 years until last 5
  if (projections.length > 20) {
    console.log('  ... (showing every 5 years) ...');
    for (let i = firstN; i < projections.length - 5; i++) {
      if ((projections[i].age % 5) === 0) {
        logRow(projections[i]);
      }
    }
  }

  // Last 5 years
  console.log('  --- last 5 years ---');
  for (let i = Math.max(0, projections.length - 5); i < projections.length; i++) {
    logRow(projections[i]);
  }
}

function logRow(p: import('../types').YearProjection) {
  console.log(
    String(p.age).padStart(4) + ' | ' +
    String(p.year).padStart(5) + ' | ' +
    p.phase.padEnd(6) + ' | ' +
    formatCurrency(p.employmentIncome).padStart(12) + ' | ' +
    formatCurrency(p.employmentIncome - (p.employmentTax ?? 0)).padStart(12) + ' | ' +
    formatCurrency(p.expenses).padStart(12) + ' | ' +
    formatCurrency(p.ssIncome).padStart(10) + ' | ' +
    formatCurrency(p.gap).padStart(12) + ' | ' +
    formatCurrency(p.withdrawal).padStart(12) + ' | ' +
    formatCurrency(p.withdrawalPenalty).padStart(8) + ' | ' +
    formatCurrency(p.federalTax).padStart(9) + ' | ' +
    formatCurrency(p.stateTax).padStart(8) + ' | ' +
    formatCurrency(p.taxableBalance).padStart(12) + ' | ' +
    formatCurrency(p.traditionalBalance).padStart(12) + ' | ' +
    formatCurrency(p.totalNetWorth).padStart(14) + ' | ' +
    (p.isShortfall ? 'YES' : '')
  );
}

describe('Audit Scenario: $2.38M assets, $370K income, ~$130K expenses', () => {
  it('should show projection at FI age = 55 (surplus ignored)', () => {
    const state = buildScenarioState(55, 'ignore');
    const projections = calculateProjection(state);
    logProjectionTable(projections, 'FI Age = 55, Surplus = IGNORED');

    const shortfalls = projections.filter(p => p.isShortfall);
    const terminal = projections[projections.length - 1];
    console.log(`\nTerminal net worth at age ${terminal.age}: ${formatCurrency(terminal.totalNetWorth)}`);
    console.log(`Shortfall years: ${shortfalls.length}`);
    if (shortfalls.length > 0) {
      console.log(`First shortfall at age ${shortfalls[0].age}`);
    }
  });

  it('should show projection at FI age = 58 (surplus ignored)', () => {
    const state = buildScenarioState(58, 'ignore');
    const projections = calculateProjection(state);
    logProjectionTable(projections, 'FI Age = 58, Surplus = IGNORED');

    const shortfalls = projections.filter(p => p.isShortfall);
    const terminal = projections[projections.length - 1];
    console.log(`\nTerminal net worth at age ${terminal.age}: ${formatCurrency(terminal.totalNetWorth)}`);
    console.log(`Shortfall years: ${shortfalls.length}`);
    if (shortfalls.length > 0) {
      console.log(`First shortfall at age ${shortfalls[0].age}`);
    }
  });

  it('should show projection at FI age = 60 (surplus ignored)', () => {
    const state = buildScenarioState(60, 'ignore');
    const projections = calculateProjection(state);
    logProjectionTable(projections, 'FI Age = 60, Surplus = IGNORED');

    const shortfalls = projections.filter(p => p.isShortfall);
    const terminal = projections[projections.length - 1];
    console.log(`\nTerminal net worth at age ${terminal.age}: ${formatCurrency(terminal.totalNetWorth)}`);
    console.log(`Shortfall years: ${shortfalls.length}`);
    if (shortfalls.length > 0) {
      console.log(`First shortfall at age ${shortfalls[0].age}`);
    }
  });

  it('should show projection at FI age = 62 (surplus ignored)', () => {
    const state = buildScenarioState(62, 'ignore');
    const projections = calculateProjection(state);
    logProjectionTable(projections, 'FI Age = 62, Surplus = IGNORED');

    const shortfalls = projections.filter(p => p.isShortfall);
    const terminal = projections[projections.length - 1];
    console.log(`\nTerminal net worth at age ${terminal.age}: ${formatCurrency(terminal.totalNetWorth)}`);
    console.log(`Shortfall years: ${shortfalls.length}`);
    if (shortfalls.length > 0) {
      console.log(`First shortfall at age ${shortfalls[0].age}`);
    }
  });

  it('should show achievable FI age with surplus IGNORED', () => {
    const state = buildScenarioState(70, 'ignore'); // targetFIAge doesn't matter for search
    const result = calculateAchievableFIAge(state);
    console.log('\n========================================');
    console.log('  calculateAchievableFIAge (surplus IGNORED)');
    console.log('========================================');
    console.log(`Achievable FI Age: ${result.achievableFIAge}`);
    console.log(`Confidence: ${result.confidenceLevel}`);
    console.log(`Buffer years: ${result.bufferYears}`);
    console.log(`Years until FI: ${result.yearsUntilFI}`);
    if (result.shortfallGuidance) {
      console.log(`Shortfall guidance: runs out at ${result.shortfallGuidance.runsOutAtAge}`);
      console.log(`  Spending reduction: ${formatCurrency(result.shortfallGuidance.spendingReductionNeeded)}`);
      console.log(`  Additional savings: ${formatCurrency(result.shortfallGuidance.additionalSavingsNeeded)}`);
    }
  });

  it('should show achievable FI age with surplus ROUTED', () => {
    const state = buildScenarioState(70, 'route_to_account');
    const result = calculateAchievableFIAge(state);
    console.log('\n========================================');
    console.log('  calculateAchievableFIAge (surplus ROUTED)');
    console.log('========================================');
    console.log(`Achievable FI Age: ${result.achievableFIAge}`);
    console.log(`Confidence: ${result.confidenceLevel}`);
    console.log(`Buffer years: ${result.bufferYears}`);
    console.log(`Years until FI: ${result.yearsUntilFI}`);
  });

  it('should show detailed year-by-year for the CRITICAL FI boundary (surplus ignored)', () => {
    // Run achievable to find the boundary
    const state = buildScenarioState(70, 'ignore');
    const result = calculateAchievableFIAge(state);
    const achievable = result.achievableFIAge;
    console.log(`\nAchievable FI age (surplus ignored): ${achievable}`);

    if (achievable !== null) {
      // Show projection at achievable age
      const stateAtAchievable = buildScenarioState(achievable, 'ignore');
      const projections = calculateProjection(stateAtAchievable);
      logProjectionTable(projections, `FI Age = ${achievable} (achievable, surplus IGNORED)`);

      // Also show one year earlier to understand the boundary
      if (achievable > 48) {
        const stateOneEarlier = buildScenarioState(achievable - 1, 'ignore');
        const projOneEarlier = calculateProjection(stateOneEarlier);
        const shortfalls = projOneEarlier.filter(p => p.isShortfall);
        const terminal = projOneEarlier[projOneEarlier.length - 1];
        console.log(`\nFI Age = ${achievable - 1}: terminal = ${formatCurrency(terminal.totalNetWorth)}, shortfalls = ${shortfalls.length}`);
        if (shortfalls.length > 0) {
          console.log(`  First shortfall at age ${shortfalls[0].age}`);
        }
      }
    }
  });

  it('should audit expense calculation in detail', () => {
    console.log('\n========================================');
    console.log('  EXPENSE AUDIT');
    console.log('========================================');

    const state = buildScenarioState(55, 'ignore');
    const projections = calculateProjection(state);

    // Check first few years in detail
    for (let i = 0; i < 10; i++) {
      const p = projections[i];
      const yearsFromNow = p.year - 2026;
      const inflationFactor = Math.pow(1.03, yearsFromNow);

      // Expected category expense
      let expectedCategoryExpense: number;
      if (p.year <= 2031) {
        expectedCategoryExpense = 80000 * inflationFactor;
      } else {
        expectedCategoryExpense = 100000 * inflationFactor;
      }

      // Mortgage: $2688.13/mo * 12 = $32,257.56/yr (until payoff in 2031)
      const mortgageAnnual = 2688.13 * 12;
      const hasMortgage = p.year < 2031; // payoff year = 2031

      // Property tax + insurance, inflation-adjusted
      const propTax = 15000 * inflationFactor;
      const insurance = 2500 * inflationFactor;

      const expectedBase = expectedCategoryExpense + (hasMortgage ? mortgageAnnual : 0) + propTax + insurance;

      // Note: in 2031, mortgage early payoff happens (paid as separate amount, not in totalExpenses base)
      // But the expense column includes mortgagePayoffAmount added to yearExpenses in projection.ts line 171:
      // yearExpenses = expenseResult.totalExpenses + lifeEventTotal + mortgagePayoffExpense

      console.log(`Age ${p.age} (${p.year}): actual expenses = ${formatCurrency(p.expenses)}, ` +
        `expected base ~${formatCurrency(expectedBase)}, ` +
        `inflation factor = ${inflationFactor.toFixed(4)}, ` +
        `mortgage = ${hasMortgage ? 'YES' : 'NO'}`);
    }

    // Check 2031 specifically (mortgage payoff year)
    const payoffYear = projections.find(p => p.year === 2031);
    if (payoffYear) {
      console.log(`\n2031 (mortgage payoff year):`);
      console.log(`  Age: ${payoffYear.age}`);
      console.log(`  Total expenses: ${formatCurrency(payoffYear.expenses)}`);
      console.log(`  Mortgage balance: ${payoffYear.mortgageBalance !== undefined ? formatCurrency(payoffYear.mortgageBalance) : 'N/A'}`);
      console.log(`  Gap: ${formatCurrency(payoffYear.gap)}`);
      console.log(`  Withdrawal: ${formatCurrency(payoffYear.withdrawal)}`);
    }
  });

  it('should audit SS calculations', () => {
    console.log('\n========================================');
    console.log('  SOCIAL SECURITY AUDIT');
    console.log('========================================');

    // Primary: $2500/mo FRA benefit, starts at 67, COLA 2%
    // Spouse: $2000/mo FRA benefit, starts at 67, spouse is 44 now (4 years younger)
    // When primary is 67, spouse is 63 -- spouse SS not yet started
    // Spouse SS starts at 67, which is when primary is 71

    const state = buildScenarioState(55, 'ignore');
    const projections = calculateProjection(state);

    console.log('Primary SS: $2,500/mo at FRA 67 (factor = 1.0)');
    console.log('Spouse SS: $2,000/mo at FRA 67 (factor = 1.0)');
    console.log('Spouse is 4 years younger, so spouse hits 67 when primary is 71');
    console.log('');

    for (const p of projections) {
      if (p.ssIncome > 0 || (p.age >= 65 && p.age <= 75)) {
        const spouseAge = p.age - (48 - 44);
        console.log(`Age ${p.age} (spouse age ${spouseAge}): SS = ${formatCurrency(p.ssIncome)}`);
      }
    }
  });

  it('should audit balance growth during accumulation (surplus ignored)', () => {
    console.log('\n========================================');
    console.log('  BALANCE GROWTH AUDIT (surplus ignored)');
    console.log('========================================');

    const state = buildScenarioState(70, 'ignore'); // FI age = 70 so accumulation until 70
    const projections = calculateProjection(state);

    // Starting balances: taxable=507K, traditional=1,870K
    // With no contributions and 6% return, check year-over-year growth
    for (let i = 0; i < 10; i++) {
      const p = projections[i];
      const taxableGrowth = i > 0 ? ((p.taxableBalance / projections[i-1].taxableBalance) - 1) * 100 : 0;
      const tradGrowth = i > 0 ? ((p.traditionalBalance / projections[i-1].traditionalBalance) - 1) * 100 : 0;

      console.log(`Age ${p.age}: taxable = ${formatCurrency(p.taxableBalance)} (${taxableGrowth.toFixed(1)}% YoY), ` +
        `traditional = ${formatCurrency(p.traditionalBalance)} (${tradGrowth.toFixed(1)}% YoY), ` +
        `total = ${formatCurrency(p.totalNetWorth)}, ` +
        `gap = ${formatCurrency(p.gap)}, employment net = ${formatCurrency(p.employmentIncome - p.employmentTax)}`);
    }

    console.log('\nExpected with pure 6% growth:');
    for (let i = 0; i < 10; i++) {
      const totalExpected = 2377000 * Math.pow(1.06, i);
      console.log(`  Year ${i}: ${formatCurrency(totalExpected)}`);
    }
  });

  it('should show what FI age changes to with 4% FI return instead of 2%', () => {
    const state = buildScenarioState(70, 'ignore');
    // Override FI return to 4%
    const stateWith4pct: AppState = {
      ...state,
      assumptions: { ...state.assumptions, fiPhaseReturn: 0.04 },
    };
    const result = calculateAchievableFIAge(stateWith4pct);
    console.log('\n========================================');
    console.log('  FI return = 4% (was 2%), surplus IGNORED');
    console.log('========================================');
    console.log(`Achievable FI Age: ${result.achievableFIAge}`);
    console.log(`Confidence: ${result.confidenceLevel}`);
    console.log(`Buffer years: ${result.bufferYears}`);

    // Also with 5%
    const stateWith5pct: AppState = {
      ...state,
      assumptions: { ...state.assumptions, fiPhaseReturn: 0.05 },
    };
    const result5 = calculateAchievableFIAge(stateWith5pct);
    console.log(`\nWith 5% FI return: age=${result5.achievableFIAge}, confidence=${result5.confidenceLevel}`);

    // And same as accumulation (6%)
    const stateWith6pct: AppState = {
      ...state,
      assumptions: { ...state.assumptions, fiPhaseReturn: 0.06 },
    };
    const result6 = calculateAchievableFIAge(stateWith6pct);
    console.log(`With 6% FI return: age=${result6.achievableFIAge}, confidence=${result6.confidenceLevel}`);
  });

  it('should show impact of the overlapping expenses in 2031', () => {
    console.log('\n========================================');
    console.log('  OVERLAPPING EXPENSE BUG CHECK');
    console.log('========================================');

    // The user has endYear=2031 on first expense AND startYear=2031 on second
    // So in 2031, BOTH $80K + $100K = $180K are active (before inflation)
    // Is this intentional?

    const state = buildScenarioState(55, 'ignore');
    const projections = calculateProjection(state);

    for (const p of projections.filter(pp => pp.year >= 2029 && pp.year <= 2034)) {
      console.log(`Year ${p.year} (age ${p.age}): expenses = ${formatCurrency(p.expenses)}`);
    }

    // Fix: If we change expense 1 endYear to 2030 (no overlap), what happens?
    const fixedState: AppState = {
      ...state,
      expenses: {
        ...state.expenses,
        categories: [
          { id: '1', name: 'all', annualAmount: 80000, category: 'living', endYear: 2030 },
          { id: '2', name: 'all', annualAmount: 100000, category: 'living', startYear: 2031 },
        ],
      },
    };
    const fixedResult = calculateAchievableFIAge(fixedState);
    console.log(`\nWith fixed expense overlap (endYear 2030): achievable FI age = ${fixedResult.achievableFIAge}`);

    // Even better: fix overlap AND use fiPhaseReturn of 0.04
    const fixedState2: AppState = {
      ...fixedState,
      assumptions: { ...fixedState.assumptions, fiPhaseReturn: 0.04 },
    };
    const fixedResult2 = calculateAchievableFIAge(fixedState2);
    console.log(`With fixed expense overlap + 4% FI return: achievable FI age = ${fixedResult2.achievableFIAge}`);
  });

  it('should verify FI phase depletion rate at 2% return', () => {
    console.log('\n========================================');
    console.log('  FI PHASE DEPLETION ANALYSIS (2% return, 3% inflation)');
    console.log('========================================');

    // At FI, investment return = 2%, inflation = 3%, so real return = -1%
    // This means portfolio shrinks in real terms each year PLUS withdrawals

    const state = buildScenarioState(55, 'ignore');
    const projections = calculateProjection(state);

    // Show FI phase years
    const fiYears = projections.filter(p => p.phase === 'fi');
    console.log(`FI years: ${fiYears.length} (age ${fiYears[0]?.age} to ${fiYears[fiYears.length-1]?.age})`);

    let prevNW = 0;
    for (const p of fiYears) {
      const nwChange = prevNW > 0 ? p.totalNetWorth - prevNW : 0;
      console.log(
        `Age ${p.age}: NW = ${formatCurrency(p.totalNetWorth)}, ` +
        `expenses = ${formatCurrency(p.expenses)}, ` +
        `SS = ${formatCurrency(p.ssIncome)}, ` +
        `gap = ${formatCurrency(p.gap)}, ` +
        `withdrawal = ${formatCurrency(p.withdrawal)}, ` +
        `NW change = ${formatCurrency(nwChange)}`
      );
      prevNW = p.totalNetWorth;
    }
  });
});
