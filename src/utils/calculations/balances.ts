import type { Asset, EmploymentIncome } from '../../types';
import type { AccountBalances } from './types';

// Convert array-based assets to aggregated balances for tracking
export function aggregateBalances(assets: Asset[]): AccountBalances {
  const balances: AccountBalances = {
    taxable: 0,
    taxableCostBasis: 0,
    traditional: 0,
    roth: 0,
    hsa: 0,
    cash: 0,
  };

  for (const asset of assets) {
    switch (asset.type) {
      case 'taxable':
      case '529':
      case 'other':
        // 529 and other treated like taxable for withdrawal purposes
        balances.taxable += asset.balance;
        balances.taxableCostBasis += asset.costBasis ?? 0;
        break;
      case 'traditional':
        balances.traditional += asset.balance;
        break;
      case 'roth':
        balances.roth += asset.balance;
        break;
      case 'hsa':
        balances.hsa += asset.balance;
        break;
      case 'cash':
        balances.cash += asset.balance;
        break;
    }
  }

  return balances;
}

// Create a map of asset ID to current balance for tracking
export function createAssetBalanceMap(assets: Asset[]): Map<string, { balance: number; costBasis?: number }> {
  const map = new Map<string, { balance: number; costBasis?: number }>();
  for (const asset of assets) {
    map.set(asset.id, {
      balance: asset.balance,
      costBasis: asset.costBasis,
    });
  }
  return map;
}

/**
 * Add contributions to specific linked accounts or distribute proportionally
 * If contributionAccountId is set, add all contributions to that account
 * If contributionType is 'mixed', distribute proportionally to all retirement accounts
 * Otherwise, fall back to proportional distribution
 */
export function addContributionsToAccounts(
  assetBalanceMap: Map<string, { balance: number; costBasis?: number }>,
  assets: Asset[],
  selfContributions: number,
  spouseContributions: number,
  selfEmployment: EmploymentIncome | undefined,
  spouseEmployment: EmploymentIncome | undefined
): Map<string, { balance: number; costBasis?: number }> {
  if (selfContributions <= 0 && spouseContributions <= 0) return assetBalanceMap;

  const newMap = new Map(assetBalanceMap);

  // Helper to add contributions to a specific account
  const addToAccount = (accountId: string, amount: number) => {
    const balanceInfo = newMap.get(accountId);
    if (balanceInfo) {
      newMap.set(accountId, {
        ...balanceInfo,
        balance: balanceInfo.balance + amount,
      });
    }
  };

  // Helper to distribute contributions proportionally across retirement accounts
  const distributeProportionally = (
    contributions: number,
    ownerFilter: (a: Asset) => boolean
  ) => {
    const retirementAccounts = assets.filter(
      (a) => (a.type === 'traditional' || a.type === 'roth' || a.type === 'hsa') && ownerFilter(a)
    );

    if (retirementAccounts.length === 0) {
      // No retirement accounts - add to taxable or cash
      const taxableAccount = assets.find((a) => a.type === 'taxable' && ownerFilter(a));
      const cashAccount = assets.find((a) => a.type === 'cash');
      const targetAccount = taxableAccount || cashAccount;
      if (targetAccount) {
        addToAccount(targetAccount.id, contributions);
      }
      return;
    }

    // Get total balance of retirement accounts for proportional distribution
    const totalRetirementBalance = retirementAccounts.reduce((sum, a) => {
      const info = assetBalanceMap.get(a.id);
      return sum + (info?.balance ?? 0);
    }, 0);

    if (totalRetirementBalance === 0) {
      // All accounts empty - split evenly
      const perAccount = contributions / retirementAccounts.length;
      for (const account of retirementAccounts) {
        addToAccount(account.id, perAccount);
      }
    } else {
      // Distribute proportionally based on existing balances
      for (const account of retirementAccounts) {
        const balanceInfo = newMap.get(account.id);
        if (balanceInfo) {
          const proportion = balanceInfo.balance / totalRetirementBalance;
          const contributionAmount = contributions * proportion;
          addToAccount(account.id, contributionAmount);
        }
      }
    }
  };

  // Process self contributions
  if (selfContributions > 0) {
    if (selfEmployment?.contributionAccountId) {
      // Add all to linked account
      addToAccount(selfEmployment.contributionAccountId, selfContributions);
    } else if (selfEmployment?.contributionType === 'mixed') {
      // Distribute proportionally to self/joint accounts
      distributeProportionally(selfContributions, (a) => a.owner === 'self' || a.owner === 'joint');
    } else {
      // Fallback: distribute proportionally
      distributeProportionally(selfContributions, (a) => a.owner === 'self' || a.owner === 'joint');
    }
  }

  // Process spouse contributions
  if (spouseContributions > 0) {
    if (spouseEmployment?.contributionAccountId) {
      // Add all to linked account
      addToAccount(spouseEmployment.contributionAccountId, spouseContributions);
    } else if (spouseEmployment?.contributionType === 'mixed') {
      // Distribute proportionally to spouse/joint accounts
      distributeProportionally(spouseContributions, (a) => a.owner === 'spouse' || a.owner === 'joint');
    } else {
      // Fallback: distribute proportionally
      distributeProportionally(spouseContributions, (a) => a.owner === 'spouse' || a.owner === 'joint');
    }
  }

  return newMap;
}

