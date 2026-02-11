# FI Runway

## Overview

**FI Runway** is a financial independence calculator. It answers: *"When can I achieve financial independence?"*

The app **calculates** the earliest achievable FI age via binary search — the user provides financial inputs, and the app finds the earliest age where all employment can stop and money lasts through life expectancy.

**Target user:** People approaching early retirement who need verification that they can stop working.

**Tech stack:** React 18, Tailwind CSS, Recharts, React Context + useReducer, Supabase (Google OAuth + PostgreSQL), Vite, TypeScript, Vitest.

---

## Architecture

### Two-Phase Model

| Phase | When | What happens |
|-------|------|-------------|
| **Accumulating** | age < FI age | Employment income covers expenses, per-account contributions grow balances. Surplus (income > expenses) is untracked. |
| **FI** | age >= FI age | No employment. Portfolio + passive income (SS, pension, retirement streams) sustain spending via withdrawals. |

There is no "gap" phase. FI age = when employment stops.

**Spouse handling:** Optional `spouseAdditionalWorkYears` lets spouse continue working N years past the primary's FI age.

### Key Files

| File | Purpose |
|------|---------|
| `src/types/index.ts` | All TypeScript interfaces (source of truth for data model) |
| `src/utils/calculations/` | Projection engine split into 10 modules (types, mortgage, socialSecurity, withdrawals, balances, expenses, projection, summary, fiSearch, index) |
| `src/utils/calculations.test.ts` | 50 unit tests (Vitest) |
| `src/utils/calculations.integration.test.ts` | 16 integration tests (multi-system scenarios) |
| `src/context/ProjectionContext.tsx` | Centralized projection, summary, and achievable FI computation |
| `src/context/AppContext.tsx` | Global state, Supabase sync, migrations |
| `src/context/AuthContext.tsx` | Supabase auth, guest mode |
| `src/utils/migration.ts` | Legacy data format migrations |
| `src/constants/defaults.ts` | Default values |
| `src/constants/stateTaxes.ts` | State tax rates (all 50 states + DC) |

### Wizard Steps (8 steps)

1. Welcome (profile basics)
2. Assets (table-based with add/edit/delete)
3. Income (employment + retirement income streams)
4. Spending (annual expenses + per-item expenses)
5. Benefits (Social Security + pension)
6. Life Events (one-time income/expenses)
7. Assumptions (returns, inflation, taxes, penalties)
8. Results (summary, chart, table, what-if sliders)

FI age is auto-calculated and shown in the header starting at step 2.

---

## Projection Engine

For each year from `currentAge` to `lifeExpectancy`:

1. **Determine phase** — accumulating or FI based on age vs FI age
2. **Add per-account contributions** — each account with `annualContribution` gets funded if year is within [startYear, endYear]. Contributions are phase-independent (date-bounded, not tied to employment).
3. **Calculate employment income** — gross - tax (net income). Surplus (income > expenses) is ignored.
4. **Calculate expenses** — global-inflation-adjusted (unless `inflationAdjusted: false`) + life events
5. **Calculate passive income** — Social Security (FRA-adjusted + COLA), pension (+ COLA), retirement income streams
6. **Calculate gap** — expenses minus all income
7. **If gap > 0:** Withdraw from accounts in priority order (penalty-free first within each type)
8. **Grow balances** — apply investment return to remaining balances
9. **Track mortgage** — amortization, early payoff if configured

### Withdrawal Priority & Penalties

| Account Type | Penalty-Free Age | Penalty Rate | Notes |
|--------------|------------------|--------------|-------|
| Cash | Any | 0% | Always first |
| Taxable | Any | 0% | Capital gains tax on gains portion |
| Traditional | 59.5 | 10% | Fed + state income tax. Rule of 55 for 401k. |
| Roth | 59.5 | 10% | Tax-free, penalty on earnings only |
| HSA | 65 | 20% | Tax-free for medical |

### Social Security

`monthlyBenefit` is stored as the FRA (age 67) amount. Auto-adjusted by claiming age: 62 = 0.70x, 67 = 1.00x, 70 = 1.24x. COLA compounds on the adjusted amount.

### FI Age Binary Search

`calculateAchievableFIAge()` tests candidate FI ages. Each candidate means a different accumulation length — more working years = more contributions and growth. Binary search converges in ~7 iterations.

Confidence levels based on buffer past life expectancy: high (10+), moderate (5-9), tight (0-4), not_achievable (shortfall).

When not achievable, `calculateShortfallGuidance()` computes: runs-out age, spending reduction needed, additional savings needed.

---

## Design System

Dark mode, minimal aesthetic inspired by Linear and Raycast.

### Colors

```
Background: #0a0a0b (primary), #141416 (cards), #1c1c1f (inputs/hover)
Text: #fafafa (primary), #a1a1aa (secondary), #52525b (muted)
Accent: #22c55e (green/success), #eab308 (yellow/warning), #ef4444 (red/danger), #3b82f6 (blue/interactive)
Borders: #27272a (subtle), #3f3f46 (default)
```

