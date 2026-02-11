import { LifeEventsSection } from '../../inputs/LifeEventsSection';
import { WizardNavigation } from '../WizardNavigation';

export function LifeEventsStep() {
  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-text-primary mb-2">
          Life Events
        </h2>
        <p className="text-text-secondary">
          Add any expected one-time expenses or income (inheritances, large purchases, etc.).
          This step is optional.
        </p>
      </div>

      <LifeEventsSection />

      <WizardNavigation />
    </div>
  );
}

export default LifeEventsStep;
