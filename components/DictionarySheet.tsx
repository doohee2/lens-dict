'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/db';

interface Props {
  scannedTextBlock: string;
  onClearScannedText: () => void;
}

export default function DictionarySheet({ scannedTextBlock, onClearScannedText }: Props) {
  const [searchWord, setSearchWord] = useState('');
  const [testResult, setTestResult] = useState<{word: string, definition: string} | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(65);
  const heightRef = useRef(65);

  useEffect(() => {
    const saved = localStorage.getItem('lensDictSheetHeightV2');
    if (saved) {
      const h = Number(saved);
      setSheetHeight(h);
      heightRef.current = h;
    }
  }, []);

  const handleSearch = async (wordToSearch: string) => {
    if (!wordToSearch) return;
    try {
      const result = await db.dictionary.where('word').equals(wordToSearch.toLowerCase()).first() ||
                     await db.dictionary.where('word').equals(wordToSearch).first();
                     
      if (result) {
        let def = result.definition;
        
        const imgRegex = /src=["']([^"']+\.(?:jpg|gif))["']/gi;
        let match;
        const matches: string[] = [];
        
        while ((match = imgRegex.exec(def)) !== null) {
          if (!matches.includes(match[1])) {
            matches.push(match[1]);
          }
        }

        for (const filename of matches) {
          const res = await db.resources.get(filename);
          if (res) {
            def = def.replace(new RegExp(`src=["']${filename}["']`, 'g'), `src="${res.data}"`);
          }
        }

        setTestResult({ word: result.word, definition: def });
      } else {
        setTestResult(null); // Not found, fallback to Naver Dict
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (searchWord) {
      handleSearch(searchWord);
    } else {
      setTestResult(null);
    }
  }, [searchWord]);

  // When a new scan comes in, clear the previous search word to show the text block
  useEffect(() => {
    if (scannedTextBlock) {
      setSearchWord('');
      setIsMinimized(false);
    }
  }, [scannedTextBlock]);

  // When a word is searched manually, pop up the sheet
  useEffect(() => {
    if (searchWord) {
      setIsMinimized(false);
    }
  }, [searchWord]);

  // Dynamic text size logic is now handled inline via cqw (container queries) based on max line length.

  const handlePointerDown = (e: React.PointerEvent) => {
    const startY = e.clientY;
    const startTime = Date.now();
    let dragged = false;

    document.body.style.userSelect = 'none';
    document.body.style.touchAction = 'none';
    
    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (Math.abs(moveEvent.clientY - startY) > 10) dragged = true;
      if (dragged) {
        if (isMinimized) setIsMinimized(false);
        const newHeight = ((window.innerHeight - moveEvent.clientY) / window.innerHeight) * 100;
        if (newHeight >= 15 && newHeight <= 90) {
          setSheetHeight(newHeight);
          heightRef.current = newHeight;
        }
      }
    };

    const handlePointerUp = () => {
      document.body.style.userSelect = '';
      document.body.style.touchAction = '';
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      
      if (!dragged && Date.now() - startTime < 300) {
        setIsMinimized(prev => !prev);
      } else if (dragged) {
        localStorage.setItem('lensDictSheetHeightV2', heightRef.current.toString());
      }
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const renderTextBlock = (text: string) => {
    const lines = text.split('\n');
    const maxLineLength = Math.max(...lines.map(l => l.trim().length), 10);
    // Average char width ~ 0.55em. To fill 80% width: fontSize = 80cqw / (len * 0.55) ≈ 145cqw / len
    const dynamicFontSize = `clamp(14px, calc(145cqw / ${maxLineLength}), 40px)`;
    
    return (
      <div className="bg-surface-container-lowest p-5 md:p-6 rounded-2xl w-full text-left shadow-lg dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] shadow-[0_4px_20px_rgba(0,0,0,0.1)] border border-outline-variant flex-1 flex flex-col overflow-hidden @container">
        <div className="flex justify-between items-center mb-3 pb-3 border-b border-outline-variant shrink-0">
          <h3 className="font-bold text-primary-fixed-dim">OCR 스캔 텍스트 (단어 탭하여 선택)</h3>
          <button 
            onClick={onClearScannedText}
            className="text-on-surface-variant hover:text-error transition-colors"
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
        <div className="flex-1 overflow-auto w-full">
          <div className="flex flex-col justify-start items-start text-left min-w-max pb-4 pr-4">
            {lines.map((line, i) => (
              <p 
                key={i} 
                className="mb-2 font-extrabold tracking-tight text-on-surface leading-snug whitespace-nowrap"
                style={{ fontSize: dynamicFontSize }}
              >
              {line.split(' ').map((word, j) => {
                const cleanWord = word.replace(/[^a-zA-Z0-9-]/g, '');
                return (
                  <span 
                    key={j} 
                    onClick={() => {
                      if (cleanWord) setSearchWord(cleanWord);
                    }}
                    className="cursor-pointer hover:bg-primary-container hover:text-on-primary-container rounded px-1 transition-colors active:bg-primary-fixed"
                  >
                    {word}{' '}
                  </span>
                );
              })}
            </p>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <section 
        className={`absolute md:static bottom-0 left-0 w-full md:w-1/2 bg-surface/95 backdrop-blur-3xl md:border-l border-outline-variant flex flex-col rounded-t-[32px] md:rounded-none shadow-[0_-10px_40px_rgba(0,0,0,0.5)] md:shadow-none z-30 transition-transform duration-300 md:h-full ${(scannedTextBlock || searchWord) ? (isMinimized ? 'translate-y-[calc(100%-2.5rem)]' : 'translate-y-0') : 'translate-y-full'}`}
        style={{ height: `${sheetHeight}vh` }}
      >
        {/* Mobile Puller Handle */}
        <div 
          className="w-full flex justify-center pt-3 pb-3 md:hidden cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={handlePointerDown}
        >
          <div className="w-12 h-1.5 bg-outline-variant rounded-full pointer-events-none"></div>
        </div>
        
        <div className={`flex-1 px-margin-edge py-stack-md flex flex-col gap-container-gap ${scannedTextBlock && !searchWord ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          
          {/* Search Bar */}
          <div className="relative w-full mb-2 shrink-0">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-primary-fixed-dim">search</span>
            </div>
            <input 
              type="text"
              className="block w-full pl-12 pr-24 py-3 bg-surface-container border border-outline-variant rounded-xl text-base font-bold text-on-surface focus:ring-2 focus:ring-primary-fixed-dim focus:border-transparent placeholder-on-surface-variant transition-shadow" 
              placeholder="단어를 선택하거나 직접 입력하세요."
              value={searchWord}
              onChange={(e) => setSearchWord(e.target.value)}
            />
            {searchWord && (
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
                <button 
                  onClick={() => {
                    if ('speechSynthesis' in window) {
                      window.speechSynthesis.cancel();
                      const utterance = new SpeechSynthesisUtterance(searchWord);
                      utterance.lang = 'en-US';
                      window.speechSynthesis.speak(utterance);
                    }
                  }}
                  className="p-1.5 text-primary-fixed-dim hover:bg-primary-container rounded-full transition-colors flex items-center"
                  aria-label="발음 듣기"
                >
                  <span className="material-symbols-outlined text-[22px]">volume_up</span>
                </button>
                <button 
                  onClick={() => setSearchWord('')}
                  className="p-1.5 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors flex items-center"
                  aria-label="지우기"
                >
                  <span className="material-symbols-outlined text-[22px]">close</span>
                </button>
              </div>
            )}
          </div>

          {/* Dictionary Result or OCR Text Block */}
          {scannedTextBlock && !searchWord ? (
            renderTextBlock(scannedTextBlock)
          ) : testResult ? (
            <article className="bg-surface-container-low border border-outline-variant rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden shrink-0 mb-4">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
              
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="font-display-mobile md:font-display-lg text-display-mobile md:text-display-lg text-on-surface tracking-tight">{testResult.word}</h2>
                </div>
              </div>
              
              <div className="h-px w-full bg-outline-variant/50 my-2"></div>
              
              <div 
                className="text-sm md:text-base text-on-surface leading-relaxed whitespace-pre-wrap [&_img]:inline-block [&_img]:align-middle [&_img]:m-0"
                dangerouslySetInnerHTML={{ __html: testResult.definition }}
              ></div>
            </article>
          ) : searchWord ? (
            <div className="bg-surface-container p-6 rounded-2xl text-center shrink-0 mb-4">
              <p className="text-on-surface-variant mb-4">로컬 사전에서 결과를 찾을 수 없습니다.</p>
              <a 
                href={`https://dict.naver.com/search.dict?dicType=en&query=${encodeURIComponent(searchWord)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center h-14 px-6 bg-[#03c75a] text-white font-bold text-[17px] rounded-xl gap-2 hover:bg-[#02b351] transition-colors shadow-md"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16.273 12.845 7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" />
                </svg>
                네이버 사전
              </a>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-on-surface-variant opacity-50 min-h-[200px]">
              <p>단어를 선택하거나 직접 입력하세요</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
