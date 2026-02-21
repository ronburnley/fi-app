import type { AppState } from '../types';

/**
 * Checks if the user has entered enough data for the Results page
 * to show meaningful projections.
 */
export function hasMinimumDataForResults(state: AppState): boolean {
  const hasAge = state.profile.currentAge > 0;
  const hasAssets = state.assets.accounts.length > 0;
  const hasExpenses =
    state.expenses.categories.length > 0 || state.expenses.home !== undefined;

  return hasAge && hasAssets && hasExpenses;
}
