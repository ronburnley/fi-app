import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { ProjectionProvider } from './context/ProjectionContext';
import { Header, Footer, PrivacyPage } from './components/layout';
import { WizardProvider, WizardLayout } from './components/wizard';
import { LoginPage } from './components/auth';
import { MigrationPrompt } from './components/auth/MigrationPrompt';
import { LoadingScreen } from './components/ui/LoadingScreen';

function AppContent() {
  const { user, loading: authLoading, isGuest } = useAuth();
  const { isLoading: dataLoading, needsMigration, acceptMigration, declineMigration } = useApp();
  const [showPrivacy, setShowPrivacy] = useState(false);

  // Show loading while checking auth
  if (authLoading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  // Show login page if not authenticated and not in guest mode
  if (!user && !isGuest) {
    return (
      <>
        <LoginPage onPrivacyClick={() => setShowPrivacy(true)} />
        {showPrivacy && <PrivacyPage onClose={() => setShowPrivacy(false)} />}
      </>
    );
  }

  // Show loading while fetching data
  if (dataLoading) {
    return <LoadingScreen message="Loading your plan..." />;
  }

  // Show migration prompt if localStorage data exists (only for authenticated users)
  if (needsMigration && user) {
    return (
      <MigrationPrompt
        onAccept={acceptMigration}
        onDecline={declineMigration}
      />
    );
  }

  // Show main app
  return (
    <ProjectionProvider>
      <WizardProvider>
        <div className="flex flex-col min-h-screen bg-bg-primary">
          <Header />
          <WizardLayout />
          <Footer onPrivacyClick={() => setShowPrivacy(true)} />
        </div>
        {showPrivacy && <PrivacyPage onClose={() => setShowPrivacy(false)} />}
      </WizardProvider>
    </ProjectionProvider>
  );
}

function AuthenticatedApp() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

export default App;
