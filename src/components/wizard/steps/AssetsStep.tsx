import { AssetsSection } from '../../inputs/AssetsSection';
import { WizardNavigation } from '../WizardNavigation';

export function AssetsStep() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-text-primary mb-2">
          Your Assets
        </h2>
        <p className="text-text-secondary">
          Enter your current account balances. These are the building blocks of your runway.
        </p>
      </div>

      <AssetsSection />

      <WizardNavigation />
    </div>
  );
}
