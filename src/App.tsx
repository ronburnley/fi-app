import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout';
import { WizardProvider, WizardLayout } from './components/wizard';
import { LoginPage } from './components/auth';
import { MigrationPrompt } from './components/auth/MigrationPrompt';
import { LoadingScreen } from './components/ui/LoadingScreen';

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const { isLoading: dataLoading, needsMigration, acceptMigration, declineMigration } = useApp();

  // Show loading while checking auth
  if (authLoading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  // Show login page if not authenticated
  if (!user) {
    return <LoginPage />;
  }

  // Show loading while fetching data
  if (dataLoading) {
    return <LoadingScreen message="Loading your plan..." />;
  }

  // Show migration prompt if localStorage data exists
  if (needsMigration) {
    return (
      <MigrationPrompt
        onAccept={acceptMigration}
        onDecline={declineMigration}
      />
    );
  }

  // Show main app
  return (
    <WizardProvider>
      <div className="flex flex-col min-h-screen bg-bg-primary">
        <Header />
        <WizardLayout />
      </div>
    </WizardProvider>
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