/**
 * Add surplus income to taxable account (or cash if no taxable account)
 */
export function addSurplusToAccounts(
  assetBalanceMap: Map<string, { balance: number; costBasis?: number }>,
  assets: Asset[],
  surplus: number
): Map<string, { balance: number; costBasis?: number }> {
  if (surplus <= 0) return assetBalanceMap;

  const newMap = new Map(assetBalanceMap);

  // Prefer taxable account for surplus
  const taxableAccount = assets.find((a) => a.type === 'taxable');
  const cashAccount = assets.find((a) => a.type === 'cash');
  const targetAccount = taxableAccount || cashAccount;

  if (targetAccount) {
    const balanceInfo = newMap.get(targetAccount.id);
    if (balanceInfo) {
      newMap.set(targetAccount.id, {
        ...balanceInfo,
        balance: balanceInfo.balance + surplus,
        // For taxable, surplus is all cost basis (no unrealized gains yet)
        costBasis: targetAccount.type === 'taxable'
          ? (balanceInfo.costBasis ?? 0) + surplus
          : balanceInfo.costBasis,
      });
    }
  }

  return newMap;
}

export function growBalances(balances: AccountBalances, returnRate: number): AccountBalances {
  const growthFactor = 1 + returnRate;
  return {
    taxable: balances.taxable * growthFactor,
    taxableCostBasis: balances.taxableCostBasis, // Cost basis doesn't grow
    traditional: balances.traditional * growthFactor,
    roth: balances.roth * growthFactor,
    hsa: balances.hsa * growthFactor,
    cash: balances.cash, // Cash doesn't grow (or grows minimally)
  };
}

export function growAssetBalances(
  assetBalanceMap: Map<string, { balance: number; costBasis?: number }>,
  assets: Asset[],
  returnRate: number
): Map<string, { balance: number; costBasis?: number }> {
  const growthFactor = 1 + returnRate;
  const newMap = new Map<string, { balance: number; costBasis?: number }>();

  for (const asset of assets) {
    const balanceInfo = assetBalanceMap.get(asset.id);
    if (!balanceInfo) continue;

    if (asset.type === 'cash') {
      // Cash doesn't grow
      newMap.set(asset.id, balanceInfo);
    } else if (asset.type === 'taxable') {
      // Taxable grows, cost basis stays same
      newMap.set(asset.id, {
        balance: balanceInfo.balance * growthFactor,
        costBasis: balanceInfo.costBasis,
      });
    } else {
      // Other accounts grow normally
      newMap.set(asset.id, {
        balance: balanceInfo.balance * growthFactor,
        costBasis: balanceInfo.costBasis,
      });
    }
  }

  return newMap;
}
