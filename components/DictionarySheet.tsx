'use client';

import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import SettingsModal from './SettingsModal';

interface Props {
  scannedTextBlock: string;
  onClearScannedText: () => void;
}

export default function DictionarySheet({ scannedTextBlock, onClearScannedText }: Props) {
  const [searchWord, setSearchWord] = useState('');
  const [testResult, setTestResult] = useState<{word: string, definition: string} | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
    }
  }, [scannedTextBlock]);

  const getDynamicTextSizeClass = (textLength: number) => {
    if (textLength < 40) return 'text-xl leading-tight';
    if (textLength < 80) return 'text-lg leading-tight';
    if (textLength < 150) return 'text-base leading-tight';
    if (textLength < 300) return 'text-sm leading-tight';
    return 'text-xs leading-tight';
  };

  const renderTextBlock = (text: string) => {
    const dynamicSizeClass = getDynamicTextSizeClass(text.length);
    
    return (
      <div className="bg-surface-container-lowest p-6 rounded-2xl overflow-y-auto w-full text-left shadow-inner border border-outline-variant/30 flex-1 flex flex-col justify-center">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h3 className="font-bold text-primary-fixed-dim">스캔된 텍스트 (단어를 탭하세요)</h3>
          <button 
            onClick={onClearScannedText}
            className="text-on-surface-variant hover:text-error transition-colors"
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
        <div className="flex-1 flex flex-col justify-center items-start text-left">
          {text.split('\n').map((line, i) => (
            <p key={i} className={`mb-1 font-body-lg text-on-surface ${dynamicSizeClass}`}>
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
    );
  };

  return (
    <>
      <section className={`flex-1 w-full md:w-1/2 bg-surface/95 backdrop-blur-3xl md:border-l border-outline-variant flex flex-col md:rounded-none z-30 relative`}>
        {/* Mobile Puller Handle */}
        <div className="w-full flex justify-center pt-3 pb-2 md:hidden">
          <div className="w-12 h-1.5 bg-outline-variant rounded-full"></div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-margin-edge py-stack-md flex flex-col gap-container-gap">
          
          <div className="flex justify-between mb-2 shrink-0">
            <h2 className="text-xl font-bold text-on-surface">사전</h2>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:text-primary-fixed transition-colors"
            >
              <span className="material-symbols-outlined">settings</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full mb-4 shrink-0">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-primary-fixed-dim">search</span>
            </div>
            <input 
              type="text"
              className="block w-full pl-12 pr-12 py-4 bg-surface-container border border-outline-variant rounded-xl text-body-lg font-body-lg text-on-surface focus:ring-2 focus:ring-primary-fixed-dim focus:border-transparent placeholder-on-surface-variant transition-shadow" 
              placeholder="단어를 입력하거나 스캔하세요..."
              value={searchWord}
              onChange={(e) => setSearchWord(e.target.value)}
            />
            {searchWord && (
              <button 
                onClick={() => setSearchWord('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
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
                className="inline-flex items-center justify-center h-14 px-6 bg-transparent border-2 border-secondary-container text-secondary-container font-label-xl rounded-xl gap-2 hover:bg-secondary-container/10 transition-colors"
              >
                <span className="material-symbols-outlined">language</span>
                네이버 사전 검색
              </a>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-on-surface-variant opacity-50 min-h-[200px]">
              <p>단어를 입력하거나 텍스트를 스캔하세요</p>
            </div>
          )}
        </div>
      </section>

      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
    </>
  );
}
