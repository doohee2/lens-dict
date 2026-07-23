import React from 'react';

interface Props {
  onOpenSettings?: () => void;
}

export default function TopAppBar({ onOpenSettings }: Props) {
  return (
    <header className="fixed top-0 left-0 w-full flex justify-between items-center px-margin-edge h-touch-min bg-surface/80 backdrop-blur-xl border-b border-outline-variant z-50 pt-safe">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary-fixed-dim text-[28px]">search</span>
        <h1 className="text-headline-md font-headline-md font-extrabold text-primary-fixed-dim tracking-tight">Lens Dictionary</h1>
      </div>
      <button onClick={onOpenSettings} aria-label="설정" className="w-12 h-12 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors rounded-full">
        <span className="material-symbols-outlined">settings</span>
      </button>
    </header>
  );
}
