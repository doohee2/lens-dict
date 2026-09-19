'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/db';
import { purgeSecurityCaches } from '../lib/security';

interface Props {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: Props) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [dictSize, setDictSize] = useState<number | null>(null);
  const [dictName, setDictName] = useState<string | null>(null);
  const [fallbackApiType, setFallbackApiType] = useState<'freedict' | 'wikipedia' | 'none'>('freedict');
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [useGoogleOCR, setUseGoogleOCR] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [useGeminiTranslate, setUseGeminiTranslate] = useState(false);
  const [startDictMode, setStartDictMode] = useState(false);
  
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('../lib/dictParser.worker.ts', import.meta.url));
    
    workerRef.current.onmessage = (event) => {
      const { type, progress, message, error } = event.data;
      if (type === 'PROGRESS') {
        setProgress(progress);
        setStatus(message);
      } else if (type === 'COMPLETE') {
        setIsParsing(false);
        setStatus('사전 로드 성공!');
        setProgress(100);
        checkDictSize();
      } else if (type === 'ERROR') {
        setIsParsing(false);
        setStatus(`오류: ${error}`);
      }
    };

    checkDictSize();
    setDictName(localStorage.getItem('lensDictName'));
    
    // Fallback API Type Migration & Initialization
    const savedFallbackType = localStorage.getItem('lensDictFallbackApiType');
    const oldSavedAuto = localStorage.getItem('lensDictAutoFreeDict');
    
    if (savedFallbackType) {
      setFallbackApiType(savedFallbackType as 'freedict' | 'wikipedia' | 'none');
    } else if (oldSavedAuto === 'false') {
      setFallbackApiType('none');
    } else {
      setFallbackApiType('freedict');
    }

    setGoogleApiKey(localStorage.getItem('lensDictGoogleApiKey') || '');
    setUseGoogleOCR(localStorage.getItem('lensDictUseGoogleOCR') === 'true');
    
    setGeminiApiKey(localStorage.getItem('lensDictGeminiApiKey') || '');
    setUseGeminiTranslate(localStorage.getItem('lensDictUseGeminiTranslate') === 'true');
    setStartDictMode(localStorage.getItem('lensDictStartDictMode') === 'true');

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setGoogleApiKey(val);
    localStorage.setItem('lensDictGoogleApiKey', val);
  };

  const checkDictSize = async () => {
    try {
      const count = await db.dictionary.count();
      setDictSize(count);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.zip')) {
      setIsParsing(true);
      setProgress(0);
      setStatus('파싱을 시작합니다...');
      const name = file.name.replace('.zip', '');
      localStorage.setItem('lensDictName', name);
      setDictName(name);
      workerRef.current?.postMessage({ type: 'PARSE_DICT', payload: file });
    } else {
      alert('StarDict 파일이 포함된 .zip 파일을 업로드해주세요.');
    }
  };

  const clearDictionary = async () => {
    if (!window.confirm('정말로 로컬 사전 데이터를 모두 삭제하시겠습니까?')) return;
    
    await db.dictionary.clear();
    await db.resources.clear();
    localStorage.removeItem('lensDictName');
    setDictName(null);
    setDictSize(0);
    setStatus('사전 데이터가 삭제되었습니다.');
    setProgress(0);
  };

  const handlePurgeCache = async () => {
    if (!window.confirm('PWA 오프라인 서비스 캐시 스토리지를 즉시 파기(Purge)하시겠습니까?\n(기존 캐시 스토리지가 파괴되며 다음 다운로드 요청 시 안전하게 재캐싱됩니다.)')) return;
    const res = await purgeSecurityCaches();
    setStatus(res.message);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-container w-full max-w-lg rounded-2xl p-6 shadow-2xl relative border border-outline-variant">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        
        <h2 className="text-xl font-bold text-primary-fixed-dim mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined">database</span>
          사전 데이터 관리
        </h2>
        
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/50 shadow-sm">
            <div className="flex justify-between items-center w-full">
              {dictName ? (
                <p className="font-bold text-primary-fixed-dim text-lg w-full text-center py-2">{dictName}</p>
              ) : (
                <p className="text-on-surface-variant w-full text-center py-2">현재 로컬에 저장된 사전 없음</p>
              )}
            </div>
            {dictName ? (
              <div className="flex justify-between items-center">
                <p className="text-on-surface text-sm">총 단어 수</p>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-primary-fixed-dim">
                    {dictSize !== null ? `${dictSize.toLocaleString()}개` : '로딩 중...'}
                  </span>
                  <button 
                    onClick={clearDictionary}
                    className="px-3 py-1.5 bg-error-container/20 text-error rounded-xl hover:bg-error-container/40 transition-colors text-sm font-semibold whitespace-nowrap"
                  >
                    사전 삭제
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <input 
                  type="file" 
                  accept=".zip" 
                  onChange={handleFileUpload} 
                  disabled={isParsing}
                  className="block w-full text-sm text-on-surface-variant
                    file:mr-3 file:py-1.5 file:px-3
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary-container file:text-on-primary-container
                    hover:file:opacity-90 disabled:opacity-50"
                />
                <p className="text-[11px] text-on-surface-variant whitespace-nowrap shrink-0">스타딕 사전 파일 지원</p>
              </div>
            )}
          </div>

          {/* 구글 OCR API 설정 */}
          <div className="flex flex-col gap-2 bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/50 shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-on-surface text-sm flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">key</span>
                  구글 Cloud Vision API 설정
                </p>
                <input
                  type="checkbox"
                  checked={useGoogleOCR}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setUseGoogleOCR(checked);
                    localStorage.setItem('lensDictUseGoogleOCR', String(checked));
                  }}
                  className="w-5 h-5 rounded-md text-primary bg-surface-container border-outline-variant focus:ring-primary focus:ring-offset-0 cursor-pointer accent-primary"
                />
              </div>
              <p className="text-[11px] text-on-surface-variant mt-0.5 mb-1">고성능 구글 OCR을 사용하기 위한 API 키를 입력하세요. 키는 로컬 기기에만 저장됩니다.</p>
            </div>
            <input
              type="password"
              placeholder="API Key 입력 (선택사항)"
              value={googleApiKey}
              onChange={handleApiKeyChange}
              className="w-full text-sm p-2 rounded-lg bg-surface-container border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary text-on-surface"
            />
          </div>

          {/* 구글 번역 Gemini API 설정 */}
          <div className="flex flex-col gap-2 bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/50 shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-on-surface text-sm flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">translate</span>
                  구글 번역 Gemini API 설정
                </p>
                <input
                  type="checkbox"
                  checked={useGeminiTranslate}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setUseGeminiTranslate(checked);
                    localStorage.setItem('lensDictUseGeminiTranslate', String(checked));
                  }}
                  className="w-5 h-5 rounded-md text-primary bg-surface-container border-outline-variant focus:ring-primary focus:ring-offset-0 cursor-pointer accent-primary"
                />
              </div>
              <p className="text-[11px] text-on-surface-variant mt-0.5 mb-1">문장 번역을 위한 Gemini API 키를 입력하세요. (Gemini-1.5-flash-lite 모델 사용)</p>
            </div>
            <input
              type="password"
              placeholder="Gemini API Key 입력 (선택사항)"
              value={geminiApiKey}
              onChange={(e) => {
                const val = e.target.value;
                setGeminiApiKey(val);
                localStorage.setItem('lensDictGeminiApiKey', val);
              }}
              className="w-full text-sm p-2 rounded-lg bg-surface-container border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary text-on-surface"
            />
          </div>

          {/* 오픈 검색 API 설정 */}
          <div className="flex flex-col gap-2 bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/50 shadow-sm">
            <div>
              <p className="font-semibold text-on-surface text-sm flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">public</span>
                오프라인 검색 폴백 (Fallback API)
              </p>
              <p className="text-[11px] text-on-surface-variant mt-0.5 mb-1">로컬 사전에 단어가 없을 때 사용할 외부 검색 API를 선택합니다.</p>
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-surface-container-low/50 transition-colors">
                <input
                  type="checkbox"
                  checked={fallbackApiType === 'freedict'}
                  onChange={(e) => {
                    const nextType = e.target.checked ? 'freedict' : 'none';
                    setFallbackApiType(nextType);
                    localStorage.setItem('lensDictFallbackApiType', nextType);
                  }}
                  className="w-5 h-5 rounded-md text-primary bg-surface-container border-outline-variant focus:ring-primary focus:ring-offset-0 cursor-pointer accent-primary"
                />
                <div>
                  <p className="font-medium text-sm text-on-surface">Free Dictionary API (오픈 사전)</p>
                  <p className="text-[11px] text-on-surface-variant">글로벌 오픈 영어 사전으로 검색합니다.</p>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-surface-container-low/50 transition-colors">
                <input
                  type="checkbox"
                  checked={fallbackApiType === 'wikipedia'}
                  onChange={(e) => {
                    const nextType = e.target.checked ? 'wikipedia' : 'none';
                    setFallbackApiType(nextType);
                    localStorage.setItem('lensDictFallbackApiType', nextType);
                  }}
                  className="w-5 h-5 rounded-md text-primary bg-surface-container border-outline-variant focus:ring-primary focus:ring-offset-0 cursor-pointer accent-primary"
                />
                <div>
                  <p className="font-medium text-sm text-on-surface">위키피디아 (Wikipedia)</p>
                  <p className="text-[11px] text-on-surface-variant">위키피디아의 백과사전식 요약을 검색합니다.</p>
                </div>
              </label>
            </div>
          </div>

          {/* 시작 모드 설정 */}
          <label className="flex items-center gap-2.5 cursor-pointer bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/50 shadow-sm hover:bg-surface-container-low/50 transition-colors">
            <input
              type="checkbox"
              checked={startDictMode}
              onChange={(e) => {
                const checked = e.target.checked;
                setStartDictMode(checked);
                localStorage.setItem('lensDictStartDictMode', String(checked));
              }}
              className="w-5 h-5 rounded-md text-primary bg-surface-container border-outline-variant focus:ring-primary focus:ring-offset-0 cursor-pointer accent-primary shrink-0"
            />
            <div>
              <p className="font-medium text-sm text-on-surface">영한사전모드로 시작</p>
              <p className="text-[11px] text-on-surface-variant">앱 실행 시 카메라 대신 단어 입력 화면으로 바로 시작합니다.</p>
            </div>
          </label>

          {isParsing && (
            <div className="px-2">
              <div className="w-full bg-surface-container-highest rounded-full h-2.5 mb-2 overflow-hidden">
                <div className="bg-primary-fixed-dim h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
              </div>
              <p className="text-sm text-on-surface-variant font-medium">{status}</p>
            </div>
          )}

          {!isParsing && status && (
            <p className="text-sm text-primary-fixed-dim font-medium px-2">{status}</p>
          )}
        </div>
      </div>
    </div>
  );
}
