import { SummaryMetrics, ChartView, TableView, GoalFIAgeCard, GoalFIGuidancePanel } from '../../results';
import { WhatIfSection } from '../../inputs/WhatIfSection';
import { WizardNavigation } from '../WizardNavigation';
import { useApp } from '../../../context/AppContext';
import { useProjectionContext } from '../../../context/ProjectionContext';

export function ResultsStep() {
  const { goalFIAge } = useApp();
  const { goalFIGuidance } = useProjectionContext();

  const showGuidancePanel = goalFIAge !== null && goalFIGuidance !== null && goalFIGuidance.status !== 'on_track';

  return (
    <div className="max-w-[1600px] mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-text-primary mb-2">
          Your FI Runway
        </h2>
        <p className="text-text-secondary">
          Here's your financial independence projection. Use the sliders below to explore what-if scenarios.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-6">
        <div className="xl:col-span-3 space-y-6">
          <SummaryMetrics />
          {goalFIGuidance?.status === 'on_track' && <GoalFIGuidancePanel />}
          {showGuidancePanel && <GoalFIGuidancePanel />}
          <ChartView />
        </div>
        <div className="xl:col-span-1 space-y-4">
          <GoalFIAgeCard />
          <WhatIfSection />
        </div>
      </div>

      {/* Table gets full width */}
      <div className="mb-6">
        <TableView />
      </div>

      <WizardNavigation />

      <p className="text-xs text-text-muted opacity-70 text-center mt-6 mb-2">
        FI Runway is an educational planning tool, not a financial advisor. Projections are estimates based on your inputs and assumptions. Consult a qualified professional before making financial decisions.
      </p>
    </div>
  );
}

export default ResultsStep;
