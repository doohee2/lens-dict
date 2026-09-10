'use client';

import React, { useState, useEffect } from 'react';

export interface HistoryItem {
  id: string;
  text: string;
  source: 'ocr' | 'clipboard';
  timestamp: string;
}

interface Props {
  onClose: () => void;
  onSelect: (item: HistoryItem) => void;
}

export default function HistoryModal({ onClose, onSelect }: Props) {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('lensDictHistory');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        setHistory([]);
      }
    }
  }, []);

  const clearHistory = () => {
    if (window.confirm('히스토리를 모두 삭제하시겠습니까?')) {
      setHistory([]);
      localStorage.removeItem('lensDictHistory');
    }
  };

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity">
      <div className="bg-surface-container-lowest w-full max-w-[400px] rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-outline-variant shrink-0">
          <h2 className="text-xl font-bold text-on-surface">스캔 히스토리</h2>
          <button onClick={onClose} className="p-2 text-on-surface-variant hover:bg-surface-variant rounded-full transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {history.length === 0 ? (
            <div className="text-center py-10 text-on-surface-variant/70">
              <span className="material-symbols-outlined text-[48px] mb-2 opacity-50">history</span>
              <p>기록된 히스토리가 없습니다.</p>
            </div>
          ) : (
            history.map((item) => (
              <button 
                key={item.id} 
                onClick={() => { onSelect(item); onClose(); }}
                className="w-full text-left bg-surface-container p-3 rounded-2xl hover:bg-surface-container-high transition-colors flex flex-col gap-1 border border-outline-variant/30 active:scale-[0.98]"
              >
                <div className="flex justify-between items-center w-full">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container uppercase tracking-wider">
                    {item.source === 'clipboard' ? 'CLIPBOARD' : 'OCR SCAN'}
                  </span>
                  <span className="text-xs text-on-surface-variant">{formatDate(item.timestamp)}</span>
                </div>
                <p className="text-sm text-on-surface font-medium line-clamp-2 mt-1 leading-snug break-all text-left">
                  {item.text}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className="p-4 border-t border-outline-variant shrink-0 flex justify-end">
            <button 
              onClick={clearHistory}
              className="px-4 py-2 text-sm font-bold text-error bg-error-container/20 hover:bg-error-container/40 rounded-xl transition-colors"
            >
              전체 삭제
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
