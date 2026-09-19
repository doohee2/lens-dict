'use client';

import React, { useState, useEffect } from 'react';
import TopAppBar from '../components/TopAppBar';
import CameraViewfinder from '../components/CameraViewfinder';
import DictionarySheet from '../components/DictionarySheet';
import SettingsModal from '../components/SettingsModal';
import AboutModal from '../components/AboutModal';
import HistoryModal, { HistoryItem } from '../components/HistoryModal';

export default function Home() {
  const [globalOCRText, setGlobalOCRText] = useState('');
  const [resetCameraSignal, setResetCameraSignal] = useState(0);
  const [isSheetMinimized, setIsSheetMinimized] = useState(true);
  const [autoFocusSignal, setAutoFocusSignal] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [textSource, setTextSource] = useState<'ocr' | 'clipboard'>('ocr');
  const [useGeminiTranslate, setUseGeminiTranslate] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');

  useEffect(() => {
    setUseGeminiTranslate(localStorage.getItem('lensDictUseGeminiTranslate') === 'true');
    setGeminiApiKey(localStorage.getItem('lensDictGeminiApiKey') || '');
  }, [isSettingsOpen]);

  useEffect(() => {
    if (globalOCRText && globalOCRText.trim().length > 0) {
      const saved = localStorage.getItem('lensDictHistory');
      let history: HistoryItem[] = saved ? JSON.parse(saved) : [];
      
      const trimmedText = globalOCRText.trim();
      
      if (history.length === 0 || history[0].text !== trimmedText) {
        history = history.filter(h => h.text !== trimmedText);
        
        const newItem: HistoryItem = {
          id: Date.now().toString(),
          text: trimmedText,
          source: textSource,
          timestamp: new Date().toISOString()
        };
        history.unshift(newItem);
        if (history.length > 30) history = history.slice(0, 30);
        localStorage.setItem('lensDictHistory', JSON.stringify(history));
      }
    }
  }, [globalOCRText, textSource]);

  const handleClearScannedText = () => {
    setGlobalOCRText('');
    setIsSheetMinimized(true);
    setResetCameraSignal(prev => prev + 1);
  };

  const handleBackgroundTap = () => {
    if (globalOCRText) {
      setIsSheetMinimized(prev => !prev);
    }
  };

  const handleStartDictionaryMode = () => {
    // 클립보드 자동 읽기를 제거 — "Paste/Speak" 팝업 없이 즉시 검색창을 열어 바로 타이핑 가능하도록 개선
    // 클립보드 붙여넣기는 바텀시트 내 별도 📋 버튼을 통해 사용자가 원할 때만 수행
    setGlobalOCRText(' ');
    setTextSource('clipboard');
    setTimeout(() => {
      setIsSheetMinimized(false);
      setAutoFocusSignal(prev => prev + 1);
    }, 100);
  };

  return (
    <>
      <TopAppBar 
        onOpenSettings={() => setIsSettingsOpen(true)} 
        onOpenAbout={() => setIsAboutOpen(true)}
      />
      <main className="flex-1 flex flex-col mt-[env(safe-area-inset-top,0px)] pt-[48px] h-[100dvh] relative overflow-hidden">
        <CameraViewfinder 
          onTextScanned={(text) => {
            setGlobalOCRText(text);
            setTextSource('ocr');
            setIsSheetMinimized(false);
          }} 
          resetCameraSignal={resetCameraSignal} 
          onStartDictionaryMode={handleStartDictionaryMode}
          onBackgroundTap={handleBackgroundTap}
        />
        <DictionarySheet 
          scannedTextBlock={globalOCRText} 
          onClearScannedText={handleClearScannedText} 
          onUpdateScannedText={setGlobalOCRText}
          isMinimized={isSheetMinimized}
          onMinimizedChange={setIsSheetMinimized}
          autoFocusSignal={autoFocusSignal}
          textSource={textSource}
          onOpenHistory={() => setIsHistoryOpen(true)}
          useGeminiTranslate={useGeminiTranslate}
          geminiApiKey={geminiApiKey}
        />
      </main>
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
      {isAboutOpen && <AboutModal onClose={() => setIsAboutOpen(false)} />}
      {isHistoryOpen && (
        <HistoryModal 
          onClose={() => setIsHistoryOpen(false)} 
          onSelect={(item) => {
            setGlobalOCRText(item.text);
            setTextSource(item.source);
            setIsSheetMinimized(false);
            setAutoFocusSignal(prev => prev + 1);
          }} 
        />
      )}
    </>
  );
}
