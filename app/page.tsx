'use client';

import React, { useState } from 'react';
import TopAppBar from '../components/TopAppBar';
import CameraViewfinder from '../components/CameraViewfinder';
import DictionarySheet from '../components/DictionarySheet';
import BottomNavBar from '../components/BottomNavBar';

export default function Home() {
  const [globalSearchWord, setGlobalSearchWord] = useState('');

  return (
    <>
      <TopAppBar />
      <main className="flex-1 flex flex-col md:flex-row mt-[env(safe-area-inset-top,0px)] pt-[48px] pb-[80px] md:pb-0 h-[100dvh] relative overflow-hidden">
        <CameraViewfinder onTextScanned={(text) => setGlobalSearchWord(text)} />
        <DictionarySheet injectedSearchWord={globalSearchWord} onSearchWordChange={setGlobalSearchWord} />
      </main>
      <BottomNavBar />
    </>
  );
}
