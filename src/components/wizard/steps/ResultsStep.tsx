import { SummaryMetrics, ChartView, TableView } from '../../results';
import { WhatIfSection } from '../../inputs/WhatIfSection';
import { WizardNavigation } from '../WizardNavigation';

export function ResultsStep() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-text-primary mb-2">
          Your FI Runway
        </h2>
        <p className="text-text-secondary">
          Here's your financial independence projection. Use the sliders below to explore what-if scenarios.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SummaryMetrics />
          <ChartView />
          <TableView />
        </div>
        <div className="lg:col-span-1">
          <WhatIfSection />
        </div>
      </div>

      <WizardNavigation />
    </div>
  );
}
