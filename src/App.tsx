import { AppProvider } from './context/AppContext';
import { Header } from './components/layout';
import { WizardProvider, WizardLayout } from './components/wizard';

function App() {
  return (
    <AppProvider>
      <WizardProvider>
        <div className="flex flex-col min-h-screen bg-bg-primary">
          <Header />
          <WizardLayout />
        </div>
      </WizardProvider>
    </AppProvider>
  );
}

export default App;
