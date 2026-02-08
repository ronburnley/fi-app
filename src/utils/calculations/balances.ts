import type { Asset } from '../../types';
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
 * Add per-account contributions based on each account's annualContribution settings.
 * Contributions are date-bounded by contributionStartYear/contributionEndYear.
 * For taxable accounts, contributions are added to cost basis (no unrealized gains).
 */
export function addPerAccountContributions(
  assetBalanceMap: Map<string, { balance: number; costBasis?: number }>,
  assets: Asset[],
  year: number,
  currentYear: number
): { updatedMap: Map<string, { balance: number; costBasis?: number }>; totalContributions: number } {
  let totalContributions = 0;
  const newMap = new Map(assetBalanceMap);

  for (const asset of assets) {
    const contribution = asset.annualContribution;
    if (!contribution || contribution <= 0) continue;

    const startYear = asset.contributionStartYear ?? currentYear;
    const endYear = asset.contributionEndYear ?? Infinity;

    if (year < startYear || year > endYear) continue;

    const balanceInfo = newMap.get(asset.id);
    if (!balanceInfo) continue;

    totalContributions += contribution;

    const isTaxable = asset.type === 'taxable' || asset.type === '529' || asset.type === 'other';
    newMap.set(asset.id, {
      ...balanceInfo,
      balance: balanceInfo.balance + contribution,
      costBasis: isTaxable
        ? (balanceInfo.costBasis ?? 0) + contribution
        : balanceInfo.costBasis,
    });
  }

  return { updatedMap: newMap, totalContributions };
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
