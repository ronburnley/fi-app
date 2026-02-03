import { Card } from '../ui';
import { useApp } from '../../context/AppContext';
import { EXPENSE_CATEGORY_LABELS, EXPENSE_CATEGORY_COLORS } from '../../constants/defaults';
import type { ExpenseCategory } from '../../types';

function formatCurrencyCompact(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function ExpensesSection() {
  const { state } = useApp();
  const { expenses } = state;
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

  // Category breakdown
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

  return (
    <Card title="Expenses">
      <div className="space-y-4">
        {/* Total */}
        <div>
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">
            Annual Expenses
          </p>
          <p className="text-2xl font-semibold text-text-primary tabular-nums">
            {formatCurrencyCompact(totalAnnual)}
          </p>
        </div>

        {/* Category breakdown */}
        <div className="space-y-2">
          {Object.entries(categoryTotals)
            .filter(([_, amount]) => amount > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([category, amount]) => (
              <div
                key={category}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: EXPENSE_CATEGORY_COLORS[category as ExpenseCategory] }}
                  />
                  <span className="text-text-secondary">
                    {EXPENSE_CATEGORY_LABELS[category as ExpenseCategory]}
                  </span>
                </div>
                <span className="text-text-primary tabular-nums">
                  {formatCurrencyCompact(amount)}
                </span>
              </div>
            ))}
        </div>

        {/* Expense count */}
        <p className="text-xs text-text-muted">
          {expenses.categories.length} expense categories
          {expenses.home && ' + home costs'}
        </p>
      </div>
    </Card>
  );
}
