'use client';

import React, { useState } from 'react';
import TopAppBar from '../components/TopAppBar';
import CameraViewfinder from '../components/CameraViewfinder';
import DictionarySheet from '../components/DictionarySheet';
import SettingsModal from '../components/SettingsModal';
import AboutModal from '../components/AboutModal';

export default function Home() {
  const [globalOCRText, setGlobalOCRText] = useState('');
  const [resetCameraSignal, setResetCameraSignal] = useState(0);
  const [focusSearchInputSignal, setFocusSearchInputSignal] = useState(0);
  const [toggleSheetSignal, setToggleSheetSignal] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  const handleClearScannedText = () => {
    setGlobalOCRText('');
    setResetCameraSignal(prev => prev + 1);
  };

  const handleBackgroundTap = () => {
    setToggleSheetSignal(prev => prev + 1);
  };

  const handleStartDictionaryMode = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().length > 0) {
          setGlobalOCRText(text.trim());
          return;
        }
      }
    } catch (e) {
      console.log('Clipboard access denied or empty', e);
    }
    // Fallback or empty clipboard: just focus the search input
    setFocusSearchInputSignal(prev => prev + 1);
  };

  return (
    <>
      <TopAppBar 
        onOpenSettings={() => setIsSettingsOpen(true)} 
        onOpenAbout={() => setIsAboutOpen(true)}
      />
      <main className="flex-1 flex flex-col mt-[env(safe-area-inset-top,0px)] pt-[48px] h-[100dvh] relative overflow-hidden">
        <CameraViewfinder 
          onTextScanned={(text) => setGlobalOCRText(text)} 
          resetCameraSignal={resetCameraSignal} 
          onStartDictionaryMode={handleStartDictionaryMode}
          onBackgroundTap={handleBackgroundTap}
        />
        <DictionarySheet 
          scannedTextBlock={globalOCRText} 
          onClearScannedText={handleClearScannedText} 
          focusSearchInputSignal={focusSearchInputSignal}
          toggleSheetSignal={toggleSheetSignal}
        />
      </main>
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
      {isAboutOpen && <AboutModal onClose={() => setIsAboutOpen(false)} />}
    </>
  );
}
