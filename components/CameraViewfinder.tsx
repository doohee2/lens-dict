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
  const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null);

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
        setCroppedImageUrl(null);
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
      
      // Save original color crop for image download feature before grayscale processing
      const colorCropCanvas = document.createElement('canvas');
      colorCropCanvas.width = cropWidth;
      colorCropCanvas.height = cropHeight;
      const colorCropCtx = colorCropCanvas.getContext('2d');
      if (colorCropCtx) {
        colorCropCtx.putImageData(imageData, 0, 0);
        setCroppedImageUrl(colorCropCanvas.toDataURL('image/png'));
      }
      
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
        await worker.setParameters({
          tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 \'\"-.,:;!?()[]{}@#$%&*+=/<>'
        });
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
      setCroppedImageUrl(null);
      if (onTextScanned) onTextScanned('');
    }
  };

  const saveImage = async () => {
    if (!croppedImageUrl) return;
    
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const filename = `lens_scan_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.png`;

    try {
      // Convert Data URL to Blob for Web Share API (enables native Save Image on iOS/Android)
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();
      const file = new File([blob], filename, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: '스캔 영역 이미지 저장',
        });
        return;
      }
    } catch (err: any) {
      // If user cancels system share dialog, ignore error
      if (err?.name === 'AbortError') return;
      console.log('Share API not available or failed, falling back to download:', err);
    }

    // Direct download fallback for desktop / non-share environments
    const link = document.createElement('a');
    link.href = croppedImageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section ref={containerRef} className="w-full h-full relative bg-surface-container-lowest flex-shrink-0 flex items-center justify-center overflow-hidden">
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
      <div ref={guideRef} className={`absolute top-[20%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-[24%] max-w-[400px] border-2 rounded-2xl flex items-center justify-center z-10 transition-colors duration-300 ${isFrozen ? 'border-error shadow-[0_0_0_9999px_rgba(0,0,0,0.65),0_0_20px_rgba(186,26,26,0.5)]' : 'border-primary-fixed-dim shadow-[0_0_30px_rgba(3,199,90,0.15)]'}`}>
        {/* Corner accents */}
        <div className={`absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 rounded-tl-xl transition-colors duration-300 ${isFrozen ? 'border-error' : 'border-primary-container'}`}></div>
        <div className={`absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 rounded-tr-xl transition-colors duration-300 ${isFrozen ? 'border-error' : 'border-primary-container'}`}></div>
        <div className={`absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 rounded-bl-xl transition-colors duration-300 ${isFrozen ? 'border-error' : 'border-primary-container'}`}></div>
        <div className={`absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 rounded-br-xl transition-colors duration-300 ${isFrozen ? 'border-error' : 'border-primary-container'}`}></div>
        
        {/* Scanning animation line */}
        {hasPermission && !isFrozen && (
          <div className="absolute top-0 left-0 w-full h-[2px] bg-primary-container opacity-60 shadow-[0_0_10px_#03C75A] animate-scan"></div>
        )}
      </div>

      {/* Camera Controls */}
      <div className="absolute top-[60%] -translate-y-1/2 left-0 w-full flex justify-center items-center gap-8 z-20">
        {/* Shutter Button */}
        {!isFrozen ? (
          <button 
            aria-label="텍스트 스캔" 
            onClick={captureAndScan}
            disabled={isScanning || !hasPermission}
            className={`w-28 h-28 md:w-32 md:h-32 rounded-full border-[6px] flex items-center justify-center transition-all duration-200 group
              ${isScanning ? 'bg-primary-container/50 border-primary-container scale-95' : 'bg-surface-container-highest border-primary-container shadow-[0_0_30px_rgba(3,199,90,0.3)] hover:scale-95'}
            `}
          >
            <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full transition-colors flex items-center justify-center
              ${isScanning ? 'bg-primary-container animate-pulse' : 'bg-primary-container/20 group-hover:bg-primary-container/40'}
            `}>
              {isScanning ? (
                <span className="material-symbols-outlined text-[48px] text-on-primary-container animate-spin">sync</span>
              ) : (
                <span className="material-symbols-outlined text-[48px] text-primary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>camera</span>
              )}
            </div>
          </button>
        ) : (
          <div className="flex items-center justify-center gap-6 md:gap-10 w-full max-w-[420px] px-4">
            {/* Invisible Left Spacer to keep center Retake button perfectly aligned */}
            <div className="w-16 h-16 md:w-20 md:h-20 pointer-events-none invisible flex-shrink-0" />

            {/* Retake Button (Center) */}
            <button 
              aria-label="재촬영" 
              onClick={retake}
              className="w-28 h-28 md:w-32 md:h-32 rounded-full border-[6px] border-error flex items-center justify-center bg-surface-container-highest shadow-[0_0_30px_rgba(186,26,26,0.3)] hover:scale-95 transition-transform duration-100 group flex-shrink-0"
            >
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-error/20 group-hover:bg-error/40 transition-colors flex items-center justify-center">
                <span className="material-symbols-outlined text-[48px] text-error">refresh</span>
              </div>
            </button>

            {/* Save Image Button (Right) */}
            <button 
              aria-label="스캔 영역 이미지 저장" 
              onClick={saveImage}
              disabled={!croppedImageUrl}
              className="w-16 h-16 md:w-20 md:h-20 rounded-full border-[4px] border-primary-container bg-surface-container-highest flex items-center justify-center shadow-[0_0_20px_rgba(3,199,90,0.25)] hover:scale-105 active:scale-95 transition-all duration-100 group flex-shrink-0 disabled:opacity-40 disabled:pointer-events-none"
              title="녹색 뷰파인더 영역 이미지 저장"
            >
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary-container/20 group-hover:bg-primary-container/40 transition-colors flex items-center justify-center">
                <span className="material-symbols-outlined text-[32px] text-primary-fixed">download</span>
              </div>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
