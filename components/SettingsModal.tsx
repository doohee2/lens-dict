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
  const [autoFreeDict, setAutoFreeDict] = useState<boolean>(true);
  
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
    const savedAuto = localStorage.getItem('lensDictAutoFreeDict');
    setAutoFreeDict(savedAuto !== 'false');

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

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
        
        <h2 className="text-2xl font-bold text-primary-fixed-dim mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined">database</span>
          사전 데이터 관리
        </h2>
        
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/50 shadow-sm">
            <div className="flex justify-between items-center w-full">
              {dictName ? (
                <p className="font-bold text-primary-fixed-dim text-lg w-full text-center py-2">{dictName}</p>
              ) : (
                <p className="text-on-surface-variant w-full text-center py-2">현재 로컬에 저장된 사전 없음</p>
              )}
            </div>
            <div className="flex justify-between items-center">
              <p className="text-on-surface">총 단어 수</p>
              <div className="flex items-center gap-4">
                <span className="font-bold text-primary-fixed-dim">
                  {dictSize !== null ? `${dictSize.toLocaleString()}개` : '로딩 중...'}
                </span>
                {!!dictName && (
                  <button 
                    onClick={clearDictionary}
                    className="px-3 py-1.5 bg-error-container/20 text-error rounded-xl hover:bg-error-container/40 transition-colors text-sm font-semibold whitespace-nowrap"
                  >
                    사전 삭제
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-surface-container-highest p-4 rounded-xl border border-outline-variant/50">
            <h3 className="font-semibold text-on-surface mb-2">스타딕 형식의 사전 파일(zip)을 지원합니다.</h3>
            <input 
              type="file" 
              accept=".zip" 
              onChange={handleFileUpload} 
              disabled={isParsing}
              className="block w-full text-sm text-on-surface-variant
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-primary-container file:text-on-primary-container
                hover:file:opacity-90 disabled:opacity-50"
            />
          </div>

          {/* PWA 오프라인 보안 캐시 초기화 방어 구역 */}
          <div className="flex items-center justify-between bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/50 shadow-sm">
            <div>
              <p className="font-semibold text-on-surface text-sm flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">security</span>
                PWA 보안 캐시 관리
              </p>
              <p className="text-xs text-on-surface-variant mt-0.5">로그아웃 및 기기 반납 대비 (오프라인 캐시 전수 파기)</p>
            </div>
            <button
              onClick={handlePurgeCache}
              type="button"
              className="px-3.5 py-2 bg-primary-container text-on-primary-container rounded-xl hover:opacity-90 transition-opacity text-xs font-semibold whitespace-nowrap shadow-sm"
            >
              캐시 즉시 파기
            </button>
          </div>

          {/* Free Dictionary API 자동 검색 설정 */}
          <label className="flex items-center justify-between bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/50 shadow-sm cursor-pointer hover:bg-surface-container-low/50 transition-colors">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={autoFreeDict}
                onChange={(e) => {
                  const val = e.target.checked;
                  setAutoFreeDict(val);
                  localStorage.setItem('lensDictAutoFreeDict', val ? 'true' : 'false');
                }}
                className="w-5 h-5 rounded-md text-primary bg-surface-container border-outline-variant focus:ring-primary focus:ring-offset-0 cursor-pointer accent-primary"
              />
              <div>
                <p className="font-semibold text-on-surface text-sm flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">public</span>
                  Free Dictionary API 자동 검색
                </p>
                <p className="text-xs text-on-surface-variant mt-0.5">로컬 사전에 단어가 없을 때 글로벌 오픈 사전을 실시간 자동 로드합니다.</p>
              </div>
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
