import { forwardRef, useState, useEffect } from 'react';

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
    const [displayValue, setDisplayValue] = useState(formatCurrency(value));
    const [isFocused, setIsFocused] = useState(false);

    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    useEffect(() => {
      if (!isFocused) {
        setDisplayValue(formatCurrency(value));
      }
    }, [value, isFocused]);

    const handleFocus = () => {
      setIsFocused(true);
      setDisplayValue(value === 0 ? '' : value.toString());
    };

    const handleBlur = () => {
      setIsFocused(false);
      const parsed = parseCurrency(displayValue);
      onChange(parsed);
      setDisplayValue(formatCurrency(parsed));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setDisplayValue(raw);
      const parsed = parseCurrency(raw);
      onChange(parsed);
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
