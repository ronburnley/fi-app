import type { ReactNode } from 'react';

interface PanelProps {
  children: ReactNode;
  className?: string;
}

export function Panel({ children, className = '' }: PanelProps) {
  return (
    <div
      className={`
        h-full overflow-y-auto
        ${className}
      `}
    >
      {children}
    </div>
  );
}
