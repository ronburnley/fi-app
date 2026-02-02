import { forwardRef, useState, useEffect } from 'react';

interface PercentInputProps {
  label?: string;
  value: number; // stored as decimal (0.06 = 6%)
  onChange: (value: number) => void;
  error?: string;
  hint?: string;
  id?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
}

export const PercentInput = forwardRef<HTMLInputElement, PercentInputProps>(
  ({ label, value, onChange, error, hint, id, disabled, min = 0, max = 100 }, ref) => {
    const [displayValue, setDisplayValue] = useState((value * 100).toFixed(1));
    const [isFocused, setIsFocused] = useState(false);

    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    useEffect(() => {
      if (!isFocused) {
        setDisplayValue((value * 100).toFixed(1));
      }
    }, [value, isFocused]);

    const handleFocus = () => {
      setIsFocused(true);
    };

    const handleBlur = () => {
      setIsFocused(false);
      let parsed = parseFloat(displayValue);
      if (isNaN(parsed)) parsed = 0;
      parsed = Math.max(min, Math.min(max, parsed));
      onChange(parsed / 100);
      setDisplayValue(parsed.toFixed(1));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setDisplayValue(raw);
      const parsed = parseFloat(raw);
      if (!isNaN(parsed)) {
        const clamped = Math.max(min, Math.min(max, parsed));
        onChange(clamped / 100);
      }
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
          <input
            ref={ref}
            id={inputId}
            type="text"
            inputMode="decimal"
            value={displayValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            className={`
              w-full pl-3 pr-8 py-2
              bg-bg-tertiary text-text-primary text-right tabular-nums
              border border-border-default rounded-md
              placeholder:text-text-muted
              focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-150
              ${error ? 'border-accent-danger focus:ring-accent-danger' : ''}
            `}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
            %
          </span>
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

PercentInput.displayName = 'PercentInput';
