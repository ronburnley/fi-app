import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface HomePageProps {
  onEnter: () => void;
}

export function HomePage({ onEnter }: HomePageProps) {
  const { user, signInWithGoogle, enterGuestMode } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const firstName =
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'there';

  const handleGetStarted = () => {
    enterGuestMode();
    onEnter();
  };

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (_) {
      setError('Failed to sign in. Please try again.');
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    onEnter();
  };

  return (
    <div className="homepage-page">
      {/* Ambient gradient */}
      <div className="landing-bg-gradient" />

      {/* Navigation */}
      <nav className="homepage-nav">
        <div className="homepage-nav-inner">
          <div className="homepage-nav-logo">
            <div className="landing-logo-icon" style={{ width: 36, height: 36, borderRadius: 10 }}>
              <svg
                style={{ width: 18, height: 18 }}
                className="text-white"
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
            <span className="homepage-nav-title">FI Runway</span>
          </div>
          {user && (
            <button onClick={handleContinue} className="homepage-nav-cta">
              Continue to your plan →
            </button>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="homepage-hero">
        <div className="homepage-hero-content">
          {user && (
            <div className="homepage-welcome-badge">
              Welcome back, {firstName}
            </div>
          )}
          <h1 className="homepage-headline">
            Know exactly when<br />you can stop working.
          </h1>
          <p className="homepage-subheadline">
            FI Runway calculates your financial independence age — the exact
            moment your portfolio sustains your life, forever.
          </p>

          <div className="homepage-cta-area">
            {error && <div className="landing-error">{error}</div>}
            {user ? (
              <button onClick={handleContinue} className="landing-btn-primary">
                <span>Continue to your plan</span>
                <svg
                  style={{ width: 16, height: 16, opacity: 0.6 }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            ) : (
              <>
                <button onClick={handleGetStarted} className="landing-btn-primary">
                  <span>Get Started — it's free</span>
                  <svg
                    style={{ width: 16, height: 16, opacity: 0.6 }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
                <div className="landing-divider">
                  <span>or</span>
                </div>
                <button
                  onClick={handleSignIn}
                  disabled={isLoading}
                  className="landing-btn-google"
                >
                  {isLoading ? (
                    <svg
                      style={{ width: 16, height: 16 }}
                      className="animate-spin"
                      viewBox="0 0 24 24"
                    >
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
                  ) : (
                    <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  )}
                  <span>{isLoading ? 'Signing in...' : 'Sign in with Google'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="homepage-how">
        <div className="homepage-section-inner">
          <p className="homepage-section-label">How it works</p>
          <h2 className="homepage-section-heading">Simple, powerful, honest math.</h2>
          <div className="homepage-how-steps">
            <div className="homepage-step">
              <div className="homepage-step-number">01</div>
              <div className="homepage-step-icon">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
              </div>
              <h3 className="homepage-step-title">Enter your numbers</h3>
              <p className="homepage-step-desc">
                Assets, income, spending, Social Security, pension — everything that matters.
              </p>
            </div>
            <div className="homepage-step">
              <div className="homepage-step-number">02</div>
              <div className="homepage-step-icon">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="homepage-step-title">We find your FI age</h3>
              <p className="homepage-step-desc">
                Our engine tests every possible retirement age and finds the one that makes your money last.
              </p>
            </div>
            <div className="homepage-step">
              <div className="homepage-step-number">03</div>
              <div className="homepage-step-icon">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
              </div>
              <h3 className="homepage-step-title">Explore what-if scenarios</h3>
              <p className="homepage-step-desc">
                Drag sliders to see what happens if you spend more, retire earlier, or change your return assumptions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="homepage-features">
        <div className="homepage-section-inner">
          <p className="homepage-section-label">Features</p>
          <h2 className="homepage-section-heading">Everything you need to plan with confidence.</h2>
          <div className="homepage-features-grid">
            <div className="homepage-feature-card">
              <div className="homepage-feature-icon">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              </div>
              <h3 className="homepage-feature-title">Multi-account portfolio</h3>
              <p className="homepage-feature-desc">
                Track 401(k), Roth IRA, brokerage, HSA, and cash with per-account contribution modeling.
              </p>
            </div>
            <div className="homepage-feature-card">
              <div className="homepage-feature-icon">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"
                  />
                </svg>
              </div>
              <h3 className="homepage-feature-title">Social Security & pension</h3>
              <p className="homepage-feature-desc">
                FRA-adjusted SS benefits with COLA. Pension income with inflation protection.
              </p>
            </div>
            <div className="homepage-feature-card">
              <div className="homepage-feature-icon">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="homepage-feature-title">Tax-aware withdrawals</h3>
              <p className="homepage-feature-desc">
                Penalty-aware sequencing: cash first, then taxable, then tax-deferred, then Roth.
              </p>
            </div>
            <div className="homepage-feature-card">
              <div className="homepage-feature-icon">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="homepage-feature-title">What-if scenario explorer</h3>
              <p className="homepage-feature-desc">
                Live sliders for retirement age, spending, and return assumptions. Changes reflect instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="homepage-footer-bar">
        <p className="landing-footer">
          <span className="landing-footer-icon">
            <svg
              style={{ width: 14, height: 14 }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </span>
          Your data stays private on this device. Sign in to sync across devices.
        </p>
      </footer>
    </div>
  );
}

export default HomePage;
