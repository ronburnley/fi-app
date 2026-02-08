import { Card, PercentInput, Toggle } from '../ui';
import { useApp } from '../../context/AppContext';
import type { PenaltySettings } from '../../types';

export function AssumptionsSection() {
  const { state, dispatch } = useApp();
  const { assumptions } = state;

  const updateAssumptions = (field: string, value: number) => {
    dispatch({
      type: 'UPDATE_ASSUMPTIONS',
      payload: { [field]: value },
    });
  };

  const updatePenaltySettings = (field: keyof PenaltySettings, value: number | boolean) => {
    dispatch({
      type: 'UPDATE_ASSUMPTIONS',
      payload: {
        penaltySettings: {
          ...assumptions.penaltySettings,
          [field]: value,
        },
      },
    });
  };

  return (
    <Card>
      <div className="space-y-4">
        <div>
          <p className="text-xs text-text-muted mb-3">Growth & Inflation</p>
          <div className="grid grid-cols-3 gap-3">
            <PercentInput
              label="Investment Return"
              value={assumptions.investmentReturn}
              onChange={(value) => updateAssumptions('investmentReturn', value)}
              hint="Nominal annual return"
              min={-20}
              max={20}
            />
            <PercentInput
              label="General Inflation"
              value={assumptions.inflationRate}
              onChange={(value) => updateAssumptions('inflationRate', value)}
              hint="Applied to all expenses & retirement income"
              min={0}
              max={15}
            />
            <PercentInput
              label="Withdrawal Rate"
              value={assumptions.safeWithdrawalRate}
              onChange={(value) => updateAssumptions('safeWithdrawalRate', value)}
              hint="Sets FI Number target (reference only)"
              min={1}
              max={10}
            />
          </div>
        </div>

        <div className="pt-3 border-t border-border-subtle">
          <p className="text-xs text-text-muted mb-3">Federal Tax Rates</p>
          <div className="grid grid-cols-2 gap-3">
            <PercentInput
              label="Income Tax"
              value={assumptions.traditionalTaxRate}
              onChange={(value) => updateAssumptions('traditionalTaxRate', value)}
              hint="On traditional withdrawals"
              min={0}
              max={50}
            />
            <PercentInput
              label="Capital Gains"
              value={assumptions.capitalGainsTaxRate}
              onChange={(value) => updateAssumptions('capitalGainsTaxRate', value)}
              hint="On taxable account gains"
              min={0}
              max={40}
            />
          </div>
        </div>

        <div className="pt-3 border-t border-border-subtle">
          <p className="text-xs text-text-muted mb-3">Early Withdrawal Penalties</p>
          <div className="grid grid-cols-2 gap-3">
            <PercentInput
              label="Before Age 59.5"
              value={assumptions.penaltySettings.earlyWithdrawalPenaltyRate}
              onChange={(value) => updatePenaltySettings('earlyWithdrawalPenaltyRate', value)}
              hint="Traditional/Roth penalty"
              min={0}
              max={25}
            />
            <PercentInput
              label="HSA Before 65"
              value={assumptions.penaltySettings.hsaEarlyPenaltyRate}
              onChange={(value) => updatePenaltySettings('hsaEarlyPenaltyRate', value)}
              hint="Non-medical use"
              min={0}
              max={30}
            />
          </div>
          <div className="mt-3">
            <Toggle
              label="Enable Rule of 55"
              checked={assumptions.penaltySettings.enableRule55}
              onChange={(value) => updatePenaltySettings('enableRule55', value)}
            />
            <p className="text-xs text-text-muted mt-1">
              Allows penalty-free 401(k) withdrawals after leaving employer at 55+
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-border-subtle">
          <p className="text-xs text-text-muted mb-2">Withdrawal Priority</p>
          <div className="text-sm text-text-secondary">
            {assumptions.withdrawalOrder.map((source, index) => (
              <span key={source}>
                {index > 0 && <span className="text-text-muted mx-1">&rarr;</span>}
                <span className="text-text-muted">{index + 1}.</span>{' '}
                <span className="capitalize">{source}</span>
              </span>
            ))}
          </div>
          <p className="text-xs text-text-muted mt-1 italic">
            Taxable first for tax efficiency, Roth last for tax-free growth
          </p>
        </div>
      </div>
    </Card>
  );
}
