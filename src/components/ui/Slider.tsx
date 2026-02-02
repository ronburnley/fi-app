interface SliderProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  formatValue?: (value: number) => string;
  disabled?: boolean;
  id?: string;
}

export function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  formatValue,
  disabled,
  id,
}: SliderProps) {
  const sliderId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const displayValue = formatValue ? formatValue(value) : value.toString();

  // Calculate the percentage for the filled portion
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor={sliderId}
            className="text-sm font-medium text-text-secondary"
          >
            {label}
          </label>
          <span className="text-sm font-medium text-text-primary tabular-nums">
            {displayValue}
          </span>
        </div>
      )}
      <input
        id={sliderId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        className="w-full h-2 bg-bg-tertiary rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #1c1c1f ${percentage}%, #1c1c1f 100%)`,
        }}
      />
    </div>
  );
}
