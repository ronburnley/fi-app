import type { UserProfile, Assets, Expenses, Assumptions } from '../types';

export interface ValidationError {
  field: string;
  message: string;
}

export function validateProfile(profile: UserProfile): ValidationError[] {
  const errors: ValidationError[] = [];

  if (profile.currentAge < 18 || profile.currentAge > 120) {
    errors.push({ field: 'currentAge', message: 'Age must be between 18 and 120' });
  }

  if (profile.targetFIAge <= profile.currentAge) {
    errors.push({ field: 'targetFIAge', message: 'FI age must be greater than current age' });
  }

  if (profile.lifeExpectancy <= profile.targetFIAge) {
    errors.push({ field: 'lifeExpectancy', message: 'Life expectancy must be greater than FI age' });
  }

  if (profile.lifeExpectancy > 120) {
    errors.push({ field: 'lifeExpectancy', message: 'Life expectancy cannot exceed 120' });
  }

  return errors;
}

export function validateAssets(assets: Assets): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate each account in the accounts array
  for (const asset of assets.accounts) {
    if (asset.balance < 0) {
      errors.push({ field: `asset.${asset.id}.balance`, message: `${asset.name} balance cannot be negative` });
    }

    // Validate cost basis for taxable accounts
    if (asset.type === 'taxable' && asset.costBasis !== undefined) {
      if (asset.costBasis < 0) {
        errors.push({ field: `asset.${asset.id}.costBasis`, message: `${asset.name} cost basis cannot be negative` });
      }
      if (asset.costBasis > asset.balance) {
        errors.push({ field: `asset.${asset.id}.costBasis`, message: `${asset.name} cost basis cannot exceed balance` });
      }
    }
  }

  if (assets.pension) {
    if (assets.pension.annualBenefit < 0) {
      errors.push({ field: 'pension.annualBenefit', message: 'Pension benefit cannot be negative' });
    }
    if (assets.pension.startAge < 50 || assets.pension.startAge > 100) {
      errors.push({ field: 'pension.startAge', message: 'Pension start age must be between 50 and 100' });
    }
  }

  return errors;
}

export function validateExpenses(expenses: Expenses): ValidationError[] {
  const errors: ValidationError[] = [];

  if (expenses.annualSpending < 0) {
    errors.push({ field: 'annualSpending', message: 'Annual spending cannot be negative' });
  }

  if (expenses.annualSpending > 10000000) {
    errors.push({ field: 'annualSpending', message: 'Annual spending seems unrealistically high' });
  }

  return errors;
}

export function validateAssumptions(assumptions: Assumptions): ValidationError[] {
  const errors: ValidationError[] = [];

  if (assumptions.investmentReturn < -0.5 || assumptions.investmentReturn > 0.5) {
    errors.push({ field: 'investmentReturn', message: 'Investment return should be between -50% and 50%' });
  }

  if (assumptions.inflationRate < 0 || assumptions.inflationRate > 0.2) {
    errors.push({ field: 'inflationRate', message: 'Inflation rate should be between 0% and 20%' });
  }

  if (assumptions.traditionalTaxRate < 0 || assumptions.traditionalTaxRate > 0.5) {
    errors.push({ field: 'traditionalTaxRate', message: 'Tax rate should be between 0% and 50%' });
  }

  if (assumptions.capitalGainsTaxRate < 0 || assumptions.capitalGainsTaxRate > 0.4) {
    errors.push({ field: 'capitalGainsTaxRate', message: 'Capital gains rate should be between 0% and 40%' });
  }

  if (assumptions.safeWithdrawalRate < 0.01 || assumptions.safeWithdrawalRate > 0.1) {
    errors.push({ field: 'safeWithdrawalRate', message: 'Safe withdrawal rate should be between 1% and 10%' });
  }

  // Validate penalty settings
  if (assumptions.penaltySettings) {
    if (assumptions.penaltySettings.earlyWithdrawalPenaltyRate < 0 || assumptions.penaltySettings.earlyWithdrawalPenaltyRate > 0.25) {
      errors.push({ field: 'penaltySettings.earlyWithdrawalPenaltyRate', message: 'Early withdrawal penalty should be between 0% and 25%' });
    }

    if (assumptions.penaltySettings.hsaEarlyPenaltyRate < 0 || assumptions.penaltySettings.hsaEarlyPenaltyRate > 0.3) {
      errors.push({ field: 'penaltySettings.hsaEarlyPenaltyRate', message: 'HSA penalty should be between 0% and 30%' });
    }
  }

  return errors;
}
