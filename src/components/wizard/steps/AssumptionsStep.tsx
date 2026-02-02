import { AssumptionsSection } from '../../inputs/AssumptionsSection';
import { WizardNavigation } from '../WizardNavigation';

export function AssumptionsStep() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-text-primary mb-2">
          Assumptions
        </h2>
        <p className="text-text-secondary">
          Fine-tune your projection assumptions. The defaults are reasonable for most people.
          This step is optional.
        </p>
      </div>

      <AssumptionsSection />

      <WizardNavigation showSkip />
    </div>
  );
}
