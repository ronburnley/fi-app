import type { Asset, Assets, LegacyAssets, AccountType, AccountOwner } from '../types';

// Generate a simple UUID
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Check if assets are in legacy format (fixed accounts) vs new format (array)
export function isLegacyAssetFormat(assets: unknown): assets is LegacyAssets {
  if (typeof assets !== 'object' || assets === null) return false;

  const obj = assets as Record<string, unknown>;

  // Legacy format has these fixed keys
  return (
    'taxableBrokerage' in obj &&
    typeof obj.taxableBrokerage === 'object' &&
    obj.taxableBrokerage !== null &&
    'balance' in (obj.taxableBrokerage as object) &&
    !('accounts' in obj)
  );
}

// Check if assets are in new format (array-based)
export function isNewAssetFormat(assets: unknown): assets is Assets {
  if (typeof assets !== 'object' || assets === null) return false;

  const obj = assets as Record<string, unknown>;
  return 'accounts' in obj && Array.isArray(obj.accounts);
}

// Create an asset with standard defaults
function createAsset(
  name: string,
  type: AccountType,
  balance: number,
  options?: {
    owner?: AccountOwner;
    costBasis?: number;
    is401k?: boolean;
  }
): Asset {
  const asset: Asset = {
    id: generateId(),
    name,
    type,
    owner: options?.owner ?? 'self',
    balance,
  };

  if (type === 'taxable' && options?.costBasis !== undefined) {
    asset.costBasis = options.costBasis;
  }

  if ((type === 'traditional' || type === 'roth') && options?.is401k) {
    asset.is401k = true;
  }

  return asset;
}

// Migrate legacy fixed-account format to new array-based format
export function migrateLegacyAssets(legacy: LegacyAssets): Assets {
  const accounts: Asset[] = [];

  // Taxable brokerage
  if (legacy.taxableBrokerage.balance > 0) {
    accounts.push(
      createAsset('Taxable Brokerage', 'taxable', legacy.taxableBrokerage.balance, {
        costBasis: legacy.taxableBrokerage.costBasis,
      })
    );
  }

  // Traditional 401(k)
  if (legacy.traditional401k > 0) {
    accounts.push(
      createAsset('Traditional 401(k)', 'traditional', legacy.traditional401k, {
        is401k: true,
      })
    );
  }

  // Traditional IRA
  if (legacy.traditionalIRA > 0) {
    accounts.push(createAsset('Traditional IRA', 'traditional', legacy.traditionalIRA));
  }

  // Roth 401(k)
  if (legacy.roth401k > 0) {
    accounts.push(
      createAsset('Roth 401(k)', 'roth', legacy.roth401k, {
        is401k: true,
      })
    );
  }

  // Roth IRA
  if (legacy.rothIRA > 0) {
    accounts.push(createAsset('Roth IRA', 'roth', legacy.rothIRA));
  }

  // HSA
  if (legacy.hsa > 0) {
    accounts.push(createAsset('HSA', 'hsa', legacy.hsa));
  }

  // Cash
  if (legacy.cash > 0) {
    accounts.push(createAsset('Cash / Emergency Fund', 'cash', legacy.cash));
  }

  return {
    accounts,
    homeEquity: legacy.homeEquity,
    pension: legacy.pension,
  };
}

// Export generateId for use in creating new assets
export { generateId };
