import { useState } from 'react';
import { Card, CurrencyInput, Input, Toggle, Button, PercentInput } from '../ui';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';
import { AssetRow } from './AssetRow';
import { AssetEditForm } from './AssetEditForm';
import type { Asset } from '../../types';

export function AssetsSection() {
  const { state, dispatch } = useApp();
  const { assets, profile } = state;
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [hasPension, setHasPension] = useState(!!assets.pension);
  const [showPensionAdvanced, setShowPensionAdvanced] = useState(false);

  const isMarried = profile.filingStatus === 'married';

  const totalBalance = assets.accounts.reduce((sum, asset) => sum + asset.balance, 0);

  const handleAddAsset = (asset: Asset) => {
    dispatch({ type: 'ADD_ASSET', payload: asset });
    setIsAdding(false);
  };

  const handleUpdateAsset = (asset: Asset) => {
    dispatch({ type: 'UPDATE_ASSET', payload: asset });
    setEditingAsset(null);
  };

  const handleDeleteAsset = (id: string) => {
    dispatch({ type: 'REMOVE_ASSET', payload: id });
  };

  const togglePension = (enabled: boolean) => {
    setHasPension(enabled);
    if (enabled) {
      dispatch({
        type: 'UPDATE_ASSETS',
        payload: {
          pension: { annualBenefit: 0, startAge: 65, colaRate: 0 },
        },
      });
    } else {
      dispatch({
        type: 'UPDATE_ASSETS',
        payload: { pension: undefined },
      });
    }
  };

  const updatePension = (field: string, value: number) => {
    dispatch({
      type: 'UPDATE_ASSETS',
      payload: {
        pension: {
          ...assets.pension!,
          [field]: value,
        },
      },
    });
  };

  const updateHomeEquity = (value: number) => {
    dispatch({
      type: 'UPDATE_ASSETS',
      payload: { homeEquity: value },
    });
  };

  return (
    <Card title="Assets">
      <div className="space-y-4">
        {/* Assets Table */}
        <div className="border border-border-subtle rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-bg-tertiary">
                <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">Name</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">Type</th>
                {isMarried && (
                  <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">Owner</th>
                )}
                <th className="px-3 py-2 text-right text-xs font-medium text-text-muted">Balance</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-text-muted w-20">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {assets.accounts.map((asset) => (
                <AssetRow
                  key={asset.id}
                  asset={asset}
                  showOwner={isMarried}
                  onEdit={() => setEditingAsset(asset)}
                  onDelete={() => handleDeleteAsset(asset.id)}
                />
              ))}
              {assets.accounts.length === 0 && (
                <tr>
                  <td colSpan={isMarried ? 5 : 4} className="px-3 py-8 text-center text-text-muted text-sm">
                    No assets added yet. Click "Add Asset" to get started.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-bg-tertiary border-t border-border-subtle">
                <td colSpan={isMarried ? 3 : 2} className="px-3 py-2 text-sm font-medium text-text-secondary">
                  Total
                </td>
                <td className="px-3 py-2 text-right text-sm font-semibold text-text-primary tabular-nums">
                  {formatCurrency(totalBalance)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Add Asset Button */}
        <Button
          variant="secondary"
          onClick={() => setIsAdding(true)}
          className="w-full"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Asset
        </Button>

        {/* Home Equity (display only) */}
        <div className="pt-3 border-t border-border-subtle">
          <CurrencyInput
            label="Home Equity (optional)"
            value={assets.homeEquity || 0}
            onChange={updateHomeEquity}
            hint="For reference only, not included in withdrawals"
          />
        </div>

        {/* Pension */}
        <div className="pt-3 border-t border-border-subtle space-y-3">
          <Toggle
            label="Have a pension?"
            checked={hasPension}
            onChange={togglePension}
          />
          {hasPension && assets.pension && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <CurrencyInput
                  label="Annual Benefit"
                  value={assets.pension.annualBenefit}
                  onChange={(value) => updatePension('annualBenefit', value)}
                  hint="Before taxes"
                />
                <Input
                  label="Start Age"
                  type="number"
                  value={assets.pension.startAge}
                  onChange={(e) => updatePension('startAge', parseInt(e.target.value) || 65)}
                  min={50}
                  max={100}
                  hint="When payments begin"
                />
              </div>

              {/* Advanced Settings - COLA */}
              <div className="pt-3 border-t border-border-subtle/50">
                <button
                  type="button"
                  onClick={() => setShowPensionAdvanced(!showPensionAdvanced)}
                  className="group flex items-center gap-2 text-sm text-text-muted hover:text-text-secondary transition-colors duration-150"
                >
                  <svg
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      showPensionAdvanced ? 'rotate-90' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  <span className="font-medium">Advanced</span>
                </button>

                {showPensionAdvanced && (
                  <div className="mt-3 max-w-[200px]">
                    <PercentInput
                      label="Annual COLA"
                      value={assets.pension.colaRate ?? 0}
                      onChange={(value) => updatePension('colaRate', value)}
                      hint="Cost-of-living adjustment"
                      min={0}
                      max={10}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Asset Modal */}
      {isAdding && (
        <AssetEditForm
          isMarried={isMarried}
          onSave={handleAddAsset}
          onCancel={() => setIsAdding(false)}
        />
      )}

      {/* Edit Asset Modal */}
      {editingAsset && (
        <AssetEditForm
          asset={editingAsset}
          isMarried={isMarried}
          onSave={handleUpdateAsset}
          onCancel={() => setEditingAsset(null)}
        />
      )}
    </Card>
  );
}
