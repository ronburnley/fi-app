# FI Runway - MVP Specification

## Overview

**FI Runway** is a financial independence verification tool for people approaching or considering early retirement. The app answers one core question: *"When can I achieve financial independence?"*

The app **calculates** the earliest achievable FI age based on the user's financial inputs, rather than having them specify a target date.

### Target User
People who have accumulated wealth and need confidence in their exit plan. They don't need help building wealth—they need verification that they can stop working.

### Core Value Proposition
- Simple inputs, powerful projections
- Year-by-year runway visualization (table + charts)
- Real-time what-if scenario modeling
- Beautiful, minimal dark UI

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18+ |
| Styling | Tailwind CSS |
| Charts | Recharts |
| State | React Context + useReducer |
| Auth & Database | Supabase (Google OAuth + PostgreSQL) |
| Build | Vite |

---

## Design System

### Visual Style
Dark mode, minimal aesthetic inspired by Linear and Raycast.

### Color Palette

```
Background:
  --bg-primary: #0a0a0b (near black)
  --bg-secondary: #141416 (cards, panels)
  --bg-tertiary: #1c1c1f (hover states, inputs)

Text:
  --text-primary: #fafafa (headings, key numbers)
  --text-secondary: #a1a1aa (body text)
  --text-muted: #52525b (labels, hints)

Accent:
  --accent-primary: #22c55e (green - positive/success)
  --accent-warning: #eab308 (yellow - caution)
  --accent-danger: #ef4444 (red - shortfall/danger)
  --accent-blue: #3b82f6 (interactive elements)

Borders:
  --border-subtle: #27272a
  --border-default: #3f3f46
```

### Typography
- Font: Inter (or system-ui fallback)
- Headings: font-semibold, tracking-tight
- Numbers/Data: tabular-nums for alignment
- Body: font-normal, text-sm or text-base

### Component Principles
- Rounded corners: rounded-lg (8px) for cards, rounded-md for inputs
- Subtle borders, minimal shadows
- Generous whitespace
- Micro-interactions on hover/focus (subtle opacity or scale changes)
- No unnecessary decoration

---

## Data Model

### UserProfile
```typescript
interface UserProfile {
  currentAge: number;
  targetFIAge: number;      // COMPUTED - auto-set to earliest achievable FI age
  lifeExpectancy: number;   // default 95
  state: string;            // state code for tax calculations (e.g., 'CA', 'TX')
  filingStatus: 'single' | 'married';
  spouseAge?: number;       // when married
}
```

Note: `targetFIAge` is automatically calculated by the app based on the user's financial inputs. Users do not set this value directly.

### Assets (v3 - Array-based)
```typescript
type AccountType = 'taxable' | 'traditional' | 'roth' | 'hsa' | 'cash';
type AccountOwner = 'self' | 'spouse' | 'joint';

interface Asset {
  id: string;                    // UUID
  name: string;                  // "Ron's Fidelity 401k"
  type: AccountType;             // Tax treatment
  owner: AccountOwner;           // Who owns it (affects 59.5 timing)
  balance: number;
  costBasis?: number;            // Taxable accounts only
  is401k?: boolean;              // For Rule of 55 eligibility
  separatedFromService?: boolean; // Rule of 55: left employer at 55+
}

interface Assets {
  accounts: Asset[];             // Array of all accounts
  homeEquity?: number;           // Display only, not in withdrawals
  pension?: {
    annualBenefit: number;
    startAge: number;
    colaRate?: number;         // Optional COLA rate (decimal, e.g., 0.02 = 2%)
  };
}
```

### SocialSecurity
```typescript
interface SpouseSocialSecurity {
  include: boolean;
  monthlyBenefit: number;
  startAge: 62 | 67 | 70;
}

interface SocialSecurity {
  include: boolean;
  monthlyBenefit: number;
  startAge: 62 | 67 | 70;
  colaRate: number; // default 0.02 (2% annual increase)
  spouse?: SpouseSocialSecurity;
}
```

### Expenses
```typescript
interface Expenses {
  annualSpending: number;
}
```

### LifeEvents
```typescript
interface LifeEvent {
  id: string;
  name: string;
  year: number;
  amount: number; // positive = expense, negative = income
}
```

### Assumptions
```typescript
interface PenaltySettings {
  earlyWithdrawalPenaltyRate: number;  // default 0.10 (10%)
  hsaEarlyPenaltyRate: number;         // default 0.20 (20%)
  enableRule55: boolean;                // default false
}

interface Assumptions {
  investmentReturn: number; // default 0.06
  inflationRate: number; // default 0.03
  traditionalTaxRate: number; // default 0.22
  capitalGainsTaxRate: number; // default 0.15
  rothTaxRate: number; // always 0
  withdrawalOrder: ('taxable' | 'traditional' | 'roth')[];
  safeWithdrawalRate: number; // default 0.04
  penaltySettings: PenaltySettings;
}
```

