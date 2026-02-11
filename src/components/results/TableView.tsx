import { useState, useMemo } from 'react';
import { useProjectionContext } from '../../context/ProjectionContext';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';
import type { FinancialPhase } from '../../types';

// Phase badge colors and labels
const PHASE_CONFIG: Record<FinancialPhase, { label: string; color: string; bg: string }> = {
  accumulating: { label: 'ACCUM', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  fi: { label: 'FI', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
};

export function TableView() {
  const { state } = useApp();
  const { projections } = useProjectionContext();
  // Default to showing all years to see the full timeline
  const [showAllYears, setShowAllYears] = useState(true);

  const effectiveFIAge = state.profile.targetFIAge;

  // Check if there are any shortfalls in the projection
  const hasAnyShortfall = projections.some((p) => p.isShortfall);
  const firstShortfallAge = projections.find((p) => p.isShortfall)?.age;

  // Check if there's employment income (to show employment-related columns)
  const hasEmploymentIncome = state.income.employment || state.income.spouseEmployment;
  const hasRetirementIncome = state.income.retirementIncomes.length > 0;

  // Auto-hide columns that are all-zero across the entire timeline
  const columnVisibility = useMemo(() => {
    const has = (fn: (p: (typeof projections)[0]) => boolean) => projections.some(fn);
    return {
      income: has(p => p.income > 0),
      gap: has(p => p.gap > 0),
      withdrawal: has(p => p.withdrawal > 0),
      federalTax: has(p => p.federalTax > 0),
      stateTax: has(p => p.stateTax > 0),
      penalty: has(p => p.withdrawalPenalty > 0),
      taxable: has(p => p.taxableBalance > 0),
      traditional: has(p => p.traditionalBalance > 0),
      roth: has(p => p.rothBalance > 0),
      mortgage: has(p => p.mortgageBalance !== undefined && p.mortgageBalance > 0),
    };
  }, [projections]);

  // Filter logic:
  // - "Show all years" shows everything (default now)
  // - Otherwise show from FI age or first shortfall
  const displayProjections = showAllYears
    ? projections
    : hasAnyShortfall && firstShortfallAge !== undefined
      ? projections.filter((p) => p.age >= firstShortfallAge)
      : projections.filter((p) => p.age >= effectiveFIAge);

  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <h3 className="text-sm font-semibold text-text-primary">Year-by-Year Projection</h3>
        <button
          onClick={() => setShowAllYears(!showAllYears)}
          className="text-xs text-accent-blue hover:text-accent-blue/80 transition-colors"
        >
          {showAllYears ? 'Show FI years only' : 'Show all years'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-bg-tertiary">
              <th className="sticky left-0 bg-bg-tertiary px-4 py-2 text-left text-xs font-medium text-text-muted">
                Age
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium text-text-muted whitespace-nowrap">
                Phase
              </th>
              {hasEmploymentIncome && (
                <>
                  <th className="px-4 py-2 text-right text-xs font-medium text-text-muted whitespace-nowrap">
                    Emp. Inc
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-text-muted whitespace-nowrap">
                    Emp. Tax
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-text-muted whitespace-nowrap">
                    Contrib
                  </th>
                </>
              )}
              {hasRetirementIncome && (
                <th className="px-4 py-2 text-right text-xs font-medium text-text-muted whitespace-nowrap">
                  Ret. Inc
                </th>
              )}
              <th className="px-4 py-2 text-right text-xs font-medium text-text-muted whitespace-nowrap">
                Expenses
              </th>
              {columnVisibility.income && (
                <th className="px-4 py-2 text-right text-xs font-medium text-text-muted whitespace-nowrap">
                  Income
                </th>
              )}
              {columnVisibility.gap && (
                <th className="px-4 py-2 text-right text-xs font-medium text-text-muted whitespace-nowrap">
                  Gap
                </th>
              )}
              {columnVisibility.withdrawal && (
                <th className="px-4 py-2 text-right text-xs font-medium text-text-muted whitespace-nowrap">
                  Withdrawal
                </th>
              )}
              {columnVisibility.federalTax && (
                <th className="px-4 py-2 text-right text-xs font-medium text-text-muted whitespace-nowrap">
                  Fed Tax
                </th>
              )}
              {columnVisibility.stateTax && (
                <th className="px-4 py-2 text-right text-xs font-medium text-text-muted whitespace-nowrap">
                  State Tax
                </th>
              )}
              {columnVisibility.penalty && (
                <th className="px-4 py-2 text-right text-xs font-medium text-text-muted whitespace-nowrap">
                  Penalty
                </th>
              )}
              {columnVisibility.withdrawal && (
                <th className="px-4 py-2 text-left text-xs font-medium text-text-muted whitespace-nowrap">
                  Source
                </th>
              )}
              {columnVisibility.taxable && (
                <th className="px-4 py-2 text-right text-xs font-medium text-text-muted whitespace-nowrap">
                  Taxable
                </th>
              )}
              {columnVisibility.traditional && (
                <th className="px-4 py-2 text-right text-xs font-medium text-text-muted whitespace-nowrap">
                  Traditional
                </th>
              )}
              {columnVisibility.roth && (
                <th className="px-4 py-2 text-right text-xs font-medium text-text-muted whitespace-nowrap">
                  Roth
                </th>
              )}
              {columnVisibility.mortgage && (
                <th className="px-4 py-2 text-right text-xs font-medium text-text-muted whitespace-nowrap">
                  Mortgage
                </th>
              )}
              <th className="px-4 py-2 text-right text-xs font-medium text-text-muted whitespace-nowrap">
                Net Worth
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {displayProjections.map((projection, index) => {
              const isCurrentAge = projection.age === state.profile.currentAge;
              // Only show FI badge if there are no shortfalls (FI was actually achieved)
              const isFIStart = !hasAnyShortfall && projection.age === effectiveFIAge;
              const phaseConfig = PHASE_CONFIG[projection.phase];

              return (
                <tr
                  key={projection.year}
                  className={`
                    ${index % 2 === 0 ? 'bg-bg-primary' : 'bg-bg-secondary'}
                    ${isCurrentAge ? 'bg-accent-blue/5' : ''}
                    ${isFIStart ? 'bg-accent-primary/5' : ''}
                    ${projection.isShortfall ? 'bg-accent-danger/10' : ''}
                  `}
                >
                  <td className="sticky left-0 px-4 py-2 font-medium text-text-primary tabular-nums whitespace-nowrap bg-inherit">
                    <div className="flex items-center gap-2">
                      <span>{projection.age}</span>
                      {isCurrentAge && (
                        <span className="text-[10px] text-accent-blue font-medium">NOW</span>
                      )}
                      {isFIStart && (
                        <span className="text-[10px] text-accent-primary font-medium">FI</span>
                      )}
                      {Math.floor(projection.age) === 59 && projection.age < 60 && (
                        <span className="text-[10px] text-accent-warning font-medium">59.5</span>
                      )}
                      {projection.isShortfall && (
                        <span className="text-[10px] text-accent-danger font-medium">!</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center whitespace-nowrap">
                    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${phaseConfig.color} ${phaseConfig.bg}`}>
                      {phaseConfig.label}
                    </span>
                  </td>
                  {hasEmploymentIncome && (
                    <>
                      <td className="px-4 py-2 text-right text-text-secondary tabular-nums whitespace-nowrap">
                        {projection.employmentIncome > 0 ? formatCurrency(projection.employmentIncome) : '-'}
                      </td>
                      <td className="px-4 py-2 text-right text-text-secondary tabular-nums whitespace-nowrap">
                        {projection.employmentTax > 0 ? formatCurrency(projection.employmentTax) : '-'}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums whitespace-nowrap">
                        <span className={projection.contributions > 0 ? 'text-emerald-400' : 'text-text-muted'}>
                          {projection.contributions > 0 ? formatCurrency(projection.contributions) : '-'}
                        </span>
                      </td>
                    </>
                  )}
                  {hasRetirementIncome && (
                    <td className="px-4 py-2 text-right text-text-secondary tabular-nums whitespace-nowrap">
                      {projection.retirementIncome > 0 ? formatCurrency(projection.retirementIncome) : '-'}
                    </td>
                  )}
                  <td className="px-4 py-2 text-right text-text-secondary tabular-nums whitespace-nowrap">
                    {projection.expenses > 0 ? formatCurrency(projection.expenses) : '-'}
                  </td>
                  {columnVisibility.income && (
                    <td className="px-4 py-2 text-right text-text-secondary tabular-nums whitespace-nowrap">
                      {projection.income > 0 ? formatCurrency(projection.income) : '-'}
                    </td>
                  )}
                  {columnVisibility.gap && (
                    <td className="px-4 py-2 text-right tabular-nums whitespace-nowrap">
                      <span className={projection.gap > 0 ? 'text-text-secondary' : 'text-text-muted'}>
                        {projection.gap > 0 ? formatCurrency(projection.gap) : '-'}
                      </span>
                    </td>
                  )}
                  {columnVisibility.withdrawal && (
                    <td className="px-4 py-2 text-right text-text-secondary tabular-nums whitespace-nowrap">
                      {projection.withdrawal > 0 ? formatCurrency(projection.withdrawal) : '-'}
                    </td>
                  )}
                  {columnVisibility.federalTax && (
                    <td className="px-4 py-2 text-right text-text-secondary tabular-nums whitespace-nowrap">
                      {projection.federalTax > 0 ? formatCurrency(projection.federalTax) : '-'}
                    </td>
                  )}
                  {columnVisibility.stateTax && (
                    <td className="px-4 py-2 text-right text-text-secondary tabular-nums whitespace-nowrap">
                      {projection.stateTax > 0 ? formatCurrency(projection.stateTax) : '-'}
                    </td>
                  )}
                  {columnVisibility.penalty && (
                    <td className="px-4 py-2 text-right tabular-nums whitespace-nowrap">
                      <span className={projection.withdrawalPenalty > 0 ? 'text-accent-warning font-medium' : 'text-text-muted'}>
                        {projection.withdrawalPenalty > 0 ? formatCurrency(projection.withdrawalPenalty) : '-'}
                      </span>
                    </td>
                  )}
                  {columnVisibility.withdrawal && (
                    <td className="px-4 py-2 text-left text-text-muted text-xs whitespace-nowrap">
                      {projection.withdrawal > 0 ? projection.withdrawalSource : (projection.phase === 'accumulating' && projection.contributions > 0 ? 'Contributing' : '-')}
                    </td>
                  )}
                  {columnVisibility.taxable && (
                    <td className="px-4 py-2 text-right text-text-secondary tabular-nums whitespace-nowrap">
                      {formatCurrency(projection.taxableBalance)}
                    </td>
                  )}
                  {columnVisibility.traditional && (
                    <td className="px-4 py-2 text-right text-text-secondary tabular-nums whitespace-nowrap">
                      {formatCurrency(projection.traditionalBalance)}
                    </td>
                  )}
                  {columnVisibility.roth && (
                    <td className="px-4 py-2 text-right text-text-secondary tabular-nums whitespace-nowrap">
                      {formatCurrency(projection.rothBalance)}
                    </td>
                  )}
                  {columnVisibility.mortgage && (
                    <td className="px-4 py-2 text-right text-text-secondary tabular-nums whitespace-nowrap">
                      {projection.mortgageBalance !== undefined && projection.mortgageBalance > 0
                        ? formatCurrency(projection.mortgageBalance)
                        : '-'}
                    </td>
                  )}
                  <td
                    className={`px-4 py-2 text-right font-medium tabular-nums whitespace-nowrap ${
                      projection.isShortfall ? 'text-accent-danger' : 'text-text-primary'
                    }`}
                  >
                    {formatCurrency(projection.totalNetWorth)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {displayProjections.length === 0 && (
        <div className="px-4 py-8 text-center text-text-muted text-sm">
          No projection data available
        </div>
      )}
    </div>
  );
}
