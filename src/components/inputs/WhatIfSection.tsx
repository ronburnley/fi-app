import { Card, Slider, Select } from '../ui';
import { useApp } from '../../context/AppContext';

export function WhatIfSection() {
  const { state, whatIf, setWhatIf } = useApp();

  const formatSpendingAdjustment = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${(value * 100).toFixed(0)}%`;
  };

  const formatFIAgeAdjustment = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value} years`;
  };

  const formatReturn = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <Card title="What-If Scenarios">
      <div className="space-y-5">
        <p className="text-xs text-text-muted">
          Adjust these sliders to see how changes affect your runway
        </p>

        <Slider
          label="Spending Adjustment"
          value={whatIf.spendingAdjustment}
          onChange={(value) => setWhatIf({ ...whatIf, spendingAdjustment: value })}
          min={-0.3}
          max={0.3}
          step={0.01}
          formatValue={formatSpendingAdjustment}
        />

        <Slider
          label="FI Age Adjustment"
          value={whatIf.fiAgeAdjustment}
          onChange={(value) => setWhatIf({ ...whatIf, fiAgeAdjustment: value })}
          min={-10}
          max={10}
          step={1}
          formatValue={formatFIAgeAdjustment}
        />

        <Slider
          label="Investment Return"
          value={whatIf.returnAdjustment}
          onChange={(value) => setWhatIf({ ...whatIf, returnAdjustment: value })}
          min={0.02}
          max={0.12}
          step={0.005}
          formatValue={formatReturn}
        />

        <Select
          label="Social Security Start Age"
          value={whatIf.ssStartAge}
          onChange={(value) => setWhatIf({ ...whatIf, ssStartAge: parseInt(value as string) as 62 | 67 | 70 })}
          options={[
            { value: 62, label: 'Age 62' },
            { value: 67, label: 'Age 67' },
            { value: 70, label: 'Age 70' },
          ]}
        />

        {state.profile.filingStatus === 'married' && state.socialSecurity.spouse?.include && (
          <Select
            label="Spouse SS Start Age"
            value={whatIf.spouseSSStartAge ?? state.socialSecurity.spouse.startAge}
            onChange={(value) => setWhatIf({ ...whatIf, spouseSSStartAge: parseInt(value as string) as 62 | 67 | 70 })}
            options={[
              { value: 62, label: 'Age 62' },
              { value: 67, label: 'Age 67' },
              { value: 70, label: 'Age 70' },
            ]}
          />
        )}

        {/* Show effective values */}
        <div className="pt-3 border-t border-border-subtle">
          <p className="text-xs text-text-muted mb-2">Effective Values</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-text-muted">Spending: </span>
              <span className="text-text-primary tabular-nums">
                ${Math.round(state.expenses.annualSpending * (1 + whatIf.spendingAdjustment)).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-text-muted">FI Age: </span>
              <span className="text-text-primary tabular-nums">
                {state.profile.targetFIAge + whatIf.fiAgeAdjustment}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