### Complete State
```typescript
interface AppState {
  profile: UserProfile;
  assets: Assets;
  socialSecurity: SocialSecurity;
  expenses: Expenses;
  lifeEvents: LifeEvent[];
  assumptions: Assumptions;
}
```

### AchievableFIResult
```typescript
interface AchievableFIResult {
  achievableFIAge: number | null;  // null if never achievable
  confidenceLevel: 'high' | 'moderate' | 'tight' | 'not_achievable';
  bufferYears: number;             // years past life expectancy
  yearsUntilFI: number | null;     // from current age
  fiAtCurrentAge: boolean;         // already FI?
}
```

Confidence levels:
- `high`: 10+ years buffer past life expectancy
- `moderate`: 5-9 years buffer
- `tight`: 0-4 years buffer
- `not_achievable`: shortfall detected before life expectancy

---

## Projection Engine

### Core Calculation Loop

For each year from `currentAge` to `lifeExpectancy`:

1. **Calculate expenses** (inflation-adjusted)
   ```
   yearExpenses = baseExpenses * (1 + inflationRate) ^ yearsSinceFI
   ```

2. **Add life events** for this year

3. **Calculate income**
   - Social Security with COLA (if age >= startAge)
   - Spouse Social Security with COLA (if spouse age >= startAge)
   - Pension (if age >= startAge)

4. **Calculate gap**
   ```
   gap = yearExpenses - income
   ```

5. **Withdraw from accounts** (in order specified, with penalty logic)
   - Cash: No tax, no penalty
   - Taxable: Apply capital gains tax on gains portion
   - Traditional: Apply income tax rate + 10% penalty if owner < 59.5
   - Roth: No tax + 10% penalty if owner < 59.5
   - HSA: Tax-free for medical, 20% penalty if owner < 65
   - Rule of 55: 401(k) accounts exempt if separated from service at 55+
   - Priority: Penalty-free accounts first within each type

6. **Grow remaining balances**
   ```
   newBalance = balance * (1 + investmentReturn)
   ```

7. **Record year's data point**

### Penalty Rules

| Account Type | Penalty-Free Age | Penalty Rate | Notes |
|--------------|------------------|--------------|-------|
| Taxable | Any | 0% | Never penalized |
| Cash | Any | 0% | Never penalized |
| Traditional | 59.5 | 10% | Rule of 55 for 401k |
| Roth | 59.5 | 10% | On earnings only |
| HSA | 65 | 20% | For non-medical |

### Owner Age Logic
- `self` → uses `profile.currentAge`
- `spouse` → uses `profile.spouseAge`
- `joint` → uses older of the two (conservative)

### State Tax Data
```typescript
interface StateTaxInfo {
  code: string;
  name: string;
  hasIncomeTax: boolean;
  incomeRate: number;       // Effective rate for income/traditional withdrawals
  capitalGainsRate: number; // Rate for capital gains (taxable account withdrawals)
}
```

State tax data is stored in `src/constants/stateTaxes.ts` for all 50 states + DC.

### Output Structure
```typescript
interface YearProjection {
  year: number;
  age: number;
  expenses: number;
  income: number; // SS + pension
  gap: number;
  withdrawal: number;
  withdrawalPenalty: number;
  federalTax: number;  // Federal tax on withdrawals
  stateTax: number;    // State tax on withdrawals
  withdrawalSource: string;
  taxableBalance: number;
  traditionalBalance: number;
  rothBalance: number;
  hsaBalance: number;
  cashBalance: number;
  totalNetWorth: number;
  isShortfall: boolean;
}
```

---

## UI Structure

