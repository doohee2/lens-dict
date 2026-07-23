'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/db';

interface Props {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: Props) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [dictSize, setDictSize] = useState<number | null>(null);
  const [dictName, setDictName] = useState<string | null>(null);
  
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
          <div className="flex flex-col gap-3 bg-white p-4 rounded-xl border border-outline-variant/30">
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
                  {dictSize !== null ? dictSize.toLocaleString() : '로딩 중...'}
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
