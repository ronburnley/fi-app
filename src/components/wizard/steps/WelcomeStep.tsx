import { useApp } from '../../../context/AppContext';
import { WizardNavigation } from '../WizardNavigation';
import { Card, Input, Select } from '../../ui';
import { getStateOptions, getStateTaxInfo } from '../../../constants/stateTaxes';

export function WelcomeStep() {
  const { state, dispatch } = useApp();
  const { profile } = state;

  const isMarried = profile.filingStatus === 'married';

  // Compute yearsToFI from targetFIAge, clamped to 1-30
  const yearsToFI = Math.min(30, Math.max(1, profile.targetFIAge - profile.currentAge));

  // Computed FI ages for display
  const yourFIAge = profile.currentAge + yearsToFI;
  const spouseFIAge = isMarried && profile.spouseAge ? profile.spouseAge + yearsToFI : null;

  const updateProfile = (field: string, value: number | string) => {
    dispatch({
      type: 'UPDATE_PROFILE',
      payload: { [field]: value },
    });
  };

  const handleYearsToFIChange = (newYears: number) => {
    const newTargetAge = profile.currentAge + newYears;
    updateProfile('targetFIAge', newTargetAge);
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
          Let's start by learning about you and your financial independence goals.
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
              value={profile.currentAge}
              onChange={(e) => updateProfile('currentAge', parseInt(e.target.value) || 0)}
              min={18}
              max={100}
            />
            {isMarried && (
              <Input
                label="Spouse's Age"
                type="number"
                value={profile.spouseAge || profile.currentAge - 2}
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
              min={profile.targetFIAge + 1}
              max={120}
            />
          </div>
        </div>
      </Card>

      {/* Years to FI Hero Section */}
      <div className="mt-6 relative overflow-hidden rounded-xl border border-border-subtle bg-bg-secondary">
        {/* Gradient overlay at top */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-accent-blue/10 to-transparent pointer-events-none" />

        <div className="relative px-6 pt-8 pb-6">
          {/* Hero number with glow */}
          <div className="text-center mb-6">
            <div className="relative inline-block">
              {/* Glow effect */}
              <div className="absolute inset-0 blur-2xl bg-accent-blue/20 scale-150" />
              <span className="relative text-8xl font-extrabold text-text-primary tabular-nums">
                {yearsToFI}
              </span>
            </div>
            <p className="text-text-secondary mt-2 text-lg">
              years to financial independence
            </p>
          </div>

          {/* Slider */}
          <div className="mb-4">
            <input
              type="range"
              min={1}
              max={30}
              value={yearsToFI}
              onChange={(e) => handleYearsToFIChange(parseInt(e.target.value))}
              className="fi-slider"
              style={{
                background: `linear-gradient(to right, var(--color-accent-blue) 0%, var(--color-accent-blue) ${((yearsToFI - 1) / 29) * 100}%, var(--color-border-default) ${((yearsToFI - 1) / 29) * 100}%, var(--color-border-default) 100%)`
              }}
            />
            <div className="flex justify-between text-xs text-text-muted mt-2">
              <span>1 year</span>
              <span>30 years</span>
            </div>
          </div>

          {/* FI Ages Display */}
          <div className="border-t border-border-subtle pt-4 mt-4">
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent-blue" />
                <span className="text-text-secondary">
                  You at <span className="text-text-primary font-semibold">{yourFIAge}</span>
                </span>
              </div>
              {isMarried && spouseFIAge && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent-primary" />
                  <span className="text-text-secondary">
                    Spouse at <span className="text-text-primary font-semibold">{spouseFIAge}</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <WizardNavigation />
    </div>
  );
}
