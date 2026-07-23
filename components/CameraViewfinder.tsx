'use client';

import React, { useRef, useState, useEffect } from 'react';
import Tesseract from 'tesseract.js';

interface Props {
  onTextScanned?: (text: string) => void;
}

export default function CameraViewfinder({ onTextScanned }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const guideRef = useRef<HTMLDivElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setHasPermission(true);
        setIsFrozen(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Camera access denied');
      console.error('Camera Error:', err);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const captureAndScan = async () => {
    if (!videoRef.current || !guideRef.current || !containerRef.current || isFrozen) return;
    
    setIsScanning(true);
    try {
      const video = videoRef.current;
      video.pause(); // Freeze the camera stream
      setIsFrozen(true);
      
      const guide = guideRef.current.getBoundingClientRect();
      const container = containerRef.current.getBoundingClientRect();
      
      // Calculate crop area relative to the video element's displayed size
      const cropX = guide.left - container.left;
      const cropY = guide.top - container.top;
      const cropWidth = guide.width;
      const cropHeight = guide.height;
      
      // Create offscreen canvas matched to video display size
      const canvas = document.createElement('canvas');
      canvas.width = container.width;
      canvas.height = container.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Draw the video frame covering the container
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Extract the cropped imageData
      const imageData = ctx.getImageData(cropX, cropY, cropWidth, cropHeight);
      const data = imageData.data;
      
      // Grayscale & Contrast processing
      for (let i = 0; i < data.length; i += 4) {
        // Grayscale
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        // Increase contrast
        const contrast = 1.5;
        const color = (avg - 128) * contrast + 128;
        const finalColor = Math.min(255, Math.max(0, color));
        
        data[i] = finalColor;     // R
        data[i + 1] = finalColor; // G
        data[i + 2] = finalColor; // B
        // alpha remains unchanged
      }
      
      // Draw processed image back to a new crop canvas
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = cropWidth;
      cropCanvas.height = cropHeight;
      const cropCtx = cropCanvas.getContext('2d');
      if (cropCtx) {
        cropCtx.putImageData(imageData, 0, 0);
        const dataUrl = cropCanvas.toDataURL('image/jpeg', 0.9);
        
        // Tesseract OCR
        const worker = await Tesseract.createWorker('eng');
        const { data: { text } } = await worker.recognize(dataUrl);
        await worker.terminate(); // CRITICAL: Prevent Safari memory crash
        
        // Preserve newlines for full block OCR
        const cleanText = text.trim();
        if (cleanText && onTextScanned) {
          onTextScanned(cleanText);
        }
      }
    } catch (e) {
      console.error('OCR Error:', e);
      // If error, unfreeze automatically
      if (videoRef.current) videoRef.current.play();
      setIsFrozen(false);
    } finally {
      setIsScanning(false);
    }
  };

  const retake = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsFrozen(false);
      if (onTextScanned) onTextScanned('');
    }
  };

  return (
    <section ref={containerRef} className="w-full md:w-1/2 h-[40vh] md:h-full relative bg-surface-container-lowest flex-shrink-0 flex items-center justify-center overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-surface-container-low to-surface-container-highest opacity-50 mix-blend-overlay"></div>
      
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover z-0 ${hasPermission ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Camera Permission Request Overlay */}
      {!hasPermission && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-surface/80 backdrop-blur-sm">
          <p className="text-on-surface mb-4 font-body-lg text-center px-4">
            텍스트를 스캔하려면 카메라 접근 권한이 필요합니다.
          </p>
          <button
            onClick={startCamera}
            className="px-6 py-3 bg-primary-container text-on-primary-container rounded-full font-label-xl shadow-[0_0_15px_rgba(57,255,20,0.3)] hover:scale-105 transition-transform"
          >
            카메라 시작
          </button>
          {errorMsg && <p className="text-error mt-4">{errorMsg}</p>}
        </div>
      )}

      {/* Status Badge */}
      <div className="absolute top-margin-edge right-margin-edge bg-surface-container/80 backdrop-blur-md border border-outline-variant px-3 py-1.5 rounded-full flex items-center gap-2 z-20">
        <div className="w-2.5 h-2.5 rounded-full bg-primary-fixed-dim shadow-[0_0_8px_rgba(42,229,0,0.8)]"></div>
        <span className="font-label-md text-label-md text-on-surface">오프라인 준비 완료</span>
      </div>

      {/* Scan Guide Overlay */}
      <div ref={guideRef} className="relative w-[90%] h-[75%] border-2 border-primary-fixed-dim rounded-2xl flex items-center justify-center z-10 shadow-[0_0_30px_rgba(42,229,0,0.15)] mt-[-10%]">
        {/* Corner accents */}
        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary-container rounded-tl-xl"></div>
        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary-container rounded-tr-xl"></div>
        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary-container rounded-bl-xl"></div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary-container rounded-br-xl"></div>
        
        {/* Scanning animation line */}
        {hasPermission && (
          <div className="absolute top-0 left-0 w-full h-[2px] bg-primary-container opacity-60 shadow-[0_0_10px_#39ff14] animate-scan"></div>
        )}
        
        <span className="font-label-md text-label-md text-primary-fixed-dim/70 bg-surface/50 px-3 py-1 rounded-full backdrop-blur-md">
          박스 안에 텍스트를 맞춰주세요
        </span>
      </div>

      {/* Camera Controls */}
      <div className="absolute bottom-margin-edge left-0 w-full flex justify-center items-center gap-8 z-20">
        <button aria-label="플래시 토글" className="w-12 h-12 flex items-center justify-center rounded-full bg-surface-container border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors">
          <span className="material-symbols-outlined">flashlight_on</span>
        </button>
        
        {/* Shutter Button */}
        {!isFrozen ? (
          <button 
            aria-label="텍스트 스캔" 
            onClick={captureAndScan}
            disabled={isScanning || !hasPermission}
            className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all duration-200 group
              ${isScanning ? 'bg-primary-container/50 border-primary-container scale-95' : 'bg-surface-container-highest border-primary-container shadow-[0_0_20px_rgba(57,255,20,0.2)] hover:scale-95'}
            `}
          >
            <div className={`w-16 h-16 rounded-full transition-colors flex items-center justify-center
              ${isScanning ? 'bg-primary-container animate-pulse' : 'bg-primary-container/20 group-hover:bg-primary-container/40'}
            `}>
              {isScanning ? (
                <span className="material-symbols-outlined text-[32px] text-on-primary-container animate-spin">sync</span>
              ) : (
                <span className="material-symbols-outlined text-[32px] text-primary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>camera</span>
              )}
            </div>
          </button>
        ) : (
          <button 
            aria-label="재촬영" 
            onClick={retake}
            className="w-20 h-20 rounded-full border-4 border-error flex items-center justify-center bg-surface-container-highest shadow-[0_0_20px_rgba(186,26,26,0.2)] hover:scale-95 transition-transform duration-100 group"
          >
            <div className="w-16 h-16 rounded-full bg-error/20 group-hover:bg-error/40 transition-colors flex items-center justify-center">
              <span className="material-symbols-outlined text-[32px] text-error">refresh</span>
            </div>
          </button>
        )}
        
        <button aria-label="이미지 업로드" className="w-12 h-12 flex items-center justify-center rounded-full bg-surface-container border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors">
          <span className="material-symbols-outlined">image</span>
        </button>
      </div>
    </section>
  );
}
