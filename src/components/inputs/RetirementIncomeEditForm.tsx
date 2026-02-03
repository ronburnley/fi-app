import { useState } from 'react';
import type { RetirementIncome } from '../../types';
import { Input, CurrencyInput, Button, Toggle } from '../ui';

interface RetirementIncomeEditFormProps {
  income?: RetirementIncome;
  onSave: (income: RetirementIncome) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

export function RetirementIncomeEditForm({
  income,
  onSave,
  onDelete,
  onCancel,
}: RetirementIncomeEditFormProps) {
  const [name, setName] = useState(income?.name ?? '');
  const [annualAmount, setAnnualAmount] = useState(income?.annualAmount ?? 0);
  const [startAge, setStartAge] = useState(income?.startAge ?? 55);
  const [hasEndAge, setHasEndAge] = useState(income?.endAge !== undefined);
  const [endAge, setEndAge] = useState(income?.endAge ?? 75);
  const [inflationAdjusted, setInflationAdjusted] = useState(income?.inflationAdjusted ?? false);
  const [taxable, setTaxable] = useState(income?.taxable ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    onSave({
      id: income?.id ?? crypto.randomUUID(),
      name: name.trim(),
      annualAmount,
      startAge,
      endAge: hasEndAge ? endAge : undefined,
      inflationAdjusted,
      taxable,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary border border-border-default rounded-lg w-full max-w-md">
        <div className="px-4 py-3 border-b border-border-subtle">
          <h3 className="text-lg font-semibold text-text-primary">
            {income ? 'Edit Retirement Income' : 'Add Retirement Income'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <Input
            label="Income Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Consulting, Rental income"
          />

          <CurrencyInput
            label="Annual Amount"
            value={annualAmount}
            onChange={setAnnualAmount}
            hint="Gross annual income"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Age"
              type="number"
              value={startAge}
              onChange={(e) => setStartAge(parseInt(e.target.value) || 55)}
              min={18}
              max={100}
              hint="When income begins"
            />
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-text-secondary">
                  End Age
                </label>
                <Toggle
                  label=""
                  checked={hasEndAge}
                  onChange={setHasEndAge}
                />
              </div>
              {hasEndAge ? (
                <Input
                  type="number"
                  value={endAge}
                  onChange={(e) => setEndAge(parseInt(e.target.value) || 75)}
                  min={startAge}
                  max={120}
                />
              ) : (
                <div className="h-10 flex items-center px-3 bg-bg-tertiary border border-border-subtle rounded-md text-text-muted text-sm">
                  Perpetual
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Toggle
              label="Inflation adjusted"
              checked={inflationAdjusted}
              onChange={setInflationAdjusted}
            />
            <p className="text-xs text-text-muted -mt-2 ml-12">
              Increase annually with inflation rate
            </p>

            <Toggle
              label="Taxable income"
              checked={taxable}
              onChange={setTaxable}
            />
            <p className="text-xs text-text-muted -mt-2 ml-12">
              Subject to income tax
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            {income && onDelete && (
              <Button
                type="button"
                variant="secondary"
                onClick={onDelete}
                className="text-accent-danger hover:bg-accent-danger/10"
              >
                Delete
              </Button>
            )}
            <div className="flex-1" />
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              {income ? 'Save' : 'Add Income'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
