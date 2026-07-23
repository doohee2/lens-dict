import React from 'react';

export default function TopAppBar() {
  return (
    <header className="fixed top-0 left-0 w-full flex justify-between items-center px-margin-edge h-touch-min bg-surface/80 backdrop-blur-xl border-b border-outline-variant z-50 pt-safe">
      <button aria-label="메뉴" className="w-12 h-12 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors rounded-full">
        <span className="material-symbols-outlined">menu_book</span>
      </button>
      <h1 className="text-headline-md font-headline-md font-extrabold text-primary-fixed-dim tracking-tight">Lens Dictionary</h1>
      <button aria-label="정보" className="w-12 h-12 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors rounded-full">
        <span className="material-symbols-outlined">info</span>
      </button>
    </header>
  );
}
