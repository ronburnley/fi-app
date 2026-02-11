import { useApp } from '../../../context/AppContext';
import { WizardNavigation } from '../WizardNavigation';
import { Card, Input, Select } from '../../ui';
import { getStateOptions, getStateTaxInfo } from '../../../constants/stateTaxes';

export function WelcomeStep() {
  const { state, dispatch } = useApp();
  const { profile } = state;

  const isMarried = profile.filingStatus === 'married';

  const updateProfile = (field: string, value: number | string) => {
    dispatch({
      type: 'UPDATE_PROFILE',
      payload: { [field]: value },
    });
  };

  // Format state tax hint in the new format
  const formatTaxHint = (code: string): string => {
    const stateInfo = getStateTaxInfo(code);
    if (!stateInfo.hasIncomeTax && stateInfo.capitalGainsRate === 0) {
      return 'No state income tax';
    }
    // Use the higher of income or cap gains rate for display
    const topRate = Math.max(stateInfo.incomeRate, stateInfo.capitalGainsRate);
    return `${(topRate * 100).toFixed(0)}% top marginal rate`;
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2 tracking-tight">
          Welcome to FI Runway
        </h1>
        <p className="text-text-secondary">
          Answer a few questions and we'll calculate when you can achieve financial independence.
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-4">
          Profile
        </p>

        <div className="space-y-5">
          {/* Filing Status - Segmented Control */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Filing Status
            </label>
            <div className="bg-zinc-800/80 rounded-lg p-1 flex gap-1">
              <button
                type="button"
                onClick={() => updateProfile('filingStatus', 'single')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  profile.filingStatus === 'single'
                    ? 'bg-zinc-700 text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Single
              </button>
              <button
                type="button"
                onClick={() => updateProfile('filingStatus', 'married')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  profile.filingStatus === 'married'
                    ? 'bg-zinc-700 text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Married Filing Jointly
              </button>
            </div>
          </div>

          {/* Row 1: Your Age | Spouse's Age */}
          <div className={`grid gap-4 ${isMarried ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <Input
              label="Your Age"
              type="number"
              value={profile.currentAge || ''}
              onChange={(e) => updateProfile('currentAge', parseInt(e.target.value) || 0)}
              placeholder="e.g., 45"
              min={18}
              max={100}
            />
            {isMarried && (
              <Input
                label="Spouse's Age"
                type="number"
                value={profile.spouseAge || ''}
                onChange={(e) => updateProfile('spouseAge', parseInt(e.target.value) || 0)}
                min={18}
                max={100}
              />
            )}
          </div>

          {/* Row 2: State | Life Expectancy */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="State of Residence"
              value={profile.state}
              onChange={(value) => updateProfile('state', value)}
              options={getStateOptions()}
              hint={formatTaxHint(profile.state)}
            />
            <Input
              label="Life Expectancy"
              type="number"
              value={profile.lifeExpectancy}
              onChange={(e) => updateProfile('lifeExpectancy', parseInt(e.target.value) || 0)}
              min={profile.currentAge + 1}
              max={120}
            />
          </div>
        </div>
      </Card>

      {/* Info callout */}
      <div className="mt-6 relative overflow-hidden rounded-xl border border-border-subtle bg-bg-secondary p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-accent-blue/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-text-primary font-medium mb-1">How it works</p>
            <p className="text-sm text-text-secondary">
              Enter your assets, spending, and benefits in the following steps. We'll calculate the earliest age you can achieve financial independence based on your current situation.
            </p>
          </div>
        </div>
      </div>

      <WizardNavigation
        onValidate={() => profile.currentAge > 0}
        disabled={profile.currentAge <= 0}
      />
    </div>
  );
}
