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
│   ├── dictParser.worker.ts# Web Worker: JSZip으로 StarDict 파일 파싱 후 DB Bulk Insert
│   └── security.ts         # 보안 유효성 검증(Zod), 에러 위생화 및 PWA 오프라인 캐시 전수 파기 유틸리티
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

3. **OCR (Tesseract.js) 전체 텍스트 추출 및 터치 검색 UX**
   - 기존의 단일 단어 크롭 방식에서 벗어나, 카메라 뷰 전체(90% 영역)를 스캔하여 원본의 줄바꿈과 띄어쓰기를 보존한 전체 텍스트 블록을 추출합니다.
   - 추출된 텍스트는 바텀 시트를 통해 크게 렌더링되며, 개별 단어마다 터치 이벤트(`<span> onClick`)가 바인딩되어 사용자가 모르는 단어를 찍기만 하면 즉시 사전을 검색하는 혁신적인 UX를 제공합니다.
   - 스캔(셔터) 시 화면을 일시정지(Freeze) 시켜 안정감을 주고, 스캔이 끝난 즉시 `worker.terminate()`를 호출해 Safari WebAssembly 메모리 한도 초과 오류를 방지합니다.

4. **보안 컨텍스트 (Secure Context) 및 PWA 지원**
   - 카메라 접근을 위해 HTTPS 연결이나 `localhost`가 필수입니다.
   - PWA(Progressive Web App)를 위한 `manifest.json`과 아이콘이 세팅되어 있어 기기의 홈 화면에 추가하여 네이티브 앱처럼 사용할 수 있습니다.

6. **반응형 모바일 전용 레이아웃 및 다크모드**
   - PC(가로 모드) 환경에서도 모바일과 동일한 사용자 경험을 제공하기 위해 미디어 쿼리를 제거하고 단일 모바일 레이아웃 뷰를 채택했습니다.
   - 우측 상단의 테마 전환(☀️/🌙) 버튼을 통해 다크모드를 완벽하게 지원하며, `localStorage`와 `<meta name="theme-color">`를 통해 테마 상태와 브라우저 오버스크롤 색상까지 세밀하게 동기화됩니다.

7. **오프라인 폰트 지원 (리디바탕)**
   - OCR 스캔 텍스트 영역의 가독성을 높이기 위해 '리디바탕(RIDIBatang)' 웹폰트를 적용했습니다.
   - 외부 CDN이 아닌 `public/fonts/` 경로에 폰트 파일을 직접 내장하여, 오프라인(네트워크 단절) 상태에서도 PWA 서비스 워커 캐시를 통해 완벽하게 폰트가 로드되도록 구성했습니다.

8. **4단계 보안 검증 및 아키텍처 하드닝 (Security Hardening & Zero-Leak)**
   - **Phase 1 (서버리스 인가 & Zod 입력 검증)**: 향후 API 및 Server Action 확장 시 `zod` 패키지를 사용해 Body/Param 데이터를 엄격히 검증하며, 내부 에러 발생 시 클라이언트에는 `"요청을 처리할 수 없습니다."`로 위생화된 메시지만 반환(`lib/security.ts`)합니다.
   - **Phase 2 (Zero-Leak 환경변수 및 배포 가이드)**: 클라이언트 자바스크립트 번들에 DB 자격증명 등이 노출되지 않도록 서버 전용 비밀 키에는 절대 `NEXT_PUBLIC_` 접두사를 붙이지 않고 순수 백엔드 명칭(예: `SUPABASE_URL`)으로 격리합니다. Vercel 배포 대시보드 등록 시에도 이 기준을 준수해야 합니다.
   - **Phase 3 (PWA 오프라인 민감 캐시 파기)**: 공용 사용 또는 로그아웃 시 서비스 워커가 런타임 캐싱한 `Cache Storage(Cache API)`의 민감 데이터를 `window.caches.delete`를 순회 호출하여 완벽히 파괴하는 캐시 초기화 방어벽(`purgeSecurityCaches`)이 설정 모달 UI에 적용되어 있습니다.
   - **Phase 4 (Vercel 배포용 6대 HTTP 보안 헤더)**: `next.config.ts` 전역 라우트에 6대 강력 보안 헤더를 설정했습니다. 특히 **`Permissions-Policy: camera=(self), microphone=(), geolocation=()`** 로 커스텀 설정하여 OCR 카메라 기능을 보호하면서도 불필요한 위치/마이크 권한을 사전에 통제하며, CSP를 통해 XSS를 철저히 차단합니다.

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

4. **단어 스캔 및 터치로 찾기 (핵심 기능)**
   - `카메라 시작` 권한을 허용한 후, 뷰파인더 가이드 박스 안에 스캔할 텍스트(문단 전체)를 위치시킵니다.
   - 하단의 카메라 버튼(셔터)을 클릭하면 화면이 일시정지(Freeze)되며 OCR 처리를 진행합니다.
   - 잠시 후 바텀 시트가 화면 위로 확장되면서 추출된 텍스트 블록 전체가 화면에 렌더링됩니다.
   - 렌더링된 문장들 중에서 **모르는 단어를 가볍게 터치(Click)** 하면, 즉시 해당 단어의 뜻풀이가 하단에 나타납니다! (로컬 DB에 없을 경우 네이버 사전 검색 버튼 출력)
   - 재촬영이 필요하면 언제든 빨간색 `재촬영` 버튼을 누르면 됩니다.
