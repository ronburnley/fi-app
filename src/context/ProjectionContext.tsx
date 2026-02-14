/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useEffect, useRef, type ReactNode } from 'react';
import { useApp } from './AppContext';
import { calculateProjection, calculateSummary, calculateAchievableFIAge, calculateGoalFIGuidance } from '../utils/calculations';
import type { YearProjection, ProjectionSummary, AchievableFIResult, GoalFIGuidance } from '../types';

interface ProjectionContextType {
  projections: YearProjection[];
  summary: ProjectionSummary;
  achievableFI: AchievableFIResult;
  goalFIGuidance: GoalFIGuidance | null;
}

const ProjectionContext = createContext<ProjectionContextType | null>(null);

export function ProjectionProvider({ children }: { children: ReactNode }) {
  const { state, whatIf, dispatch, goalFIAge } = useApp();
  const lastCalculatedFIAge = useRef<number | null>(null);

  const { assets, income, expenses, socialSecurity, assumptions, lifeEvents, profile } = state;
  const { currentAge, lifeExpectancy, filingStatus, spouseAge, state: profileState, targetFIAge } = profile;

  const achievableFI = useMemo(
    () => calculateAchievableFIAge(state, whatIf),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
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
    ]
  );

  const projections = useMemo(
    () => calculateProjection(state, whatIf),
    [state, whatIf]
  );

  const summary = useMemo(
    () => calculateSummary(state, projections, whatIf, achievableFI.achievableFIAge),
    [state, projections, whatIf, achievableFI.achievableFIAge]
  );

  const goalFIGuidance = useMemo(() => {
    if (goalFIAge === null) return null;
    return calculateGoalFIGuidance(state, goalFIAge, achievableFI.achievableFIAge, whatIf);
  }, [goalFIAge, state, achievableFI.achievableFIAge, whatIf]);

  // Sync targetFIAge with calculated achievable FI age
  useEffect(() => {
    // When achievable, set targetFIAge to the calculated FI age.
    // When not achievable, set targetFIAge to lifeExpectancy - 1 (work as long as possible)
    // to keep employment income visible in projections and match shortfall guidance.
    const newFIAge = achievableFI.achievableFIAge ?? (lifeExpectancy - 1);
    if (lastCalculatedFIAge.current !== newFIAge && targetFIAge !== newFIAge) {
      lastCalculatedFIAge.current = newFIAge;
      dispatch({
        type: 'UPDATE_PROFILE',
        payload: { targetFIAge: newFIAge },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [achievableFI.achievableFIAge, targetFIAge, lifeExpectancy, dispatch]);

  return (
    <ProjectionContext.Provider value={{ projections, summary, achievableFI, goalFIGuidance }}>
      {children}
    </ProjectionContext.Provider>
  );
}

export function useProjectionContext(): ProjectionContextType {
  const context = useContext(ProjectionContext);
  if (!context) {
    throw new Error('useProjectionContext must be used within a ProjectionProvider');
  }
  return context;
}
