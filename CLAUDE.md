# FI Runway

## Overview

**FI Runway** is a financial independence calculator. It answers: *"When can I achieve financial independence?"*

The app calculates FI age by testing candidate stop-working ages and choosing the viable age whose projected terminal balance is closest to the configured target (default `$0` at life expectancy).

**Target user:** People approaching early retirement who need verification that they can stop working.

**Tech stack:** React 18, Tailwind CSS, Recharts, React Context + useReducer, Supabase (Google OAuth + PostgreSQL), Vite, TypeScript, Vitest.

---

## Architecture

### Two-Phase Model

| Phase | When | What happens |
|-------|------|-------------|
| **Accumulating** | age < FI age | Employment income covers expenses, per-account contributions grow balances. Surplus can be ignored (default) or routed to a selected account type. |
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
3. **Calculate employment income** — gross - tax (net income). Surplus can optionally be routed to a selected account type.
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

### FI Age Search

`calculateAchievableFIAge()` tests candidate FI ages from current age through `lifeExpectancy - 1`. It keeps only viable ages (no shortfall), then picks the age whose terminal balance is closest to `terminalBalanceTarget` (default `$0`).

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
| v8.6 | 2026-02-20 | **Monthly/Annual Input Frequency** — Added `InputFrequency` type (`'monthly' \| 'annual'`) and optional `inputFrequency` field to `EmploymentIncome`, `RetirementIncome`, `Expense`, `Pension`, and `Asset` interfaces. Added `propertyTaxFrequency` and `insuranceFrequency` to `HomeExpense`. New `FrequencyToggle` (compact "mo/yr" segmented pill) and `CurrencyInputWithFrequency` (wraps CurrencyInput + toggle with automatic conversion and hint like "= $144,000/yr") UI components. Internal storage stays annual — frequency is UI metadata only. New items default to monthly; migration stamps `'annual'` on all existing data (`needsFrequencyMigration` + `migrateInputFrequency`). Integrated into: employment gross income (IncomeStep), retirement income streams (RetirementIncomeEditForm), recurring expenses (ExpenseEditForm), property tax & insurance (SpendingStep), pension benefit (AssetsStep), asset contributions (AssetEditForm). List displays show frequency-aware suffixes (`$2,000/mo` vs `$24,000/yr`). Labels simplified ("Annual Gross Income" → "Gross Income", "Annual Benefit" → "Benefit Amount", "Annual Contribution" → "Contribution", "Annual Amount" → "Amount"). Zero calculation engine changes. 105 tests. |
| v8.5 | 2026-02-19 | **Data Privacy & Trust Features** — Added trust section on LoginPage (shield icon + 4 checkmark bullets: no bank linking, encryption, no data selling, guest mode) between tagline and CTAs. Added "not financial advice" disclaimer on LoginPage and ResultsStep. Added JSON data export (timestamped download) for both authenticated and guest users via Header. Added account deletion flow: `deleteAccount()` on AuthContext calls `delete_my_account()` Supabase RPC (security definer function that deletes financial_plans + auth.users record), with `DeleteAccountModal` confirmation UI. Header dropdown now shows Export data, Sign out, and Delete account menu items. Added full Privacy & Security page (`PrivacyPage.tsx`) as a full-screen overlay with 4 sections (what we collect, how it's secured, what we don't do, your controls). Added `Footer.tsx` with privacy link on all wizard pages. LoginPage disclaimer links to privacy page. No calculation changes. |
| v8.4 | 2026-02-18 | **Calculation Engine Audit Fixes** — Fixed 3 substantive bugs: (1) Mortgage amortization now uses `loanBalance` as the current-year anchor and amortizes forward over the remaining term (was treating loanBalance as original principal at originationYear, giving wrong balances for mid-loan mortgages). (2) Mortgage regular payments excluded from `spendingMultiplier` scaling (contractual obligation, like `mortgagePayoffAmount`). (3) `additionalSavingsNeeded` in shortfall guidance replaced linear division with simulation loop (same approach as `calculateGoalFIGuidance`), correctly accounting for investment compounding. Fixed 3 misleading type comments in `YearProjection` and `SpouseSocialSecurity`. 118 tests (89 unit + 16 integration + 13 audit). |
| v8.3 | 2026-02-16 | **Route Surplus to Specific Account** — Replaced `accumulationSurplusAccountType` (account type) with `accumulationSurplusAccountId` (specific asset ID) on `Assumptions` interface. Projection engine now does direct ID lookup instead of type-based filter + largest-account heuristic. Assumptions UI shows account-name dropdown (`"Account Name (Type)"`) instead of type picker. `REMOVE_ASSET` reducer clears stale surplus reference when the linked account is deleted. Migration converts legacy type-based setting to the largest matching account's ID. Edge case test for deleted/missing account ID. 107 tests (78 unit + 16 integration + 13 audit). |
| v8.2 | 2026-02-14 | **Remove SWR & Derive FI Number from Projection** — Removed `safeWithdrawalRate` from `Assumptions` interface, defaults, validators, and Assumptions UI. FI Number is now derived from the projection timeline (`totalNetWorth` at achievable FI age) instead of `expenses / SWR`. Summary metrics show `--` when FI is not achievable. Progress to FI guards against division by zero. `calculateFINumber` helper removed. 81 tests (65 unit + 16 integration). |
| v8.1 | 2026-02-13 | **Granular Income Columns in Timeline Table** — Split passive income into separate `ssIncome` and `pensionIncome` fields on `YearProjection`. Timeline table now shows "SS Income" column (was generic "Income") and includes pension in "Ret. Income" column. Retirement income column visibility now accounts for pension config. Renamed "Traditional" account label to "Traditional IRA". |
| v8.0 | 2026-02-11 | **Depletion Target + Optional Surplus Routing + Shortfall Fix** — FI age selection now targets a configurable terminal balance (`terminalBalanceTarget`, default `$0`) instead of earliest-viable binary search. Added Assumptions controls for working-year surplus handling (`ignore` default or `route_to_account`) and destination account type. Fixed shortfall detection to use unmet net need after taxes/penalties (not gross withdrawal comparisons), and updated shortfall guidance to use unmet need. Added regression tests for terminal target selection, optional surplus routing, and gross-vs-net shortfall edge case. |
| v7.9 | 2026-02-11 | **Employment Income Annual Growth Rate** — Added optional `annualGrowthRate` to `EmploymentIncome` for modeling salary raises. Compound growth applied during accumulation: `gross * (1 + rate)^yearsSinceStart`. Tax calculated on grown gross. Independent rates for primary and spouse. UI: "Annual Raise" PercentInput (0-20%) on Income step. Backward-compatible — undefined/zero = static salary. 72 tests. |
| v7.8 | 2026-02-11 | **FI Achievability Fix + Auto-Hide Table Columns** — Removed hidden 5-year buffer from `testFIAge()` that tested viability against LE+5 instead of actual life expectancy, causing false "not achievable" results when portfolios lasted through the planning horizon. Confidence levels (high/moderate/tight) already communicate safety margin. Timeline table now auto-hides columns that are all-zero (Income, Gap, Withdrawal, taxes, account balances, Mortgage). 66 tests. |
| v7.7 | 2026-02-11 | **Empty Income Defaults + Live Comma Formatting** — Zeroed out pre-populated employment income defaults ($150K/$100K → $0/$0) so new users start blank, consistent with v7.4. CurrencyInput now shows comma-formatted numbers while typing (was format-on-blur only) with stable cursor positioning. 66 tests. |
| v7.6 | 2026-02-11 | **Bundle Code Splitting** — Lazy-load all 8 wizard steps via `React.lazy` + `Suspense`. Main chunk dropped from 814 KB → 426 KB (below Vite's 500 KB warning). ResultsStep + Recharts (359 KB) deferred until step 8. Each step is its own chunk loaded on-demand. Added default exports to all step components. 66 tests. |
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
