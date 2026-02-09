import type {
  Asset,
  AccountOwner,
  PenaltySettings,
  StateTaxInfo,
  WithdrawalSource,
} from '../../types';
import { PENALTY_FREE_AGES } from '../../constants/defaults';
import type { AssetWithBalance, WithdrawalResult } from './types';

// Get the owner's age for a given asset
function getOwnerAge(
  owner: AccountOwner,
  selfAge: number,
  spouseAge: number | undefined
): number {
  switch (owner) {
    case 'self':
      return selfAge;
    case 'spouse':
      return spouseAge ?? selfAge;
    case 'joint':
      // Use the older age (conservative - allows earlier penalty-free access)
      return Math.max(selfAge, spouseAge ?? selfAge);
  }
}

// Check if an asset can be withdrawn from without penalty
export function isPenaltyFree(
  asset: Asset,
  selfAge: number,
  spouseAge: number | undefined,
  penaltySettings: PenaltySettings
): boolean {
  const ownerAge = getOwnerAge(asset.owner, selfAge, spouseAge);
  const penaltyFreeAge = PENALTY_FREE_AGES[asset.type];

  // Cash, taxable, 529, and other are always penalty-free
  if (asset.type === 'cash' || asset.type === 'taxable' || asset.type === '529' || asset.type === 'other') {
    return true;
  }

  // Rule of 55 for 401(k)s
  if (
    penaltySettings.enableRule55 &&
    asset.is401k &&
    asset.separatedFromService &&
    ownerAge >= 55
  ) {
    return true;
  }

  // Standard age-based check
  return ownerAge >= penaltyFreeAge;
}

// Calculate penalty for a withdrawal
export function calculatePenalty(
  asset: Asset,
  withdrawalAmount: number,
  selfAge: number,
  spouseAge: number | undefined,
  penaltySettings: PenaltySettings
): number {
  if (isPenaltyFree(asset, selfAge, spouseAge, penaltySettings)) {
    return 0;
  }

  // Apply appropriate penalty rate
  if (asset.type === 'hsa') {
    return withdrawalAmount * penaltySettings.hsaEarlyPenaltyRate;
  }

  if (asset.type === 'traditional' || asset.type === 'roth') {
    return withdrawalAmount * penaltySettings.earlyWithdrawalPenaltyRate;
  }

  return 0;
}

// Sort assets by penalty-free status, then by balance (largest first)
function sortAssetsForWithdrawal(
  assets: AssetWithBalance[],
  selfAge: number,
  spouseAge: number | undefined,
  penaltySettings: PenaltySettings
): AssetWithBalance[] {
  return [...assets].sort((a, b) => {
    const aFree = isPenaltyFree(a, selfAge, spouseAge, penaltySettings);
    const bFree = isPenaltyFree(b, selfAge, spouseAge, penaltySettings);

    // Penalty-free accounts first
    if (aFree && !bFree) return -1;
    if (!aFree && bFree) return 1;

    // Then by balance (larger first)
    return b.currentBalance - a.currentBalance;
  });
}

