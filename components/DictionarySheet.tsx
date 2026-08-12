'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/db';
import { getLemmas } from '../lib/lemmatizer';

interface LemmaInfo {
  originalWord: string;
  lemma: string;
  label: string;
}

interface Props {
  scannedTextBlock: string;
  onClearScannedText: () => void;
  isMinimized: boolean;
  onMinimizedChange: (minimized: boolean) => void;
  autoFocusSignal?: number;
}

interface FreeDictResult {
  word: string;
  phonetic?: string;
  phonetics?: { text?: string; audio?: string }[];
  meanings?: {
    partOfSpeech: string;
    definitions: {
      definition: string;
      example?: string;
    }[];
  }[];
}

interface WikiResult {
  title: string;
  extract: string;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  description?: string;
  content_urls?: {
    desktop: {
      page: string;
    };
  };
}

export default function DictionarySheet({ scannedTextBlock, onClearScannedText, isMinimized, onMinimizedChange, autoFocusSignal }: Props) {
  const [searchWord, setSearchWord] = useState('');
  const [testResult, setTestResult] = useState<{ word: string, definition: string } | null>(null);
  const [fallbackResult, setFallbackResult] = useState<FreeDictResult | null>(null);
  const [fallbackWikiResult, setFallbackWikiResult] = useState<WikiResult | null>(null);
  const [isFallbackLoading, setIsFallbackLoading] = useState(false);
  const [fallbackApiType, setFallbackApiType] = useState<'freedict' | 'wikipedia' | 'none'>('none');
  const [lemmaInfo, setLemmaInfo] = useState<LemmaInfo | null>(null);
  const [sheetHeight, setSheetHeight] = useState(65);
  const heightRef = useRef(65);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('lensDictSheetHeightV2');
    if (saved) {
      const h = Number(saved);
      setSheetHeight(h);
      heightRef.current = h;
    }
  }, []);

  useEffect(() => {
    if (autoFocusSignal && autoFocusSignal > 0) {
      // 0.1초 딜레이를 통해 바텀시트가 올라오는 트랜지션이 시작된 직후 포커스
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 500);
    }
  }, [autoFocusSignal]);

  useEffect(() => {
    const trimmed = searchWord.trim();
    if (!trimmed) {
      setTestResult(null);
      setFallbackResult(null);
      setFallbackWikiResult(null);
      setLemmaInfo(null);
      setIsFallbackLoading(false);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    const controller = new AbortController();
    let isMounted = true;

    const performSearch = async () => {
      try {
        let result = await db.dictionary.where('word').equals(trimmed.toLowerCase()).first() ||
          await db.dictionary.where('word').equals(trimmed).first();

        if (!isMounted) return;

        let currentLemmaInfo: LemmaInfo | null = null;
        const lemmas = getLemmas(trimmed);

        if (!result && lemmas.length > 0) {
          for (const cand of lemmas) {
            const candRes = await db.dictionary.where('word').equals(cand.lemma.toLowerCase()).first() ||
              await db.dictionary.where('word').equals(cand.lemma).first();
            if (candRes) {
              result = candRes;
              currentLemmaInfo = {
                originalWord: trimmed,
                lemma: cand.lemma,
                label: cand.label,
              };
              break;
            }
          }
        }

        if (!isMounted) return;

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

          if (!isMounted) return;
          setTestResult({ word: result.word, definition: def });
          setLemmaInfo(currentLemmaInfo);
          setFallbackResult(null);
          setFallbackWikiResult(null);
          setIsFallbackLoading(false);
        } else {
          setTestResult(null);
          setFallbackResult(null);
          setFallbackWikiResult(null);
          setLemmaInfo(null);

          // Fallback API Type 확인
          let apiType = 'freedict';
          if (typeof localStorage !== 'undefined') {
            const savedType = localStorage.getItem('lensDictFallbackApiType');
            const oldSavedAuto = localStorage.getItem('lensDictAutoFreeDict');
            if (savedType) {
              apiType = savedType;
            } else if (oldSavedAuto === 'false') {
              apiType = 'none';
            }
          }
          setFallbackApiType(apiType as 'freedict' | 'wikipedia' | 'none');

          if (apiType === 'freedict') {
            setIsFallbackLoading(true);
            timer = setTimeout(async () => {
              try {
                let res = await fetch(
                  `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(trimmed.toLowerCase())}`,
                  { signal: controller.signal }
                );
                let fallbackFound = false;
                if (!isMounted) return;

                if (res.ok) {
                  const data: FreeDictResult[] = await res.json();
                  if (Array.isArray(data) && data.length > 0) {
                    setFallbackResult(data[0]);
                    setLemmaInfo(null);
                    fallbackFound = true;
                  }
                }

                if (!fallbackFound && lemmas.length > 0 && isMounted) {
                  for (const cand of lemmas) {
                    try {
                      res = await fetch(
                        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cand.lemma.toLowerCase())}`,
                        { signal: controller.signal }
                      );
                      if (!isMounted) return;
                      if (res.ok) {
                        const data: FreeDictResult[] = await res.json();
                        if (Array.isArray(data) && data.length > 0) {
                          setFallbackResult(data[0]);
                          setLemmaInfo({
                            originalWord: trimmed,
                            lemma: cand.lemma,
                            label: cand.label,
                          });
                          fallbackFound = true;
                          break;
                        }
                      }
                    } catch (err) { }
                  }
                }
              } catch (apiErr: any) {
                if (apiErr?.name !== 'AbortError') {
                  console.log('Fallback Free Dictionary API fetch error or offline:', apiErr);
                }
              } finally {
                if (isMounted) setIsFallbackLoading(false);
              }
            }, 500);
          } else if (apiType === 'wikipedia') {
            setIsFallbackLoading(true);
            timer = setTimeout(async () => {
              try {
                let res = await fetch(
                  `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(trimmed)}`,
                  { signal: controller.signal }
                );
                let fallbackFound = false;
                if (!isMounted) return;

                if (res.ok) {
                  const data: WikiResult = await res.json();
                  if (data.extract) {
                    setFallbackWikiResult(data);
                    setLemmaInfo(null);
                    fallbackFound = true;
                  }
                }

                if (!fallbackFound && lemmas.length > 0 && isMounted) {
                  for (const cand of lemmas) {
                    try {
                      res = await fetch(
                        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cand.lemma)}`,
                        { signal: controller.signal }
                      );
                      if (!isMounted) return;
                      if (res.ok) {
                        const data: WikiResult = await res.json();
                        if (data.extract) {
                          setFallbackWikiResult(data);
                          setLemmaInfo({
                            originalWord: trimmed,
                            lemma: cand.lemma,
                            label: cand.label,
                          });
                          fallbackFound = true;
                          break;
                        }
                      }
                    } catch (err) { }
                  }
                }
              } catch (apiErr: any) {
                if (apiErr?.name !== 'AbortError') {
                  console.log('Fallback Wikipedia API fetch error or offline:', apiErr);
                }
              } finally {
                if (isMounted) setIsFallbackLoading(false);
              }
            }, 500);
          } else {
            setIsFallbackLoading(false);
          }
        }
      } catch (e) {
        console.error(e);
        if (isMounted) setIsFallbackLoading(false);
      }
    };

    performSearch();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
      controller.abort();
    };
  }, [searchWord]);

  useEffect(() => {
    if (searchWord) {
      onMinimizedChange(false);
    }
  }, [searchWord]);

  const handlePointerDown = (e: React.PointerEvent) => {
    const startY = e.clientY;
    const startHeight = heightRef.current;
    const startTime = Date.now();
    let dragged = false;

    document.body.style.userSelect = 'none';
    document.body.style.touchAction = 'none';

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (Math.abs(moveEvent.clientY - startY) > 15) dragged = true;
      if (dragged) {
        if (isMinimized) onMinimizedChange(false);
        const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const deltaY = startY - moveEvent.clientY;
        const deltaHeight = (deltaY / vh) * 100;
        const newHeight = startHeight + deltaHeight;
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
        onMinimizedChange(!isMinimized);
      } else if (dragged) {
        localStorage.setItem('lensDictSheetHeightV2', heightRef.current.toString());
      }
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const renderTextBlock = (text: string) => {
    // 긴 텍스트(클립보드 등)가 한 줄로 들어올 경우, 가독성 및 폰트 크기 확보를 위해 적절히 줄바꿈 처리
    let processedLines: string[] = [];
    text.split('\n').forEach(line => {
      if (line.trim().length > 40) {
        const words = line.trim().split(/\s+/);
        let currentChunk: string[] = [];
        for (let i = 0; i < words.length; i++) {
          currentChunk.push(words[i]);
          // 청크의 글자 수가 35자를 넘어가면 줄바꿈 (단어 단위 유지)
          if (currentChunk.join(' ').length > 35 && i < words.length - 1) {
            processedLines.push(currentChunk.join(' '));
            currentChunk = [];
          }
        }
        if (currentChunk.length > 0) {
          processedLines.push(currentChunk.join(' '));
        }
      } else {
        processedLines.push(line);
      }
    });

    const lines = processedLines;
    const maxLineLength = Math.max(...lines.map(l => l.trim().length), 10);
    const dynamicFontSize = `clamp(14px, calc(164cqw / ${maxLineLength}), 40px)`;

    return (
      <div className="bg-surface-container-lowest p-5 md:p-6 rounded-2xl w-full text-left shadow-lg dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] shadow-[0_4px_20px_rgba(0,0,0,0.1)] border border-outline-variant flex-1 flex flex-col overflow-hidden @container">
        <div className="flex justify-between items-center mb-3 pb-3 border-b border-outline-variant shrink-0">
          <h3 className="font-bold text-primary-fixed-dim">OCR 스캔 텍스트 (단어 탭하여 선택)</h3>
          <button
            onClick={() => {
              onClearScannedText();
              onMinimizedChange(true);
            }}
            title="스캔 텍스트 삭제 및 카메라 즉시 촬영 모드로 전환"
            className="text-on-surface-variant hover:text-error transition-colors p-1 -mr-1"
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
        <div className="flex-1 overflow-auto w-full">
          <div className="flex flex-col justify-start items-start text-left min-w-max pb-4 pr-4">
            {lines.map((line, i) => (
              <p
                key={i}
                className="mb-2 font-[family-name:RIDIBatang] font-extrabold tracking-tight text-on-surface leading-snug whitespace-nowrap"
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
        className={`absolute bottom-0 left-0 w-full bg-surface/95 backdrop-blur-3xl border-outline-variant flex flex-col rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-30 transition-transform duration-300 ${(scannedTextBlock || searchWord) ? (isMinimized ? 'translate-y-[calc(100%-2.5rem)]' : 'translate-y-0') : 'translate-y-full'}`}
        style={{ height: `${sheetHeight}vh` }}
      >
        {/* Mobile Puller Handle */}
        <div
          className="w-full flex justify-center pt-3 pb-3 cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={handlePointerDown}
        >
          <svg width="24" height="12" viewBox="0 0 24 12" className="text-outline-variant fill-current pointer-events-none">
            {isMinimized ? (
              <polygon points="12,0 24,12 0,12" />
            ) : (
              <polygon points="0,0 24,0 12,12" />
            )}
          </svg>
        </div>

        <div className={`flex-1 px-margin-edge py-stack-md flex flex-col gap-container-gap ${scannedTextBlock && !searchWord ? 'overflow-hidden' : 'overflow-y-auto'}`}>

          {/* Search Bar */}
          <div className="relative w-full mb-2 shrink-0">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-primary-fixed-dim">search</span>
            </div>
            <input
              ref={searchInputRef}
              type="text"
              className="block w-full pl-12 pr-24 py-3 bg-surface-container border border-outline-variant rounded-xl text-base font-bold text-on-surface focus:ring-2 focus:ring-primary-fixed-dim focus:border-transparent placeholder-on-surface-variant transition-shadow"
              placeholder="단어를 선택하거나 입력하세요."
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
            <article className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden shrink-0 mb-4 shadow-sm">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>

              {lemmaInfo && (
                <div className="bg-indigo-50 border border-indigo-200 text-indigo-950 px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 shadow-2xs">
                  <span className="material-symbols-outlined text-[18px] text-indigo-600 shrink-0">auto_fix</span>
                  <span className="leading-snug">
                    <strong className="font-semibold text-indigo-900">'{lemmaInfo.originalWord}'</strong>의 {lemmaInfo.label}인 <strong className="text-indigo-700 font-bold underline decoration-indigo-300 underline-offset-2">'{lemmaInfo.lemma}'</strong>(으)로 스마트 검색된 결과입니다.
                  </span>
                </div>
              )}

              <div className="flex justify-between items-start">
                <div>
                  <h2 className="font-display-mobile text-display-mobile text-gray-900 tracking-tight">{testResult.word}</h2>
                </div>
              </div>

              <div className="h-px w-full bg-gray-200 my-2"></div>

              <div
                className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap [&_img]:inline-block [&_img]:align-middle [&_img]:m-0"
                dangerouslySetInnerHTML={{ __html: testResult.definition }}
              ></div>

              <div className="mt-6 flex justify-center sm:justify-start">
                <a
                  href={`https://dict.naver.com/search.dict?dicType=en&query=${encodeURIComponent(searchWord)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center h-12 px-6 bg-[#03c75a] text-white font-bold text-[15px] rounded-xl gap-2 hover:bg-[#02b351] transition-colors shadow-sm w-full sm:w-auto"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16.273 12.845 7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" />
                  </svg>
                  네이버 사전에서 찾기
                </a>
              </div>
            </article>
          ) : searchWord ? (
            <div className="flex flex-col gap-4 shrink-0 mb-4">
              {/* 상단: 네이버 사전 유지 및 안내 */}
              <div className="bg-surface-container p-6 rounded-2xl text-center shadow-xs">
                <p className="text-on-surface-variant text-sm mb-4">로컬 사전에서 결과를 찾을 수 없어 네이버 사전 및 글로벌 실시간 오픈 사전을 지원합니다.</p>
                <a
                  href={`https://dict.naver.com/search.dict?dicType=en&query=${encodeURIComponent(searchWord)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center h-14 px-6 bg-[#03c75a] text-white font-bold text-[17px] rounded-xl gap-2 hover:bg-[#02b351] transition-colors shadow-md w-full sm:w-auto"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16.273 12.845 7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" />
                  </svg>
                  네이버 사전에서 전체 뜻 보기
                </a>
              </div>

              {/* 하단: 대안 1 (폴백 API 실시간 렌더링 - 설정 활성 시에만 로드) */}
              {fallbackApiType !== 'none' && (
                isFallbackLoading ? (
                  <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-3 shadow-sm">
                    <span className="material-symbols-outlined text-[32px] text-primary animate-spin">sync</span>
                    <p className="text-sm text-gray-600 font-medium">
                      {fallbackApiType === 'wikipedia' ? '위키피디아 백과사전에서 정보를 가져오고 있습니다...' : '글로벌 오픈 영어 사전(Free Dictionary API)에서 의미를 가져오고 있습니다...'}
                    </p>
                  </div>
                ) : fallbackResult ? (
                  <article className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden shadow-sm text-left">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>

                    {lemmaInfo && (
                      <div className="bg-indigo-50 border border-indigo-200 text-indigo-950 px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 shadow-2xs mb-1">
                        <span className="material-symbols-outlined text-[18px] text-indigo-600 shrink-0">auto_fix</span>
                        <span className="leading-snug">
                          <strong className="font-semibold text-indigo-900">'{lemmaInfo.originalWord}'</strong>의 {lemmaInfo.label}인 <strong className="text-indigo-700 font-bold underline decoration-indigo-300 underline-offset-2">'{lemmaInfo.lemma}'</strong>(으)로 스마트 검색된 결과입니다.
                        </span>
                      </div>
                    )}

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-900 rounded-md uppercase tracking-wider">
                          Free Dict Open API
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-baseline gap-3">
                          <h2 className="font-display-mobile text-display-mobile text-gray-900 tracking-tight capitalize">
                            {fallbackResult.word}
                          </h2>
                          {fallbackResult.phonetic || fallbackResult.phonetics?.find(p => p.text)?.text ? (
                            <span className="text-sm font-medium text-gray-500">
                              {fallbackResult.phonetic || fallbackResult.phonetics?.find(p => p.text)?.text}
                            </span>
                          ) : null}
                        </div>
                        {fallbackResult.phonetics?.find(p => p.audio && p.audio.length > 0) && (
                          <button
                            type="button"
                            onClick={() => {
                              const audioUrl = fallbackResult.phonetics?.find(p => p.audio && p.audio.length > 0)?.audio;
                              if (audioUrl) new Audio(audioUrl).play();
                            }}
                            className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shadow-xs hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                            title="발음 듣기"
                          >
                            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>volume_up</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="h-px w-full bg-gray-200 my-1"></div>

                    <div className="flex flex-col gap-5">
                      {fallbackResult.meanings?.slice(0, 4).map((m, idx) => (
                        <div key={idx} className="flex flex-col gap-2">
                          <div className="flex">
                            <span className="px-2.5 py-1 text-xs font-semibold bg-gray-100 text-gray-700 rounded-lg capitalize border border-gray-200/60">
                              {m.partOfSpeech}
                            </span>
                          </div>
                          <ul className="list-disc pl-5 flex flex-col gap-2.5 text-sm text-gray-800">
                            {m.definitions?.slice(0, 3).map((d, dIdx) => (
                              <li key={dIdx} className="leading-relaxed">
                                <span>{d.definition}</span>
                                {d.example && (
                                  <p className="mt-1 text-xs italic text-gray-500 bg-gray-50 p-2 rounded-md border-l-2 border-gray-300">
                                    "{d.example}"
                                  </p>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </article>
                ) : fallbackWikiResult ? (
                  <article className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden shadow-sm text-left">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
                    
                    {lemmaInfo && (
                      <div className="bg-indigo-50 border border-indigo-200 text-indigo-950 px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 shadow-2xs mb-1">
                        <span className="material-symbols-outlined text-[18px] text-indigo-600 shrink-0">auto_fix</span>
                        <span className="leading-snug">
                          <strong className="font-semibold text-indigo-900">'{lemmaInfo.originalWord}'</strong>의 {lemmaInfo.label}인 <strong className="text-indigo-700 font-bold underline decoration-indigo-300 underline-offset-2">'{lemmaInfo.lemma}'</strong>(으)로 스마트 검색된 결과입니다.
                        </span>
                      </div>
                    )}

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[11px] font-bold bg-blue-100 text-blue-900 rounded-md uppercase tracking-wider">
                          Wikipedia
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <h2 className="font-display-mobile text-display-mobile text-gray-900 tracking-tight capitalize">
                          {fallbackWikiResult.title}
                        </h2>
                      </div>
                      {fallbackWikiResult.description && (
                        <p className="text-sm text-gray-500 italic mt-0.5">{fallbackWikiResult.description}</p>
                      )}
                    </div>

                    <div className="h-px w-full bg-gray-200 my-1"></div>

                    <div className="flex flex-col gap-3">
                      {fallbackWikiResult.thumbnail && (
                        <img 
                          src={fallbackWikiResult.thumbnail.source} 
                          alt={fallbackWikiResult.title}
                          className="w-full max-w-[200px] rounded-lg shadow-sm self-center object-cover"
                        />
                      )}
                      <p className="text-sm text-gray-800 leading-relaxed text-justify">
                        {fallbackWikiResult.extract}
                      </p>
                    </div>

                    {fallbackWikiResult.content_urls?.desktop?.page && (
                      <a
                        href={fallbackWikiResult.content_urls.desktop.page}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 text-blue-600 text-sm font-medium hover:underline inline-flex items-center gap-1 self-start"
                      >
                        위키백과에서 전체 읽기
                        <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                      </a>
                    )}
                  </article>
                ) : (
                  <div className="bg-white/60 border border-gray-200 rounded-2xl p-6 text-center text-gray-500 text-sm">
                    <p>글로벌 오픈 사전에서도 결과를 찾지 못했거나 오프라인 상태입니다.</p>
                    <p className="mt-1 text-xs text-gray-400">상단의 [네이버 사전에서 전체 뜻 보기] 버튼을 탭하여 네이버 웹에서 검색해보세요.</p>
                  </div>
                )
              )}
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
