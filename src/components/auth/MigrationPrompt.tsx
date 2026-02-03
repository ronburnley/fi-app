import { useState } from 'react';

interface MigrationPromptProps {
  onAccept: () => Promise<void>;
  onDecline: () => Promise<void>;
}

export function MigrationPrompt({ onAccept, onDecline }: MigrationPromptProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [action, setAction] = useState<'accept' | 'decline' | null>(null);

  const handleAccept = async () => {
    setIsLoading(true);
    setAction('accept');
    await onAccept();
  };

  const handleDecline = async () => {
    setIsLoading(true);
    setAction('decline');
    await onDecline();
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-accent-primary flex items-center justify-center">
          <svg
            className="w-7 h-7 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-semibold text-text-primary tracking-tight">
          FI Runway
        </h1>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-bg-secondary border border-border-subtle rounded-xl p-8">
        <div className="w-12 h-12 rounded-full bg-accent-blue/10 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-6 h-6 text-accent-blue"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
        </div>

        <h2 className="text-xl font-semibold text-text-primary text-center mb-2">
          Import Existing Data?
        </h2>
        <p className="text-text-secondary text-center text-sm mb-6">
          We found financial data saved on this device. Would you like to import
          it into your account?
        </p>

        <div className="bg-bg-tertiary rounded-lg p-4 mb-6">
          <p className="text-text-muted text-xs mb-2 uppercase tracking-wider">
            What gets imported
          </p>
          <ul className="text-text-secondary text-sm space-y-1">
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Profile and household info
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Investment accounts and balances
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Expense categories and amounts
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Social Security and pension details
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleAccept}
            disabled={isLoading}
            className="w-full px-4 py-3 bg-accent-primary hover:bg-accent-primary/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading && action === 'accept' ? (
              <>
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Importing...
              </>
            ) : (
              'Yes, Import My Data'
            )}
          </button>

          <button
            onClick={handleDecline}
            disabled={isLoading}
            className="w-full px-4 py-3 bg-bg-tertiary hover:bg-border-subtle text-text-secondary font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading && action === 'decline' ? (
              <>
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Starting fresh...
              </>
            ) : (
              'No, Start Fresh'
            )}
          </button>
        </div>
      </div>

      <p className="mt-6 text-text-muted text-xs text-center max-w-xs">
        Your data will be securely stored in the cloud and synced across all
        your devices.
      </p>
    </div>
  );
}
