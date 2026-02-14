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

  // Validate expense categories
  for (const expense of expenses.categories) {
    if (expense.annualAmount < 0) {
      errors.push({ field: `expense.${expense.id}.annualAmount`, message: `${expense.name} amount cannot be negative` });
    }
    if (expense.annualAmount > 10000000) {
      errors.push({ field: `expense.${expense.id}.annualAmount`, message: `${expense.name} amount seems unrealistically high` });
    }
    if (expense.startYear && expense.endYear && expense.startYear > expense.endYear) {
      errors.push({ field: `expense.${expense.id}.endYear`, message: `${expense.name} end year must be after start year` });
    }
  }

  // Validate home expenses
  if (expenses.home) {
    if (expenses.home.mortgage) {
      const mortgage = expenses.home.mortgage;
      if (mortgage.monthlyPayment < 0) {
        errors.push({ field: 'home.mortgage.monthlyPayment', message: 'Mortgage payment cannot be negative' });
      }
      if (mortgage.homeValue < 0) {
        errors.push({ field: 'home.mortgage.homeValue', message: 'Home value cannot be negative' });
      }
      if (mortgage.loanBalance < 0) {
        errors.push({ field: 'home.mortgage.loanBalance', message: 'Loan balance cannot be negative' });
      }
      if (mortgage.interestRate < 0 || mortgage.interestRate > 0.25) {
        errors.push({ field: 'home.mortgage.interestRate', message: 'Interest rate should be between 0% and 25%' });
      }
      if (mortgage.earlyPayoff?.enabled) {
        const endYear = mortgage.originationYear + mortgage.loanTermYears;
        if (mortgage.earlyPayoff.payoffYear > endYear) {
          errors.push({ field: 'home.mortgage.earlyPayoff.payoffYear', message: 'Early payoff year must be before natural payoff date' });
        }
      }
    }
    if (expenses.home.propertyTax < 0) {
      errors.push({ field: 'home.propertyTax', message: 'Property tax cannot be negative' });
    }
    if (expenses.home.insurance < 0) {
      errors.push({ field: 'home.insurance', message: 'Home insurance cannot be negative' });
    }
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

  if (assumptions.terminalBalanceTarget !== undefined && assumptions.terminalBalanceTarget < 0) {
    errors.push({ field: 'terminalBalanceTarget', message: 'Terminal balance target cannot be negative' });
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