export function withdrawFromAccounts(
  needed: number,
  assets: Asset[],
  assetBalanceMap: Map<string, { balance: number; costBasis?: number }>,
  withdrawalOrder: WithdrawalSource[],
  traditionalTaxRate: number,
  capitalGainsTaxRate: number,
  stateTaxInfo: StateTaxInfo,
  selfAge: number,
  spouseAge: number | undefined,
  penaltySettings: PenaltySettings
): WithdrawalResult {
  let remaining = needed;
  let totalWithdrawn = 0;
  let totalPenalty = 0;
  let totalFederalTax = 0;
  let totalStateTax = 0;
  const sources: string[] = [];
  const newAssetBalanceMap = new Map(assetBalanceMap);

  // Build assets with current balances
  const assetsWithBalances: AssetWithBalance[] = assets.map((asset) => {
    const balanceInfo = assetBalanceMap.get(asset.id) || { balance: 0, costBasis: 0 };
    return {
      ...asset,
      currentBalance: balanceInfo.balance,
      currentCostBasis: balanceInfo.costBasis,
    };
  });

  // First, try to use cash (no tax, no penalty)
  const cashAssets = sortAssetsForWithdrawal(
    assetsWithBalances.filter((a) => a.type === 'cash' && a.currentBalance > 0),
    selfAge,
    spouseAge,
    penaltySettings
  );

  for (const asset of cashAssets) {
    if (remaining <= 0) break;

    const fromCash = Math.min(remaining, asset.currentBalance);
    const balanceInfo = newAssetBalanceMap.get(asset.id)!;
    newAssetBalanceMap.set(asset.id, {
      ...balanceInfo,
      balance: balanceInfo.balance - fromCash,
    });
    remaining -= fromCash;
    totalWithdrawn += fromCash;
    if (fromCash > 0) sources.push('Cash');
  }

  // Then follow withdrawal order
  for (const sourceType of withdrawalOrder) {
    if (remaining <= 0) break;

    // Get all assets of this type (529 and other are treated as taxable)
    const typeAssets = sortAssetsForWithdrawal(
      assetsWithBalances.filter((a) => {
        if (sourceType === 'taxable') {
          return (a.type === 'taxable' || a.type === '529' || a.type === 'other') && a.currentBalance > 0;
        }
        return a.type === sourceType && a.currentBalance > 0;
      }),
      selfAge,
      spouseAge,
      penaltySettings
    );

    for (const asset of typeAssets) {
      if (remaining <= 0) break;

      const balanceInfo = newAssetBalanceMap.get(asset.id)!;
      const available = balanceInfo.balance;

      if (available <= 0) continue;

      // Calculate gross withdrawal needed (accounting for tax)
      // Combined tax rate = federal + state
      let grossWithdrawal: number;
      let federalTaxOnWithdrawal = 0;
      let stateTaxOnWithdrawal = 0;

      if (sourceType === 'roth') {
        // No tax on Roth, but early withdrawal penalty must be grossed up
        const penaltyRate = isPenaltyFree(asset, selfAge, spouseAge, penaltySettings)
          ? 0 : penaltySettings.earlyWithdrawalPenaltyRate;
        grossWithdrawal = remaining / (1 - penaltyRate);
      } else if (sourceType === 'traditional') {
        const combinedTaxRate = traditionalTaxRate + stateTaxInfo.incomeRate;
        const penaltyRate = isPenaltyFree(asset, selfAge, spouseAge, penaltySettings)
          ? 0 : penaltySettings.earlyWithdrawalPenaltyRate;
        grossWithdrawal = remaining / (1 - combinedTaxRate - penaltyRate);
      } else {
        // Taxable: approximate - gains are only part of withdrawal
        const costBasisRatio = balanceInfo.costBasis !== undefined && available > 0
          ? balanceInfo.costBasis / available
          : 0.6; // Assume 60% cost basis if unknown
        const gainRatio = 1 - Math.min(1, costBasisRatio);
        const combinedCapGainsRate = capitalGainsTaxRate + stateTaxInfo.capitalGainsRate;
        const effectiveTaxRate = gainRatio * combinedCapGainsRate;
        grossWithdrawal = remaining / (1 - effectiveTaxRate);
      }

      const withdrawal = Math.min(grossWithdrawal, available);

      // Calculate taxes on this withdrawal
      if (sourceType === 'traditional') {
        federalTaxOnWithdrawal = withdrawal * traditionalTaxRate;
        stateTaxOnWithdrawal = withdrawal * stateTaxInfo.incomeRate;
      } else if (sourceType === 'taxable') {
        const costBasisRatio = balanceInfo.costBasis !== undefined && available > 0
          ? balanceInfo.costBasis / available
          : 0.6;
        const gainRatio = 1 - Math.min(1, costBasisRatio);
        const taxableGains = withdrawal * gainRatio;
        federalTaxOnWithdrawal = taxableGains * capitalGainsTaxRate;
        stateTaxOnWithdrawal = taxableGains * stateTaxInfo.capitalGainsRate;
      }
      // Roth and Cash: no taxes

      totalFederalTax += federalTaxOnWithdrawal;
      totalStateTax += stateTaxOnWithdrawal;

      // Calculate penalty
      const penalty = calculatePenalty(
        asset,
        withdrawal,
        selfAge,
        spouseAge,
        penaltySettings
      );
      totalPenalty += penalty;

      // Update balance (and cost basis for taxable)
      if (sourceType === 'taxable' && balanceInfo.costBasis !== undefined && available > 0) {
        const withdrawalRatio = withdrawal / available;
        newAssetBalanceMap.set(asset.id, {
          balance: available - withdrawal,
          costBasis: balanceInfo.costBasis * (1 - withdrawalRatio),
        });
      } else {
        newAssetBalanceMap.set(asset.id, {
          ...balanceInfo,
          balance: available - withdrawal,
        });
      }

      // Calculate net after tax (penalty reduces net further)
      const totalTaxOnWithdrawal = federalTaxOnWithdrawal + stateTaxOnWithdrawal;
      let netAfterTax: number;
      if (sourceType === 'roth') {
        netAfterTax = withdrawal - penalty;
      } else {
        netAfterTax = withdrawal - totalTaxOnWithdrawal - penalty;
      }

      remaining -= Math.max(0, netAfterTax);
      totalWithdrawn += withdrawal;

      if (withdrawal > 0) {
        const sourceName = sourceType.charAt(0).toUpperCase() + sourceType.slice(1);
        if (!sources.includes(sourceName)) {
          sources.push(sourceName);
        }
      }
    }
  }

  // If still need more, try HSA (tax-free for medical, assume qualified)
  const hsaAssets = sortAssetsForWithdrawal(
    assetsWithBalances.filter((a) => a.type === 'hsa' && a.currentBalance > 0),
    selfAge,
    spouseAge,
    penaltySettings
  );

  for (const asset of hsaAssets) {
    if (remaining <= 0) break;

    const balanceInfo = newAssetBalanceMap.get(asset.id)!;
    const available = balanceInfo.balance;
    const hsaPenaltyRate = isPenaltyFree(asset, selfAge, spouseAge, penaltySettings)
      ? 0 : penaltySettings.hsaEarlyPenaltyRate;
    const fromHSA = Math.min(remaining / (1 - hsaPenaltyRate), available);

    // Calculate HSA penalty if under 65
    const penalty = calculatePenalty(
      asset,
      fromHSA,
      selfAge,
      spouseAge,
      penaltySettings
    );
    totalPenalty += penalty;

    newAssetBalanceMap.set(asset.id, {
      ...balanceInfo,
      balance: available - fromHSA,
    });

    remaining -= (fromHSA - penalty);
    totalWithdrawn += fromHSA;
    if (fromHSA > 0 && !sources.includes('HSA')) sources.push('HSA');
  }

  // Aggregate new balances
  const newBalances = {
    taxable: 0,
    taxableCostBasis: 0,
    traditional: 0,
    roth: 0,
    hsa: 0,
    cash: 0,
  };

  for (const asset of assets) {
    const balanceInfo = newAssetBalanceMap.get(asset.id);
    if (!balanceInfo) continue;

    switch (asset.type) {
      case 'taxable':
      case '529':
      case 'other':
        // 529 and other treated like taxable for withdrawal purposes
        newBalances.taxable += balanceInfo.balance;
        newBalances.taxableCostBasis += balanceInfo.costBasis ?? 0;
        break;
      case 'traditional':
        newBalances.traditional += balanceInfo.balance;
        break;
      case 'roth':
        newBalances.roth += balanceInfo.balance;
        break;
      case 'hsa':
        newBalances.hsa += balanceInfo.balance;
        break;
      case 'cash':
        newBalances.cash += balanceInfo.balance;
        break;
    }
  }

  return {
    amount: totalWithdrawn,
    penalty: totalPenalty,
    federalTax: totalFederalTax,
    stateTax: totalStateTax,
    source: sources.join(', ') || 'None',
    balances: newBalances,
    assetBalances: newAssetBalanceMap,
  };
}
