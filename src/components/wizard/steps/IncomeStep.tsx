import { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { WizardNavigation } from '../WizardNavigation';
import { RetirementIncomeEditForm } from '../../inputs/RetirementIncomeEditForm';
import { CurrencyInput, PercentInput, Toggle, Input } from '../../ui';
import type { EmploymentIncome, RetirementIncome, Income } from '../../../types';

function formatCurrencyCompact(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function IncomeStep() {
  const { state, dispatch } = useApp();
  const { income, profile } = state;
  const isMarried = profile.filingStatus === 'married';

  const [hasEmployment, setHasEmployment] = useState(!!income.employment);
  const [hasSpouseEmployment, setHasSpouseEmployment] = useState(!!income.spouseEmployment);
  const [editingRetirementIncome, setEditingRetirementIncome] = useState<RetirementIncome | null>(null);
  const [isAddingRetirementIncome, setIsAddingRetirementIncome] = useState(false);

  // Spouse additional work years
  const [spouseAdditionalYears, setSpouseAdditionalYears] = useState<number>(
    income.spouseAdditionalWorkYears ?? 0
  );

  // Local state for employment fields
  const [selfEmployment, setSelfEmployment] = useState<EmploymentIncome>(() => {
    const existing = income.employment;
    if (existing) return existing;
    return {
      annualGrossIncome: 150000,
      effectiveTaxRate: 0.28,
    };
  });

  const [spouseEmployment, setSpouseEmployment] = useState<EmploymentIncome>(() => {
    const existing = income.spouseEmployment;
    if (existing) return existing;
    return {
      annualGrossIncome: 100000,
      effectiveTaxRate: 0.25,
    };
  });

  // Toggle employment on/off
  const toggleEmployment = (enabled: boolean) => {
    setHasEmployment(enabled);
    if (enabled) {
      dispatch({ type: 'UPDATE_EMPLOYMENT', payload: selfEmployment });
    } else {
      dispatch({ type: 'UPDATE_EMPLOYMENT', payload: undefined });
    }
  };

  const toggleSpouseEmployment = (enabled: boolean) => {
    setHasSpouseEmployment(enabled);
    if (enabled) {
      dispatch({ type: 'UPDATE_SPOUSE_EMPLOYMENT', payload: spouseEmployment });
    } else {
      dispatch({ type: 'UPDATE_SPOUSE_EMPLOYMENT', payload: undefined });
    }
  };

  // Update self employment field
  const updateSelfField = (field: keyof EmploymentIncome, value: number) => {
    const updated = { ...selfEmployment, [field]: value };
    setSelfEmployment(updated);
    if (hasEmployment) {
      dispatch({ type: 'UPDATE_EMPLOYMENT', payload: updated });
    }
  };

  // Update spouse employment field
  const updateSpouseField = (field: keyof EmploymentIncome, value: number) => {
    const updated = { ...spouseEmployment, [field]: value };
    setSpouseEmployment(updated);
    if (hasSpouseEmployment) {
      dispatch({ type: 'UPDATE_SPOUSE_EMPLOYMENT', payload: updated });
    }
  };

  // Retirement income handlers
  const handleAddRetirementIncome = (ri: RetirementIncome) => {
    dispatch({ type: 'ADD_RETIREMENT_INCOME', payload: ri });
    setIsAddingRetirementIncome(false);
  };

  const handleUpdateRetirementIncome = (ri: RetirementIncome) => {
    dispatch({ type: 'UPDATE_RETIREMENT_INCOME', payload: ri });
    setEditingRetirementIncome(null);
  };

  const handleDeleteRetirementIncome = (id: string) => {
    dispatch({ type: 'REMOVE_RETIREMENT_INCOME', payload: id });
    setEditingRetirementIncome(null);
  };

  // Calculate total annual retirement income
  const totalRetirementIncome = income.retirementIncomes.reduce(
    (sum, ri) => sum + ri.annualAmount,
    0
  );

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-text-primary mb-2">
          Income
        </h1>
        <p className="text-text-secondary">
          Model current employment income and other income streams.
          Employment stops at your calculated FI age. This step is optional.
        </p>
      </div>

      {/* Employment Income Card */}
      <div className="bg-bg-secondary border border-border-subtle rounded-xl mb-6">
        <div className="px-4 py-3 border-b border-border-subtle">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
            Employment Income
          </p>
        </div>

        <div className="p-4 space-y-6">
          {/* Self Employment */}
          <div>
            <Toggle
              label="I have employment income"
              checked={hasEmployment}
              onChange={toggleEmployment}
            />

            {hasEmployment && (
              <div className="mt-4 space-y-4 pl-0">
                <CurrencyInput
                  label="Annual Gross Income"
                  value={selfEmployment.annualGrossIncome}
                  onChange={(v) => updateSelfField('annualGrossIncome', v)}
                  hint="Before taxes"
                />
                <PercentInput
                  label="Effective Tax Rate"
                  value={selfEmployment.effectiveTaxRate}
                  onChange={(v) => updateSelfField('effectiveTaxRate', v)}
                  hint="Combined fed + state"
                  min={0}
                  max={60}
                />
              </div>
            )}
          </div>

          {/* Spouse Employment (only if married) */}
          {isMarried && (
            <div className="pt-4 border-t border-border-subtle/50">
              <Toggle
                label="Spouse has employment income"
                checked={hasSpouseEmployment}
                onChange={toggleSpouseEmployment}
              />

              {hasSpouseEmployment && (
                <div className="mt-4 space-y-4 pl-0">
                  <CurrencyInput
                    label="Spouse Annual Gross"
                    value={spouseEmployment.annualGrossIncome}
                    onChange={(v) => updateSpouseField('annualGrossIncome', v)}
                    hint="Before taxes"
                  />
                  <PercentInput
                    label="Spouse Tax Rate"
                    value={spouseEmployment.effectiveTaxRate}
                    onChange={(v) => updateSpouseField('effectiveTaxRate', v)}
                    hint="Combined fed + state"
                    min={0}
                    max={60}
                  />
                </div>
              )}
            </div>
          )}

          {/* Spouse works longer option — shown when both have employment */}
          {hasEmployment && hasSpouseEmployment && isMarried && (
            <div className="pt-4 border-t border-border-subtle/50">
              <Toggle
                label="Spouse works longer after I stop"
                checked={spouseAdditionalYears > 0}
                onChange={(enabled) => {
                  const years = enabled ? 3 : 0;
                  setSpouseAdditionalYears(years);
                  dispatch({
                    type: 'UPDATE_INCOME',
                    payload: { spouseAdditionalWorkYears: years || undefined } as Partial<Income>,
                  });
                }}
              />
              {spouseAdditionalYears > 0 && (
                <div className="mt-3">
                  <Input
                    label="Additional years"
                    type="number"
                    value={spouseAdditionalYears}
                    onChange={(e) => {
                      const years = Math.max(0, Math.min(20, parseInt(e.target.value) || 0));
                      setSpouseAdditionalYears(years);
                      dispatch({
                        type: 'UPDATE_INCOME',
                        payload: { spouseAdditionalWorkYears: years || undefined } as Partial<Income>,
                      });
                    }}
                    min={1}
                    max={20}
                    hint="Years spouse keeps working after your FI age"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Retirement Income Streams Card */}
      <div className="bg-bg-secondary border border-border-subtle rounded-xl mb-8">
        <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
            Other Retirement Income
          </p>
          {totalRetirementIncome > 0 && (
            <p className="text-sm font-medium text-text-secondary tabular-nums">
              {formatCurrencyCompact(totalRetirementIncome)}/yr
            </p>
          )}
        </div>

        <div className="divide-y divide-border-subtle">
          {income.retirementIncomes.length === 0 ? (
            <div className="px-4 py-6 text-center text-text-muted text-sm">
              No retirement income streams added yet.
              <br />
              <span className="text-xs">
                Add consulting, rental income, royalties, etc.
              </span>
            </div>
          ) : (
            income.retirementIncomes.map((ri) => (
              <button
                key={ri.id}
                onClick={() => setEditingRetirementIncome(ri)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-bg-tertiary/50 transition-colors text-left"
              >
                {/* Icon indicator */}
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-accent-blue" />

                {/* Name and details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-text-primary truncate">
                      {ri.name}
                    </span>
                    {ri.inflationAdjusted && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-emerald-400/10 text-emerald-400/80 rounded">
                        COLA
                      </span>
                    )}
                    {!ri.taxable && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-zinc-800 text-zinc-500 rounded">
                        tax-free
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-text-muted">
                    Age {ri.startAge}{ri.endAge ? ` - ${ri.endAge}` : '+'}
                  </span>
                </div>

                {/* Amount */}
                <span className="text-sm font-medium text-text-primary tabular-nums flex-shrink-0">
                  {formatCurrencyCompact(ri.annualAmount)}/yr
                </span>
              </button>
            ))
          )}
        </div>

        {/* Add Income button */}
        <div className="p-3">
          <button
            onClick={() => setIsAddingRetirementIncome(true)}
            className="w-full py-2.5 border-2 border-dashed border-border-default rounded-lg text-sm font-medium text-text-muted hover:border-text-muted hover:text-text-secondary transition-colors"
          >
            + Add Retirement Income
          </button>
        </div>
      </div>

      <WizardNavigation showSkip />

      {/* Add Retirement Income Modal */}
      {isAddingRetirementIncome && (
        <RetirementIncomeEditForm
          onSave={handleAddRetirementIncome}
          onCancel={() => setIsAddingRetirementIncome(false)}
        />
      )}

      {/* Edit Retirement Income Modal */}
      {editingRetirementIncome && (
        <RetirementIncomeEditForm
          income={editingRetirementIncome}
          onSave={handleUpdateRetirementIncome}
          onDelete={() => handleDeleteRetirementIncome(editingRetirementIncome.id)}
          onCancel={() => setEditingRetirementIncome(null)}
        />
      )}
    </div>
  );
}

export default IncomeStep;
