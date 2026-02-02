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
    <Card title="Assumptions">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <PercentInput
            label="Investment Return"
            value={assumptions.investmentReturn}
            onChange={(value) => updateAssumptions('investmentReturn', value)}
            hint="Annual return (before inflation)"
            min={-20}
            max={20}
          />
          <PercentInput
            label="Inflation Rate"
            value={assumptions.inflationRate}
            onChange={(value) => updateAssumptions('inflationRate', value)}
            hint="Annual inflation"
            min={0}
            max={15}
          />
        </div>

        <div className="pt-3 border-t border-border-subtle">
          <p className="text-xs text-text-muted mb-3">Tax Rates on Withdrawals</p>
          <div className="grid grid-cols-2 gap-3">
            <PercentInput
              label="Federal Income Tax"
              value={assumptions.traditionalTaxRate}
              onChange={(value) => updateAssumptions('traditionalTaxRate', value)}
              hint="For traditional withdrawals"
              min={0}
              max={50}
            />
            <PercentInput
              label="Federal Cap Gains"
              value={assumptions.capitalGainsTaxRate}
              onChange={(value) => updateAssumptions('capitalGainsTaxRate', value)}
              hint="For taxable account gains"
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
          <PercentInput
            label="Safe Withdrawal Rate"
            value={assumptions.safeWithdrawalRate}
            onChange={(value) => updateAssumptions('safeWithdrawalRate', value)}
            hint="Used to calculate your FI number"
            min={1}
            max={10}
          />
        </div>

        <div className="pt-3 border-t border-border-subtle">
          <p className="text-xs text-text-muted mb-2">Withdrawal Order</p>
          <div className="text-xs text-text-secondary space-y-1">
            {assumptions.withdrawalOrder.map((source, index) => (
              <div key={source} className="flex items-center gap-2">
                <span className="text-text-muted">{index + 1}.</span>
                <span className="capitalize">{source}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-text-muted mt-2 italic">
            Taxable first for tax efficiency, Roth last for tax-free growth
          </p>
        </div>
      </div>
    </Card>
  );
}