### Style Rules
- Font: Inter / system-ui. Numbers: tabular-nums.
- Cards: rounded-lg, subtle borders, no shadows.
- Minimal decoration, generous whitespace.

---

## Auth & Sync

- **Guest mode:** localStorage, no account required
- **Authenticated:** Google OAuth via Supabase, auto-save with 1s debounce
- **Migration:** Guest data migrates to cloud on sign-in
- **Dev bypass:** `VITE_DEV_BYPASS_AUTH=true` for local development

---

## Notes for Claude

- Prioritize calculation accuracy over features
- Keep UI minimal; resist adding complexity
- Use TypeScript strictly; no `any` types
- Write unit tests for the projection engine (`npm test`)
- Memoize expensive calculations
- All data model types are in `src/types/index.ts` — read that file for the current interfaces
- All defaults are in `src/constants/defaults.ts`
- Run `npm run build` to verify no type errors after changes

---

## Version History

| Version | Date | Summary |
|---------|------|---------|
| v7.5 | 2026-02-11 | **Centralized Projections + Calculation Fixes** — Created `ProjectionContext` to compute projections, summary, and achievable FI age once (was 3-4x redundant via per-component hooks). Deleted `useProjection` and `useAchievableFI` hooks. Fixed: timeline now shows gross employment income (was net). Fixed: contributions included in gap/deficit calculation. Fixed: targetFIAge sync when FI not achievable (sets to lifeExpectancy-1). 66 tests. |
| v7.4 | 2026-02-11 | **Empty Defaults for New Users** — Cleared pre-populated demo data from assets (5 accounts, $1.6M) and expenses (7 categories, $53.8K/yr, full mortgage). New users now start with a completely blank slate. Existing users unaffected (saved data loads over defaults). 66 tests. |
| v7.3 | 2026-02-09 | **Employment Tax in Timeline** — Added `employmentTax` field to `YearProjection` and "Emp. Tax" column to timeline table. Tax deducted from gross employment income is now visible during accumulation years. 66 tests (50 unit + 16 integration). |
| v7.2 | 2026-02-09 | **Penalty Gross-Up Fix** — Withdrawal gross-up now includes penalty rates in the denominator (Traditional, Roth, HSA). Previously, penalties were calculated but not funded by the withdrawal amount, making projections overly optimistic. 66 tests (50 unit + 16 integration). |
| v7.1 | 2026-02-08 | **Simplified Inflation** — Single global inflation rate for all expenses. Replaced per-expense `inflationRate: number` with `inflationAdjusted?: boolean` (default true, false = fixed cost). Removed `HomeExpense.inflationRate`. UI: checkbox toggle replaces PercentInput, "Fixed" badge on expense rows. Migration converts legacy data. 63 tests. |
| v7.0 | 2026-02-08 | **Per-Account Contributions** — Moved contributions from employment to individual accounts (`annualContribution` + start/end year). Removed surplus auto-deposit. Simplified `EmploymentIncome` to gross + tax rate. 63 tests (47 unit + 16 integration). |
| v6.1 | 2026-02-07 | **Engine Refactor** — Split 1545-line `calculations.ts` into 10 focused modules under `calculations/`. Added 16 integration tests (62 total). Zero logic changes. |
| v6.0 | 2026-02-07 | **FI Age Model Rework** — Removed retirement age (`endAge`). FI age IS when employment stops. Two phases (accumulating/fi), no gap. Spouse additional work years. Shortfall guidance. |
| v5.5 | 2026-02-07 | Assumptions page layout rework (narrower, 4 sections, clearer labels) |
| v5.4 | 2026-02-06 | FRA-based Social Security auto-adjustment (62/67/70 claiming factors) |
| v5.3 | 2026-02-05 | Sign-in modal instead of direct OAuth redirect |
| v5.2 | 2026-02-05 | Guest mode & landing page (use app without signing in) |
| v5.1 | 2026-02-04 | Contribution linking to specific accounts, dev bypass mode, 32 unit tests |
| v5.0 | 2026-02-03 | Supabase auth & cloud sync (replaced localStorage + JSON export) |
| v4.3 | 2026-02-03 | Employment income modeling, retirement income streams, three-phase model |
| v4.2 | 2026-02-03 | Mortgage calculator with amortization, early payoff, balance tracking |
| v4.1 | 2026-02-03 | Pension COLA support |
| v4.0 | 2026-02-02 | Inverted FI model (app calculates FI age via binary search) |
| v3.1 | 2026-02-02 | State tax calculations (all 50 states + DC) |
| v3.0 | 2026-02-02 | Array-based assets, withdrawal penalties (59.5, HSA 65, Rule of 55) |
| v2.0 | 2026-02-02 | Wizard UX, spouse Social Security, COLA |
| v1.0 | 2026-02-02 | Initial MVP — projection engine, chart, table, what-if sliders |
