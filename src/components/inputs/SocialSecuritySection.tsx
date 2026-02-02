import { useState } from 'react';
import { Card, Toggle, CurrencyInput, Select, PercentInput } from '../ui';
import { useApp } from '../../context/AppContext';
import type { SpouseSocialSecurity } from '../../types';

export function SocialSecuritySection() {
  const { state, dispatch } = useApp();
  const { socialSecurity, profile } = state;
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateSocialSecurity = (field: string, value: boolean | number) => {
    dispatch({
      type: 'UPDATE_SOCIAL_SECURITY',
      payload: { [field]: value },
    });
  };

  const updateSpouseSocialSecurity = (updates: Partial<SpouseSocialSecurity>) => {
    const currentSpouse = socialSecurity.spouse || { include: true, monthlyBenefit: 2000, startAge: 67 as const };
    dispatch({
      type: 'UPDATE_SOCIAL_SECURITY',
      payload: {
        spouse: { ...currentSpouse, ...updates },
      },
    });
  };

  return (
    <Card title="Social Security">
      <div className="space-y-4">
        <Toggle
          label="Include Social Security"
          checked={socialSecurity.include}
          onChange={(checked) => updateSocialSecurity('include', checked)}
        />

        {socialSecurity.include && (
          <>
            <CurrencyInput
              label="Monthly Benefit"
              value={socialSecurity.monthlyBenefit}
              onChange={(value) => updateSocialSecurity('monthlyBenefit', value)}
              hint="Estimated monthly benefit at your chosen start age"
            />
            <Select
              label="Start Age"
              value={socialSecurity.startAge}
              onChange={(value) => updateSocialSecurity('startAge', parseInt(value as string))}
              options={[
                { value: 62, label: 'Age 62 (early, reduced benefit)' },
                { value: 67, label: 'Age 67 (full retirement age)' },
                { value: 70, label: 'Age 70 (delayed, maximum benefit)' },
              ]}
            />

            {/* Spouse Social Security */}
            {profile.filingStatus === 'married' && (
              <div className="pt-4 border-t border-border-subtle">
                <p className="text-sm font-medium text-text-secondary mb-3">Spouse's Social Security</p>
                <div className="space-y-4">
                  <Toggle
                    label="Include Spouse's Social Security"
                    checked={socialSecurity.spouse?.include ?? true}
                    onChange={(checked) => updateSpouseSocialSecurity({ include: checked })}
                  />

                  {socialSecurity.spouse?.include && (
                    <>
                      <CurrencyInput
                        label="Spouse Monthly Benefit"
                        value={socialSecurity.spouse?.monthlyBenefit ?? 2000}
                        onChange={(value) => updateSpouseSocialSecurity({ monthlyBenefit: value })}
                        hint="Spouse's estimated monthly benefit"
                      />
                      <Select
                        label="Spouse Start Age"
                        value={socialSecurity.spouse?.startAge ?? 67}
                        onChange={(value) => updateSpouseSocialSecurity({ startAge: parseInt(value as string) as 62 | 67 | 70 })}
                        options={[
                          { value: 62, label: 'Age 62 (early, reduced benefit)' },
                          { value: 67, label: 'Age 67 (full retirement age)' },
                          { value: 70, label: 'Age 70 (delayed, maximum benefit)' },
                        ]}
                      />
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Advanced Settings */}
            <div className="pt-4 border-t border-border-subtle">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-text-muted hover:text-text-secondary transition-colors flex items-center gap-1"
              >
                <span className={`transition-transform ${showAdvanced ? 'rotate-90' : ''}`}>▸</span>
                Advanced Settings
              </button>

              {showAdvanced && (
                <div className="mt-3">
                  <PercentInput
                    label="Annual COLA Rate"
                    value={socialSecurity.colaRate ?? 0.02}
                    onChange={(value) => updateSocialSecurity('colaRate', value)}
                    hint="Cost of Living Adjustment (historical average ~2%)"
                    min={0}
                    max={10}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
