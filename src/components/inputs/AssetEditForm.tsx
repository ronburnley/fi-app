import { useState, useEffect } from 'react';
import type { Asset, AccountType, AccountOwner } from '../../types';
import { Input, CurrencyInput, Toggle, Select, Button } from '../ui';
import { generateId } from '../../utils/migration';
import { ACCOUNT_TYPE_LABELS, ACCOUNT_OWNER_LABELS } from '../../constants/defaults';

interface AssetEditFormProps {
  asset?: Asset;
  isMarried: boolean;
  onSave: (asset: Asset) => void;
  onCancel: () => void;
}

const ACCOUNT_TYPE_OPTIONS = [
  { value: 'taxable', label: ACCOUNT_TYPE_LABELS.taxable },
  { value: 'traditional', label: ACCOUNT_TYPE_LABELS.traditional },
  { value: 'roth', label: ACCOUNT_TYPE_LABELS.roth },
  { value: 'hsa', label: ACCOUNT_TYPE_LABELS.hsa },
  { value: 'cash', label: ACCOUNT_TYPE_LABELS.cash },
];

export function AssetEditForm({ asset, isMarried, onSave, onCancel }: AssetEditFormProps) {
  const [name, setName] = useState(asset?.name ?? '');
  const [type, setType] = useState<AccountType>(asset?.type ?? 'taxable');
  const [owner, setOwner] = useState<AccountOwner>(asset?.owner ?? 'self');
  const [balance, setBalance] = useState(asset?.balance ?? 0);
  const [costBasis, setCostBasis] = useState(asset?.costBasis ?? 0);
  const [is401k, setIs401k] = useState(asset?.is401k ?? false);
  const [separatedFromService, setSeparatedFromService] = useState(asset?.separatedFromService ?? false);

  const ownerOptions = isMarried
    ? [
        { value: 'self', label: ACCOUNT_OWNER_LABELS.self },
        { value: 'spouse', label: ACCOUNT_OWNER_LABELS.spouse },
        { value: 'joint', label: ACCOUNT_OWNER_LABELS.joint },
      ]
    : [{ value: 'self', label: ACCOUNT_OWNER_LABELS.self }];

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

    if (type === 'taxable') {
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
    }
  };

  const isRetirementAccount = type === 'traditional' || type === 'roth';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary border border-border-default rounded-lg w-full max-w-md">
        <div className="px-4 py-3 border-b border-border-subtle">
          <h3 className="text-lg font-semibold text-text-primary">
            {asset ? 'Edit Asset' : 'Add Asset'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <Input
            label="Account Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={getDefaultName(type)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Account Type"
              options={ACCOUNT_TYPE_OPTIONS}
              value={type}
              onChange={(value) => setType(value as AccountType)}
            />

            <Select
              label="Owner"
              options={ownerOptions}
              value={owner}
              onChange={(value) => setOwner(value as AccountOwner)}
            />
          </div>

          <CurrencyInput
            label="Balance"
            value={balance}
            onChange={setBalance}
          />

          {type === 'taxable' && (
            <CurrencyInput
              label="Cost Basis"
              value={costBasis}
              onChange={setCostBasis}
              hint="Original purchase price for capital gains calculation"
            />
          )}

          {isRetirementAccount && (
            <div className="pt-2 border-t border-border-subtle space-y-3">
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

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {asset ? 'Save' : 'Add Asset'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
