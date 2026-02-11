import { forwardRef, useState } from 'react';

interface CurrencyInputProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  error?: string;
  hint?: string;
  id?: string;
  disabled?: boolean;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const parseCurrency = (value: string): number => {
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ label, value, onChange, error, hint, id, disabled }, ref) => {
    const [editingValue, setEditingValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    const displayValue = isFocused ? editingValue : formatCurrency(value);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setEditingValue(value === 0 ? '' : formatCurrency(value));
      setIsFocused(true);
      // Select all text on focus for easy replacement
      requestAnimationFrame(() => e.target.select());
    };

    const handleBlur = () => {
      setIsFocused(false);
      const parsed = parseCurrency(editingValue);
      onChange(parsed);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const raw = input.value;
      const parsed = parseCurrency(raw);

      // Count commas before cursor in old vs new value to adjust cursor
      const cursorPos = input.selectionStart ?? raw.length;
      const formatted = parsed === 0 && raw === '' ? '' : formatCurrency(parsed);

      const oldCommasBefore = (raw.slice(0, cursorPos).match(/,/g) || []).length;
      const strippedCursorPos = cursorPos - oldCommasBefore;

      // Find where the same stripped position lands in the formatted string
      let newCursorPos = 0;
      let strippedCount = 0;
      for (let i = 0; i < formatted.length; i++) {
        if (strippedCount === strippedCursorPos) {
          newCursorPos = i;
          break;
        }
        if (formatted[i] !== ',') strippedCount++;
        newCursorPos = i + 1;
      }

      setEditingValue(formatted);
      onChange(parsed);

      // Restore cursor position after React re-renders
      requestAnimationFrame(() => {
        input.setSelectionRange(newCursorPos, newCursorPos);
      });
    };

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-text-secondary mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
            $
          </span>
          <input
            ref={ref}
            id={inputId}
            type="text"
            inputMode="numeric"
            value={displayValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            className={`
              w-full pl-7 pr-3 py-2
              bg-bg-tertiary text-text-primary text-right tabular-nums
              border border-border-default rounded-md
              placeholder:text-text-muted
              focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-150
              ${error ? 'border-accent-danger focus:ring-accent-danger' : ''}
            `}
          />
        </div>
        {hint && !error && (
          <p className="mt-1 text-xs text-text-muted">{hint}</p>
        )}
        {error && (
          <p className="mt-1 text-xs text-accent-danger">{error}</p>
        )}
      </div>
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
