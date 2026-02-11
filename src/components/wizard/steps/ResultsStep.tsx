import { SummaryMetrics, ChartView, TableView } from '../../results';
import { WhatIfSection } from '../../inputs/WhatIfSection';
import { WizardNavigation } from '../WizardNavigation';

export function ResultsStep() {
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
          <ChartView />
        </div>
        <div className="xl:col-span-1">
          <WhatIfSection />
        </div>
      </div>

      {/* Table gets full width */}
      <div className="mb-6">
        <TableView />
      </div>

      <WizardNavigation />
    </div>
  );
}

export default ResultsStep;
