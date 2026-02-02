import { useState } from 'react';
import type { LifeEvent } from '../../types';
import { Input, CurrencyInput, Button } from '../ui';

interface LifeEventEditFormProps {
  event?: LifeEvent;
  onSave: (event: LifeEvent) => void;
  onCancel: () => void;
}

export function LifeEventEditForm({ event, onSave, onCancel }: LifeEventEditFormProps) {
  const currentYear = new Date().getFullYear();

  const [name, setName] = useState(event?.name ?? '');
  const [year, setYear] = useState(event?.year ?? currentYear + 5);
  const [amount, setAmount] = useState(Math.abs(event?.amount ?? 0));
  const [isExpense, setIsExpense] = useState(event ? event.amount >= 0 : true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    onSave({
      id: event?.id ?? crypto.randomUUID(),
      name: name.trim(),
      year,
      amount: isExpense ? amount : -amount,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary border border-border-default rounded-lg w-full max-w-md">
        <div className="px-4 py-3 border-b border-border-subtle">
          <h3 className="text-lg font-semibold text-text-primary">
            {event ? 'Edit Life Event' : 'Add Life Event'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <Input
            label="Event Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Home renovation, Inheritance"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Year"
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value) || currentYear)}
              min={currentYear}
              max={currentYear + 60}
            />
            <CurrencyInput
              label="Amount"
              value={amount}
              onChange={setAmount}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Type
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsExpense(true)}
                className={`flex-1 py-2 text-sm rounded-md border transition-colors ${
                  isExpense
                    ? 'border-accent-danger bg-accent-danger/10 text-accent-danger'
                    : 'border-border-default text-text-secondary hover:bg-bg-tertiary'
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setIsExpense(false)}
                className={`flex-1 py-2 text-sm rounded-md border transition-colors ${
                  !isExpense
                    ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                    : 'border-border-default text-text-secondary hover:bg-bg-tertiary'
                }`}
              >
                Income
              </button>
            </div>
            <p className="text-xs text-text-muted mt-1.5">
              {isExpense
                ? 'One-time cost (renovation, college, car, etc.)'
                : 'One-time income (inheritance, property sale, etc.)'}
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={!name.trim()}>
              {event ? 'Save' : 'Add Event'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
