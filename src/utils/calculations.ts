import type {
  AppState,
  YearProjection,
  ProjectionSummary,
  WhatIfAdjustments,
  WithdrawalSource,
  Asset,
  AccountOwner,
  PenaltySettings,
  StateTaxInfo,
} from '../types';
import { PENALTY_FREE_AGES } from '../constants/defaults';
import { getStateTaxInfo } from '../constants/stateTaxes';

interface AccountBalances {
  taxable: number;
  taxableCostBasis: number;
  traditional: number;
  roth: number;
  hsa: number;
  cash: number;
}

interface AssetWithBalance extends Asset {
  currentBalance: number;
  currentCostBasis?: number;
}

interface WithdrawalResult {
  amount: number;
  penalty: number;
  federalTax: number;
  stateTax: number;
  source: string;
  balances: AccountBalances;
  assetBalances: Map<string, { balance: number; costBasis?: number }>; // Track individual asset balances
}

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
function isPenaltyFree(
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
function calculatePenalty(
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

// Convert array-based assets to aggregated balances for tracking
function aggregateBalances(assets: Asset[]): AccountBalances {
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
function createAssetBalanceMap(assets: Asset[]): Map<string, { balance: number; costBasis?: number }> {
  const map = new Map<string, { balance: number; costBasis?: number }>();
  for (const asset of assets) {
    map.set(asset.id, {
      balance: asset.balance,
      costBasis: asset.costBasis,
    });
  }
  return map;
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

function withdrawFromAccounts(
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
        grossWithdrawal = remaining;
        // No tax on Roth withdrawals
      } else if (sourceType === 'traditional') {
        const combinedTaxRate = traditionalTaxRate + stateTaxInfo.incomeRate;
        grossWithdrawal = remaining / (1 - combinedTaxRate);
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
    const fromHSA = Math.min(remaining, available);

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

function growBalances(balances: AccountBalances, returnRate: number): AccountBalances {
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

function growAssetBalances(
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

export function calculateProjection(
  state: AppState,
  whatIf?: WhatIfAdjustments
): YearProjection[] {
  const projections: YearProjection[] = [];
  const currentYear = new Date().getFullYear();

  // Apply what-if adjustments
  const effectiveSpending = state.expenses.annualSpending * (1 + (whatIf?.spendingAdjustment || 0));
  const effectiveFIAge = state.profile.targetFIAge + (whatIf?.fiAgeAdjustment || 0);
  const effectiveReturn = whatIf?.returnAdjustment ?? state.assumptions.investmentReturn;
  const effectiveSSAge = whatIf?.ssStartAge ?? state.socialSecurity.startAge;

  // Initialize balances from array-based assets
  let balances = aggregateBalances(state.assets.accounts);
  let assetBalanceMap = createAssetBalanceMap(state.assets.accounts);

  const { assumptions, socialSecurity, lifeEvents, profile, assets } = state;
  const penaltySettings = assumptions.penaltySettings;
  const stateTaxInfo = getStateTaxInfo(profile.state);

  for (let age = profile.currentAge; age <= profile.lifeExpectancy; age++) {
    const year = currentYear + (age - profile.currentAge);
    const yearsSinceFI = Math.max(0, age - effectiveFIAge);
    const isInFI = age >= effectiveFIAge;

    // Calculate spouse age
    const spouseAge = profile.filingStatus === 'married' && profile.spouseAge
      ? age - (profile.currentAge - profile.spouseAge)
      : undefined;

    // Calculate inflation-adjusted expenses (only matters after FI)
    const inflationFactor = Math.pow(1 + assumptions.inflationRate, yearsSinceFI);
    const yearExpenses = isInFI ? effectiveSpending * inflationFactor : 0;

    // Add life events for this year
    const yearLifeEvents = lifeEvents.filter((e) => e.year === year);
    const lifeEventTotal = yearLifeEvents.reduce((sum, e) => sum + e.amount, 0);

    // Calculate income
    let income = 0;

    // Primary Social Security with COLA
    if (socialSecurity.include && age >= effectiveSSAge) {
      const yearsSinceStart = age - effectiveSSAge;
      const colaFactor = Math.pow(1 + (socialSecurity.colaRate || 0), yearsSinceStart);
      income += socialSecurity.monthlyBenefit * 12 * colaFactor;
    }

    // Spouse Social Security with COLA
    if (profile.filingStatus === 'married' && socialSecurity.spouse?.include && spouseAge !== undefined) {
      const spouseSSAge = whatIf?.spouseSSStartAge ?? socialSecurity.spouse.startAge;

      if (spouseAge >= spouseSSAge) {
        const yearsSinceStart = spouseAge - spouseSSAge;
        const colaFactor = Math.pow(1 + (socialSecurity.colaRate || 0), yearsSinceStart);
        income += socialSecurity.spouse.monthlyBenefit * 12 * colaFactor;
      }
    }

    // Pension
    if (assets.pension && age >= assets.pension.startAge) {
      income += assets.pension.annualBenefit;
    }

    // Calculate gap (expenses + life events - income)
    // Life events: positive = expense, negative = income
    const totalExpenses = yearExpenses + Math.max(0, lifeEventTotal);
    const totalIncome = income + Math.abs(Math.min(0, lifeEventTotal));
    const gap = isInFI ? Math.max(0, totalExpenses - totalIncome) : 0;

    // Withdraw from accounts if in FI
    let withdrawal = 0;
    let withdrawalPenalty = 0;
    let federalTax = 0;
    let stateTax = 0;
    let withdrawalSource = 'N/A';

    if (isInFI && gap > 0) {
      const result = withdrawFromAccounts(
        gap,
        assets.accounts,
        assetBalanceMap,
        assumptions.withdrawalOrder,
        assumptions.traditionalTaxRate,
        assumptions.capitalGainsTaxRate,
        stateTaxInfo,
        age,
        spouseAge,
        penaltySettings
      );
      withdrawal = result.amount;
      withdrawalPenalty = result.penalty;
      federalTax = result.federalTax;
      stateTax = result.stateTax;
      withdrawalSource = result.source;
      balances = result.balances;
      assetBalanceMap = result.assetBalances;
    }

    // Check for shortfall
    const totalBalance = balances.taxable + balances.traditional + balances.roth + balances.hsa + balances.cash;
    const isShortfall = isInFI && gap > 0 && totalBalance < gap && withdrawal < gap;

    // Record this year's projection
    const totalNetWorth = totalBalance + (assets.homeEquity || 0);

    projections.push({
      year,
      age,
      expenses: yearExpenses + lifeEventTotal,
      income: totalIncome,
      gap,
      withdrawal,
      withdrawalPenalty,
      federalTax,
      stateTax,
      withdrawalSource,
      taxableBalance: balances.taxable,
      traditionalBalance: balances.traditional,
      rothBalance: balances.roth,
      hsaBalance: balances.hsa,
      cashBalance: balances.cash,
      totalNetWorth,
      isShortfall,
    });

    // Grow balances for next year (if not in shortfall)
    if (!isShortfall) {
      balances = growBalances(balances, effectiveReturn);
      assetBalanceMap = growAssetBalances(assetBalanceMap, assets.accounts, effectiveReturn);
    }
  }

  return projections;
}

export function calculateSummary(
  state: AppState,
  projections: YearProjection[],
  whatIf?: WhatIfAdjustments
): ProjectionSummary {
  const effectiveSpending = state.expenses.annualSpending * (1 + (whatIf?.spendingAdjustment || 0));
  const effectiveSWR = state.assumptions.safeWithdrawalRate;

  // FI Number
  const fiNumber = effectiveSpending / effectiveSWR;

  // Current Net Worth (liquid assets only)
  const currentNetWorth = state.assets.accounts.reduce(
    (sum, asset) => sum + asset.balance,
    0
  );

  // Gap
  const gap = currentNetWorth - fiNumber;

  // Find shortfall age
  const shortfallYear = projections.find((p) => p.isShortfall);
  const hasShortfall = !!shortfallYear;
  const shortfallAge = shortfallYear?.age || null;

  // Runway age (last year with positive balance, or life expectancy if no shortfall)
  const lastPositiveYear = [...projections]
    .reverse()
    .find((p) => p.totalNetWorth > 0 && !p.isShortfall);
  const runwayAge = hasShortfall && shortfallAge
    ? shortfallAge - 1
    : lastPositiveYear?.age || state.profile.lifeExpectancy;

  // Buffer years
  const bufferYears = runwayAge - state.profile.lifeExpectancy;

  return {
    fiNumber,
    currentNetWorth,
    gap,
    runwayAge,
    hasShortfall,
    shortfallAge,
    bufferYears,
  };
}

export function calculateFINumber(annualSpending: number, swr: number): number {
  return annualSpending / swr;
}
