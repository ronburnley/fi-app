import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export function LoginPage() {
  const { signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError('Failed to sign in. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-4">
      {/* Logo and Title */}
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
      <div className="w-full max-w-sm bg-bg-secondary border border-border-subtle rounded-xl p-8">
        <h2 className="text-xl font-semibold text-text-primary text-center mb-2">
          Welcome back
        </h2>
        <p className="text-text-secondary text-center text-sm mb-8">
          Sign in to access your financial independence plan
        </p>

        {error && (
          <div className="mb-4 p-3 bg-accent-danger/10 border border-accent-danger/20 rounded-lg text-accent-danger text-sm text-center">
            {error}
          </div>
        )}

        <button
          onClick={handleSignIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-100 text-gray-800 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
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
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
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
      </div>

      {/* Footer */}
      <p className="mt-8 text-text-muted text-xs text-center max-w-xs">
        Your data is stored securely and synced across devices.
        By signing in, you agree to our terms of service.
      </p>
    </div>
  );
}