### Layout (Wizard Flow)
```
┌─────────────────────────────────────────────────────────────┐
│  Logo          [FI Status Indicator]     [Sync] [User Menu] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              ●───●───○───○───○───○───○                      │
│              1   2   3   4   5   6   7                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │              Step Title                             │   │
│  │              Step description text                  │   │
│  │                                                     │   │
│  │  ┌───────────────────────────────────────────────┐ │   │
│  │  │                                               │ │   │
│  │  │           Step Content                        │ │   │
│  │  │           (Form inputs, tables, etc.)         │ │   │
│  │  │                                               │ │   │
│  │  └───────────────────────────────────────────────┘ │   │
│  │                                                     │   │
│  │           [Back]              [Continue]            │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Wizard Steps

1. **Welcome** - Profile basics (ages, filing status, state, life expectancy)
2. **Assets** - Table-based asset entry with add/edit/delete
3. **Spending** - Annual expenses
4. **Benefits** - Social Security (self + spouse), pension
5. **Life Events** - Table-based one-time income/expenses
6. **Assumptions** - Returns, inflation, taxes, penalties (optional)
7. **Results** - Summary, chart, table, what-if sliders

Note: The FI age is calculated automatically and displayed in the header indicator starting from step 2.

### Assets Table
```
┌─────────────────────────────────────────────────────────────┐
│ Name              │ Type        │ Owner  │ Balance   │ Actions│
├───────────────────┼─────────────┼────────┼───────────┼────────┤
│ Fidelity 401k     │ Traditional │ Self   │ $800,000  │ ✏️ 🗑️  │
│ Vanguard Taxable  │ Taxable     │ Joint  │ $500,000  │ ✏️ 🗑️  │
│ Spouse Roth IRA   │ Roth        │ Spouse │ $200,000  │ ✏️ 🗑️  │
├───────────────────┴─────────────┴────────┴───────────┴────────┤
│ Total: $1,500,000                              [+ Add Asset]  │
└───────────────────────────────────────────────────────────────┘
```

### Life Events Table
```
┌─────────────────────────────────────────────────────────────┐
│ Event             │ Year │ Amount                  │ Actions │
├───────────────────┼──────┼─────────────────────────┼─────────┤
│ Home renovation   │ 2028 │ -$50,000 (expense)      │ ✏️ 🗑️   │
│ Inheritance       │ 2035 │ +$100,000 (income)      │ ✏️ 🗑️   │
├───────────────────┴──────┴─────────────────────────┴─────────┤
│                                          [+ Add Life Event]  │
└──────────────────────────────────────────────────────────────┘
```

### Results Panel (Step 7)

**Summary Metrics** (top cards)
- FI Number: `annualSpending / SWR`
- Current Net Worth
- Gap: `NW - FI Number` (green if positive, red if negative)
- Runway: "Money lasts until age X" or "Shortfall at age X"
- Buffer: "+/- X years vs life expectancy"

**Chart View**
- Stacked area chart (Recharts AreaChart)
- X-axis: Age
- Y-axis: Balance ($)
- Areas: Taxable, Traditional, Roth (distinct colors)
- Tooltip showing breakdown on hover

**Table View**
- Scrollable table with sticky header
- Columns: Age | Expenses | Income | Gap | Withdrawal | Fed Tax | State Tax | Penalty | Source | Taxable | Traditional | Roth | Net Worth
- Highlight FI start age, current age
- Red text/background for shortfall years
- Yellow highlight for penalty amounts

**What-If Sliders**
- Spending adjustment: -30% to +30%
- Return assumption: 2% to 12%
- SS start age: 62 / 67 / 70

Note: FI age is no longer adjustable via slider - it's calculated based on inputs. Changes to spending or returns will automatically recalculate the achievable FI age shown in the header.

---

## Component Hierarchy

```
App
├── AuthProvider               # Supabase auth state + guest mode
├── AppProvider                # App state + sync (Supabase or localStorage)
├── LoginPage                  # Landing page (if !user && !isGuest)
├── Header
│   ├── Logo
│   ├── FIStatusIndicator      # Center - shows years to FI
│   ├── SyncStatusIndicator    # Saving/Saved/Error (authenticated only)
│   ├── SignInToSync           # Link for guest users
│   └── UserMenu               # Avatar + logout (authenticated only)
├── MainLayout
│   ├── InputPanel
│   │   ├── ProfileSection
│   │   ├── AssetsSection
│   │   ├── ExpensesSection
│   │   ├── SocialSecuritySection
│   │   ├── LifeEventsSection
│   │   ├── AssumptionsSection
│   │   └── WhatIfSection
│   └── ResultsPanel
│       ├── SummaryMetrics
│       ├── ChartView
│       └── TableView
└── Footer (minimal)
```

---

## Key Interactions

### Real-time Updates
All inputs should update projections immediately. Use debouncing (300ms) on text inputs to prevent excessive recalculation.

### Input Validation
- Ages: must be positive integers, logical ordering (current < FI < life expectancy)
- Currency: format with commas, strip on parse
- Percentages: display as %, store as decimals
- Show inline validation errors

### Authentication & Sync
- **Landing Page**: Users choose between guest mode or Google sign-in
- **Guest Mode**: No account required, data stored in localStorage
- **Sign In**: Google OAuth via Supabase for cloud sync
- **Auto-Save**: Changes saved automatically (1s debounce) - localStorage for guests, Supabase for authenticated
- **Sync Status**: Header shows Saving.../Saved/Error indicator (authenticated only)
- **Guest→Auth Migration**: When guest signs in, localStorage data migrates to cloud
- **URL Reset**: Add `?reset` to URL to clear guest mode and return to landing page

### Responsive Behavior
- Desktop: side-by-side panels
- Tablet: stacked, input panel collapsible
- Mobile: full-width stacked, tabbed navigation between Input/Results

---

## File Structure

```
src/
├── components/
│   ├── auth/                  # Authentication components
│   │   ├── LoginPage.tsx          # Landing page with guest/Google choice
│   │   └── MigrationPrompt.tsx    # localStorage migration prompt
│   ├── ui/                    # Reusable primitives
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── CurrencyInput.tsx
│   │   ├── PercentInput.tsx
│   │   ├── Toggle.tsx
│   │   ├── Select.tsx
│   │   ├── Slider.tsx
│   │   ├── Card.tsx
│   │   ├── Tooltip.tsx
│   │   ├── LoadingScreen.tsx      # Full-page loading spinner
│   │   └── FIStatusIndicator.tsx  # Header indicator showing years to FI
│   ├── layout/
│   │   ├── Header.tsx             # Logo, FI indicator, sync status, user menu
│   │   ├── MainLayout.tsx
│   │   └── Panel.tsx
│   ├── inputs/
│   │   ├── ProfileSection.tsx
│   │   ├── AssetsSection.tsx
│   │   ├── AssetRow.tsx           # Table row for assets
│   │   ├── AssetEditForm.tsx      # Modal for add/edit asset
│   │   ├── ExpensesSection.tsx
│   │   ├── SocialSecuritySection.tsx
│   │   ├── LifeEventsSection.tsx
│   │   ├── LifeEventEditForm.tsx  # Modal for add/edit life event
│   │   ├── AssumptionsSection.tsx
│   │   └── WhatIfSection.tsx
│   ├── results/
│   │   ├── SummaryMetrics.tsx
│   │   ├── ChartView.tsx
│   │   └── TableView.tsx
│   └── wizard/
│       ├── WizardContext.tsx      # Wizard state management
│       ├── WizardLayout.tsx       # Main wizard container
│       ├── WizardProgress.tsx     # Step indicator
│       ├── WizardNavigation.tsx   # Back/Next buttons
│       └── steps/
│           ├── WelcomeStep.tsx
│           ├── AssetsStep.tsx
│           ├── SpendingStep.tsx
│           ├── BenefitsStep.tsx
│           ├── LifeEventsStep.tsx
│           ├── AssumptionsStep.tsx
│           └── ResultsStep.tsx
├── hooks/
│   ├── useProjection.ts       # Core calculation hook
│   ├── useAchievableFI.ts     # Calculates earliest achievable FI age
│   └── useDebounce.ts
├── context/
│   ├── AuthContext.tsx        # Supabase auth state + methods
│   └── AppContext.tsx         # Global state + Supabase sync
├── lib/
│   └── supabase.ts            # Supabase client initialization
├── utils/
│   ├── calculations.ts        # Projection math + penalties
│   ├── formatters.ts          # Currency, percent formatting
│   ├── validators.ts          # Input validation
│   └── migration.ts           # Legacy format migration
├── types/
│   └── index.ts               # TypeScript interfaces
├── constants/
│   ├── defaults.ts            # Default values + labels
│   └── stateTaxes.ts          # State tax rates (all 50 states + DC)
├── App.tsx
├── main.tsx
└── index.css                  # Tailwind + custom styles
```

---

## Default Values

```typescript
export const DEFAULT_STATE: AppState = {
  profile: {
    currentAge: 45,
    targetFIAge: 50,
    lifeExpectancy: 95,
    state: 'CA',
    filingStatus: 'married',
    spouseAge: 43,
  },
  assets: {
    accounts: [
      { id: '...', name: 'Taxable Brokerage', type: 'taxable', owner: 'joint', balance: 500000, costBasis: 300000 },
      { id: '...', name: 'Traditional 401(k)', type: 'traditional', owner: 'self', balance: 800000, is401k: true },
      { id: '...', name: 'Roth IRA', type: 'roth', owner: 'self', balance: 200000 },
      { id: '...', name: 'HSA', type: 'hsa', owner: 'self', balance: 50000 },
      { id: '...', name: 'Cash / Emergency Fund', type: 'cash', owner: 'joint', balance: 50000 },
    ],
    homeEquity: 400000,
    pension: undefined,
  },
  socialSecurity: {
    include: true,
    monthlyBenefit: 2500,
    startAge: 67,
    colaRate: 0.02,
    spouse: {
      include: true,
      monthlyBenefit: 2000,
      startAge: 67,
    },
  },
  expenses: {
    annualSpending: 80000,
  },
  lifeEvents: [],
  assumptions: {
    investmentReturn: 0.06,
    inflationRate: 0.03,
    traditionalTaxRate: 0.22,
    capitalGainsTaxRate: 0.15,
    rothTaxRate: 0,
    withdrawalOrder: ['taxable', 'traditional', 'roth'],
    safeWithdrawalRate: 0.04,
    penaltySettings: {
      earlyWithdrawalPenaltyRate: 0.10,
      hsaEarlyPenaltyRate: 0.20,
      enableRule55: false,
    },
  },
};
```

---

## MVP Scope Boundaries

### In Scope (MVP)
- All input sections as specified
- Projection engine with tax-aware withdrawals
- Summary metrics
- Stacked area chart
- Year-by-year table
- What-if sliders
- User authentication (Google OAuth via Supabase)
- Cloud sync (auto-save to Supabase PostgreSQL)
- Responsive layout
- Dark mode

### Out of Scope (Post-MVP)
- Detailed tax modeling (IRMAA, ACA subsidies)
- Multiple scenarios saved side-by-side
- Monte Carlo simulations
- Account linking (Plaid)
- Roth conversion ladder planning
- RMD calculations
- PDF report export
- Mobile native apps

---

## Development Phases

### Phase 1: Foundation ✅
- [x] Project setup (Vite + React + Tailwind)
- [x] Design system implementation (colors, typography, base components)
- [x] State management setup
- [x] Basic layout structure

### Phase 2: Inputs ✅
- [x] All input sections
- [x] Validation
- [x] Local storage persistence

### Phase 3: Projection Engine ✅
- [x] Core calculation logic
- [x] Penalty calculations (age 59.5, HSA 65, Rule of 55)
- [x] Hook integration

### Phase 4: Results Display ✅
- [x] Summary metrics
- [x] Chart view with Recharts
- [x] Table view with penalty column

### Phase 5: What-If & Polish ✅
- [x] What-if sliders
- [x] Export/import with migration support
- [x] Wizard flow UX
- [x] Table-based asset and life event entry

### Phase 6: Authentication & Cloud Sync ✅
- [x] Supabase project setup
- [x] Google OAuth authentication
- [x] Database schema (financial_plans table with RLS)
- [x] Auto-save with debounce (1s)
- [x] Sync status indicator in header
- [x] User menu with logout
- [x] localStorage migration prompt for existing users
- [x] Remove JSON export/import (replaced by cloud sync)

---

## Success Metrics

The MVP is successful if:
1. A user can input their financial data in under 5 minutes
2. Projections update in real-time (<100ms perceived latency)
3. The year-by-year breakdown is clear and scannable
4. What-if scenarios provide immediate feedback
5. The UI feels premium and trustworthy

---

## Notes for Claude

When building this app:
- Prioritize calculation accuracy over features
- Keep the UI minimal; resist adding complexity
- Use TypeScript strictly; no `any` types
- Write unit tests for the projection engine
- Ensure accessibility (keyboard nav, screen readers)
- Performance matters: memoize expensive calculations

---

## Changelog

### v5.2 - 2026-02-05 - Guest Mode & Landing Page

**Major Change:**
Users can now use the app without signing in. A new landing page offers two paths: "Get Started" for guest mode (localStorage) or "Continue with Google" for cloud sync.

**New Features:**
- Landing page with two entry paths (guest vs authenticated)
- Guest mode uses localStorage for data persistence
- Seamless migration from guest to authenticated (existing flow handles it)
- "Sign in to sync" button in header for guest users
- URL parameter `?reset` clears guest mode and returns to landing page

**Data Model Changes:**
- Added `GUEST_MODE_KEY` constant for localStorage flag
- AuthContext now includes: `isGuest`, `enterGuestMode()`, `exitGuestMode()`

**UI Changes:**
- New premium landing page design with gradient background
- Primary green "Get Started" CTA button with glow effect
- Secondary "Continue with Google" button
- Header shows "Sign in to sync" link when in guest mode (replaces sync status + user menu)
- Privacy footer explaining data stays on device

**Behavior:**
- Guest mode persists across page refreshes (localStorage flag)
- Signing in auto-exits guest mode and triggers migration if localStorage data exists
- Signing out returns to landing page (not guest mode)
- DEV_BYPASS_AUTH still takes precedence for development

### v5.1 - 2026-02-04 - Contribution Linking & Test Suite

**New Features:**
- Employment contributions now link to specific asset accounts
- Auto-create 401(k)/Roth/HSA accounts when contribution destination doesn't exist
- Contribution destination dropdown in Income wizard step
- Dev bypass mode for local development without Supabase authentication
- Comprehensive unit test suite with Vitest (32 tests)

**Data Model Changes:**
- Added `ContributionAccountType` type: `'traditional' | 'roth' | 'hsa' | 'mixed'`
- Added `contributionAccountId` to `EmploymentIncome` - links to specific account for contributions
- Added `contributionType` to `EmploymentIncome` - type for auto-creation (default: 'traditional')

**UI Changes:**
- Contribution Destination dropdown appears when employment contributions > 0
- Options include existing retirement accounts (filtered by owner) and create-new options
- "Split across retirement accounts" option preserves proportional distribution behavior

**Calculation Changes:**
- `addContributionsToAccounts()` now supports linked accounts and mixed distribution
- When `contributionAccountId` is set, all contributions go to that specific account
- When `contributionType` is 'mixed', uses proportional distribution across retirement accounts
- Surplus income continues to go to first taxable account

**New Files:**
- `vitest.config.ts` - Vitest test configuration
- `src/test/setup.ts` - Test setup with jest-dom
- `src/utils/calculations.test.ts` - 32 unit tests for calculation engine

**Development:**
- Added `VITE_DEV_BYPASS_AUTH` environment variable for local testing
- Dev bypass mode uses localStorage instead of Supabase
- Mock user provided when bypass is enabled

**Migration:**
- Existing employment data with contributions auto-links to best matching retirement account
- Falls back to undefined (auto-create on next update) if no match found

### v5.0 - 2026-02-03 - Supabase Authentication & Cloud Sync

**Major Change:**
Replaced localStorage + JSON export/import with Supabase authentication and cloud database storage. Data now syncs automatically across devices.

**New Features:**
- Google OAuth sign-in via Supabase
- Automatic cloud sync with debounced saves (1 second delay)
- Sync status indicator in header (Saving.../Saved/Error)
- User menu with avatar and logout
- localStorage migration prompt for existing users
- Loading screens during auth check and data fetch

**New Files:**
- `src/lib/supabase.ts` - Supabase client initialization
- `src/context/AuthContext.tsx` - Auth state and methods (signInWithGoogle, signOut)
- `src/components/auth/LoginPage.tsx` - Google sign-in landing page
- `src/components/auth/MigrationPrompt.tsx` - Prompts to import localStorage data
- `src/components/ui/LoadingScreen.tsx` - Full-page loading spinner
- `supabase-schema.sql` - Database schema for Supabase
- `.env.example` - Environment variable template

**Data Model Changes:**
- New `FinancialPlan` interface for database records (id, user_id, name, data, timestamps)
- New `SyncStatus` type: `'idle' | 'syncing' | 'saved' | 'error'`
- AppContext now includes: syncStatus, isLoading, needsMigration, acceptMigration, declineMigration

**UI Changes:**
- New login page with "Sign in with Google" button
- Header now shows sync status and user menu (replaced import/export buttons)
- Loading screens during authentication and data loading
- Migration prompt when localStorage data exists for new users

**Files Removed:**
- `src/utils/exportImport.ts` - No longer needed with cloud storage
- `src/hooks/useLocalStorage.ts` - Replaced by Supabase sync

**Database Schema:**
```sql
create table public.financial_plans (
  id uuid primary key,
  user_id uuid references auth.users(id),
  name text default 'My Plan',
  data jsonb not null,
  created_at timestamptz,
  updated_at timestamptz
);
-- Row Level Security ensures users only access their own plans
```

**Environment Variables Required:**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon/public key

### v4.3 - 2026-02-03 - Income Modeling & Timeline Restructure

**Major Change:**
The app now models the complete financial journey from **current age through life expectancy**, with FI as a milestone along the way. Employment income during working years is tracked, contributions grow accounts, and the timeline shows accumulation before FI, not just drawdown after.

**New Features:**
- Employment income modeling with salary, contributions, retirement age, and effective tax rate
- Separate spouse employment tracking (different retirement ages supported)
- Retirement income streams (consulting, rentals, royalties) with start/end ages
- Three financial phases: WORKING → GAP → FI
- Contributions automatically added to retirement accounts during working years
- Surplus income (after expenses) saved to taxable accounts

**Data Model Changes:**
- New `EmploymentIncome` interface: annualGrossIncome, annualContributions, endAge, effectiveTaxRate
- New `RetirementIncome` interface: name, annualAmount, startAge, endAge, inflationAdjusted, taxable
- New `FinancialPhase` type: `'working' | 'gap' | 'fi'`
- New `Income` interface combining employment and retirementIncomes
- Added `income` field to `AppState`
- Added `phase`, `employmentIncome`, `contributions`, `retirementIncome` to `YearProjection`
- New AppAction types: UPDATE_INCOME, UPDATE_EMPLOYMENT, UPDATE_SPOUSE_EMPLOYMENT, ADD/UPDATE/REMOVE_RETIREMENT_INCOME

**UI Changes:**
- New wizard step 3: "Income" (wizard now 8 steps instead of 7)
- Employment income toggle with fields for gross income, contributions, retirement age, tax rate
- Spouse employment section when filing status is married
- Retirement income streams table with add/edit/delete modal
- TableView defaults to showing all years (full timeline)
- New "Phase" column with color-coded badges (WORK blue, GAP amber, FI green)
- New "Emp. Inc" and "Contrib" columns when employment configured
- New "Ret. Inc" column when retirement income configured
- Chart shows amber "Retire" reference line for employment end age
- SummaryMetrics shows "Years to Retirement" card when employment configured

**Calculation Changes:**
- `determinePhase()` - determines working/gap/fi status based on ages
- `calculateEmploymentIncome()` - computes gross, net, tax, and contributions
- `addContributionsToAccounts()` - distributes contributions proportionally to retirement accounts
- `calculateRetirementIncomeStreams()` - sums active streams with optional inflation adjustment
- `addSurplusToAccounts()` - adds working-year savings to taxable account
- Main projection loop restructured for three phases:
  - WORKING: Employment covers expenses, contributions grow accounts, surplus saved
  - GAP: Withdrawals bridge between retirement and FI
  - FI: Full drawdown with SS, pension, and retirement income streams

**Migration:**
- Backward compatible: existing saved data loads without income (uses empty defaults)
- Import/export updated to handle income field

### v4.2 - 2026-02-03 - Mini Mortgage Calculator

**New Features:**
- Full mortgage calculator with amortization formula (P&I calculation)
- Home equity display (home value minus loan balance)
- Early payoff modeling with estimated payoff amount
- Custom payment override option for non-standard mortgages
- Mortgage balance tracking in year-by-year projections

**Data Model Changes:**
- New `MortgageDetails` interface replacing simple `{monthlyPayment, endYear}`
- Fields: homeValue, loanBalance, interestRate, loanTermYears (15/20/30), originationYear
- Added `manualPaymentOverride` flag to preserve custom payments
- Added optional `earlyPayoff` with enabled flag and payoffYear
- Added `mortgageBalance` to `YearProjection` interface
- Added `LegacyMortgage` type for migration support

**UI Changes:**
- Mortgage inputs: Home Value, Loan Balance, Interest Rate, Term dropdown, Origination Year
- Summary box showing: Monthly P&I, Home Equity, Total Monthly, Payoff Year
- "Enter custom payment" checkbox for manual override
- Advanced section with early payoff toggle and estimated payoff amount
- Underwater mortgage warning when loan exceeds home value
- New "Mortgage" column in year-by-year results table

**Calculation Changes:**
- `calculateMonthlyPayment()` - standard amortization: M = P × [r(1+r)^n] / [(1+r)^n - 1]
- `calculateRemainingBalance()` - balance at any point in loan term
- `calculateHomeEquity()` - home value minus outstanding loan
- `calculateMortgageBalanceForYear()` - tracks balance with early payoff support
- Early payoff triggers large withdrawal in payoff year, stops payments after
- Mortgage end year calculated from originationYear + loanTermYears

**Migration:**
- Auto-detects legacy `{monthlyPayment, endYear}` format
- Converts to new format with `manualPaymentOverride: true` to preserve payment
- Estimates origination year from end year and assumed 30-year term

### v4.1 - 2026-02-03 - Pension Input with COLA Support

**New Features:**
- Pension input fields now appear inline on Assets step when toggle is enabled
- Added COLA (Cost-of-Living Adjustment) support for pensions
- Collapsible "Advanced" section for COLA rate input

**Data Model Changes:**
- Added optional `colaRate` to Pension interface (stored as decimal, e.g., 0.02 = 2%)

**UI Changes:**
- Removed "We'll ask for details on the next step" message
- Pension inputs (Annual Benefit, Start Age) now appear immediately when toggle is ON
- Added "Advanced" collapsible section with COLA percentage input
- Added helpful hint text: "Before taxes", "When payments begin", "Cost-of-living adjustment"
- Consistent pension UI in both wizard (AssetsStep) and 2-panel layout (AssetsSection)

**Calculation Changes:**
- Pension income now compounds with COLA from pension start year (matches SS pattern)
- Formula: `annualBenefit * (1 + colaRate)^yearsSincePensionStart`

### v4.0 - 2026-02-02 - Inverted FI Model (Calculated FI Age)

**Major Change:**
The app now **calculates** the earliest achievable FI age instead of having the user input their target. This answers "When CAN I retire?" rather than "Will my target work?"

**New Features:**
- `calculateAchievableFIAge()` function using binary search algorithm
- FIStatusIndicator component in header ("mission control" style)
- `useAchievableFI` hook for memoized achievable FI calculations
- Confidence levels: high, moderate, tight, not_achievable
- Real-time FI age updates as inputs change

**Data Model Changes:**
- `targetFIAge` is now computed/synced automatically (not user input)
- Added `AchievableFIResult` interface
- Removed `fiAgeAdjustment` from `WhatIfAdjustments`

**UI Changes:**
- Header redesigned with 3-column grid layout (logo | indicator | buttons)
- FI Status Indicator shows years to FI with confidence dot
- States: hidden (step 1), achievable, immediate ("FI NOW"), unreachable
- WelcomeStep no longer has "Years to FI" slider
- SummaryMetrics shows "Achievable FI Age" as primary metric
- What-If section no longer has FI age adjustment slider

**Calculation Changes:**
- Binary search finds earliest viable FI age (~7 iterations max)
- Buffer years calculated by extending projection to age 120
- Confidence based on buffer: 10+ (high), 5-9 (moderate), 0-4 (tight)
- AppContext auto-syncs `targetFIAge` with calculated value

### v3.1 - 2026-02-02 - State Tax Calculations

**New Features:**
- State tax calculations on withdrawals (all 50 states + DC)
- State selector in Profile section with tax rate hint
- Federal and state taxes calculated and displayed separately
- States with no income tax (TX, FL, WA, etc.) properly handled

**Data Model Changes:**
- Added StateTaxInfo type (code, name, hasIncomeTax, incomeRate, capitalGainsRate)
- YearProjection now includes federalTax and stateTax fields
- Assumptions tax rates clarified as federal rates only

**UI Changes:**
- State dropdown in Profile with hint showing effective tax rates
- Fed Tax and State Tax columns in year-by-year table
- Table column order: Gap → Withdrawal → Fed Tax → State Tax → Penalty → Source
- Assumptions labels updated to clarify "Federal Income Tax" and "Federal Cap Gains"

**Calculation Changes:**
- Withdrawals now calculate combined federal + state tax burden
- Traditional withdrawals: federal income rate + state income rate
- Taxable withdrawals: federal cap gains rate + state cap gains rate
- Gross withdrawal amount accounts for total tax to meet net spending need

### v3.0 - 2026-02-02 - Flexible Assets + Withdrawal Penalties

**New Features:**
- Table-based asset entry with custom names
- Table-based life events entry with modal form
- Asset ownership tracking (self, spouse, joint)
- Age 59.5 early withdrawal penalty enforcement (10%)
- HSA age 65 non-medical penalty (20%)
- Optional Rule of 55 for 401(k) accounts
- Withdrawal penalty tracking in projections

**Data Model Changes:**
- Assets now array-based instead of fixed accounts
- Each asset has: id, name, type, owner, balance, costBasis
- Added PenaltySettings to Assumptions (earlyWithdrawalPenaltyRate, hsaEarlyPenaltyRate, enableRule55)
- YearProjection includes withdrawalPenalty field
- LegacyAssets type for migration support

**UI Changes:**
- Assets displayed as editable table with add/edit/delete modal
- Life Events displayed as editable table with add/edit/delete modal
- Owner column shown when filing status is married
- 401k and Rule of 55 badges on eligible accounts
- Penalty settings section in Assumptions
- Penalty column in year-by-year table
- Wider wizard layouts for Assets and Life Events steps

**Calculation Changes:**
- Withdrawals check owner age before allowing penalty-free access
- Prioritizes penalty-free accounts within each account type
- Penalties tracked and displayed in results
- Auto-migration from old fixed-account format on load/import

### v2.0 - 2026-02-02 - Wizard UX + Spouse Support

**New Features:**
- TurboTax-style wizard flow (7-step questionnaire)
- Spouse Social Security support (when filing status = married)
- SS COLA (Cost of Living Adjustment) - benefits increase annually (default 2%)
- Spouse age tracking for accurate benefit timing

**Data Model Changes:**
- Added `colaRate` to SocialSecurity (default 0.02)
- Added `spouse` object to SocialSecurity (include, monthlyBenefit, startAge)
- Added `spouseAge` to UserProfile (optional, when married)
- Added WizardState type for navigation

**UI Changes:**
- New wizard layout replaces two-panel side-by-side view
- Progress indicator shows 7 steps
- Back/Next navigation with validation
- Results shown at final step with What-If sliders

**Calculation Changes:**
- SS benefits now compound with COLA from start year
- Spouse SS calculated independently with same COLA rate
- Combined household income displayed in projections

### v1.0 - 2026-02-02 - Initial MVP

- Two-panel layout (inputs left, results right)
- Profile, Assets, Expenses, Social Security, Life Events, Assumptions sections
- Year-by-year projection engine with tax-aware withdrawals
- Stacked area chart (Recharts) + data table
- What-If scenario sliders
- JSON export/import
- localStorage persistence
- Dark mode UI
