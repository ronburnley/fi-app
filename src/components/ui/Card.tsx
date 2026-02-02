import { useState, type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function Card({
  children,
  className = '',
  title,
  collapsible = false,
  defaultCollapsed = false,
}: CardProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <div
      className={`
        bg-bg-secondary border border-border-subtle rounded-lg
        ${className}
      `}
    >
      {title && (
        <div
          className={`
            flex items-center justify-between px-4 py-3
            ${collapsible ? 'cursor-pointer hover:bg-bg-tertiary/50 transition-colors' : ''}
            ${!isCollapsed && children ? 'border-b border-border-subtle' : ''}
          `}
          onClick={() => collapsible && setIsCollapsed(!isCollapsed)}
        >
          <h3 className="text-sm font-semibold text-text-primary tracking-tight">
            {title}
          </h3>
          {collapsible && (
            <svg
              className={`w-4 h-4 text-text-muted transition-transform duration-200 ${
                isCollapsed ? '' : 'rotate-180'
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          )}
        </div>
      )}
      {(!collapsible || !isCollapsed) && (
        <div className="p-4">{children}</div>
      )}
    </div>
  );
}
