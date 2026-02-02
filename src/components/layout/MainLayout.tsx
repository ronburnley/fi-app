import { useState, type ReactNode } from 'react';
import { Panel } from './Panel';

interface MainLayoutProps {
  inputPanel: ReactNode;
  resultsPanel: ReactNode;
}

export function MainLayout({ inputPanel, resultsPanel }: MainLayoutProps) {
  const [showInputs, setShowInputs] = useState(true);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Mobile tabs */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-10 flex border-t border-border-subtle bg-bg-secondary">
        <button
          onClick={() => setShowInputs(true)}
          className={`flex-1 py-3 text-sm font-medium ${
            showInputs ? 'text-accent-blue bg-bg-tertiary' : 'text-text-secondary'
          }`}
        >
          Inputs
        </button>
        <button
          onClick={() => setShowInputs(false)}
          className={`flex-1 py-3 text-sm font-medium ${
            !showInputs ? 'text-accent-blue bg-bg-tertiary' : 'text-text-secondary'
          }`}
        >
          Results
        </button>
      </div>

      {/* Input Panel */}
      <div
        className={`
          w-full lg:w-[400px] xl:w-[440px] shrink-0
          border-r border-border-subtle bg-bg-primary
          ${showInputs ? 'block' : 'hidden'} lg:block
          pb-16 lg:pb-0
        `}
      >
        <Panel className="p-4 space-y-4">
          {inputPanel}
        </Panel>
      </div>

      {/* Results Panel */}
      <div
        className={`
          flex-1 bg-bg-primary
          ${!showInputs ? 'block' : 'hidden'} lg:block
          pb-16 lg:pb-0
        `}
      >
        <Panel className="p-6">
          {resultsPanel}
        </Panel>
      </div>
    </div>
  );
}
