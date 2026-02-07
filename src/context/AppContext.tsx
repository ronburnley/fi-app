import { createContext, useContext, useReducer, useEffect, useState, useRef, useCallback, type ReactNode } from 'react';
import type { AppState, AppAction, WhatIfAdjustments, SyncStatus, Asset, AccountType } from '../types';
import { DEFAULT_STATE, DEFAULT_WHAT_IF, DEFAULT_INCOME, STORAGE_KEY } from '../constants/defaults';

// Check if we should bypass auth for local development
const DEV_BYPASS_AUTH = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';
import {
  isLegacyAssetFormat,
  migrateLegacyAssets,
  isLegacyExpenseFormat,
  migrateLegacyExpenses,
  needsMortgageMigration,
  migrateHomeExpense,
  generateId,
  needsEmploymentContributionMigration,
  migrateEmploymentContributions,
  needsEndAgeMigration,
  migrateEndAge,
} from '../utils/migration';
import { calculateAchievableFIAge } from '../utils/calculations';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import type { FinancialPlan } from '../types';

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  whatIf: WhatIfAdjustments;
  setWhatIf: React.Dispatch<React.SetStateAction<WhatIfAdjustments>>;
  syncStatus: SyncStatus;
  isLoading: boolean;
  needsMigration: boolean;
  localDataToMigrate: string | null;
  acceptMigration: () => Promise<void>;
  declineMigration: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'UPDATE_PROFILE':
      return {
        ...state,
        profile: { ...state.profile, ...action.payload },
      };

    case 'UPDATE_ASSETS':
      return {
        ...state,
        assets: {
          ...state.assets,
          ...action.payload,
        },
      };

    case 'ADD_ASSET':
      return {
        ...state,
        assets: {
          ...state.assets,
          accounts: [...state.assets.accounts, action.payload],
        },
      };

    case 'UPDATE_ASSET':
      return {
        ...state,
        assets: {
          ...state.assets,
          accounts: state.assets.accounts.map((asset) =>
            asset.id === action.payload.id ? action.payload : asset
          ),
        },
      };

    case 'REMOVE_ASSET': {
      const removedId = action.payload;

      // Clear contributionAccountId if it references the removed asset
      let updatedEmployment = state.income.employment;
      let updatedSpouseEmployment = state.income.spouseEmployment;

      if (updatedEmployment?.contributionAccountId === removedId) {
        updatedEmployment = {
          ...updatedEmployment,
          contributionAccountId: undefined,
          contributionType: 'traditional', // Reset to default for auto-create
        };
      }

      if (updatedSpouseEmployment?.contributionAccountId === removedId) {
        updatedSpouseEmployment = {
          ...updatedSpouseEmployment,
          contributionAccountId: undefined,
          contributionType: 'traditional', // Reset to default for auto-create
        };
      }

      return {
        ...state,
        assets: {
          ...state.assets,
          accounts: state.assets.accounts.filter((asset) => asset.id !== removedId),
        },
        income: {
          ...state.income,
          employment: updatedEmployment,
          spouseEmployment: updatedSpouseEmployment,
        },
      };
    }

    case 'UPDATE_INCOME':
      return {
        ...state,
        income: { ...state.income, ...action.payload },
      };

    case 'UPDATE_EMPLOYMENT': {
      const employment = action.payload;
      let newAccounts = state.assets.accounts;
      let updatedEmployment = employment;

      // Auto-create account if contributionType is set but no contributionAccountId
      if (employment && employment.annualContributions > 0 &&
          employment.contributionType &&
          employment.contributionType !== 'mixed' &&
          !employment.contributionAccountId) {
        // Check if a matching account already exists
        const existingAccount = state.assets.accounts.find(
          (a) => a.type === employment.contributionType &&
                 (a.owner === 'self' || a.owner === 'joint')
        );

        if (existingAccount) {
          // Link to existing account
          updatedEmployment = { ...employment, contributionAccountId: existingAccount.id };
        } else {
          // Create new account
          const accountType = employment.contributionType as AccountType;
          const accountName = accountType === 'hsa'
            ? 'HSA'
            : `Employment ${accountType === 'roth' ? 'Roth' : 'Traditional'} 401(k)`;

          const newAccount: Asset = {
            id: generateId(),
            name: accountName,
            type: accountType,
            owner: 'self',
            balance: 0,
            is401k: accountType !== 'hsa',
          };

          newAccounts = [...state.assets.accounts, newAccount];
          updatedEmployment = { ...employment, contributionAccountId: newAccount.id };
        }
      }

      return {
        ...state,
        assets: {
          ...state.assets,
          accounts: newAccounts,
        },
        income: {
          ...state.income,
          employment: updatedEmployment,
        },
      };
    }

    case 'UPDATE_SPOUSE_EMPLOYMENT': {
      const employment = action.payload;
      let newAccounts = state.assets.accounts;
      let updatedEmployment = employment;

      // Auto-create account if contributionType is set but no contributionAccountId
      if (employment && employment.annualContributions > 0 &&
          employment.contributionType &&
          employment.contributionType !== 'mixed' &&
          !employment.contributionAccountId) {
        // Check if a matching account already exists
        const existingAccount = state.assets.accounts.find(
          (a) => a.type === employment.contributionType &&
                 a.owner === 'spouse'
        );

        if (existingAccount) {
          // Link to existing account
          updatedEmployment = { ...employment, contributionAccountId: existingAccount.id };
        } else {
          // Create new account
          const accountType = employment.contributionType as AccountType;
          const accountName = accountType === 'hsa'
            ? "Spouse's HSA"
            : `Spouse's ${accountType === 'roth' ? 'Roth' : 'Traditional'} 401(k)`;

          const newAccount: Asset = {
            id: generateId(),
            name: accountName,
            type: accountType,
            owner: 'spouse',
            balance: 0,
            is401k: accountType !== 'hsa',
          };

          newAccounts = [...state.assets.accounts, newAccount];
          updatedEmployment = { ...employment, contributionAccountId: newAccount.id };
        }
      }

      return {
        ...state,
        assets: {
          ...state.assets,
          accounts: newAccounts,
        },
        income: {
          ...state.income,
          spouseEmployment: updatedEmployment,
        },
      };
    }

    case 'ADD_RETIREMENT_INCOME':
      return {
        ...state,
        income: {
          ...state.income,
          retirementIncomes: [...state.income.retirementIncomes, action.payload],
        },
      };

    case 'UPDATE_RETIREMENT_INCOME':
      return {
        ...state,
        income: {
          ...state.income,
          retirementIncomes: state.income.retirementIncomes.map((ri) =>
            ri.id === action.payload.id ? action.payload : ri
          ),
        },
      };

    case 'REMOVE_RETIREMENT_INCOME':
      return {
        ...state,
        income: {
          ...state.income,
          retirementIncomes: state.income.retirementIncomes.filter((ri) => ri.id !== action.payload),
        },
      };

    case 'UPDATE_SOCIAL_SECURITY':
      return {
        ...state,
        socialSecurity: {
          ...state.socialSecurity,
          ...action.payload,
          spouse: action.payload.spouse
            ? { ...state.socialSecurity.spouse, ...action.payload.spouse }
            : state.socialSecurity.spouse,
        },
      };

    case 'UPDATE_EXPENSES':
      return {
        ...state,
        expenses: { ...state.expenses, ...action.payload },
      };

    case 'ADD_EXPENSE':
      return {
        ...state,
        expenses: {
          ...state.expenses,
          categories: [...state.expenses.categories, action.payload],
        },
      };

    case 'UPDATE_EXPENSE':
      return {
        ...state,
        expenses: {
          ...state.expenses,
          categories: state.expenses.categories.map((expense) =>
            expense.id === action.payload.id ? action.payload : expense
          ),
        },
      };

    case 'REMOVE_EXPENSE':
      return {
        ...state,
        expenses: {
          ...state.expenses,
          categories: state.expenses.categories.filter((expense) => expense.id !== action.payload),
        },
      };

    case 'UPDATE_HOME_EXPENSE':
      return {
        ...state,
        expenses: {
          ...state.expenses,
          home: action.payload,
        },
      };

    case 'ADD_LIFE_EVENT':
      return {
        ...state,
        lifeEvents: [...state.lifeEvents, action.payload],
      };

    case 'UPDATE_LIFE_EVENT':
      return {
        ...state,
        lifeEvents: state.lifeEvents.map((event) =>
          event.id === action.payload.id ? action.payload : event
        ),
      };

    case 'REMOVE_LIFE_EVENT':
      return {
        ...state,
        lifeEvents: state.lifeEvents.filter((event) => event.id !== action.payload),
      };

    case 'UPDATE_ASSUMPTIONS':
      return {
        ...state,
        assumptions: {
          ...state.assumptions,
          ...action.payload,
          penaltySettings: action.payload.penaltySettings
            ? { ...state.assumptions.penaltySettings, ...action.payload.penaltySettings }
            : state.assumptions.penaltySettings,
        },
      };

    case 'LOAD_STATE':
      return action.payload;

    case 'RESET_STATE':
      return DEFAULT_STATE;

    default:
      return state;
  }
}

