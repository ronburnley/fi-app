interface PrivacyPageProps {
  onClose: () => void;
}

export function PrivacyPage({ onClose }: PrivacyPageProps) {
  return (
    <div className="fixed inset-0 z-50 bg-bg-primary overflow-y-auto">
      {/* Header bar */}
      <div className="sticky top-0 bg-bg-primary/90 backdrop-blur-sm border-b border-border-subtle z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-text-primary tracking-tight">
            Privacy & Security
          </h1>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-secondary hover:bg-bg-tertiary transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Intro */}
        <p className="text-text-secondary text-sm leading-relaxed mb-10">
          FI Runway is a personal financial independence calculator. We believe your financial data
          deserves careful handling. Here's exactly what we collect, how we protect it, and what
          controls you have.
        </p>

        {/* Sections */}
        <div className="space-y-10">

          {/* What We Collect */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-accent-blue/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-base font-medium text-text-primary">What we collect</h2>
            </div>
            <div className="pl-11 space-y-3">
              <div className="privacy-item">
                <span className="text-text-secondary text-sm font-medium">Account info</span>
                <span className="text-text-muted text-sm"> — Name, email, and profile photo from Google sign-in. Used only for authentication.</span>
              </div>
              <div className="privacy-item">
                <span className="text-text-secondary text-sm font-medium">Financial plan data</span>
                <span className="text-text-muted text-sm"> — The ages, balances, income, expenses, and assumptions you enter. These are self-reported estimates — we never ask for bank credentials or account numbers.</span>
              </div>
              <div className="privacy-item">
                <span className="text-text-secondary text-sm font-medium">Nothing else</span>
                <span className="text-text-muted text-sm"> — No analytics, no tracking pixels, no cookies beyond authentication.</span>
              </div>
            </div>
          </section>

          {/* How It's Secured */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-base font-medium text-text-primary">How it's secured</h2>
            </div>
            <div className="pl-11 space-y-2">
              <div className="privacy-detail">
                <svg className="w-3.5 h-3.5 text-accent-primary/60 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-text-muted text-sm">AES-256 encryption at rest (Supabase/PostgreSQL on AWS)</span>
              </div>
              <div className="privacy-detail">
                <svg className="w-3.5 h-3.5 text-accent-primary/60 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-text-muted text-sm">TLS encryption in transit — all API calls over HTTPS</span>
              </div>
              <div className="privacy-detail">
                <svg className="w-3.5 h-3.5 text-accent-primary/60 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-text-muted text-sm">Row Level Security — database enforces that you can only access your own data</span>
              </div>
              <div className="privacy-detail">
                <svg className="w-3.5 h-3.5 text-accent-primary/60 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-text-muted text-sm">Google OAuth — we never store or handle passwords</span>
              </div>
            </div>
          </section>

          {/* What We Don't Do */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-accent-danger/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-accent-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <h2 className="text-base font-medium text-text-primary">What we don't do</h2>
            </div>
            <div className="pl-11 space-y-2">
              <div className="privacy-detail">
                <svg className="w-3.5 h-3.5 text-accent-danger/60 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-text-muted text-sm">We never link to your bank accounts or request financial credentials</span>
              </div>
              <div className="privacy-detail">
                <svg className="w-3.5 h-3.5 text-accent-danger/60 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-text-muted text-sm">We never sell, share, or monetize your data</span>
              </div>
              <div className="privacy-detail">
                <svg className="w-3.5 h-3.5 text-accent-danger/60 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-text-muted text-sm">No third-party analytics, ad trackers, or data brokers</span>
              </div>
              <div className="privacy-detail">
                <svg className="w-3.5 h-3.5 text-accent-danger/60 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-text-muted text-sm">No financial advice — FI Runway is an educational estimation tool</span>
              </div>
            </div>
          </section>

          {/* Your Controls */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-accent-warning/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-accent-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-base font-medium text-text-primary">Your controls</h2>
            </div>
            <div className="pl-11 space-y-3">
              <div className="privacy-item">
                <span className="text-text-secondary text-sm font-medium">Guest mode</span>
                <span className="text-text-muted text-sm"> — Use the app without an account. All data stays in your browser's localStorage and never touches a server.</span>
              </div>
              <div className="privacy-item">
                <span className="text-text-secondary text-sm font-medium">Export your data</span>
                <span className="text-text-muted text-sm"> — Download a full JSON copy of your financial plan at any time from the menu.</span>
              </div>
              <div className="privacy-item">
                <span className="text-text-secondary text-sm font-medium">Delete your account</span>
                <span className="text-text-muted text-sm"> — Permanently remove your account and all associated data from our servers. Available in the menu for signed-in users.</span>
              </div>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-border-subtle">
          <p className="text-xs text-text-muted opacity-60 leading-relaxed">
            FI Runway is an open-source educational planning tool. It is not a financial advisor
            and does not provide financial, tax, or investment advice. Projections are estimates
            based on your inputs and assumptions. Consult a qualified professional before making
            financial decisions.
          </p>
        </div>
      </div>
    </div>
  );
}
