import { useState, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import { WizardNavigation } from '../WizardNavigation';
import { ExpenseEditForm } from '../../inputs/ExpenseEditForm';
import { CurrencyInput, Input, PercentInput, Toggle, Select } from '../../ui';
import { EXPENSE_CATEGORY_LABELS, EXPENSE_CATEGORY_COLORS } from '../../../constants/defaults';
import {
  calculateMonthlyPayment,
  calculateHomeEquity,
  calculateMortgageEndYear,
  calculateMortgageBalanceForYear,
} from '../../../utils/calculations';
import type { Expense, ExpenseCategory, HomeExpense, MortgageDetails } from '../../../types';

function formatCurrencyCompact(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatPercent(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

const LOAN_TERM_OPTIONS = [
  { value: '15', label: '15 years' },
  { value: '20', label: '20 years' },
  { value: '30', label: '30 years' },
];

export function SpendingStep() {
  const { state, dispatch } = useApp();
  const { expenses } = state;
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [hasHome, setHasHome] = useState(!!expenses.home);
  const [showHomeAdvanced, setShowHomeAdvanced] = useState(false);
  const [showMortgageAdvanced, setShowMortgageAdvanced] = useState(false);

  const currentYear = new Date().getFullYear();

  // Calculate totals
  const recurringTotal = expenses.categories.reduce((sum, exp) => {
    const startYear = exp.startYear ?? currentYear;
    const endYear = exp.endYear ?? Infinity;
    if (currentYear >= startYear && currentYear <= endYear) {
      return sum + exp.annualAmount;
    }
    return sum;
  }, 0);

  const homeTotal = expenses.home
    ? (expenses.home.mortgage?.monthlyPayment ?? 0) * 12 +
      expenses.home.propertyTax +
      expenses.home.insurance
    : 0;

  const totalAnnual = recurringTotal + homeTotal;

  // Category breakdown for summary
  const categoryTotals = expenses.categories.reduce((acc, exp) => {
    const startYear = exp.startYear ?? currentYear;
    const endYear = exp.endYear ?? Infinity;
    if (currentYear >= startYear && currentYear <= endYear) {
      acc[exp.category] = (acc[exp.category] || 0) + exp.annualAmount;
    }
    return acc;
  }, {} as Record<ExpenseCategory, number>);

  if (homeTotal > 0) {
    categoryTotals.housing = (categoryTotals.housing || 0) + homeTotal;
  }

  // Mortgage calculations
  const mortgageCalcs = useMemo(() => {
    const mortgage = expenses.home?.mortgage;
    if (!mortgage) return null;

    const calculatedPayment = calculateMonthlyPayment(
      mortgage.loanBalance,
      mortgage.interestRate,
      mortgage.loanTermYears
    );
    const homeEquity = calculateHomeEquity(mortgage.homeValue, mortgage.loanBalance);
    const endYear = calculateMortgageEndYear(mortgage.originationYear, mortgage.loanTermYears);
    const totalMonthly =
      mortgage.monthlyPayment +
      (expenses.home?.propertyTax ?? 0) / 12 +
      (expenses.home?.insurance ?? 0) / 12;

    // Calculate early payoff amount if enabled
    let earlyPayoffAmount: number | undefined;
    if (mortgage.earlyPayoff?.enabled) {
      earlyPayoffAmount = calculateMortgageBalanceForYear(
        mortgage,
        mortgage.earlyPayoff.payoffYear - 1 // Balance at end of year before payoff
      );
    }

    return {
      calculatedPayment,
      homeEquity,
      endYear,
      totalMonthly,
      earlyPayoffAmount,
    };
  }, [expenses.home]);

  const handleAddExpense = (expense: Expense) => {
    dispatch({ type: 'ADD_EXPENSE', payload: expense });
    setIsAdding(false);
  };

  const handleUpdateExpense = (expense: Expense) => {
    dispatch({ type: 'UPDATE_EXPENSE', payload: expense });
    setEditingExpense(null);
  };

  const handleDeleteExpense = (id: string) => {
    dispatch({ type: 'REMOVE_EXPENSE', payload: id });
    setEditingExpense(null);
  };

  const toggleHome = (enabled: boolean) => {
    setHasHome(enabled);
    if (enabled) {
      dispatch({
        type: 'UPDATE_HOME_EXPENSE',
        payload: {
          propertyTax: 0,
          insurance: 0,
          inflationRate: 0.03,
        },
      });
    } else {
      dispatch({ type: 'UPDATE_HOME_EXPENSE', payload: undefined });
    }
  };

  const updateHomeExpense = (updates: Partial<HomeExpense>) => {
    dispatch({
      type: 'UPDATE_HOME_EXPENSE',
      payload: {
        ...expenses.home!,
        ...updates,
      },
    });
  };

  const toggleMortgage = (enabled: boolean) => {
    if (enabled) {
      const defaultMortgage: MortgageDetails = {
        homeValue: 0,
        loanBalance: 0,
        interestRate: 0.065,
        loanTermYears: 30,
        originationYear: currentYear - 5,
        monthlyPayment: 0,
        manualPaymentOverride: false,
        earlyPayoff: undefined,
      };
      updateHomeExpense({ mortgage: defaultMortgage });
    } else {
      updateHomeExpense({ mortgage: undefined });
    }
  };

  const updateMortgage = (updates: Partial<MortgageDetails>) => {
    const mortgage = expenses.home?.mortgage;
    if (!mortgage) return;

    const newMortgage = { ...mortgage, ...updates };

    // Auto-calculate payment if not in manual override mode
    if (!newMortgage.manualPaymentOverride) {
      newMortgage.monthlyPayment = calculateMonthlyPayment(
        newMortgage.loanBalance,
        newMortgage.interestRate,
        newMortgage.loanTermYears
      );
    }

    updateHomeExpense({ mortgage: newMortgage });
  };

  const toggleManualPayment = (enabled: boolean) => {
    const mortgage = expenses.home?.mortgage;
    if (!mortgage) return;

    if (enabled) {
      // Keep current payment when switching to manual
      updateMortgage({ manualPaymentOverride: true });
    } else {
      // Recalculate payment when switching back to auto
      const calculatedPayment = calculateMonthlyPayment(
        mortgage.loanBalance,
        mortgage.interestRate,
        mortgage.loanTermYears
      );
      updateMortgage({
        manualPaymentOverride: false,
        monthlyPayment: calculatedPayment,
      });
    }
  };

  const toggleEarlyPayoff = (enabled: boolean) => {
    const mortgage = expenses.home?.mortgage;
    if (!mortgage) return;

    if (enabled) {
      // Default to 5 years from now
      updateMortgage({
        earlyPayoff: {
          enabled: true,
          payoffYear: currentYear + 5,
        },
      });
    } else {
      updateMortgage({ earlyPayoff: undefined });
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-text-primary mb-2">
          Your Expenses
        </h1>
        <p className="text-text-secondary">
          Break down your spending into categories. Each expense can have its own timeline and inflation rate.
        </p>
      </div>

      {/* Hero: Total Annual Expenses */}
      <div className="bg-bg-secondary border border-border-subtle rounded-xl p-5 mb-6 relative overflow-hidden">
        {/* Gradient line at top */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{
            background: `linear-gradient(90deg,
              ${EXPENSE_CATEGORY_COLORS.housing} 0%,
              ${EXPENSE_CATEGORY_COLORS.living} 25%,
              ${EXPENSE_CATEGORY_COLORS.healthcare} 50%,
              ${EXPENSE_CATEGORY_COLORS.discretionary} 75%,
              ${EXPENSE_CATEGORY_COLORS.other} 100%
            )`,
          }}
        />

        <div className="flex justify-between items-start pt-2">
          <div>
            <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">
              Annual Expenses
            </p>
            <p className="text-3xl font-semibold text-text-primary tabular-nums">
              {formatCurrencyCompact(totalAnnual)}
            </p>
          </div>

          {/* Mini category breakdown */}
          <div className="flex flex-wrap gap-2 justify-end max-w-[200px]">
            {Object.entries(categoryTotals)
              .filter(([_, amount]) => amount > 0)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 4)
              .map(([category, amount]) => (
                <div
                  key={category}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: EXPENSE_CATEGORY_COLORS[category as ExpenseCategory] }}
                  />
                  <span className="text-text-muted tabular-nums">
                    {formatCurrencyCompact(amount)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Recurring Expenses Card */}
      <div className="bg-bg-secondary border border-border-subtle rounded-xl mb-6">
        <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
            Recurring Expenses
          </p>
          <p className="text-sm text-text-secondary tabular-nums">
            {formatCurrencyCompact(recurringTotal)}/yr
          </p>
        </div>

        <div className="divide-y divide-border-subtle">
          {expenses.categories.length === 0 ? (
            <div className="px-4 py-8 text-center text-text-muted text-sm">
              No expenses added yet. Add your recurring costs below.
            </div>
          ) : (
            expenses.categories.map((expense) => {
              const isActive =
                (expense.startYear ?? currentYear) <= currentYear &&
                (expense.endYear ?? Infinity) >= currentYear;

              return (
                <button
                  key={expense.id}
                  onClick={() => setEditingExpense(expense)}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-bg-tertiary/50 transition-colors text-left ${
                    !isActive ? 'opacity-50' : ''
                  }`}
                >
                  {/* Category dot */}
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: EXPENSE_CATEGORY_COLORS[expense.category] }}
                  />

                  {/* Name and metadata */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-text-primary truncate">
                        {expense.name}
                      </span>
                      {/* Category badge */}
                      <span
                        className="px-1.5 py-0.5 text-[10px] font-medium rounded"
                        style={{
                          backgroundColor: `${EXPENSE_CATEGORY_COLORS[expense.category]}15`,
                          color: EXPENSE_CATEGORY_COLORS[expense.category],
                        }}
                      >
                        {EXPENSE_CATEGORY_LABELS[expense.category]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                      {/* Duration indicator */}
                      {expense.endYear ? (
                        <span>Ends {expense.endYear}</span>
                      ) : expense.startYear && expense.startYear > currentYear ? (
                        <span>Starts {expense.startYear}</span>
                      ) : (
                        <span>Ongoing</span>
                      )}
                      {/* Inflation indicator */}
                      {expense.inflationRate !== 0.03 && (
                        <>
                          <span className="text-border-default">·</span>
                          <span className={expense.inflationRate > 0.03 ? 'text-accent-warning' : ''}>
                            {formatPercent(expense.inflationRate)} infl.
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <span className="text-sm font-medium text-text-primary tabular-nums flex-shrink-0">
                    {formatCurrencyCompact(expense.annualAmount)}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Add Expense button */}
        <div className="p-3">
          <button
            onClick={() => setIsAdding(true)}
            className="w-full py-2.5 border-2 border-dashed border-border-default rounded-lg text-sm font-medium text-text-muted hover:border-text-muted hover:text-text-secondary transition-colors"
          >
            + Add Expense
          </button>
        </div>
      </div>

      {/* Home Costs Card */}
      <div className="bg-bg-secondary border border-border-subtle rounded-xl mb-8">
        <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
            Home Costs
          </p>
          {hasHome && expenses.home && (
            <p className="text-sm text-text-secondary tabular-nums">
              {formatCurrencyCompact(homeTotal)}/yr
            </p>
          )}
        </div>

        <div className="p-4">
          <Toggle
            label="I own a home"
            checked={hasHome}
            onChange={toggleHome}
          />

          {hasHome && expenses.home && (
            <div className="mt-4 space-y-4">
              {/* Property Tax & Insurance */}
              <div className="grid grid-cols-2 gap-3">
                <CurrencyInput
                  label="Property Tax"
                  value={expenses.home.propertyTax}
                  onChange={(value) => updateHomeExpense({ propertyTax: value })}
                  hint="Annual amount"
                />
                <CurrencyInput
                  label="Homeowners Insurance"
                  value={expenses.home.insurance}
                  onChange={(value) => updateHomeExpense({ insurance: value })}
                  hint="Annual premium"
                />
              </div>

              {/* Mortgage section */}
              <div className="pt-3 border-t border-border-subtle/50 space-y-3">
                <Toggle
                  label="Have a mortgage?"
                  checked={!!expenses.home.mortgage}
                  onChange={toggleMortgage}
                />

                {expenses.home.mortgage && (
                  <div className="pl-4 border-l-2 border-border-subtle space-y-4">
                    {/* Core mortgage inputs */}
                    <div className="grid grid-cols-2 gap-3">
                      <CurrencyInput
                        label="Home Value"
                        value={expenses.home.mortgage.homeValue}
                        onChange={(value) => updateMortgage({ homeValue: value })}
                        hint="Current market value"
                      />
                      <CurrencyInput
                        label="Loan Balance"
                        value={expenses.home.mortgage.loanBalance}
                        onChange={(value) => updateMortgage({ loanBalance: value })}
                        hint="Outstanding principal"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <PercentInput
                        label="Interest Rate"
                        value={expenses.home.mortgage.interestRate}
                        onChange={(value) => updateMortgage({ interestRate: value })}
                        hint="Annual rate"
                        min={0}
                        max={15}
                      />
                      <Select
                        label="Loan Term"
                        value={expenses.home.mortgage.loanTermYears.toString()}
                        onChange={(value) =>
                          updateMortgage({ loanTermYears: parseInt(String(value)) as 15 | 20 | 30 })
                        }
                        options={LOAN_TERM_OPTIONS}
                        hint="Original term"
                      />
                    </div>

                    <div className="max-w-[200px]">
                      <Input
                        label="Origination Year"
                        type="number"
                        value={expenses.home.mortgage.originationYear}
                        onChange={(e) =>
                          updateMortgage({
                            originationYear: parseInt(e.target.value) || currentYear - 5,
                          })
                        }
                        min={currentYear - 40}
                        max={currentYear}
                        hint="When loan started"
                      />
                    </div>

                    {/* Calculated Summary */}
                    {mortgageCalcs && (
                      <div className="bg-bg-tertiary/50 rounded-lg p-3 space-y-2">
                        <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
                          Summary
                        </p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-text-muted">Monthly P&I:</span>
                            <span className="text-text-primary font-medium tabular-nums">
                              {formatCurrencyCompact(expenses.home.mortgage.monthlyPayment)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-muted">Home Equity:</span>
                            <span className="text-accent-primary font-medium tabular-nums">
                              {formatCurrencyCompact(mortgageCalcs.homeEquity)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-muted">Total Monthly:</span>
                            <span className="text-text-primary font-medium tabular-nums">
                              {formatCurrencyCompact(mortgageCalcs.totalMonthly)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-muted">Payoff Year:</span>
                            <span className="text-text-primary font-medium tabular-nums">
                              {expenses.home.mortgage.earlyPayoff?.enabled
                                ? expenses.home.mortgage.earlyPayoff.payoffYear
                                : mortgageCalcs.endYear}
                            </span>
                          </div>
                        </div>
                        {/* Underwater warning */}
                        {mortgageCalcs.homeEquity <= 0 && expenses.home.mortgage.loanBalance > 0 && (
                          <p className="text-xs text-accent-warning mt-2">
                            Your loan balance exceeds home value (underwater)
                          </p>
                        )}
                      </div>
                    )}

                    {/* Custom payment override */}
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="manual-payment"
                        checked={expenses.home.mortgage.manualPaymentOverride}
                        onChange={(e) => toggleManualPayment(e.target.checked)}
                        className="w-4 h-4 rounded border-border-default bg-bg-tertiary text-accent-primary focus:ring-accent-primary"
                      />
                      <label
                        htmlFor="manual-payment"
                        className="text-sm text-text-secondary cursor-pointer"
                      >
                        Enter custom payment
                      </label>
                    </div>

                    {expenses.home.mortgage.manualPaymentOverride && (
                      <div className="max-w-[200px]">
                        <CurrencyInput
                          label="Custom Monthly Payment"
                          value={expenses.home.mortgage.monthlyPayment}
                          onChange={(value) =>
                            updateMortgage({ monthlyPayment: value })
                          }
                          hint="Your actual payment"
                        />
                      </div>
                    )}

                    {/* Mortgage Advanced section */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setShowMortgageAdvanced(!showMortgageAdvanced)}
                        className="group flex items-center gap-2 text-sm text-text-muted hover:text-text-secondary transition-colors duration-150"
                      >
                        <svg
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            showMortgageAdvanced ? 'rotate-90' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                        <span className="font-medium">Advanced</span>
                      </button>

                      {showMortgageAdvanced && (
                        <div className="mt-3 space-y-3">
                          <Toggle
                            label="Plan to pay off early?"
                            checked={!!expenses.home.mortgage.earlyPayoff?.enabled}
                            onChange={toggleEarlyPayoff}
                          />

                          {expenses.home.mortgage.earlyPayoff?.enabled && (
                            <div className="pl-4 border-l-2 border-accent-blue/30 space-y-2">
                              <div className="max-w-[200px]">
                                <Input
                                  label="Payoff Year"
                                  type="number"
                                  value={expenses.home.mortgage.earlyPayoff.payoffYear}
                                  onChange={(e) =>
                                    updateMortgage({
                                      earlyPayoff: {
                                        enabled: true,
                                        payoffYear: parseInt(e.target.value) || currentYear + 5,
                                      },
                                    })
                                  }
                                  min={currentYear + 1}
                                  max={mortgageCalcs?.endYear ?? currentYear + 30}
                                  hint="When to pay off"
                                />
                              </div>
                              {mortgageCalcs?.earlyPayoffAmount !== undefined && (
                                <p className="text-sm text-text-muted">
                                  Estimated payoff amount:{' '}
                                  <span className="text-text-primary font-medium tabular-nums">
                                    {formatCurrencyCompact(mortgageCalcs.earlyPayoffAmount)}
                                  </span>
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Home Advanced: Inflation rate for taxes/insurance */}
              <div className="pt-3 border-t border-border-subtle/50">
                <button
                  type="button"
                  onClick={() => setShowHomeAdvanced(!showHomeAdvanced)}
                  className="group flex items-center gap-2 text-sm text-text-muted hover:text-text-secondary transition-colors duration-150"
                >
                  <svg
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      showHomeAdvanced ? 'rotate-90' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  <span className="font-medium">Advanced</span>
                </button>

                {showHomeAdvanced && (
                  <div className="mt-3 max-w-[200px]">
                    <PercentInput
                      label="Tax/Insurance Inflation"
                      value={expenses.home.inflationRate}
                      onChange={(value) => updateHomeExpense({ inflationRate: value })}
                      hint="Annual increase rate"
                      min={0}
                      max={15}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <WizardNavigation />

      {/* Add Expense Modal */}
      {isAdding && (
        <ExpenseEditForm
          onSave={handleAddExpense}
          onCancel={() => setIsAdding(false)}
        />
      )}

      {/* Edit Expense Modal */}
      {editingExpense && (
        <ExpenseEditForm
          expense={editingExpense}
          onSave={handleUpdateExpense}
          onDelete={() => handleDeleteExpense(editingExpense.id)}
          onCancel={() => setEditingExpense(null)}
        />
      )}
    </div>
  );
}
