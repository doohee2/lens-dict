import React from 'react';
import { APP_INFO } from '../lib/appInfo';

interface Props {
  onClose: () => void;
}

export default function AboutModal({ onClose }: Props) {
  const handleUpdate = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map(key => caches.delete(key)));
        window.location.reload();
      } catch (err) {
        console.error('Update failed:', err);
        window.location.reload();
      }
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-container w-full max-w-sm rounded-3xl p-6 shadow-2xl relative border border-outline-variant flex flex-col items-center">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface transition-colors"
          aria-label="닫기"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        
        {/* App Icon and Title */}
        <div className="flex flex-col items-center gap-3 mt-4 mb-6">
          <img src="/icon-192x192.png" alt="App Icon" className="w-20 h-20 rounded-2xl shadow-md border border-outline-variant/30" />
          <h2 className="sr-only">{APP_INFO.title}</h2>
          <svg viewBox="0 0 320 60" className="h-[28px] w-auto drop-shadow-sm block" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ fontFamily: 'inherit' }}>
            <text x="0" y="45" fontWeight="800" fontSize="42" letterSpacing="-0.02em" className="fill-[#03c75a] transition-colors duration-300">Lens</text>
            <circle cx="16" cy="12" r="5" className="fill-[#03c75a] transition-colors duration-300"/>
            <text x="105" y="45" fontWeight="700" fontSize="42" letterSpacing="-0.02em" className="fill-current text-on-surface transition-colors duration-300">Dictionary</text>
          </svg>
        </div>
        
        {/* Description */}
        <div className="text-on-surface text-left leading-relaxed mb-6 break-all px-2 text-[15px]">
          {APP_INFO.description}
        </div>
        
        <button
          onClick={handleUpdate}
          className="w-full bg-primary-container text-on-primary-container font-semibold py-3 rounded-xl mb-4 hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">system_update</span>
          최신 버전으로 업데이트 (캐시 초기화)
        </button>
        
        {/* Footer */}
        <div className="w-full text-right text-xs text-on-surface-variant font-medium">
          {APP_INFO.footer}
        </div>
      </div>
    </div>
  );
}
