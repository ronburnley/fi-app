import type { InputFrequency } from '../../types';

interface FrequencyToggleProps {
  value: InputFrequency;
  onChange: (frequency: InputFrequency) => void;
}

export function FrequencyToggle({ value, onChange }: FrequencyToggleProps) {
  return (
    <div className="flex gap-0.5 p-0.5 bg-bg-tertiary rounded-md">
      <button
        type="button"
        onClick={() => onChange('monthly')}
        className={`px-1.5 py-0.5 text-xs font-medium rounded transition-colors ${
          value === 'monthly'
            ? 'bg-bg-secondary text-text-primary'
            : 'text-text-muted hover:text-text-secondary'
        }`}
      >
        mo
      </button>
      <button
        type="button"
        onClick={() => onChange('annual')}
        className={`px-1.5 py-0.5 text-xs font-medium rounded transition-colors ${
          value === 'annual'
            ? 'bg-bg-secondary text-text-primary'
            : 'text-text-muted hover:text-text-secondary'
        }`}
      >
        yr
      </button>
    </div>
  );
}
