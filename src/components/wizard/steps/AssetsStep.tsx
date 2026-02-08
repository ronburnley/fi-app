import { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { WizardNavigation } from '../WizardNavigation';
import { AssetEditForm } from '../../inputs/AssetEditForm';
import { CurrencyInput, Toggle, Input, PercentInput } from '../../ui';
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_COLORS } from '../../../constants/defaults';
import type { Asset } from '../../../types';

function formatCurrencyCompact(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function AssetsStep() {
  const { state, dispatch } = useApp();
  const { assets, profile } = state;
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [hasPension, setHasPension] = useState(!!assets.pension);
  const [showPensionAdvanced, setShowPensionAdvanced] = useState(false);

  const isMarried = profile.filingStatus === 'married';

  // Calculate totals
  const investmentAssets = assets.accounts.reduce((sum, asset) => sum + asset.balance, 0);

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
    setEditingAsset(null);
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

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-text-primary mb-2">
          Your Assets
        </h1>
        <p className="text-text-secondary">
          Enter your current account balances. These are the building blocks of your runway.
        </p>
      </div>

      {/* Hero: Investment Assets + Net Worth */}
      <div className="bg-bg-secondary border border-border-subtle rounded-xl p-5 mb-6 relative overflow-hidden">
        {/* Gradient line at top */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{
            background: 'linear-gradient(90deg, #a78bfa 0%, #60a5fa 25%, #34d399 50%, #fbbf24 75%, #f472b6 100%)',
          }}
        />

        <div className="pt-2">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">
            Total Investment Assets
          </p>
          <p className="text-3xl font-semibold text-text-primary tabular-nums">
            {formatCurrencyCompact(investmentAssets)}
          </p>
        </div>
      </div>

      {/* Accounts Card */}
      <div className="bg-bg-secondary border border-border-subtle rounded-xl mb-6">
        <div className="px-4 py-3 border-b border-border-subtle">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
            Accounts
          </p>
        </div>

        <div className="divide-y divide-border-subtle">
          {assets.accounts.length === 0 ? (
            <div className="px-4 py-8 text-center text-text-muted text-sm">
              No accounts added yet
            </div>
          ) : (
            assets.accounts.map((asset) => (
              <button
                key={asset.id}
                onClick={() => setEditingAsset(asset)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-bg-tertiary/50 transition-colors text-left"
              >
                {/* Colored dot */}
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: ACCOUNT_TYPE_COLORS[asset.type] }}
                />

                {/* Name, badges, and type label */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-text-primary truncate">
                      {asset.name}
                    </span>
                    {asset.type === 'traditional' && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-zinc-800 text-zinc-500 rounded">
                        pre-tax
                      </span>
                    )}
                    {isMarried && asset.owner === 'spouse' && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-emerald-400/10 text-emerald-400/80 rounded">
                        spouse
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-text-muted">
                    {ACCOUNT_TYPE_LABELS[asset.type]}
                  </span>
                </div>

                {/* Contribution + Balance */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {asset.annualContribution && asset.annualContribution > 0 && (
                    <span className="text-xs font-medium text-emerald-400/80 tabular-nums">
                      +{formatCurrencyCompact(asset.annualContribution)}/yr
                    </span>
                  )}
                  <span className="text-sm font-medium text-text-primary tabular-nums">
                    {formatCurrencyCompact(asset.balance)}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Add Account button */}
        <div className="p-3">
          <button
            onClick={() => setIsAdding(true)}
            className="w-full py-2.5 border-2 border-dashed border-border-default rounded-lg text-sm font-medium text-text-muted hover:border-text-muted hover:text-text-secondary transition-colors"
          >
            + Add Account
          </button>
        </div>
      </div>

      {/* Pension Card */}
      <div className="bg-bg-secondary border border-border-subtle rounded-xl mb-8">
        <div className="px-4 py-3 border-b border-border-subtle">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
            Pension
          </p>
        </div>

        <div className="p-4">
          {/* Pension Toggle + Inline Details */}
          <div>
            <Toggle
              label="Have a pension?"
              checked={hasPension}
              onChange={togglePension}
            />

            {hasPension && assets.pension && (
              <div className="mt-4 space-y-4">
                {/* Primary Inputs: 2-column grid */}
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
              </div>
            )}
          </div>
        </div>
      </div>

      <WizardNavigation />

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
          onDelete={() => handleDeleteAsset(editingAsset.id)}
          onCancel={() => setEditingAsset(null)}
        />
      )}
    </div>
  );
}
