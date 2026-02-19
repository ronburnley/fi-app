interface FooterProps {
  onPrivacyClick: () => void;
}

export function Footer({ onPrivacyClick }: FooterProps) {
  return (
    <footer className="py-3 px-6 border-t border-border-subtle/50">
      <div className="flex items-center justify-center">
        <button
          onClick={onPrivacyClick}
          className="text-xs text-text-muted/60 hover:text-text-muted transition-colors"
        >
          Privacy & Security
        </button>
      </div>
    </footer>
  );
}
