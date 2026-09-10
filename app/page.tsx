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

  const handleStartDictionaryMode = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().length > 0) {
          setGlobalOCRText(text.trim());
          setTextSource('clipboard');
          setIsSheetMinimized(false);
          return;
        }
      }
    } catch (e) {
      console.log('Clipboard access denied or empty', e);
    }
    
    // [iOS/Safari 트랜지션 타이밍 버그 우회 및 상태 동기화]
    // 클립보드가 비어있어도 동일한 OCR 바텀시트 UI(검색창)를 유지하기 위해 공백을 스캔 결과로 처리합니다.
    // 비동기 팝업 없이 즉각적으로 실행될 경우, React 렌더링 틱과 CSS transition이 경합하여 
    // 바텀시트가 열리지 않고 닫힌(minimized) 상태로 렌더링되는 현상을 방지하기 위해 100ms의 마이크로 딜레이를 줍니다.
    setGlobalOCRText(' ');
    setTextSource('clipboard');
    setTimeout(() => {
      setIsSheetMinimized(false);
      setAutoFocusSignal(prev => prev + 1); // 빈 텍스트 상태로 열릴 때는 즉각적인 검색을 위해 인풋 박스에 포커스
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
          isMinimized={isSheetMinimized}
          onMinimizedChange={setIsSheetMinimized}
          autoFocusSignal={autoFocusSignal}
          textSource={textSource}
          onOpenHistory={() => setIsHistoryOpen(true)}
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
