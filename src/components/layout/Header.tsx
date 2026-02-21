import { useState, useRef, useEffect, useCallback } from 'react';
import { Button, FIStatusIndicator } from '../ui';
import { SignInModal, DeleteAccountModal } from '../auth';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useWizard } from '../wizard/WizardContext';
import { useProjectionContext } from '../../context/ProjectionContext';
import { hasMinimumDataForResults } from '../../utils/dataReadiness';

export function Header() {
  const { state, syncStatus } = useApp();
  const { user, signOut, isGuest } = useAuth();
  const { currentStep, goToResults } = useWizard();
  const { achievableFI } = useProjectionContext();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Show indicator after step 1 (once user has entered assets in step 2+)
  const showIndicator = currentStep >= 2;
  const isIndicatorClickable = showIndicator && hasMinimumDataForResults(state) && currentStep !== 8;

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setShowUserMenu(false);
    await signOut();
  };

  const handleSignInToSync = () => {
    setShowSignInModal(true);
  };

  const handleExportData = useCallback(() => {
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fi-runway-plan-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [state]);

  // Get user initials for avatar
  const getInitials = () => {
    if (!user?.email) return '?';
    const parts = user.email.split('@')[0].split(/[._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return user.email[0].toUpperCase();
  };

  // Get display name
  const getDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    return user?.email?.split('@')[0] || 'User';
  };

  return (
    <header className="header-with-fi-indicator">
      {/* Left: Logo */}
      <div className="header-left">
        <div className="w-8 h-8 rounded-lg bg-accent-primary flex items-center justify-center">
          <svg
            className="w-5 h-5 text-white"
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
        <h1 className="text-lg font-semibold text-text-primary tracking-tight">
          FI Runway
        </h1>
      </div>

      {/* Center: FI Status Indicator */}
      <div className="header-center">
        <FIStatusIndicator
          result={achievableFI}
          isVisible={showIndicator}
          isClickable={isIndicatorClickable}
          onClick={goToResults}
        />
      </div>

      {/* Right: Sync Status + User Menu (or Sign In for guests) */}
      <div className="header-right">
        {isGuest ? (
          /* Guest mode: Show export button + "Sign in to sync" link */
          <>
            <button
              onClick={handleExportData}
              title="Export data"
              className="flex items-center justify-center w-8 h-8 text-text-muted hover:text-text-secondary hover:bg-bg-tertiary rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            <button
              onClick={handleSignInToSync}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-accent-blue hover:text-accent-blue/80 hover:bg-bg-tertiary rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <span>Sign in to sync</span>
            </button>
          </>
        ) : (
          /* Authenticated: Show sync status + user menu */
          <>
            {/* Sync Status Indicator */}
            <div className="flex items-center gap-2 mr-2">
              {syncStatus === 'syncing' && (
                <div className="flex items-center gap-1.5 text-text-muted text-xs">
                  <svg
                    className="w-3.5 h-3.5 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Saving...</span>
                </div>
              )}
              {syncStatus === 'saved' && (
                <div className="flex items-center gap-1.5 text-accent-primary text-xs">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Saved</span>
                </div>
              )}
              {syncStatus === 'error' && (
                <div className="flex items-center gap-1.5 text-accent-danger text-xs">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Error</span>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-bg-tertiary transition-colors"
              >
                {/* Avatar */}
                {user?.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt={getDisplayName()}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-accent-blue/20 text-accent-blue flex items-center justify-center text-sm font-medium">
                    {getInitials()}
                  </div>
                )}
                <svg
                  className={`w-4 h-4 text-text-muted transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-bg-secondary border border-border-subtle rounded-lg shadow-lg py-1 z-50">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-border-subtle">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {getDisplayName()}
                    </p>
                    <p className="text-xs text-text-muted truncate">
                      {user?.email}
                    </p>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <Button
                      variant="ghost"
                      className="w-full justify-start px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-none"
                      onClick={() => { setShowUserMenu(false); handleExportData(); }}
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      Export data
                    </Button>
                  </div>
                  <div className="border-t border-border-subtle" />
                  <div className="py-1">
                    <Button
                      variant="ghost"
                      className="w-full justify-start px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-none"
                      onClick={handleSignOut}
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      Sign out
                    </Button>
                  </div>
                  <div className="border-t border-border-subtle" />
                  <div className="py-1">
                    <Button
                      variant="ghost"
                      className="w-full justify-start px-4 py-2 text-accent-danger hover:text-accent-danger hover:bg-accent-danger/10 rounded-none"
                      onClick={() => { setShowUserMenu(false); setShowDeleteModal(true); }}
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      Delete account
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {showSignInModal && <SignInModal onClose={() => setShowSignInModal(false)} />}
      {showDeleteModal && <DeleteAccountModal onClose={() => setShowDeleteModal(false)} />}
    </header>
  );
}
