import { useState, useEffect, useRef } from 'react';
import { Card } from '../ui';
import { useApp } from '../../context/AppContext';
import { useProjectionContext } from '../../context/ProjectionContext';

export function GoalFIAgeCard() {
  const { state, goalFIAge, setGoalFIAge } = useApp();
  const { achievableFI } = useProjectionContext();
  const [localValue, setLocalValue] = useState<string>('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { currentAge, lifeExpectancy } = state.profile;
  const minAge = currentAge;
  const maxAge = lifeExpectancy - 1;

  // Sync local value from external goalFIAge (e.g. on clear)
  useEffect(() => {
    if (goalFIAge === null) {
      setLocalValue('');
    } else {
      setLocalValue(String(goalFIAge));
    }
  }, [goalFIAge]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalValue(raw);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (raw === '') {
      debounceRef.current = setTimeout(() => setGoalFIAge(null), 300);
      return;
    }

    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed >= minAge && parsed <= maxAge) {
      debounceRef.current = setTimeout(() => setGoalFIAge(parsed), 300);
    }
  };

  const handleClear = () => {
    setLocalValue('');
    setGoalFIAge(null);
    inputRef.current?.focus();
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Delta status text
  const achievableAge = achievableFI.achievableFIAge;
  let deltaText = '';
  let deltaColor = 'text-text-muted';

  if (goalFIAge !== null && achievableAge !== null) {
    const diff = achievableAge - goalFIAge;
    if (diff === 0) {
      deltaText = 'On track!';
      deltaColor = 'text-accent-primary';
    } else if (diff > 0) {
      deltaText = `${diff} year${diff !== 1 ? 's' : ''} earlier than projected`;
      deltaColor = 'text-accent-blue';
    } else {
      deltaText = `${Math.abs(diff)} year${Math.abs(diff) !== 1 ? 's' : ''} later than projected`;
      deltaColor = 'text-accent-primary';
    }
  } else if (goalFIAge !== null && achievableAge === null) {
    deltaText = 'FI not yet achievable — see guidance below';
    deltaColor = 'text-accent-warning';
  }

  return (
    <Card title="Goal FI Age">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="number"
              value={localValue}
              onChange={handleChange}
              min={minAge}
              max={maxAge}
              placeholder={`${minAge}–${maxAge}`}
              className="
                w-full px-3 py-2
                bg-bg-tertiary text-text-primary
                border border-border-default rounded-md
                placeholder:text-text-muted
                focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent
                tabular-nums text-lg font-semibold
                transition-colors duration-150
              "
            />
          </div>
          {goalFIAge !== null && (
            <button
              onClick={handleClear}
              className="
                p-2 rounded-md
                text-text-muted hover:text-text-secondary
                hover:bg-bg-tertiary
                transition-colors duration-150
              "
              aria-label="Clear goal age"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {goalFIAge !== null && deltaText ? (
          <p className={`text-xs ${deltaColor} leading-snug`}>
            {deltaText}
          </p>
        ) : goalFIAge === null ? (
          <p className="text-xs text-text-muted leading-snug">
            Set a target retirement age
          </p>
        ) : null}
      </div>
    </Card>
  );
}
