import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { calculateProjection, calculateSummary } from '../utils/calculations';
import type { YearProjection, ProjectionSummary } from '../types';

interface UseProjectionResult {
  projections: YearProjection[];
  summary: ProjectionSummary;
  baselineSummary: ProjectionSummary;
  deltaYears: number;
}

export function useProjection(): UseProjectionResult {
  const { state, whatIf } = useApp();

  // Memoize projections with what-if adjustments
  const projections = useMemo(() => {
    return calculateProjection(state, whatIf);
  }, [state, whatIf]);

  // Memoize summary with what-if adjustments
  const summary = useMemo(() => {
    return calculateSummary(state, projections, whatIf);
  }, [state, projections, whatIf]);

  // Memoize baseline (without what-if) for comparison
  const baselineProjections = useMemo(() => {
    return calculateProjection(state);
  }, [state]);

  const baselineSummary = useMemo(() => {
    return calculateSummary(state, baselineProjections);
  }, [state, baselineProjections]);

  // Calculate delta in runway years
  const deltaYears = summary.runwayAge - baselineSummary.runwayAge;

  return {
    projections,
    summary,
    baselineSummary,
    deltaYears,
  };
}
