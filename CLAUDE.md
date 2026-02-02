# FI Runway - MVP Specification

## Overview

**FI Runway** is a financial independence verification tool for people approaching or considering early retirement. The app answers one core question: *"Given what I have, what I spend, and reasonable assumptions, will my money last?"*

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
| State | React Context + useReducer (or Zustand if complexity grows) |
| Data Persistence | Local storage + JSON export/import |
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
  targetFIAge: number;
  lifeExpectancy: number; // default 95
  state: string; // for future tax context
  filingStatus: 'single' | 'married';
}
```

### Assets
```typescript
interface Assets {
  taxableBrokerage: {
    balance: number;
    costBasis: number; // for cap gains calculation
  };
  traditional401k: number;
  traditionalIRA: number;
  roth401k: number;
  rothIRA: number;
  hsa: number;
  cash: number;
  homeEquity?: number; // optional, display only
  pension?: {
    annualBenefit: number;
    startAge: number;
  };
}
```

### SocialSecurity
```typescript
interface SocialSecurity {
  include: boolean;
  monthlyBenefit: number;
  startAge: 62 | 67 | 70;
}
```

### Expenses
```typescript
interface Expenses {
  annualSpending: number;
  // Future: could break into categories
}
```

### LifeEvents
```typescript
interface LifeEvent {
  id: string;
  name: string;
  year: number;
  amount: number; // positive = expense, negative = income (inheritance, etc.)
}
```

### Assumptions
```typescript
interface Assumptions {
  investmentReturn: number; // default 0.06
  inflationRate: number; // default 0.03
  traditionalTaxRate: number; // default 0.22
  capitalGainsTaxRate: number; // default 0.15
  rothTaxRate: number; // always 0
  withdrawalOrder: ('taxable' | 'traditional' | 'roth')[]; // default order
  safeWithdrawalRate: number; // default 0.04
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
   - Social Security (if age >= startAge)
   - Pension (if age >= startAge)

4. **Calculate gap**
   ```
   gap = yearExpenses - income
   ```

5. **Withdraw from accounts** (in order specified)
   - Taxable: Apply capital gains tax on gains portion
   - Traditional: Apply income tax rate
   - Roth: No tax

6. **Grow remaining balances**
   ```
   newBalance = balance * (1 + investmentReturn)
   ```

7. **Record year's data point**

### Output Structure
```typescript
interface YearProjection {
  year: number;
  age: number;
  expenses: number;
  income: number; // SS + pension
  gap: number;
  withdrawal: number;
  withdrawalSource: string;
  taxableBalance: number;
  traditionalBalance: number;
  rothBalance: number;
  totalNetWorth: number;
  isShortfall: boolean;
}
```

---

## UI Structure

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│  Logo                                    [Export] [Import]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌──────────────────────────────────┐  │
│  │                 │  │                                  │  │
│  │  Input Panel    │  │  Results Panel                   │  │
│  │  (Scrollable)   │  │                                  │  │
│  │                 │  │  ┌────────────────────────────┐  │  │
│  │  - Profile      │  │  │  Summary Metrics           │  │  │
│  │  - Assets       │  │  └────────────────────────────┘  │  │
│  │  - Expenses     │  │                                  │  │
│  │  - Social Sec   │  │  ┌────────────────────────────┐  │  │
│  │  - Life Events  │  │  │  Chart View                │  │  │
│  │  - Assumptions  │  │  │  (Stacked Area)            │  │  │
│  │                 │  │  └────────────────────────────┘  │  │
│  │  ───────────────│  │                                  │  │
│  │  What-If Panel  │  │  ┌────────────────────────────┐  │  │
│  │  (Sliders)      │  │  │  Table View                │  │  │
│  │                 │  │  │  (Year-by-year)            │  │  │
│  └─────────────────┘  │  └────────────────────────────┘  │  │
│                       └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Input Panel Sections

**Profile**
- Current age (number input)
- Target FI age (number input)
- Life expectancy (number input, default 95)
- Filing status (toggle: Single / Married)

**Assets**
- Taxable brokerage (currency input)
  - Cost basis (currency input, collapsible)
- Traditional 401k/IRA (currency input)
- Roth 401k/IRA (currency input)
- HSA (currency input)
- Cash (currency input)
- Pension toggle
  - Annual benefit (currency input)
  - Start age (number input)

**Expenses**
- Annual spending in retirement (currency input)

**Social Security**
- Include toggle (yes/no)
- Monthly benefit (currency input)
- Start age (select: 62 / 67 / 70)

**Life Events**
- List of events with add/remove
- Each: Name, Year, Amount

**Assumptions** (collapsible, show defaults)
- Investment return %
- Inflation rate %
- Tax rate on traditional withdrawals %
- Capital gains tax rate %
- Safe withdrawal rate %
- Withdrawal order (drag to reorder or preset)

### What-If Panel

Quick scenario sliders that update projections in real-time:

- **Spending adjustment**: -20% to +20% slider
- **FI age adjustment**: -5 to +5 years
- **Return assumption**: 4% to 8% slider
- **SS start age**: 62 / 67 / 70 toggle

Show delta from baseline: "This adds 4 years to your runway"

### Results Panel

**Summary Metrics** (top cards)
- FI Number: `annualSpending / SWR`
- Current Net Worth
- Gap: `NW - FI Number` (green if positive, red if negative)
- Runway: "Money lasts until age X" or "Shortfall at age X"
- Buffer: "+/- X years vs life expectancy"

**Chart View**
- Stacked area chart (Recharts AreaChart)
- X-axis: Age (or Year)
- Y-axis: Balance ($)
- Areas: Taxable, Traditional, Roth (distinct colors)
- Vertical reference lines:
  - FI start age
  - SS start age
  - Age 59.5 (penalty-free withdrawals)
  - Age 73 (RMDs begin)
- Tooltip showing breakdown on hover
- Red shading if/when balances hit zero

**Table View**
- Scrollable table with sticky header
- Columns: Year | Age | Expenses | Income | Gap | Withdrawal | Source | Taxable | Traditional | Roth | Net Worth
- Alternating row colors (subtle)
- Highlight current year
- Red text/background for shortfall years
- Expandable rows for detail (optional V2)

---

## Component Hierarchy

```
App
├── Header
│   ├── Logo
│   └── ImportExportButtons
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

### Export/Import
- **Export**: Download current state as `fi-runway-{date}.json`
- **Import**: File picker, validate schema, confirm overwrite

### Responsive Behavior
- Desktop: side-by-side panels
- Tablet: stacked, input panel collapsible
- Mobile: full-width stacked, tabbed navigation between Input/Results

---

## File Structure

```
src/
├── components/
│   ├── ui/                    # Reusable primitives
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── CurrencyInput.tsx
│   │   ├── PercentInput.tsx
│   │   ├── Toggle.tsx
│   │   ├── Select.tsx
│   │   ├── Slider.tsx
│   │   ├── Card.tsx
│   │   └── Tooltip.tsx
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── MainLayout.tsx
│   │   └── Panel.tsx
│   ├── inputs/
│   │   ├── ProfileSection.tsx
│   │   ├── AssetsSection.tsx
│   │   ├── ExpensesSection.tsx
│   │   ├── SocialSecuritySection.tsx
│   │   ├── LifeEventsSection.tsx
│   │   ├── AssumptionsSection.tsx
│   │   └── WhatIfSection.tsx
│   └── results/
│       ├── SummaryMetrics.tsx
│       ├── ChartView.tsx
│       └── TableView.tsx
├── hooks/
│   ├── useProjection.ts       # Core calculation logic
│   ├── useLocalStorage.ts
│   └── useDebounce.ts
├── context/
│   └── AppContext.tsx         # Global state
├── utils/
│   ├── calculations.ts        # Projection math
│   ├── formatters.ts          # Currency, percent formatting
│   ├── validators.ts          # Input validation
│   └── exportImport.ts        # JSON handling
├── types/
│   └── index.ts               # TypeScript interfaces
├── constants/
│   └── defaults.ts            # Default values
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
  },
  assets: {
    taxableBrokerage: { balance: 500000, costBasis: 300000 },
    traditional401k: 800000,
    traditionalIRA: 0,
    roth401k: 0,
    rothIRA: 200000,
    hsa: 50000,
    cash: 50000,
    homeEquity: 400000,
    pension: undefined,
  },
  socialSecurity: {
    include: true,
    monthlyBenefit: 2500,
    startAge: 67,
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
- JSON export/import
- Responsive layout
- Dark mode

### Out of Scope (Post-MVP)
- User authentication / cloud sync
- Detailed tax modeling (state taxes, IRMAA, ACA subsidies)
- Multiple scenarios saved side-by-side
- Monte Carlo simulations
- Account linking (Plaid)
- Roth conversion ladder planning
- RMD calculations
- PDF report export
- Mobile native apps

---

## Development Phases

### Phase 1: Foundation
- [ ] Project setup (Vite + React + Tailwind)
- [ ] Design system implementation (colors, typography, base components)
- [ ] State management setup
- [ ] Basic layout structure

### Phase 2: Inputs
- [ ] All input sections
- [ ] Validation
- [ ] Local storage persistence

### Phase 3: Projection Engine
- [ ] Core calculation logic
- [ ] Unit tests for calculations
- [ ] Hook integration

### Phase 4: Results Display
- [ ] Summary metrics
- [ ] Chart view with Recharts
- [ ] Table view

### Phase 5: What-If & Polish
- [ ] What-if sliders
- [ ] Export/import
- [ ] Responsive refinements
- [ ] Performance optimization
- [ ] Final polish

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

### v3.0 - 2026-02-02 - Flexible Assets + Withdrawal Penalties

**New Features:**
- Table-based asset entry with custom names
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
- Assets displayed as editable table with add/edit/delete
- Owner column shown when filing status is married
- 401k and Rule of 55 badges on eligible accounts
- Penalty settings section in Assumptions
- Penalty column in year-by-year table

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
