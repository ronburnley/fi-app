import { ExpensesSection } from '../../inputs/ExpensesSection';
import { WizardNavigation } from '../WizardNavigation';

export function SpendingStep() {
  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-text-primary mb-2">
          Annual Spending
        </h2>
        <p className="text-text-secondary">
          How much do you expect to spend each year in retirement?
        </p>
      </div>

      <ExpensesSection />

      <WizardNavigation />
    </div>
  );
}
