# Lens Dictionary (단어 찾기 돋보기 앱)

## 📌 프로그램 개요 (Overview)
**Lens Dictionary**는 모바일 브라우저 카메라를 이용해 책이나 종이의 영어 단어를 실시간으로 스캔하고, **오프라인 상태**에서도 즉시 단어의 뜻풀이와 발음 기호를 확인할 수 있는 **Offline-first PWA(Progressive Web App)** 입니다.

100MB가 넘는 StarDict 오픈소스 사전을 백그라운드 워커에서 파싱 및 저장하여 빠른 검색 환경을 제공하며, 로컬 DB에 없는 단어는 네이버 영어 사전으로 폴백(Fallback)하는 하이브리드 검색을 지원합니다.

## 🛠 사용 기술 스택 (Tech Stack)
- **Framework**: Next.js (React 19)
- **Styling**: Tailwind CSS v4 (Lumen Vision 디자인 시스템 적용)
- **Offline DB**: Dexie.js (IndexedDB 래퍼)
- **Dictionary Parsing**: JSZip (메모리 상에서 Zip 해제)
- **OCR Engine**: Tesseract.js (영어 텍스트 인식)
- **Media**: WebRTC (`navigator.mediaDevices.getUserMedia`), Canvas API (이미지 크롭 및 흑백/대비 전처리)
- **Concurrency**: Web Workers (메인 스레드 블로킹 방지)

---

## 📂 폴더 구조 및 파일 설명 (Directory Structure)

```text
lens-dict/
├── app/
│   ├── globals.css         # Tailwind v4 설정 및 Lumen Vision 글로벌 디자인 토큰
│   ├── layout.tsx          # Next.js 루트 레이아웃 (Inter 폰트, 다크 모드 셋업)
│   └── page.tsx            # 메인 페이지 (Top, Camera, Dictionary, Bottom 조립 및 상태 주입)
├── components/
│   ├── BottomNavBar.tsx    # 모바일 전용 하단 네비게이션 바 UI
│   ├── CameraViewfinder.tsx# WebRTC 카메라 연동, 캔버스 크롭, Tesseract OCR 로직 포함
│   ├── DictionarySheet.tsx # 하단 사전 검색 바텀 시트 (결과 렌더링, 네이버 폴백 처리)
│   ├── SettingsModal.tsx   # 사전 데이터 관리용 모달 (zip 파일 업로드 및 진행률 표시)
│   └── TopAppBar.tsx       # 모바일 상단 앱바 UI
├── lib/
│   ├── db.ts               # Dexie.js 설정 (사전 및 리소스 테이블 정의)
│   └── dictParser.worker.ts# Web Worker: JSZip으로 StarDict 파일 파싱 후 DB Bulk Insert
├── stardict/
│   └── *.zip               # StarDict 포맷의 사전 파일 (업로드용 샘플)
└── GEMINI.md               # 👈 현재 문서 (개발 및 유지보수 가이드)
```

---

## 💡 개발 참고 사항 (Development Notes)

1. **대용량 StarDict 파싱 최적화**
   - 100MB 크기의 사전을 파싱할 때 브라우저가 멈추는 현상을 방지하기 위해 반드시 `lib/dictParser.worker.ts`를 통해 **Web Worker**에서 처리합니다.
   - 데이터는 1만 개(Chunk) 단위로 묶어 `db.dictionary.bulkPut()`을 통해 IndexedDB에 적재해야 메모리 초과를 막을 수 있습니다.
   - 발음기호용 이미지(res 폴더)는 파싱 시 Base64 문자열로 치환하여 `db.resources` 테이블에 따로 저장되며, 렌더링 시 정규식을 통해 `<img>` 태그를 복원합니다.

2. **iOS Safari (PWA) 필수 제약사항 대응**
   - **권한 요청**: iOS는 자동 카메라 실행을 차단하므로, 반드시 사용자의 터치 인터랙션("Start Camera" 버튼 클릭 등) 시점에 `getUserMedia`를 호출해야 합니다.
   - **인라인 재생**: `<video>` 태그에 `autoPlay`, `playsInline`, `muted` 속성을 기입해야 Safari 브라우저에서 강제 전체화면 비디오 플레이어로 튕기는 것을 막을 수 있습니다.

3. **OCR (Tesseract.js) 처리 및 메모리 누수 방지**
   - 영상 전체를 넘기면 시간이 오래 걸리므로 조준선 부분만 캔버스로 잘라내어(Crop) 넘깁니다.
   - 전처리 과정에서 흑백(Grayscale) 처리와 명암비(Contrast)를 1.5배 높여 OCR 인식률을 끌어올립니다.
   - 스캔이 끝난 즉시 `worker.terminate()`를 호출해야 Safari에서 WebAssembly 메모리 한도 초과로 인해 탭이 Crash되는 현상을 막을 수 있습니다.

4. **보안 컨텍스트 (Secure Context)**
   - 모바일 브라우저에서 카메라에 접근하려면 반드시 HTTPS 연결이나 `localhost`가 필요합니다. 로컬 네트워크 기기 테스팅 시 `localtunnel` 등을 통한 임시 HTTPS URL 사용이 필수적입니다.

---

## 🚀 로컬 테스트 및 사용법 (Usage)

1. **설치 및 서버 실행**
   ```bash
   npm install
   npm run dev
   ```

2. **접속 및 테스트 환경 세팅**
   - PC 브라우저에서 `http://localhost:3000` 접속
   - 또는 모바일 테스팅을 위해 Ngrok, Localtunnel 등으로 포워딩: `npx localtunnel --port 3000`

3. **사전 등록 (최초 1회 필수)**
   - 하단 딕셔너리 시트의 톱니바퀴(⚙️) 아이콘을 눌러 Settings 모달을 엽니다.
   - 준비된 `Dong-A_Prime_EKKE_Dictionary.zip` 파일을 업로드하여 브라우저 로컬 DB(IndexedDB)에 다운로드시킵니다.
   - 업로드가 완료되면 수 초 이내에 약 22만 개의 데이터가 적재됩니다.

4. **단어 스캔하기**
   - `Start Camera` 권한을 허용한 후, 초점이 맞는 상태에서 뷰파인더 중앙의 사각 조준선에 원하는 영단어를 위치시킵니다.
   - 중앙 하단의 초록색 카메라 버튼(Shutter)을 클릭하면 스피너가 돌면서 OCR 처리를 진행합니다.
   - 인식된 단어가 0.5초 이내에 하단 시트에 꽂히고 즉시 뜻풀이 결과를 렌더링합니다! (없을 경우 네이버로 이동 가능)
