import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface LoginPageProps {
  onPrivacyClick?: () => void;
}

export function LoginPage({ onPrivacyClick }: LoginPageProps) {
  const { signInWithGoogle, enterGuestMode } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleGuestMode = () => {
    enterGuestMode();
  };

  return (
    <div className="landing-page">
      {/* Subtle gradient overlay */}
      <div className="landing-bg-gradient" />

      {/* Content */}
      <div className="landing-content">
        {/* Logo */}
        <div className="landing-logo">
          <div className="landing-logo-icon">
            <svg
              className="w-8 h-8 text-white"
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
          <h1 className="landing-title">FI Runway</h1>
        </div>

        {/* Tagline */}
        <p className="landing-tagline">
          Calculate your path to financial independence
        </p>

        {/* Trust section */}
        <div className="landing-trust">
          <div className="landing-trust-header">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Your data is safe</span>
          </div>
          <ul className="landing-trust-list">
            <li>No bank account linking — you enter estimates, never credentials</li>
            <li>Encrypted at rest and in transit</li>
            <li>We never sell or share your data</li>
            <li>Guest mode keeps everything in your browser</li>
          </ul>
        </div>

        {/* Error message */}
        {error && (
          <div className="landing-error">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="landing-actions">
          {/* Primary CTA - Get Started */}
          <button
            onClick={handleGuestMode}
            disabled={isLoading}
            className="landing-btn-primary"
          >
            <span>Get Started</span>
            <svg
              className="w-4 h-4 opacity-60"
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

          {/* Divider */}
          <div className="landing-divider">
            <span>or</span>
          </div>

          {/* Secondary - Google Sign In */}
          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className="landing-btn-google"
          >
            {isLoading ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
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
              <svg className="w-4 h-4" viewBox="0 0 24 24">
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
            <span>{isLoading ? 'Signing in...' : 'Continue with Google'}</span>
          </button>
        </div>

        {/* Disclaimer */}
        <p className="landing-disclaimer">
          FI Runway is an educational planning tool, not a financial advisor.
          {onPrivacyClick && (
            <>
              {' '}
              <button
                onClick={onPrivacyClick}
                className="underline underline-offset-2 hover:text-text-muted transition-colors"
              >
                Privacy & Security
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
