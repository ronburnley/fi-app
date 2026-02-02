import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

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
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-3 py-2
            bg-bg-tertiary text-text-primary
            border border-border-default rounded-md
            placeholder:text-text-muted
            focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-150
            ${error ? 'border-accent-danger focus:ring-accent-danger' : ''}
            ${className}
          `}
          {...props}
        />
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

Input.displayName = 'Input';