// Merge with defaults to ensure all fields exist (handles schema evolution)
function mergeWithDefaults(partial: Partial<AppState>): AppState {
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

  // Handle income (may not exist in older data)
  const mergedIncome = partial.income
    ? {
        ...DEFAULT_INCOME,
        ...partial.income,
        retirementIncomes: partial.income.retirementIncomes || [],
        spouseAdditionalWorkYears: partial.income.spouseAdditionalWorkYears ?? undefined,
      }
    : DEFAULT_INCOME;

  // Handle expenses with categories
  const mergedExpenses = partial.expenses
    ? {
        ...DEFAULT_STATE.expenses,
        ...partial.expenses,
        categories: partial.expenses.categories || DEFAULT_STATE.expenses.categories,
      }
    : DEFAULT_STATE.expenses;

  return {
    profile: { ...DEFAULT_STATE.profile, ...partial.profile },
    assets: mergedAssets,
    income: mergedIncome,
    socialSecurity: mergedSocialSecurity,
    expenses: mergedExpenses,
    lifeEvents: partial.lifeEvents || DEFAULT_STATE.lifeEvents,
    assumptions: mergedAssumptions,
  };
}

// Migrate data from various legacy formats
function migrateData(data: AppState): AppState {
  let migratedAssets = data.assets;
  if (isLegacyAssetFormat(data.assets)) {
    migratedAssets = migrateLegacyAssets(data.assets);
  }

  let migratedExpenses = data.expenses;
  if (isLegacyExpenseFormat(data.expenses)) {
    migratedExpenses = migrateLegacyExpenses(
      data.expenses,
      data.assumptions?.inflationRate ?? 0.03
    );
  }

  if (migratedExpenses?.home && needsMortgageMigration(migratedExpenses.home)) {
    migratedExpenses = {
      ...migratedExpenses,
      home: migrateHomeExpense(migratedExpenses.home),
    };
  }

  // Migrate employment contribution linking
  let migratedIncome = data.income;

  // Strip legacy endAge from employment and convert to spouseAdditionalWorkYears
  if (migratedIncome && needsEndAgeMigration(migratedIncome)) {
    migratedIncome = migrateEndAge(migratedIncome);
  }

  if (
    migratedIncome &&
    (needsEmploymentContributionMigration(migratedIncome.employment) ||
     needsEmploymentContributionMigration(migratedIncome.spouseEmployment))
  ) {
    migratedIncome = migrateEmploymentContributions(
      migratedIncome,
      migratedAssets?.accounts || []
    );
  }

  return mergeWithDefaults({
    ...data,
    assets: migratedAssets,
    expenses: migratedExpenses,
    income: migratedIncome,
  });
}

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const { user, isGuest } = useAuth();
  const [state, dispatch] = useReducer(appReducer, DEFAULT_STATE);
  const [whatIf, setWhatIf] = useState<WhatIfAdjustments>(DEFAULT_WHAT_IF);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [isLoading, setIsLoading] = useState(true);
  const [planId, setPlanId] = useState<string | null>(null);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [localDataToMigrate, setLocalDataToMigrate] = useState<string | null>(null);
  const lastCalculatedFIAge = useRef<number | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoad = useRef(true);

  // Extract values for dependency tracking
  const { assets, income, expenses, socialSecurity, assumptions, lifeEvents, profile } = state;
  const { currentAge, lifeExpectancy, filingStatus, spouseAge, state: profileState, targetFIAge } = profile;

  // Load plan from Supabase (or localStorage in dev bypass/guest mode)
  useEffect(() => {
    // Need either user or guest mode to proceed
    if (!user && !isGuest) {
      setIsLoading(false);
      return;
    }

    const loadPlan = async () => {
      setIsLoading(true);

      // In dev bypass mode or guest mode, use localStorage instead of Supabase
      if (DEV_BYPASS_AUTH || isGuest) {
        console.log(`[AppContext] ${DEV_BYPASS_AUTH ? 'Dev bypass' : 'Guest'} mode - loading from localStorage`);
        const localData = localStorage.getItem(STORAGE_KEY);
        if (localData) {
          try {
            const parsed = JSON.parse(localData);
            const migratedState = migrateData(parsed);
            dispatch({ type: 'LOAD_STATE', payload: migratedState });
          } catch (err) {
            console.error('Failed to parse localStorage data:', err);
          }
        }
        setPlanId(isGuest ? 'guest-plan' : 'dev-plan');
        isInitialLoad.current = false;
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('financial_plans')
          .select('*')
          .eq('user_id', user!.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          // PGRST116 = no rows found
          console.error('Error loading plan:', error);
          throw error;
        }

        if (data) {
          // Existing plan found
          const plan = data as FinancialPlan;
          const migratedState = migrateData(plan.data);
          setPlanId(plan.id);
          dispatch({ type: 'LOAD_STATE', payload: migratedState });
          isInitialLoad.current = false;
        } else {
          // No plan exists, check for localStorage migration
          const localData = localStorage.getItem(STORAGE_KEY);
          if (localData) {
            setLocalDataToMigrate(localData);
            setNeedsMigration(true);
          } else {
            // Create new plan with defaults
            const { data: newPlan, error: createError } = await supabase
              .from('financial_plans')
              .insert({
                user_id: user!.id,
                name: 'My Plan',
                data: DEFAULT_STATE,
              })
              .select()
              .single();

            if (createError) {
              console.error('Error creating plan:', createError);
            } else if (newPlan) {
              setPlanId(newPlan.id);
              isInitialLoad.current = false;
            }
          }
        }
      } catch (err) {
        console.error('Failed to load plan:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPlan();
  }, [user, isGuest]);

  // Accept migration from localStorage
  const acceptMigration = useCallback(async () => {
    if (!user || !localDataToMigrate) return;

    try {
      const parsed = JSON.parse(localDataToMigrate);
      const migratedState = migrateData(parsed);

      // Create plan with migrated data
      const { data: newPlan, error } = await supabase
        .from('financial_plans')
        .insert({
          user_id: user.id,
          name: 'My Plan',
          data: migratedState,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating plan:', error);
        throw error;
      }

      if (newPlan) {
        // Clear localStorage after successful migration
        localStorage.removeItem(STORAGE_KEY);
        setPlanId(newPlan.id);
        dispatch({ type: 'LOAD_STATE', payload: migratedState });
        setNeedsMigration(false);
        setLocalDataToMigrate(null);
        isInitialLoad.current = false;
      }
    } catch (err) {
      console.error('Migration failed:', err);
    }
  }, [user, localDataToMigrate]);

  // Decline migration - start fresh
  const declineMigration = useCallback(async () => {
    if (!user) return;

    try {
      // Create new plan with defaults
      const { data: newPlan, error } = await supabase
        .from('financial_plans')
        .insert({
          user_id: user.id,
          name: 'My Plan',
          data: DEFAULT_STATE,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating plan:', error);
        throw error;
      }

      if (newPlan) {
        // Clear localStorage
        localStorage.removeItem(STORAGE_KEY);
        setPlanId(newPlan.id);
        setNeedsMigration(false);
        setLocalDataToMigrate(null);
        isInitialLoad.current = false;
      }
    } catch (err) {
      console.error('Failed to create plan:', err);
    }
  }, [user]);

  // Sync targetFIAge with calculated achievable FI age
  useEffect(() => {
    const result = calculateAchievableFIAge(state, whatIf);
    const newFIAge = result.achievableFIAge ?? lifeExpectancy - 1;

    // Only update if the calculated age is different from last time
    if (lastCalculatedFIAge.current !== newFIAge && targetFIAge !== newFIAge) {
      lastCalculatedFIAge.current = newFIAge;
      dispatch({
        type: 'UPDATE_PROFILE',
        payload: { targetFIAge: newFIAge },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    assets,
    income,
    expenses,
    socialSecurity,
    assumptions,
    lifeEvents,
    currentAge,
    lifeExpectancy,
    filingStatus,
    spouseAge,
    profileState,
    targetFIAge,
    whatIf,
  ]);

  // Auto-save to Supabase (or localStorage in dev bypass/guest mode) when state changes
  useEffect(() => {
    // Skip saving during initial load or if no plan exists
    // In guest mode, we don't have a user but still need planId
    if (isInitialLoad.current || !planId) return;
    // Need user for cloud save, but guest mode saves locally
    if (!user && !isGuest) return;

    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSyncStatus('syncing');

    // Debounce saves by 1 second
    saveTimeoutRef.current = setTimeout(async () => {
      // In dev bypass mode or guest mode, save to localStorage
      if (DEV_BYPASS_AUTH || isGuest) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
          setSyncStatus('saved');
          setTimeout(() => setSyncStatus('idle'), 2000);
        } catch (err) {
          console.error('Failed to save to localStorage:', err);
          setSyncStatus('error');
        }
        return;
      }

      try {
        const { error } = await supabase
          .from('financial_plans')
          .update({ data: state })
          .eq('id', planId);

        if (error) {
          console.error('Error saving plan:', error);
          setSyncStatus('error');
        } else {
          setSyncStatus('saved');
          // Reset to idle after showing "saved" briefly
          setTimeout(() => setSyncStatus('idle'), 2000);
        }
      } catch (err) {
        console.error('Failed to save plan:', err);
        setSyncStatus('error');
      }
    }, 1000);

    // Cleanup on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state, planId, user, isGuest]);

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        whatIf,
        setWhatIf,
        syncStatus,
        isLoading,
        needsMigration,
        localDataToMigrate,
        acceptMigration,
        declineMigration,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
