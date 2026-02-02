import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { calculateAchievableFIAge } from '../utils/calculations';
import type { AchievableFIResult } from '../types';

export function useAchievableFI(): AchievableFIResult {
  const { state, whatIf } = useApp();

  return useMemo(
    () => calculateAchievableFIAge(state, whatIf),
    [state, whatIf]
  );
}
