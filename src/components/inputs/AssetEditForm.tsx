import { useState, useEffect } from 'react';
import type { Asset, AccountType, AccountOwner } from '../../types';
import { Input, CurrencyInput, Toggle, Select, Button } from '../ui';
import { generateId } from '../../utils/migration';
import { ACCOUNT_TYPE_LABELS } from '../../constants/defaults';

interface AssetEditFormProps {
  asset?: Asset;
  isMarried: boolean;
  onSave: (asset: Asset) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

const ACCOUNT_TYPE_OPTIONS = [
  { value: 'taxable', label: ACCOUNT_TYPE_LABELS.taxable },
  { value: 'traditional', label: ACCOUNT_TYPE_LABELS.traditional },
  { value: 'roth', label: ACCOUNT_TYPE_LABELS.roth },
  { value: 'hsa', label: ACCOUNT_TYPE_LABELS.hsa },
  { value: 'cash', label: ACCOUNT_TYPE_LABELS.cash },
  { value: '529', label: ACCOUNT_TYPE_LABELS['529'] },
  { value: 'other', label: ACCOUNT_TYPE_LABELS.other },
];

export function AssetEditForm({ asset, isMarried, onSave, onDelete, onCancel }: AssetEditFormProps) {
  const [name, setName] = useState(asset?.name ?? '');
  const [type, setType] = useState<AccountType>(asset?.type ?? 'taxable');
  const [owner, setOwner] = useState<AccountOwner>(asset?.owner ?? 'self');
  const [balance, setBalance] = useState(asset?.balance ?? 0);
  const [costBasis, setCostBasis] = useState(asset?.costBasis ?? 0);
  const [is401k, setIs401k] = useState(asset?.is401k ?? false);
  const [separatedFromService, setSeparatedFromService] = useState(asset?.separatedFromService ?? false);

  // Reset owner to 'self' if not married and owner was spouse
  useEffect(() => {
    if (!isMarried && owner === 'spouse') {
      setOwner('self');
    }
  }, [isMarried, owner]);

  // Reset 401k fields when type changes
  useEffect(() => {
    if (type !== 'traditional' && type !== 'roth') {
      setIs401k(false);
      setSeparatedFromService(false);
    }
  }, [type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newAsset: Asset = {
      id: asset?.id ?? generateId(),
      name: name.trim() || getDefaultName(type),
      type,
      owner,
      balance,
    };

    if (type === 'taxable' || type === '529' || type === 'other') {
      newAsset.costBasis = costBasis;
    }

    if ((type === 'traditional' || type === 'roth') && is401k) {
      newAsset.is401k = true;
      if (separatedFromService) {
        newAsset.separatedFromService = true;
      }
    }

    onSave(newAsset);
  };

  const getDefaultName = (accountType: AccountType): string => {
    switch (accountType) {
      case 'taxable':
        return 'Taxable Brokerage';
      case 'traditional':
        return is401k ? 'Traditional 401(k)' : 'Traditional IRA';
      case 'roth':
        return is401k ? 'Roth 401(k)' : 'Roth IRA';
      case 'hsa':
        return 'HSA';
      case 'cash':
        return 'Cash';
      case '529':
        return '529 Plan';
      case 'other':
        return 'Other Account';
    }
  };

  const isRetirementAccount = type === 'traditional' || type === 'roth';
  const showCostBasis = type === 'taxable' || type === '529' || type === 'other';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h3 className="text-lg font-semibold text-text-primary">
            {asset ? 'Edit Account' : 'Add Account'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <Input
            label="Account Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={getDefaultName(type)}
          />

          <Select
            label="Account Type"
            options={ACCOUNT_TYPE_OPTIONS}
            value={type}
            onChange={(value) => setType(value as AccountType)}
          />

          {/* Owner segmented control - only show when married */}
          {isMarried && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Owner
              </label>
              <div className="flex gap-1 p-1 bg-zinc-800/50 rounded-lg">
                <button
                  type="button"
                  onClick={() => setOwner('self')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    owner === 'self'
                      ? 'bg-zinc-700 text-text-primary'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  Self
                </button>
                <button
                  type="button"
                  onClick={() => setOwner('spouse')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    owner === 'spouse'
                      ? 'bg-zinc-700 text-text-primary'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  Spouse
                </button>
              </div>
            </div>
          )}

          <CurrencyInput
            label="Balance"
            value={balance}
            onChange={setBalance}
          />

          {showCostBasis && (
            <CurrencyInput
              label="Cost Basis"
              value={costBasis}
              onChange={setCostBasis}
              hint="Original purchase price for capital gains calculation"
            />
          )}

          {isRetirementAccount && (
            <div className="pt-3 border-t border-zinc-800 space-y-3">
              <Toggle
                label="This is a 401(k)"
                checked={is401k}
                onChange={setIs401k}
              />

              {is401k && (
                <Toggle
                  label="Separated from employer at 55+"
                  checked={separatedFromService}
                  onChange={setSeparatedFromService}
                />
              )}

              {is401k && (
                <p className="text-xs text-text-muted">
                  401(k)s may qualify for the Rule of 55, allowing penalty-free withdrawals
                  after separating from service at age 55 or older.
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-3">
            {asset && onDelete && (
              <Button
                type="button"
                variant="secondary"
                onClick={onDelete}
                className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
              >
                Delete
              </Button>
            )}
            <div className="flex-1" />
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              {asset ? 'Save' : 'Add Account'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
