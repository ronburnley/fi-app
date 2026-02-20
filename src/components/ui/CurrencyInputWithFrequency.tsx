import type { InputFrequency } from '../../types';
import { CurrencyInput } from './CurrencyInput';
import { FrequencyToggle } from './FrequencyToggle';

interface CurrencyInputWithFrequencyProps {
  label: string;
  annualValue: number;
  onAnnualChange: (value: number) => void;
  frequency: InputFrequency;
  onFrequencyChange: (frequency: InputFrequency) => void;
  hint?: string;
  error?: string;
  id?: string;
  disabled?: boolean;
}

function formatConversionHint(annualValue: number, frequency: InputFrequency): string {
  const fmt = (n: number) =>
    n.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  if (frequency === 'monthly') {
    return `= ${fmt(annualValue)}/yr`;
  }
  return `= ${fmt(Math.round(annualValue / 12))}/mo`;
}

export function CurrencyInputWithFrequency({
  label,
  annualValue,
  onAnnualChange,
  frequency,
  onFrequencyChange,
  hint,
  error,
  id,
  disabled,
}: CurrencyInputWithFrequencyProps) {
  const displayValue = frequency === 'monthly' ? Math.round(annualValue / 12) : annualValue;

  const handleChange = (value: number) => {
    if (frequency === 'monthly') {
      onAnnualChange(value * 12);
    } else {
      onAnnualChange(value);
    }
  };

  const conversionHint = annualValue > 0 ? formatConversionHint(annualValue, frequency) : undefined;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <label
          htmlFor={id || label.toLowerCase().replace(/\s+/g, '-')}
          className="text-sm font-medium text-text-secondary"
        >
          {label}
        </label>
        <FrequencyToggle value={frequency} onChange={onFrequencyChange} />
      </div>
      <CurrencyInput
        value={displayValue}
        onChange={handleChange}
        hint={conversionHint || hint}
        error={error}
        id={id}
        disabled={disabled}
      />
    </div>
  );
}
