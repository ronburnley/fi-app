import { ProfileSection } from '../../inputs/ProfileSection';
import { WizardNavigation } from '../WizardNavigation';

export function WelcomeStep() {
  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-text-primary mb-2">
          Welcome to FI Runway
        </h2>
        <p className="text-text-secondary">
          Let's start by learning about you. This will take about 5 minutes.
        </p>
      </div>

      <ProfileSection />

      <WizardNavigation />
    </div>
  );
}
