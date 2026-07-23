import React from 'react';

export default function BottomNavBar() {
  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-margin-edge py-stack-sm pb-safe bg-surface/90 backdrop-blur-2xl border-t border-outline-variant md:hidden rounded-t-xl">
      <button aria-label="Scanner" className="flex flex-col items-center justify-center bg-primary-container text-on-primary-container rounded-full w-12 h-12 shadow-[0_0_15px_rgba(57,255,20,0.4)] transform scale-90 duration-200 ease-out">
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>camera_enhance</span>
      </button>
      <button aria-label="History" className="flex flex-col items-center justify-center text-on-surface-variant w-12 h-12 hover:text-primary-fixed transition-colors">
        <span className="material-symbols-outlined">history</span>
      </button>
      <button aria-label="Saved Words" className="flex flex-col items-center justify-center text-on-surface-variant w-12 h-12 hover:text-primary-fixed transition-colors">
        <span className="material-symbols-outlined">star</span>
      </button>
      <button aria-label="Settings" className="flex flex-col items-center justify-center text-on-surface-variant w-12 h-12 hover:text-primary-fixed transition-colors">
        <span className="material-symbols-outlined">settings</span>
      </button>
    </nav>
  );
}
