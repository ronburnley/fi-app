import { useRef } from 'react';
import { Button, FIStatusIndicator } from '../ui';
import { useApp } from '../../context/AppContext';
import { useWizard } from '../wizard/WizardContext';
import { useAchievableFI } from '../../hooks/useAchievableFI';
import { exportState, importState } from '../../utils/exportImport';

export function Header() {
  const { state, dispatch } = useApp();
  const { currentStep } = useWizard();
  const achievableFI = useAchievableFI();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Show indicator after step 1 (once user has entered assets in step 2+)
  const showIndicator = currentStep >= 2;

  const handleExport = () => {
    exportState(state);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedState = await importState(file);
      dispatch({ type: 'LOAD_STATE', payload: importedState });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to import file');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
        <FIStatusIndicator result={achievableFI} isVisible={showIndicator} />
      </div>

      {/* Right: Import/Export */}
      <div className="header-right">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
        <Button variant="ghost" size="sm" onClick={handleImportClick}>
          <svg
            className="w-4 h-4 mr-1.5"
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
          Import
        </Button>
        <Button variant="secondary" size="sm" onClick={handleExport}>
          <svg
            className="w-4 h-4 mr-1.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Export
        </Button>
      </div>
    </header>
  );
}
