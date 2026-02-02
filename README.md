# FI Runway

A financial independence verification tool for people approaching or considering early retirement.

**Live Demo:** https://fi-app-omega.vercel.app/

## What it does

FI Runway answers one core question: *"Given what I have, what I spend, and reasonable assumptions, will my money last?"*

- Year-by-year runway projections
- Tax-aware withdrawal strategies
- Early withdrawal penalty tracking (age 59.5, HSA at 65, Rule of 55)
- Social Security with COLA adjustments
- What-if scenario modeling

## Tech Stack

- React 18 + TypeScript
- Tailwind CSS
- Recharts
- Vite

## Development

```bash
npm install
npm run dev
```

## Features

- **Flexible Assets** - Add any number of accounts with custom names and ownership
- **Penalty Tracking** - Automatic 10% penalty for early withdrawals, 20% for HSA
- **Spouse Support** - Track separate ages for penalty-free access timing
- **Rule of 55** - Optional penalty-free 401(k) access for early retirees
- **Life Events** - One-time expenses or income (inheritance, home purchase, etc.)
- **Export/Import** - Save and load your data as JSON

## License

MIT
