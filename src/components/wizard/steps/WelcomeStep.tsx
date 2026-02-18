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
          Your Profile
        </h1>
        <p className="text-text-secondary">
          Tell us about yourself to get started.
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
              value={profile.lifeExpectancy || ''}
              onChange={(e) => updateProfile('lifeExpectancy', parseInt(e.target.value) || 0)}
              min={profile.currentAge + 1}
              max={120}
            />
          </div>
        </div>
      </Card>

      <WizardNavigation
        onValidate={() => profile.currentAge > 0}
        disabled={profile.currentAge <= 0}
      />
    </div>
  );
}

export default WelcomeStep;
