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
      
      // Math for object-fit: cover
      const scale = Math.max(container.width / video.videoWidth, container.height / video.videoHeight);
      const scaledVideoWidth = video.videoWidth * scale;
      const scaledVideoHeight = video.videoHeight * scale;
      const offsetX = (container.width - scaledVideoWidth) / 2;
      const offsetY = (container.height - scaledVideoHeight) / 2;
      
      // Create offscreen canvas matched to container display size
      const canvas = document.createElement('canvas');
      canvas.width = container.width;
      canvas.height = container.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Draw the video exactly as object-fit: cover renders it
      ctx.drawImage(video, offsetX, offsetY, scaledVideoWidth, scaledVideoHeight);
      
      // Extract the exact cropped imageData corresponding to the guide box
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
    <section ref={containerRef} className="w-full md:w-1/2 h-full relative bg-surface-container-lowest flex-shrink-0 flex items-center justify-center overflow-hidden">
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



      {/* Scan Guide Overlay */}
      <div ref={guideRef} className="absolute top-[22%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-[25%] max-w-[400px] border-2 border-primary-fixed-dim rounded-2xl flex items-center justify-center z-10 shadow-[0_0_30px_rgba(3,199,90,0.15)]">
        {/* Corner accents */}
        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary-container rounded-tl-xl"></div>
        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary-container rounded-tr-xl"></div>
        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary-container rounded-bl-xl"></div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary-container rounded-br-xl"></div>
        
        {/* Scanning animation line */}
        {hasPermission && (
          <div className="absolute top-0 left-0 w-full h-[2px] bg-primary-container opacity-60 shadow-[0_0_10px_#03C75A] animate-scan"></div>
        )}
      </div>

      {/* Camera Controls */}
      <div className="absolute bottom-margin-edge left-0 w-full flex justify-center items-center gap-8 z-20">
        {/* Shutter Button */}
        {!isFrozen ? (
          <button 
            aria-label="텍스트 스캔" 
            onClick={captureAndScan}
            disabled={isScanning || !hasPermission}
            className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all duration-200 group
              ${isScanning ? 'bg-primary-container/50 border-primary-container scale-95' : 'bg-surface-container-highest border-primary-container shadow-[0_0_20px_rgba(3,199,90,0.2)] hover:scale-95'}
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
      </div>
    </section>
  );
}
