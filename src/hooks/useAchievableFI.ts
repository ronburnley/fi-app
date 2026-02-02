import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { calculateAchievableFIAge } from '../utils/calculations';
import type { AchievableFIResult } from '../types';

export function useAchievableFI(): AchievableFIResult {
  const { state, whatIf } = useApp();

  // Extract dependencies explicitly to ensure recalculation on any relevant change
  const { assets, expenses, socialSecurity, assumptions, lifeEvents, profile } = state;

  return useMemo(
    () => calculateAchievableFIAge(state, whatIf),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      assets,
      expenses,
      socialSecurity,
      assumptions,
      lifeEvents,
      profile,
      whatIf,
    ]
  );
}
