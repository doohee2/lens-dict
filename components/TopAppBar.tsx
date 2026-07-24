import React, { useState, useEffect } from 'react';
import { useNetworkStatus } from '../lib/useNetworkStatus';

interface Props {
  onOpenSettings?: () => void;
  onOpenAbout?: () => void;
}

export default function TopAppBar({ onOpenSettings, onOpenAbout }: Props) {
  const isOnline = useNetworkStatus();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  return (
    <header className="fixed top-0 left-0 w-full flex justify-between items-center px-margin-edge h-touch-min bg-surface/80 backdrop-blur-xl border-b border-outline-variant z-50 pt-safe">
      <div 
        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={onOpenAbout}
      >
        <span className="material-symbols-outlined text-primary-fixed-dim text-[28px]">search</span>
        <h1 className="sr-only">Lens Dictionary</h1>
        <svg viewBox="0 0 320 60" className="h-[28px] w-auto drop-shadow-sm block" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ fontFamily: 'inherit' }}>
          <text x="0" y="45" fontWeight="800" fontSize="42" letterSpacing="-0.02em" className="fill-[#03c75a] transition-colors duration-300">Lens</text>
          <circle cx="16" cy="12" r="5" className="fill-[#03c75a] transition-colors duration-300"/>
          <text x="105" y="45" fontWeight="700" fontSize="42" letterSpacing="-0.02em" className="fill-current text-on-surface transition-colors duration-300">Dictionary</text>
        </svg>
      </div>
      
      <div className="flex items-center gap-3">
        {!isOnline && (
          <div className="w-10 h-10 flex items-center justify-center bg-error-container text-on-error-container rounded-full animate-pulse border border-error/20" aria-label="오프라인 모드">
            <span className="material-symbols-outlined text-lg">cloud_off</span>
          </div>
        )}
        <button onClick={toggleTheme} aria-label="테마 전환" className="w-12 h-12 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors rounded-full">
          <span className="material-symbols-outlined">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
        </button>
        <button onClick={onOpenSettings} aria-label="설정" className="w-12 h-12 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors rounded-full">
          <span className="material-symbols-outlined">settings</span>
        </button>
      </div>
    </header>
  );
}
