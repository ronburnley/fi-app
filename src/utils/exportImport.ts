import type { AppState } from '../types';
import { DEFAULT_STATE } from '../constants/defaults';
import { isLegacyAssetFormat, migrateLegacyAssets } from './migration';

export function exportState(state: AppState): void {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().split('T')[0];
  const filename = `fi-runway-${date}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function importState(file: File): Promise<AppState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);

        // Validate the basic structure
        if (!isValidAppState(parsed)) {
          throw new Error('Invalid file format');
        }

        // Check if assets need migration from legacy format
        let migratedAssets = parsed.assets;
        if (isLegacyAssetFormat(parsed.assets)) {
          migratedAssets = migrateLegacyAssets(parsed.assets);
        }

        // Merge with defaults to ensure all fields exist
        const mergedState = mergeWithDefaults({
          ...parsed,
          assets: migratedAssets,
        });

        resolve(mergedState);
      } catch (error) {
        reject(new Error('Failed to parse file. Please ensure it is a valid FI Runway export.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

function isValidAppState(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null) return false;

  const state = obj as Record<string, unknown>;

  // Check required top-level keys
  const requiredKeys = ['profile', 'assets', 'socialSecurity', 'expenses', 'lifeEvents', 'assumptions'];
  for (const key of requiredKeys) {
    if (!(key in state)) return false;
  }

  // Check profile
  const profile = state.profile as Record<string, unknown>;
  if (typeof profile?.currentAge !== 'number') return false;
  if (typeof profile?.targetFIAge !== 'number') return false;
  if (typeof profile?.lifeExpectancy !== 'number') return false;

  // Check assets - either old format (taxableBrokerage object) or new format (accounts array)
  const assets = state.assets as Record<string, unknown>;
  const hasLegacyFormat = typeof assets?.taxableBrokerage === 'object' && assets.taxableBrokerage !== null;
  const hasNewFormat = Array.isArray(assets?.accounts);
  if (!hasLegacyFormat && !hasNewFormat) return false;

  // Check expenses
  const expenses = state.expenses as Record<string, unknown>;
  if (typeof expenses?.annualSpending !== 'number') return false;

  // Check assumptions
  const assumptions = state.assumptions as Record<string, unknown>;
  if (typeof assumptions?.investmentReturn !== 'number') return false;

  return true;
}

export function mergeWithDefaults(partial: Partial<AppState>): AppState {
  // Handle assets with accounts array
  const mergedAssets = partial.assets
    ? {
        ...DEFAULT_STATE.assets,
        ...partial.assets,
        accounts: partial.assets.accounts || DEFAULT_STATE.assets.accounts,
      }
    : DEFAULT_STATE.assets;

  // Handle assumptions with penaltySettings
  const mergedAssumptions = partial.assumptions
    ? {
        ...DEFAULT_STATE.assumptions,
        ...partial.assumptions,
        penaltySettings: {
          ...DEFAULT_STATE.assumptions.penaltySettings,
          ...partial.assumptions.penaltySettings,
        },
      }
    : DEFAULT_STATE.assumptions;

  // Handle socialSecurity with spouse
  const mergedSocialSecurity = partial.socialSecurity
    ? {
        ...DEFAULT_STATE.socialSecurity,
        ...partial.socialSecurity,
        spouse: partial.socialSecurity.spouse
          ? {
              include: partial.socialSecurity.spouse.include ?? DEFAULT_STATE.socialSecurity.spouse!.include,
              monthlyBenefit: partial.socialSecurity.spouse.monthlyBenefit ?? DEFAULT_STATE.socialSecurity.spouse!.monthlyBenefit,
              startAge: partial.socialSecurity.spouse.startAge ?? DEFAULT_STATE.socialSecurity.spouse!.startAge,
            }
          : DEFAULT_STATE.socialSecurity.spouse,
      }
    : DEFAULT_STATE.socialSecurity;

  return {
    profile: { ...DEFAULT_STATE.profile, ...partial.profile },
    assets: mergedAssets,
    socialSecurity: mergedSocialSecurity,
    expenses: { ...DEFAULT_STATE.expenses, ...partial.expenses },
    lifeEvents: partial.lifeEvents || DEFAULT_STATE.lifeEvents,
    assumptions: mergedAssumptions,
  };
}
