import { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { WizardNavigation } from '../WizardNavigation';
import { AssetEditForm } from '../../inputs/AssetEditForm';
import { CurrencyInput, Toggle } from '../../ui';
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

  const isMarried = profile.filingStatus === 'married';

  // Calculate totals
  const investmentAssets = assets.accounts.reduce((sum, asset) => sum + asset.balance, 0);
  const netWorth = investmentAssets + (assets.homeEquity || 0);

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
          pension: { annualBenefit: 0, startAge: 65 },
        },
      });
    } else {
      dispatch({
        type: 'UPDATE_ASSETS',
        payload: { pension: undefined },
      });
    }
  };

  const updateHomeEquity = (value: number) => {
    dispatch({
      type: 'UPDATE_ASSETS',
      payload: { homeEquity: value },
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

        <div className="flex justify-between items-start pt-2">
          <div>
            <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">
              Investment Assets
            </p>
            <p className="text-3xl font-semibold text-text-primary tabular-nums">
              {formatCurrencyCompact(investmentAssets)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">
              Net Worth
            </p>
            <p className="text-xl font-medium text-text-secondary tabular-nums">
              {formatCurrencyCompact(netWorth)}
            </p>
          </div>
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

                {/* Balance */}
                <span className="text-sm font-medium text-text-primary tabular-nums flex-shrink-0">
                  {formatCurrencyCompact(asset.balance)}
                </span>
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

      {/* Other Card */}
      <div className="bg-bg-secondary border border-border-subtle rounded-xl mb-8">
        <div className="px-4 py-3 border-b border-border-subtle">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
            Other
          </p>
        </div>

        <div className="p-4 space-y-4">
          {/* Home Equity */}
          <CurrencyInput
            label="Home Equity"
            value={assets.homeEquity || 0}
            onChange={updateHomeEquity}
            hint="For reference only, not included in withdrawals"
          />

          {/* Pension Toggle */}
          <div className="pt-2 border-t border-border-subtle">
            <Toggle
              label="Have a pension?"
              checked={hasPension}
              onChange={togglePension}
            />
            {hasPension && (
              <p className="text-xs text-text-muted mt-2">
                We'll ask for details on the next step.
              </p>
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
