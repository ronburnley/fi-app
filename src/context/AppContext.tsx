import { createContext, useContext, useReducer, useEffect, useState, useRef, type ReactNode } from 'react';
import type { AppState, AppAction, WhatIfAdjustments } from '../types';
import { DEFAULT_STATE, DEFAULT_WHAT_IF, DEFAULT_INCOME, STORAGE_KEY } from '../constants/defaults';
import {
  isLegacyAssetFormat,
  migrateLegacyAssets,
  isLegacyExpenseFormat,
  migrateLegacyExpenses,
  needsMortgageMigration,
  migrateHomeExpense,
} from '../utils/migration';
import { calculateAchievableFIAge } from '../utils/calculations';

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  whatIf: WhatIfAdjustments;
  setWhatIf: React.Dispatch<React.SetStateAction<WhatIfAdjustments>>;
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

    case 'REMOVE_ASSET':
      return {
        ...state,
        assets: {
          ...state.assets,
          accounts: state.assets.accounts.filter((asset) => asset.id !== action.payload),
        },
      };

    case 'UPDATE_INCOME':
      return {
        ...state,
        income: { ...state.income, ...action.payload },
      };

    case 'UPDATE_EMPLOYMENT':
      return {
        ...state,
        income: {
          ...state.income,
          employment: action.payload,
        },
      };

    case 'UPDATE_SPOUSE_EMPLOYMENT':
      return {
        ...state,
        income: {
          ...state.income,
          spouseEmployment: action.payload,
        },
      };

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

function loadInitialState(): AppState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);

      // Check if assets need migration from legacy format
      let migratedAssets = parsed.assets;
      if (isLegacyAssetFormat(parsed.assets)) {
        migratedAssets = migrateLegacyAssets(parsed.assets);
      }

      // Check if expenses need migration from legacy format
      let migratedExpenses = parsed.expenses;
      if (isLegacyExpenseFormat(parsed.expenses)) {
        migratedExpenses = migrateLegacyExpenses(
          parsed.expenses,
          parsed.assumptions?.inflationRate ?? 0.03
        );
      }

      // Check if home expense needs mortgage migration (legacy to new format)
      if (migratedExpenses?.home && needsMortgageMigration(migratedExpenses.home)) {
        migratedExpenses = {
          ...migratedExpenses,
          home: migrateHomeExpense(migratedExpenses.home),
        };
      }

      // Migrate income if missing (backward compatibility)
      const migratedIncome = parsed.income || DEFAULT_INCOME;

      // Merge with defaults to handle any missing fields from older versions
      return {
        profile: { ...DEFAULT_STATE.profile, ...parsed.profile },
        assets: {
          ...DEFAULT_STATE.assets,
          ...migratedAssets,
          accounts: migratedAssets.accounts || DEFAULT_STATE.assets.accounts,
        },
        income: {
          ...DEFAULT_INCOME,
          ...migratedIncome,
          retirementIncomes: migratedIncome.retirementIncomes || [],
        },
        socialSecurity: {
          ...DEFAULT_STATE.socialSecurity,
          ...parsed.socialSecurity,
          spouse: {
            ...DEFAULT_STATE.socialSecurity.spouse,
            ...parsed.socialSecurity?.spouse,
          },
        },
        expenses: {
          ...DEFAULT_STATE.expenses,
          ...migratedExpenses,
          categories: migratedExpenses.categories || DEFAULT_STATE.expenses.categories,
        },
        lifeEvents: parsed.lifeEvents || [],
        assumptions: {
          ...DEFAULT_STATE.assumptions,
          ...parsed.assumptions,
          penaltySettings: {
            ...DEFAULT_STATE.assumptions.penaltySettings,
            ...parsed.assumptions?.penaltySettings,
          },
        },
      };
    }
  } catch (e) {
    console.warn('Failed to load saved state:', e);
  }
  return DEFAULT_STATE;
}

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, undefined, loadInitialState);
  const [whatIf, setWhatIf] = useState<WhatIfAdjustments>(DEFAULT_WHAT_IF);
  const lastCalculatedFIAge = useRef<number | null>(null);

  // Extract values for dependency tracking
  const { assets, income, expenses, socialSecurity, assumptions, lifeEvents, profile } = state;
  const { currentAge, lifeExpectancy, filingStatus, spouseAge, state: profileState, targetFIAge } = profile;

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

  // Persist state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save state:', e);
    }
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch, whatIf, setWhatIf }}>
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
