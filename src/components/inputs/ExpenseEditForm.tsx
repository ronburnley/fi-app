import { useState } from 'react';
import type { Expense, ExpenseCategory } from '../../types';
import { Input, CurrencyInput, PercentInput, Button, Select } from '../ui';
import { EXPENSE_CATEGORY_LABELS } from '../../constants/defaults';

interface ExpenseEditFormProps {
  expense?: Expense;
  onSave: (expense: Expense) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

export function ExpenseEditForm({ expense, onSave, onDelete, onCancel }: ExpenseEditFormProps) {
  const currentYear = new Date().getFullYear();

  const [name, setName] = useState(expense?.name ?? '');
  const [annualAmount, setAnnualAmount] = useState(expense?.annualAmount ?? 0);
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? 'living');
  const [inflationRate, setInflationRate] = useState(expense?.inflationRate ?? 0.03);
  const [hasStartYear, setHasStartYear] = useState(!!expense?.startYear);
  const [startYear, setStartYear] = useState(expense?.startYear ?? currentYear + 1);
  const [hasEndYear, setHasEndYear] = useState(!!expense?.endYear);
  const [endYear, setEndYear] = useState(expense?.endYear ?? currentYear + 10);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: expense?.id ?? crypto.randomUUID(),
      name: name.trim(),
      annualAmount,
      category,
      inflationRate,
      startYear: hasStartYear ? startYear : undefined,
      endYear: hasEndYear ? endYear : undefined,
    });
  };

  const categoryOptions = Object.entries(EXPENSE_CATEGORY_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary border border-border-default rounded-lg w-full max-w-md">
        <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text-primary">
            {expense ? 'Edit Expense' : 'Add Expense'}
          </h3>
          {onDelete && (
            <button
              onClick={onDelete}
              className="text-sm text-accent-danger hover:text-accent-danger/80 transition-colors"
            >
              Delete
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name */}
          <Input
            label="Expense Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Groceries, Health Insurance, Travel"
          />

          {/* Amount & Category */}
          <div className="grid grid-cols-2 gap-3">
            <CurrencyInput
              label="Annual Amount"
              value={annualAmount}
              onChange={setAnnualAmount}
            />
            <Select
              label="Category"
              value={category}
              onChange={(value) => setCategory(value as ExpenseCategory)}
              options={categoryOptions}
            />
          </div>

          {/* Duration toggles */}
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasStartYear}
                  onChange={(e) => setHasStartYear(e.target.checked)}
                  className="rounded border-border-default bg-bg-tertiary text-accent-blue focus:ring-accent-blue"
                />
                Starts in future
              </label>
              <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasEndYear}
                  onChange={(e) => setHasEndYear(e.target.checked)}
                  className="rounded border-border-default bg-bg-tertiary text-accent-blue focus:ring-accent-blue"
                />
                Has end date
              </label>
            </div>

            {(hasStartYear || hasEndYear) && (
              <div className="grid grid-cols-2 gap-3">
                {hasStartYear && (
                  <Input
                    label="Start Year"
                    type="number"
                    value={startYear}
                    onChange={(e) => setStartYear(parseInt(e.target.value) || currentYear)}
                    min={currentYear}
                    max={currentYear + 50}
                  />
                )}
                {hasEndYear && (
                  <Input
                    label="End Year"
                    type="number"
                    value={endYear}
                    onChange={(e) => setEndYear(parseInt(e.target.value) || currentYear + 10)}
                    min={hasStartYear ? startYear : currentYear}
                    max={currentYear + 60}
                  />
                )}
              </div>
            )}
          </div>

          {/* Advanced: Inflation rate */}
          <div className="pt-3 border-t border-border-subtle/50">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="group flex items-center gap-2 text-sm text-text-muted hover:text-text-secondary transition-colors duration-150"
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  showAdvanced ? 'rotate-90' : ''
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

            {showAdvanced && (
              <div className="mt-3 max-w-[200px]">
                <PercentInput
                  label="Inflation Rate"
                  value={inflationRate}
                  onChange={setInflationRate}
                  hint="Default is 3%"
                  min={0}
                  max={15}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={!name.trim()}>
              {expense ? 'Save' : 'Add Expense'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
