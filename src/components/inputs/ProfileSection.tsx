import { Card, Input, Select } from '../ui';
import { useApp } from '../../context/AppContext';
import { getStateOptions, formatStateTaxHint } from '../../constants/stateTaxes';

export function ProfileSection() {
  const { state, dispatch } = useApp();
  const { profile } = state;

  const updateProfile = (field: string, value: number | string) => {
    dispatch({
      type: 'UPDATE_PROFILE',
      payload: { [field]: value },
    });
  };

  return (
    <Card title="Profile">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Current Age"
            type="number"
            value={profile.currentAge}
            onChange={(e) => updateProfile('currentAge', parseInt(e.target.value) || 0)}
            min={18}
            max={100}
          />
          <Input
            label="FI Target Age"
            type="number"
            value={profile.targetFIAge}
            onChange={(e) => updateProfile('targetFIAge', parseInt(e.target.value) || 0)}
            min={profile.currentAge + 1}
            max={100}
          />
        </div>
        <Input
          label="Life Expectancy"
          type="number"
          value={profile.lifeExpectancy}
          onChange={(e) => updateProfile('lifeExpectancy', parseInt(e.target.value) || 0)}
          min={profile.targetFIAge + 1}
          max={120}
          hint="Planning horizon for projections"
        />
        <Select
          label="Filing Status"
          value={profile.filingStatus}
          onChange={(value) => updateProfile('filingStatus', value)}
          options={[
            { value: 'single', label: 'Single' },
            { value: 'married', label: 'Married Filing Jointly' },
          ]}
        />
        <Select
          label="State of Residence"
          value={profile.state}
          onChange={(value) => updateProfile('state', value)}
          options={getStateOptions()}
          hint={formatStateTaxHint(profile.state)}
        />
        {profile.filingStatus === 'married' && (
          <Input
            label="Spouse's Current Age"
            type="number"
            value={profile.spouseAge || profile.currentAge - 2}
            onChange={(e) => updateProfile('spouseAge', parseInt(e.target.value) || 0)}
            min={18}
            max={100}
            hint="Used for Social Security timing calculations"
          />
        )}
      </div>
    </Card>
  );
}
