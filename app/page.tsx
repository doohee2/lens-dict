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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  const handleClearScannedText = () => {
    setGlobalOCRText('');
    setResetCameraSignal(prev => prev + 1);
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
        />
        <DictionarySheet 
          scannedTextBlock={globalOCRText} 
          onClearScannedText={handleClearScannedText} 
        />
      </main>
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
      {isAboutOpen && <AboutModal onClose={() => setIsAboutOpen(false)} />}
    </>
  );
}
