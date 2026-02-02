import { SocialSecuritySection } from '../../inputs/SocialSecuritySection';
import { WizardNavigation } from '../WizardNavigation';

export function BenefitsStep() {
  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-text-primary mb-2">
          Retirement Benefits
        </h2>
        <p className="text-text-secondary">
          Social Security and pension income will supplement your portfolio withdrawals.
        </p>
      </div>

      <SocialSecuritySection />

      <WizardNavigation />
    </div>
  );
}
