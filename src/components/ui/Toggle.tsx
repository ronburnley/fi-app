interface ToggleProps {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
}

export function Toggle({ label, checked, onChange, disabled, id }: ToggleProps) {
  const toggleId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex items-center justify-between">
      {label && (
        <label
          htmlFor={toggleId}
          className="text-sm font-medium text-text-secondary cursor-pointer"
        >
          {label}
        </label>
      )}
      <button
        id={toggleId}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`
          relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full
          border-2 border-transparent transition-colors duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-2 focus:ring-offset-bg-primary
          disabled:opacity-50 disabled:cursor-not-allowed
          ${checked ? 'bg-accent-primary' : 'bg-bg-tertiary'}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full
            bg-white shadow ring-0 transition duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
}
