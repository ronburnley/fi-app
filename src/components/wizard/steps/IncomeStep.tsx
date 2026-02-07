import { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { WizardNavigation } from '../WizardNavigation';
import { RetirementIncomeEditForm } from '../../inputs/RetirementIncomeEditForm';
import { CurrencyInput, PercentInput, Toggle, Input, Select } from '../../ui';
import type { Asset, EmploymentIncome, RetirementIncome, ContributionAccountType, AccountOwner, Income } from '../../../types';

function formatCurrencyCompact(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function getRetirementAccountsForOwner(accounts: Asset[], owner: AccountOwner) {
  return accounts.filter(
    (a) => (a.type === 'traditional' || a.type === 'roth' || a.type === 'hsa') &&
      (a.owner === owner || a.owner === 'joint')
  );
}

function buildContributionOptions(accounts: Asset[], ownerLabel: string) {
  const options = accounts.map(a => ({
    value: a.id,
    label: a.name,
  }));

  return [
    ...options,
    { value: 'create-traditional', label: `Create ${ownerLabel} Traditional 401(k)` },
    { value: 'create-roth', label: `Create ${ownerLabel} Roth 401(k)` },
    { value: 'split', label: 'Split across all retirement accounts' },
  ];
}

export function IncomeStep() {
  const { state, dispatch } = useApp();
  const { income, profile, assets } = state;
  const isMarried = profile.filingStatus === 'married';

  const selfRetirementAccounts = getRetirementAccountsForOwner(assets.accounts, 'self');
  const spouseRetirementAccounts = getRetirementAccountsForOwner(assets.accounts, 'spouse');

  const [hasEmployment, setHasEmployment] = useState(!!income.employment);
  const [hasSpouseEmployment, setHasSpouseEmployment] = useState(!!income.spouseEmployment);
  const [editingRetirementIncome, setEditingRetirementIncome] = useState<RetirementIncome | null>(null);
  const [isAddingRetirementIncome, setIsAddingRetirementIncome] = useState(false);

  // Helper to find default contribution destination
  const findDefaultContributionAccount = (accounts: typeof selfRetirementAccounts) => {
    // Prefer traditional 401k, then any traditional, then first retirement account
    const traditional401k = accounts.find(a => a.type === 'traditional' && a.is401k);
    if (traditional401k) return traditional401k.id;
    const traditional = accounts.find(a => a.type === 'traditional');
    if (traditional) return traditional.id;
    if (accounts.length > 0) return accounts[0].id;
    return undefined;
  };

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
      annualContributions: 23000,
      effectiveTaxRate: 0.28,
      contributionAccountId: findDefaultContributionAccount(selfRetirementAccounts),
      contributionType: 'traditional',
    };
  });

  const [spouseEmployment, setSpouseEmployment] = useState<EmploymentIncome>(() => {
    const existing = income.spouseEmployment;
    if (existing) return existing;
    return {
      annualGrossIncome: 100000,
      annualContributions: 15000,
      effectiveTaxRate: 0.25,
      contributionAccountId: findDefaultContributionAccount(spouseRetirementAccounts),
      contributionType: 'traditional',
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
  const updateSelfField = (field: keyof EmploymentIncome, value: number | string | undefined) => {
    const updated = { ...selfEmployment, [field]: value };
    setSelfEmployment(updated);
    if (hasEmployment) {
      dispatch({ type: 'UPDATE_EMPLOYMENT', payload: updated });
    }
  };

  // Update spouse employment field
  const updateSpouseField = (field: keyof EmploymentIncome, value: number | string | undefined) => {
    const updated = { ...spouseEmployment, [field]: value };
    setSpouseEmployment(updated);
    if (hasSpouseEmployment) {
      dispatch({ type: 'UPDATE_SPOUSE_EMPLOYMENT', payload: updated });
    }
  };

  // Handle contribution destination change for self
  const handleSelfContributionDestinationChange = (value: string) => {
    if (value === 'create-traditional') {
      updateSelfField('contributionType', 'traditional' as ContributionAccountType);
      updateSelfField('contributionAccountId', undefined);
    } else if (value === 'create-roth') {
      updateSelfField('contributionType', 'roth' as ContributionAccountType);
      updateSelfField('contributionAccountId', undefined);
    } else if (value === 'split') {
      updateSelfField('contributionType', 'mixed' as ContributionAccountType);
      updateSelfField('contributionAccountId', undefined);
    } else {
      // Existing account selected
      const updated = {
        ...selfEmployment,
        contributionAccountId: value,
        contributionType: undefined
      };
      setSelfEmployment(updated);
      if (hasEmployment) {
        dispatch({ type: 'UPDATE_EMPLOYMENT', payload: updated });
      }
    }
  };

  // Handle contribution destination change for spouse
  const handleSpouseContributionDestinationChange = (value: string) => {
    if (value === 'create-traditional') {
      updateSpouseField('contributionType', 'traditional' as ContributionAccountType);
      updateSpouseField('contributionAccountId', undefined);
    } else if (value === 'create-roth') {
      updateSpouseField('contributionType', 'roth' as ContributionAccountType);
      updateSpouseField('contributionAccountId', undefined);
    } else if (value === 'split') {
      updateSpouseField('contributionType', 'mixed' as ContributionAccountType);
      updateSpouseField('contributionAccountId', undefined);
    } else {
      // Existing account selected
      const updated = {
        ...spouseEmployment,
        contributionAccountId: value,
        contributionType: undefined
      };
      setSpouseEmployment(updated);
      if (hasSpouseEmployment) {
        dispatch({ type: 'UPDATE_SPOUSE_EMPLOYMENT', payload: updated });
      }
    }
  };

  // Get current contribution destination value for dropdown
  const getSelfContributionDestination = (): string => {
    if (selfEmployment.contributionAccountId) {
      return selfEmployment.contributionAccountId;
    }
    if (selfEmployment.contributionType === 'mixed') return 'split';
    if (selfEmployment.contributionType === 'roth') return 'create-roth';
    return 'create-traditional';
  };

  const getSpouseContributionDestination = (): string => {
    if (spouseEmployment.contributionAccountId) {
      return spouseEmployment.contributionAccountId;
    }
    if (spouseEmployment.contributionType === 'mixed') return 'split';
    if (spouseEmployment.contributionType === 'roth') return 'create-roth';
    return 'create-traditional';
  };

  const selfContributionOptions = buildContributionOptions(selfRetirementAccounts, '');
  const spouseContributionOptions = buildContributionOptions(spouseRetirementAccounts, "Spouse's");

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
                <div className="grid grid-cols-2 gap-3">
                  <CurrencyInput
                    label="Annual Gross Income"
                    value={selfEmployment.annualGrossIncome}
                    onChange={(v) => updateSelfField('annualGrossIncome', v)}
                    hint="Before taxes"
                  />
                  <CurrencyInput
                    label="Annual Contributions"
                    value={selfEmployment.annualContributions}
                    onChange={(v) => updateSelfField('annualContributions', v)}
                    hint="401k, IRA, HSA"
                  />
                </div>
                {selfEmployment.annualContributions > 0 && (
                  <Select
                    label="Contribution Destination"
                    value={getSelfContributionDestination()}
                    onChange={(value) => handleSelfContributionDestinationChange(String(value))}
                    options={selfContributionOptions}
                    hint="Where contributions are deposited"
                  />
                )}
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
                  <div className="grid grid-cols-2 gap-3">
                    <CurrencyInput
                      label="Spouse Annual Gross"
                      value={spouseEmployment.annualGrossIncome}
                      onChange={(v) => updateSpouseField('annualGrossIncome', v)}
                      hint="Before taxes"
                    />
                    <CurrencyInput
                      label="Spouse Contributions"
                      value={spouseEmployment.annualContributions}
                      onChange={(v) => updateSpouseField('annualContributions', v)}
                      hint="401k, IRA, HSA"
                    />
                  </div>
                  {spouseEmployment.annualContributions > 0 && (
                    <Select
                      label="Contribution Destination"
                      value={getSpouseContributionDestination()}
                      onChange={(value) => handleSpouseContributionDestinationChange(String(value))}
                      options={spouseContributionOptions}
                      hint="Where contributions are deposited"
                    />
                  )}
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
