import { createContext, useContext, useReducer, useEffect, useState, type ReactNode } from 'react';
import type { AppState, AppAction, WhatIfAdjustments } from '../types';
import { DEFAULT_STATE, DEFAULT_WHAT_IF, STORAGE_KEY } from '../constants/defaults';
import { isLegacyAssetFormat, migrateLegacyAssets } from '../utils/migration';

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

      // Merge with defaults to handle any missing fields from older versions
      return {
        profile: { ...DEFAULT_STATE.profile, ...parsed.profile },
        assets: {
          ...DEFAULT_STATE.assets,
          ...migratedAssets,
          accounts: migratedAssets.accounts || DEFAULT_STATE.assets.accounts,
        },
        socialSecurity: {
          ...DEFAULT_STATE.socialSecurity,
          ...parsed.socialSecurity,
          spouse: {
            ...DEFAULT_STATE.socialSecurity.spouse,
            ...parsed.socialSecurity?.spouse,
          },
        },
        expenses: { ...DEFAULT_STATE.expenses, ...parsed.expenses },
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
