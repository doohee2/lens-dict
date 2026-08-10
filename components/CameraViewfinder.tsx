'use client';

import React, { useRef, useState, useEffect } from 'react';
import Tesseract from 'tesseract.js';

/**
 * [동기식 Blob 변환]
 * 사용자 터치 제스처 타이머(Transient Activation)가 만료되기 전에 동기적으로 Base64를 Blob으로 변환합니다.
 */
function dataURLtoBlob(dataUrl: string): Blob | null {
  try {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) return null;
    const mime = mimeMatch[1];
    const bstr = window.atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (e) {
    console.error('DataURL to Blob conversion failed:', e);
    return null;
  }
}

interface Props {
  onTextScanned?: (text: string) => void;
  resetCameraSignal?: number;
  onStartDictionaryMode?: () => void;
  onBackgroundTap?: () => void;
}

export default function CameraViewfinder({ onTextScanned, resetCameraSignal, onStartDictionaryMode, onBackgroundTap }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const guideRef = useRef<HTMLDivElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null);
  const [fullFrameImageUrl, setFullFrameImageUrl] = useState<string | null>(null);
  const [saveModalData, setSaveModalData] = useState<{ url: string; title: string; subtitle: string } | null>(null);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number; key: number } | null>(null);
  const focusTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef<boolean>(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          // 4K UHD 화질을 최우선 요청하고 미지원 시 FHD로 폴백
          width: { ideal: 3840, min: 1920 },
          height: { ideal: 2160, min: 1080 },
        }
      });

      // Apply macro/close-up focus settings for near-distance text scanning
      const track = stream.getVideoTracks()[0];
      if (track) {
        try {
          const capabilities = track.getCapabilities?.() as any;
          const advancedConstraints: any = {};

          // Set continuous autofocus for responsive focus tracking
          if (capabilities?.focusMode?.includes('continuous')) {
            advancedConstraints.focusMode = 'continuous';
          }

          // Set minimum focus distance for macro (close-up) mode
          if (capabilities?.focusDistance) {
            advancedConstraints.focusDistance = capabilities.focusDistance.min;
          }

          if (Object.keys(advancedConstraints).length > 0) {
            await track.applyConstraints({ advanced: [advancedConstraints] });
          }
        } catch (focusErr) {
          // Silently ignore — focus constraints are best-effort
          console.log('Macro focus not supported on this device:', focusErr);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setHasPermission(true);
        setIsFrozen(false);
        setCroppedImageUrl(null);
        setFullFrameImageUrl(null);
        setSaveModalData(null);
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
      
      // [#1] Map crop coordinates to native video resolution for maximum OCR quality
      const nativeCropX = Math.max(0, Math.round((cropX - offsetX) / scale));
      const nativeCropY = Math.max(0, Math.round((cropY - offsetY) / scale));
      const nativeCropW = Math.min(Math.round(cropWidth / scale), video.videoWidth - nativeCropX);
      const nativeCropH = Math.min(Math.round(cropHeight / scale), video.videoHeight - nativeCropY);
      
      // (1) Draw full video frame at native resolution (4K / FHD) and store for Full-Frame saving
      const fullCanvas = document.createElement('canvas');
      fullCanvas.width = video.videoWidth;
      fullCanvas.height = video.videoHeight;
      const fullCtx = fullCanvas.getContext('2d');
      if (!fullCtx) return;
      fullCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      setFullFrameImageUrl(fullCanvas.toDataURL('image/png'));

      // (2) Extract original color crop at Native Resolution for Crop image saving
      const rawImageData = fullCtx.getImageData(nativeCropX, nativeCropY, nativeCropW, nativeCropH);
      const colorCropCanvas = document.createElement('canvas');
      colorCropCanvas.width = nativeCropW;
      colorCropCanvas.height = nativeCropH;
      const colorCropCtx = colorCropCanvas.getContext('2d');
      if (!colorCropCtx) return;
      colorCropCtx.putImageData(rawImageData, 0, 0);
      setCroppedImageUrl(colorCropCanvas.toDataURL('image/png'));

      // (3) OCR 전용 가로 1600px 스케일링 (1600px 초과 시 다운스케일링, 미만 시 1600px 업스케일링)
      const targetOcrWidth = 1600;
      const scaleRatio = targetOcrWidth / nativeCropW;
      const targetOcrHeight = Math.max(1, Math.round(nativeCropH * scaleRatio));

      const ocrCanvas = document.createElement('canvas');
      ocrCanvas.width = targetOcrWidth;
      ocrCanvas.height = targetOcrHeight;
      const ocrCtx = ocrCanvas.getContext('2d');
      if (!ocrCtx) return;

      // 안티에이징 고품질 스무딩을 적용하여 ISO 모래알 노이즈 감쇄 및 텍스트 외곽선 선명화
      ocrCtx.imageSmoothingEnabled = true;
      ocrCtx.imageSmoothingQuality = 'high';
      ocrCtx.drawImage(colorCropCanvas, 0, 0, targetOcrWidth, targetOcrHeight);

      const ocrImageData = ocrCtx.getImageData(0, 0, targetOcrWidth, targetOcrHeight);
      const data = ocrImageData.data;

      // [#3] Weighted grayscale (ITU-R BT.601) + build histogram for Otsu on scaled OCR buffer
      const pixelCount = data.length / 4;
      const grayValues = new Uint8Array(pixelCount);
      const histogram = new Array(256).fill(0);
      for (let i = 0; i < data.length; i += 4) {
        const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        grayValues[i / 4] = gray;
        histogram[gray]++;
      }

      // [#2] Otsu's binarization — find optimal black/white threshold
      let sum = 0;
      for (let i = 0; i < 256; i++) sum += i * histogram[i];
      let sumB = 0;
      let wB = 0;
      let maxVariance = 0;
      let threshold = 128;
      for (let t = 0; t < 256; t++) {
        wB += histogram[t];
        if (wB === 0) continue;
        const wF = pixelCount - wB;
        if (wF === 0) break;
        sumB += t * histogram[t];
        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;
        const variance = wB * wF * (mB - mF) * (mB - mF);
        if (variance > maxVariance) {
          maxVariance = variance;
          threshold = t;
        }
      }

      // Apply binarization — pure black or pure white
      for (let i = 0; i < data.length; i += 4) {
        const bw = grayValues[i / 4] > threshold ? 255 : 0;
        data[i] = bw;
        data[i + 1] = bw;
        data[i + 2] = bw;
      }

      // Draw processed image back to OCR canvas
      ocrCtx.putImageData(ocrImageData, 0, 0);
      // [#4] PNG lossless — no JPEG compression artifacts on letter edges
      const dataUrl = ocrCanvas.toDataURL('image/png');
      
      // Tesseract OCR — 영단어 검색에 최적화된 문자 허용 목록
      // 불필요한 특수문자(괄호, 수학기호 등)를 제거하여 후보 문자군을 축소 → 오인식 확률 감소
      const worker = await Tesseract.createWorker('eng');
      await worker.setParameters({
        tessedit_char_whitelist: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '-.,",
        // [#6] PSM 6: Assume a single uniform block of text
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
        // 단어 간 공백을 원본 그대로 보존 → 터치 검색 시 단어 경계 정확도 향상
        preserve_interword_spaces: '1',
      });
      const { data: { text } } = await worker.recognize(dataUrl);
      await worker.terminate(); // CRITICAL: Prevent Safari memory crash
      
      // Preserve newlines for full block OCR
      const cleanText = text.trim();
      if (cleanText && onTextScanned) {
        onTextScanned(cleanText);
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
      videoRef.current.play().catch(() => {});
    }
    setIsFrozen(false);
    setCroppedImageUrl(null);
    setFullFrameImageUrl(null);
    setSaveModalData(null);
    if (onTextScanned) onTextScanned('');
  };

  useEffect(() => {
    if (resetCameraSignal && resetCameraSignal > 0) {
      retake();
    }
  }, [resetCameraSignal]);

  const saveImage = async (isFullFrame: boolean) => {
    const targetUrl = isFullFrame ? fullFrameImageUrl : croppedImageUrl;
    if (!targetUrl) return;
    
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const prefix = isFullFrame ? 'lens_full_4k_' : 'lens_crop_';
    const filename = `${prefix}${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.png`;
    const titleText = isFullFrame ? '카메라 원본(전체 화면) 사진' : '스캔 영역(크롭) 사진';
    const subtitleText = isFullFrame
      ? '카메라에서 송출된 Native 고해상도 전체 원본 프레임입니다.'
      : '뷰파인더 내부의 Native 고해상도 크롭 프레임입니다.';

    // [1단계] 동기식 Blob 직결 변환 (터치 제스처 권한 유지)
    const blob = dataURLtoBlob(targetUrl);
    if (!blob) {
      setSaveModalData({ url: targetUrl, title: titleText, subtitle: subtitleText });
      return;
    }

    const file = new File([blob], filename, { type: 'image/png' });

    try {
      // iOS / Android 네이티브 공유 및 사진첩 바로 저장 호출
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: titleText,
        });
        return;
      }
    } catch (err: any) {
      // 사용자가 공유 대화창을 명시적으로 취소/닫은 경우 처리 무시
      if (err?.name === 'AbortError' || err?.message?.includes('Share canceled')) {
        return;
      }
      console.log('Web Share API 호출 중지 또는 정책 제한, 로컬 다운로드 및 대안 팝업 시도:', err);
    }

    try {
      // [2단계] URL.createObjectURL 메모리 포인터 생성으로 안드로이드/웹뷰 용량 한계 돌파 및 다운로드 시도
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

      // [3단계] iOS Safari / 모바일 인앱 브라우저(네이버/카카오/인스타 등)는 a.download 속성을 차단하므로 안내 팝업 함께 표출
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
      const isInApp = /KAKAOTALK|NAVER|Instagram|FBAV|LINE/.test(navigator.userAgent);
      if (isIOS || isInApp) {
        setSaveModalData({ url: targetUrl, title: titleText, subtitle: subtitleText });
      }
    } catch (downloadErr) {
      console.error('Download fallback failed, opening preview modal:', downloadErr);
      // 최종 대안 안전장치: 모달 팝업 오픈
      setSaveModalData({ url: targetUrl, title: titleText, subtitle: subtitleText });
    }
  };

  const handleSavePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return; // 마우스는 좌클릭만 허용
    isLongPressRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      // 길게 누르기 도달 시 미세 촉각 진동 (지원 기기)
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([40, 30, 40]);
      }
      saveImage(true); // 전체 화면 고화질 원본 저장
    }, 550);
  };

  const handleSavePointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (!isLongPressRef.current) {
      saveImage(false); // 짧은 터치 -> 크롭 영역 저장
    }
  };

  const handleSavePointerCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleViewfinderPointerDown = async (e: React.PointerEvent<HTMLElement>) => {
    // 권한이 없거나 UI 컨트롤(버튼) 클릭 시에는 배경 터치/초점 동작 무시
    if (!hasPermission) return;
    if ((e.target as HTMLElement).closest('button, a, input, [role="button"]')) return;

    if (onBackgroundTap) {
      onBackgroundTap();
    }

    // 촬영 정지(Freeze) 상태일 때는 초점(포커스 링) 동작 무시
    if (isFrozen) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const touchX = e.clientX - rect.left;
    const touchY = e.clientY - rect.top;

    // (1) 시각적 초점 애니메이션 링 및 모바일 촉각 햅틱 피드백 트리거
    if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    setFocusPoint({ x: touchX, y: touchY, key: Date.now() });
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(20); // 부드러운 초점 터치 진동 피드백
    }
    focusTimerRef.current = setTimeout(() => {
      setFocusPoint(null);
    }, 1200);

    // (2) WebRTC 하드웨어 카메라 렌즈 모터 초점(Tap-to-Focus) 제어 (Image Capture API)
    if (!videoRef.current || !videoRef.current.srcObject) return;
    const stream = videoRef.current.srcObject as MediaStream;
    const track = stream.getVideoTracks()[0];
    if (!track || !track.applyConstraints) return;

    try {
      const capabilities = track.getCapabilities?.() as any;
      const normX = Math.max(0, Math.min(1, touchX / rect.width));
      const normY = Math.max(0, Math.min(1, touchY / rect.height));

      // Android Chrome 등 pointsOfInterest(좌표 지정 물리 포커싱)를 지원하는 장치
      if (capabilities?.pointsOfInterest) {
        await track.applyConstraints({
          advanced: [{
            pointsOfInterest: [{ x: normX, y: normY }],
            focusMode: capabilities.focusMode?.includes('single-shot') ? 'single-shot' : 'continuous',
          } as any]
        });
      } else if (capabilities?.focusMode?.includes('continuous')) {
        // iOS Safari 및 일반 브라우저는 focusMode='continuous'를 다시 적용하여 초점 재탐색을 억지로 자극
        await track.applyConstraints({
          advanced: [{ focusMode: 'continuous' } as any]
        });
      }
    } catch (focusErr) {
      // 권한 또는 지원되지 않는 기능 오류 발생 시 UI 피드백만 남기고 조용히 무시
      console.log('Hardware touch focus constraints best-effort check:', focusErr);
    }
  };

  return (
    <section 
      ref={containerRef} 
      onPointerDown={handleViewfinderPointerDown}
      className="w-full h-full relative bg-surface-container-lowest flex-shrink-0 flex items-center justify-center overflow-hidden cursor-crosshair"
    >
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
          
          <button
            onClick={onStartDictionaryMode}
            className="mt-4 px-4 py-2 bg-surface-container-highest text-on-surface-variant rounded-full font-label-lg shadow-sm hover:scale-105 hover:bg-surface-container-highest/80 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">menu_book</span>
            영한사전 모드
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

      {/* Tap-to-Focus Visualizer Ring */}
      {focusPoint && (
        <div
          key={focusPoint.key}
          style={{ left: `${focusPoint.x}px`, top: `${focusPoint.y}px` }}
          className="absolute z-25 pointer-events-none w-16 h-16 border-[2px] border-amber-300 rounded-xl shadow-[0_0_12px_rgba(252,211,77,0.8)] flex items-center justify-center animate-focus-ring -translate-x-1/2 -translate-y-1/2"
        >
          <div className="w-2 h-2 bg-amber-300 rounded-full animate-ping opacity-80" />
        </div>
      )}

      {/* Camera Controls */}
      <div className="absolute top-[60%] -translate-y-1/2 left-0 w-full flex justify-center items-center gap-8 z-20">
        {/* Shutter Button */}
        {!isFrozen ? (
          <div className="flex items-center justify-center gap-6 md:gap-10 w-full max-w-[420px] px-4">
            {/* Left Spacer for alignment */}
            <div className="w-16 h-16 md:w-20 md:h-20 pointer-events-none invisible flex-shrink-0" />
            
            {/* Shutter Button */}
            <button 
              aria-label="텍스트 스캔" 
              onClick={captureAndScan}
              disabled={isScanning || !hasPermission}
              className={`w-28 h-28 md:w-32 md:h-32 rounded-full border-[6px] flex items-center justify-center transition-all duration-200 group flex-shrink-0
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
            
            {/* Dictionary Mode Button */}
            <button 
              aria-label="영한사전 모드" 
              onClick={onStartDictionaryMode}
              disabled={!hasPermission}
              className="w-16 h-16 md:w-20 md:h-20 rounded-full border-[4px] border-secondary-container bg-surface-container-highest flex items-center justify-center shadow-[0_0_20px_rgba(3,199,90,0.15)] hover:scale-105 active:scale-95 transition-all duration-100 group flex-shrink-0 disabled:opacity-40 disabled:pointer-events-none"
              title="사전 모드"
            >
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-secondary-container/30 group-hover:bg-secondary-container/50 transition-colors flex items-center justify-center pointer-events-none">
                <span className="material-symbols-outlined text-[32px] text-secondary pointer-events-none">menu_book</span>
              </div>
            </button>
          </div>
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

            {/* Save Image Button (Right - Dual Function: Short Press vs Long Press) */}
            <button 
              aria-label="스캔 크롭 또는 전체 원본 이미지 저장" 
              onPointerDown={handleSavePointerDown}
              onPointerUp={handleSavePointerUp}
              onPointerLeave={handleSavePointerCancel}
              onPointerCancel={handleSavePointerCancel}
              onContextMenu={(e) => e.preventDefault()}
              disabled={!croppedImageUrl}
              className="w-16 h-16 md:w-20 md:h-20 rounded-full border-[4px] border-primary-container bg-surface-container-highest flex items-center justify-center shadow-[0_0_20px_rgba(3,199,90,0.25)] hover:scale-105 active:scale-95 transition-all duration-100 group flex-shrink-0 disabled:opacity-40 disabled:pointer-events-none select-none touch-none"
              title="짧게 탭: 녹색 크롭 영역 저장 | 길게 꾹 누르기: 4K/고해상도 전체 원본 저장"
            >
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary-container/20 group-hover:bg-primary-container/40 transition-colors flex items-center justify-center pointer-events-none">
                <span className="material-symbols-outlined text-[32px] text-primary-fixed pointer-events-none">download</span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* [3단계 최종 방어벽] 모바일/인앱 브라우저 사진 저장 안내 대안 팝업 */}
      {saveModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-surface-container w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-outline-variant text-center relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-on-surface text-base flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[20px] text-primary-fixed-dim">photo_library</span>
                {saveModalData.title}
              </h3>
              <button
                type="button"
                onClick={() => setSaveModalData(null)}
                className="text-on-surface-variant hover:text-on-surface transition-colors rounded-full p-1 bg-surface-container-highest flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <p className="text-[11px] text-primary-fixed-dim font-medium mb-3 text-left">
              ✨ {saveModalData.subtitle}
            </p>
            <p className="text-xs text-on-surface-variant mb-4 text-left leading-relaxed break-keep">
              현재 기기 보안 정책으로 자동 파일 저장이 제한될 수 있습니다.<br />
              <strong className="text-on-surface font-semibold">아래 사진을 손가락으로 꾹 길게 터치(Long-press)한 후 &apos;내 앨범에 저장&apos; 또는 &apos;사진 보관함에 추가&apos;</strong>를 선택해 주세요.
            </p>
            <div className="bg-surface-container-lowest p-2 rounded-2xl border border-outline-variant/50 mb-5 shadow-inner flex items-center justify-center max-h-64 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={saveModalData.url}
                alt={saveModalData.title}
                className="max-w-full max-h-52 object-contain rounded-xl select-all pointer-events-auto shadow-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => setSaveModalData(null)}
              className="w-full py-3 bg-primary-container text-on-primary-container font-semibold rounded-2xl hover:opacity-95 active:scale-[0.98] transition-all text-xs shadow-md"
            >
              확인 및 닫기
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
