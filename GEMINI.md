# Lens Dictionary (단어 찾기 돋보기 앱)

## 📌 프로그램 개요 (Overview)
**Lens Dictionary**는 모바일 브라우저 카메라를 이용해 책, 문서, 인쇄물의 외국어 및 한국어 텍스트를 실시간으로 스캔하고, **오프라인 상태**에서도 즉시 단어의 뜻풀이와 발음 기호를 확인할 수 있는 **Offline-first PWA(Progressive Web App)** 입니다.

100MB 이상의 StarDict 오픈소스 사전을 브라우저 내부 백그라운드 워커에서 무손실 파싱·적재하여 비행기 탑승 모드나 네트워크 단절 환경에서도 0초대의 초고속 검색 환경을 제공합니다. 또한 로컬 사전에 없는 단어는 **글로벌 오픈 영어 사전(Free Dictionary API)**, **다국어 위키피디아(Wikipedia)**, **네이버 영어 사전**으로 이어지는 다단 하이브리드 검색을 지원하며, **Google Cloud Vision OCR** 및 **Google Gemini AI 문단 번역**까지 연동된 올인원 스마트 어학 학습 도구입니다.

---

## 🛠 사용 기술 스택 및 개발 프레임워크 (Tech Stack & Architecture)

- **Core Framework**: Next.js 16 (App Router, React 19)
- **Styling & Design System**: Tailwind CSS v4, Lumen Vision 디자인 시스템, RIDIBatang(리디바탕) 로컬 웹폰트 내장
- **Offline Storage & Database**: Dexie.js 4 (IndexedDB Wrapper), LocalStorage (사용자 설정 및 히스토리 관리)
- **Service Worker & PWA**: Serwist (`@serwist/next`), Web App Manifest (PWA 지원, 홈 화면 바로가기)
- **OCR Engine (Dual Pipeline)**:
  - 오프라인 기본: `Tesseract.js` (WASM 기반 클라이언트 텍스트 인식)
  - 고정밀 클라우드: `Google Cloud Vision API` (선택적 활성화)
- **AI Translation**: Google Gemini Flash API (`gemini-flash-lite-latest`)
- **Dictionary Parsing**: `JSZip` (메모리 압축 해제), StarDict `.idx` / `.dict` 바이너리 디코더
- **Morphological Analysis & Lemmatization**:
  - 영어: `wink-lemmatizer` (동사 불규칙 변화 및 명사 복수형의 오프라인 원형 복원)
  - 한국어: Custom Suffix Stripping Algorithm (어절 단위 조사 자동 분리 및 점진적 탐색)
- **Media & Hardware Controls**: WebRTC (`navigator.mediaDevices.getUserMedia`), W3C Image Capture API (Tap-to-Focus 렌즈 제어), Canvas API (4K 캡처, 스마트 1600px 스케일링, 흑백/대비 전처리)
- **Concurrency**: Web Workers (`lib/dictParser.worker.ts`) - 대용량 데이터 적재 시 메인 UI 스레드 블로킹 방지
- **Security & Integrity**: Zod (데이터 스키마 검증), HTTP 보안 헤더(CSP, HSTS, Permissions-Policy 등)

---

## 📂 폴더 구조 및 파일별 역할 (Directory Structure)

```text
lens-dict/
├── app/
│   ├── favicon.ico         # 파비콘
│   ├── globals.css         # Tailwind v4 디렉티브 및 Lumen Vision 디자인 토큰
│   ├── layout.tsx          # PWA 메타 태그, 뷰포트 설정, 루트 레이아웃
│   ├── page.tsx            # 메인 대시보드 (카메라, 사전 바텀시트, 모달 조립 및 전역 상태 관리)
│   └── sw.ts               # Serwist 기반 PWA 서비스 워커 및 다단 런타임 캐싱 정책 정의
├── components/
│   ├── AboutModal.tsx      # 앱 안내 모달, 캐시 초기화/최신 업데이트 버튼, 개인정보처리방침 링크
│   ├── BottomNavBar.tsx    # 모바일 하단 네비게이션 바
│   ├── CameraViewfinder.tsx# WebRTC 카메라 뷰파인더, Tap-to-Focus, 듀얼 사진 저장, OCR 전처리
│   ├── DictionarySheet.tsx # 하단 사전 검색 바텀시트, 텍스트 블록 렌더링, Gemini 번역, TTS, 다단 폴백
│   ├── HistoryModal.tsx    # 스캔 및 클립보드 텍스트 조회/재사용 기록 관리 모달
│   ├── SettingsModal.tsx   # StarDict 파일 업로드/관리, API 키 설정, 폴백/시작 옵션, 캐시 완전 파기
│   └── TopAppBar.tsx       # 모바일 상단 앱바, 다크 모드 토글, 네트워크 상태 감지 인디케이터
├── lib/
│   ├── appInfo.ts          # 앱 타이틀, 버전 및 설명, 저작권/푸터 메타데이터
│   ├── db.ts               # Dexie.js 스키마 정의 (사전 표제어 및 발음기호 이미지 테이블)
│   ├── dictParser.worker.ts# 대용량 StarDict 파싱 및 청크(Chunk) 단위 IndexedDB 벌크 적재 워커
│   ├── lemmatizer.ts       # wink-lemmatizer 기반 영단어 원형 복원 유틸리티
│   ├── security.ts         # Zod 스키마 검증, 에러 메시지 위생화, CacheStorage 전수 파기 유틸리티
│   └── useNetworkStatus.ts # navigator.onLine 기반 실시간 온/오프라인 감지 커스텀 훅
├── public/
│   ├── fonts/              # RIDIBatang.woff 등 오프라인 보증 로컬 웹폰트
│   ├── icon-*.png          # PWA 홈 화면 바로가기 아이콘 (192px, 512px)
│   ├── manifest.json       # PWA 매니페스트 설정
│   └── sw.js               # 빌드 시 자동 생성되는 서비스 워커 번들
├── scripts/                # StarDict 바이너리 인코딩 검사 및 테스트용 유지보수 스크립트
├── stardict/               # StarDict 사전 견본 파일 (*.zip)
├── AGENTS.md               # Next.js 최신 개발 에이전트 규칙
└── GEMINI.md               # 👈 현재 문서 (프로젝트 통합 개발 및 아키텍처 가이드)
```

---

## ✨ 핵심 기능 상세 (Key Features)

### 1. 실시간 카메라 뷰파인더 & 터치 초점 (WebRTC Tap-to-Focus)
- 4K UHD (`ideal: 3840×2160`) 해상도를 최우선 요청하여 미세한 책의 활자도 선명하게 확보.
- 뷰파인더 임의의 위치를 탭하면 황금색 펄스 링 애니메이션과 함께 스마트폰 미세 햅틱 진동(`navigator.vibrate`)이 작동하며, 하드웨어 렌즈 모터를 제어하여 물리적 초점을 재조정.

### 2. 혁신적인 전체 문단 캡처 & '터치하여 단어 찾기'
- 돋보기 상자 안에 단어 하나를 어렵게 조준할 필요 없이, 문단 전체를 넓게 촬영.
- 추출된 텍스트가 바텀시트에 원본 줄바꿈 그대로 렌더링되며, **모르는 단어를 가볍게 터치(Tap)**하면 즉시 사전 뜻풀이를 로드.
- 단어 주변의 빈 공간이나 줄바꿈 여백을 터치하면 단어 검색창으로 포커스가 이동하여 가상 키보드가 즉시 활성화.

### 3. 오프라인-퍼스트 대용량 로컬 사전 (StarDict + IndexedDB)
- 동아 프라임, 금성 뉴에이스 등 100MB+ (20만~25만 표제어) StarDict Zip 사전을 클라이언트 브라우저에 단 1회 적재.
- 오프라인 상태에서도 단어 터치 즉시 0ms 반응 속도로 한글 뜻풀이, 예문, 발음 기호(이미지)를 출력.

### 4. 스마트 표제어/원형 자동 복원 (Lemmatization & DB-driven Suffix Stripping)
- **영어**: 과거형, 과거분사, 현재분사(`studied` ➔ `study`), 불규칙 복수형(`children` ➔ `child`)을 `wink-lemmatizer`로 자동 추론하여 2차 연속 검색.
- **한국어**: 별도의 고정 조사 사전 없이, 어절 끝에서부터 글자를 1자씩 점진적으로 줄여가며(최소 2글자 보존) 로컬 StarDict DB에 실제 존재하는 가장 긴 표제어를 찾아내는 **사전 DB 대조 폴백(DB-driven Suffix Stripping)** 지원.

### 5. 다단 하이브리드 사전 폴백 & 수동 확장 검색
- 로컬 DB 검색 실패 시, 설정에 따라 **Free Dictionary API**(품사별 뜻풀이, 예문, 영단어 오디오 발음) 또는 **위키피디아**(한국어/영어 자동 분기 백과사전 요약) 결과를 자동 비동기 호출.
- 로컬 사전에 뜻이 있는 경우에도 하단의 **[네이버 사전에서 찾기]**, **[오픈 사전 검색]**, **[위키피디아]** 버튼을 통해 언제든 외부 사전 결과를 수동으로 추가 로드 가능(클릭 시 시트 높이 `90vh` 자동 확장).
- 검색창의 스피커 버튼(`Web Speech API` TTS)과 오픈 사전의 네이티브 오디오(`Audio`)를 통한 이중 발음 청취 지원.
- 사용자가 직접 타이핑할 때는 500ms 디바운싱 및 `AbortController`를 통해 불필요한 네트워크 트래픽을 완벽히 억제.

### 6. Google Gemini AI 전체 문단 양방향 번역
- 스캔된 문단이나 클립보드 텍스트 전체를 구글 Gemini Flash 모델(`gemini-flash-lite-latest`)을 통해 한국어↔외국어로 즉시 번역.
- 번역이 완료되면 기존 텍스트 블록이 번역문으로 즉시 치환되어, **번역된 문장 내의 단어도 동일하게 터치하여 사전 검색**이 가능하며 히스토리에도 자동 기록됨.

### 7. 듀얼 사진 저장 (크롭 vs 4K 무손실 전체 원본)
- 촬영 일시정지 상태에서 저장 버튼을 **짧게 탭(< 550ms)**하면 가이드 박스 내부 영역만 크롭 저장.
- 저장 버튼을 **길게 꾹 누르면(≥ 550ms)** 햅틱 진동과 함께 잘라내지 않은 4K 원본 카메라 프레임 전체를 기기 사진첩에 저장.

### 8. 클립보드 텍스트 모드 & 히스토리 보관 (최대 30건)
- 카메라 없이도 클립보드에 복사된 텍스트를 붙여넣어 터치 사전 검색 및 AI 번역을 동일하게 활용.
- 스캔 텍스트, 클립보드 텍스트, 번역 결과는 중복 제거 후 최신순으로 최대 **30개**까지 `localStorage`에 자동 저장되며, 히스토리 모달(`components/HistoryModal.tsx`)에서 출처(`OCR SCAN` / `CLIPBOARD`) 및 시간과 함께 언제든 다시 불러올 수 있음.

---

## 💡 구현 특징 및 핵심 개발 참고 사항 (Implementation Notes & Architecture Deep Dive)

### 1. 대용량 StarDict 파싱 및 Web Worker 청크 적재
- 100MB 이상의 대용량 StarDict zip(idx + dict)을 메인 스레드에서 파싱할 경우 브라우저 탭이 강제 종료되거나 멈추는 현상이 발생합니다.
- `lib/dictParser.worker.ts`를 분리하여 백그라운드 워커에서 압축을 해제하고, 바이너리 버퍼를 Big-Endian 방식으로 파싱합니다.
- 메모리 한계 극복을 위해 10,000개(Chunk) 단위로 슬라이싱하여 `db.dictionary.bulkPut()`을 순차 호출하며, 파싱 진행률을 0~100%로 메인 UI에 통보합니다.
- 발음기호용 특수문자 이미지(res 폴더)는 Base64 Data URL로 인코딩하여 `db.resources` 테이블에 격리 적재한 후, 렌더링 시 정규식을 통해 `<img>` 태그로 복원합니다.

### 2. iOS Safari (PWA) 제약사항 극복
- **사용자 제스처 바인딩**: iOS Safari는 자동 카메라 실행(`getUserMedia`)을 엄격히 차단하므로, 첫 진입 시 사용자 명시적 탭("카메라 시작" 버튼)을 거쳐 권한을 획득하도록 설계되었습니다.
- **인라인 재생**: `<video>` 태그에 `autoPlay`, `playsInline`, `muted` 속성을 필수로 부여하여 전체화면 네이티브 비디오 플레이어로 튕기는 현상을 방지합니다.

### 3. OCR 전체 텍스트 추출, 동적 폰트 스케일링 및 바텀시트 리사이징 UX
- Tesseract.js WASM 엔진 구동 후, 줄바꿈 구조를 유지한 채 공백(`\s+`) 기준으로 단어를 분절합니다.
- 클립보드 등 40자가 넘는 긴 한 줄 텍스트가 입력될 경우, 단어 단위를 유지하며 35자 내외로 자동 줄바꿈(Chunking)하고, 컨테이너 쿼리(`clamp(14px, calc(164cqw / maxLineLength), 40px)`)를 이용해 줄 길이에 최적화된 폰트 크기를 동적으로 계산합니다.
- 바텀시트 상단 핸들은 드래그(`15vh ~ 90vh`)를 지원하며, 사용자가 조절한 높이는 `localStorage`(`lensDictSheetHeightV2`)에 영구 보존됩니다.
- 텍스트 창의 **휴지통(Delete) 버튼**을 누르면 바텀시트가 닫힘과 동시에 일시정지(Freeze)된 카메라가 즉시 실시간 촬영(Live View) 모드로 복귀합니다.

### 4. 하이브리드 터치 초점 (WebRTC Tap-to-Focus)
- 뷰파인더 탭 좌표를 0.0~1.0 비율로 정규화한 후, W3C Image Capture API의 `pointsOfInterest` 제약조건을 `MediaStreamTrack.applyConstraints()`에 주입합니다.
- 안드로이드 Chrome 등 하드웨어 지원 기기에서는 실제 카메라 렌즈 모터가 이동하여 접사 초점과 노출을 물리적으로 맞춥니다.
- 미지원 기기(iOS Safari 등)에서는 터치 링 애니메이션과 햅틱 진동 피드백을 제공하는 Best-effort 방식으로 안전하게 폴백합니다.

### 5. 4K UHD 지원, 듀얼 사진 저장 및 스마트 1600px 스케일링
- 원본 화질을 최대치로 끌어올리기 위해 WebRTC에 `{ width: { ideal: 3840, min: 1920 }, height: { ideal: 2160, min: 1080 } }`를 요청합니다.
- **사진 저장과 OCR 파이프라인의 디커플링(Decoupling)**:
  - 사진 저장 시에는 4K 원본 또는 고화질 크롭 원본을 그대로 보존합니다.
  - OCR 인식용 캔버스는 가로 1,600px로 지능형 리사이징(스마트 다운/업스케일링)을 거치며 고품질 안티앨리어싱(`imageSmoothingQuality = 'high'`)을 적용하여 글자 테두리를 정돈하고 인식 속도를 3배 이상 단축시킵니다.
- `PointerEvent`의 누름 시간(550ms 기준)을 측정하여 짧은 탭(크롭)과 긴 탭(전체 4K 원본) 저장을 하나의 버튼에서 매끄럽게 처리합니다.

### 6. 모바일 PWA 사진 앨범 저장 하드닝
- 모바일 브라우저에서 `await fetch()` 같은 비동기 로직이 개입하면 브라우저의 '사용자 터치 제스처 활성화 토큰(Transient Activation)'이 만료되어 파일 다운로드나 `navigator.share`가 차단됩니다.
- 이를 해결하기 위해 Base64 문자열을 `atob`를 이용해 **동기식(Synchronous) Uint8Array 및 Blob**으로 직접 변환합니다.
- `navigator.canShare({ files })`를 우선 호출하여 네이티브 사진첩 저장 대화상자를 열고, 미지원 브라우저나 인앱 브라우저(카카오/네이버 등)에서는 "사진 꾹 눌러 저장하기" 안내 팝업을 표시하는 3단계 방어벽을 구축했습니다.

### 7. 듀얼 OCR 엔진 아키텍처 (Tesseract.js & Google Cloud Vision)
- 오프라인 환경에서는 번들된 Tesseract.js (영어/한국어)를 기본 구동합니다.
- 설정에서 Google Cloud Vision API 키를 등록하고 스위치를 활성화하면, 캡처된 캔버스 Base64 이미지를 `v1/images:annotate` 엔드포인트의 `DOCUMENT_TEXT_DETECTION` 기능으로 전송하여 필기체, 기울어진 텍스트, 복잡한 레이아웃에 대해 99% 이상의 정밀도를 달성합니다.

### 8. Google Gemini AI 전체 문단 번역 파이프라인
- 설정창에서 Gemini API 키를 등록하면 바텀시트 하단에 **[전체 문단 AI 번역]** 버튼이 노출됩니다.
- `gemini-flash-lite-latest` 모델을 사용하여 일부 문장이 잘려 있더라도 주어진 내용 그대로 양방향 번역(외국어➔한글, 한글➔영어, 번역 불가 단어는 원문 유지)을 수행하며, 주석 없이 번역 결과만 출력하도록 프롬프트를 통제했습니다.
- 번역 결과는 텍스트 블록(`scannedTextBlock`)에 즉시 반영되어, 번역된 결과 내의 단어도 터치하여 사전을 찾거나 히스토리에 보관할 수 있습니다.

### 9. 오프라인-퍼스트 영어 표제어 복원 (`wink-lemmatizer`)
- 스캔된 단어가 동사 과거형/분사(`ran`, `studied`, `written`)이거나 복수 명사(`teeth`, `indices`)인 경우 로컬 사전에 표제어가 없어 검색에 실패할 수 있습니다.
- 약 80KB 크기의 초경량 오프라인 라이브러리 `wink-lemmatizer`를 내장하여, 1차 원본 검색 실패 시 동사 원형과 단수 명사 후보군을 0ms 만에 추출하여 2차 연속 질의합니다.
- 원형 복원으로 검색에 성공할 경우 **"💡 'studied'의 동사 원형인 'study'(으)로 스마트 검색된 결과입니다"** 배지를 사용자에게 안내합니다.

### 10. 한국어 사전 DB 대조 조사 제거(DB-driven Suffix Stripping) 및 타이핑 가드 (`isTyping`)
- 한국어 단어 검색 시 어절 전체로 먼저 검색한 후, 결과가 없으면 뒤에서부터 1글자씩 제거(`trimmed.slice(0, trimmed.length - i)`, 최소 2글자 유지)하며 로컬 StarDict DB에 표제어가 존재하는지 연속 대조합니다.
- 일치하는 표제어를 찾으면 즉시 검색어를 해당 표제어로 갱신하여 뜻을 보여줍니다.
- **타이핑 가드**: 사용자가 검색창에 직접 한글을 타이핑하는 도중에는 글자가 저절로 잘려나가지 않도록 `isTyping` 상태 플래그를 두어, 오직 **스캔/클립보드 텍스트 블록에서 단어를 탭했을 때만** 조사 제거 루틴이 동작하도록 정교하게 분리했습니다.

### 11. 다단 사전 폴백 및 디바운싱(500ms) + AbortController
- 로컬 IndexedDB에 없는 표제어는 설정된 외부 API(Free Dictionary API 또는 위키피디아)로 자동 폴백 질의를 수행하며, 사용자가 수동 버튼으로 직접 호출할 수도 있습니다.
- 검색 입력창에서 글자를 수정할 때마다 불필요한 외부 API 호출이 발생하는 것을 막기 위해 **500ms 디바운스 타이머**를 적용했습니다.
- 타이머가 끝나기 전 새 입력이 들어오거나 컴포넌트가 언마운트되면 `AbortController.abort()`를 즉시 호출하여 불필요한 네트워크 트래픽과 비동기 경쟁 상태(Race Condition)를 원천 차단합니다.

### 12. 다국어 위키피디아 동적 로컬라이제이션 분기
- 검색어가 한글(`/[가-힣]/`)을 포함하고 있으면 `ko.wikipedia.org/api/rest_v1/page/summary/`, 영문이면 `en.wikipedia.org/api/rest_v1/page/summary/`로 동적 라우팅하여 단어의 언어에 최적화된 백과사전 요약본과 대표 썸네일 이미지를 렌더링합니다.

### 13. 클립보드 권한 팝업 제거 및 빈 여백 탭 가상 키보드 UX
- "영한사전 모드" 진입 시 클립보드를 자동으로 읽으면 모바일(특히 iOS Safari)에서 매번 `"붙여넣기(Paste)"` 허용 팝업이 떠서 흐름을 방해하므로, 자동 읽기를 제거하고 빈 텍스트 창 상태로 즉시 진입하도록 개선했습니다(붙여넣기는 상단 `content_paste` 버튼으로 수동 실행).
- 내용이 비어있거나 텍스트가 이미 채워져 있는 상태에서 **단어가 아닌 빈 여백(줄바꿈 사이, 공백, 하단 여백 등)**을 탭하면 검색 입력창에 포커스가 주어지며 모바일 가상 키보드가 즉시 올라옵니다.
- 단어를 직접 탭했을 때는 `e.stopPropagation()`을 호출하여 키보드가 불필요하게 화면을 가리지 않고 사전 검색 뜻풀이만 깔끔하게 전환되도록 설계되었습니다.

### 14. 크로스 디바이스 Flexbox 높이 0px 붕괴 버그 해결
- 모바일 전용 `100dvh` 단위와 `h-full` 조합 사용 시, PC 랩탑 브라우저나 안드로이드 태블릿, iOS 27 특정 환경에서 뷰포트 높이가 0px로 수축하여 카메라 영역 전체가 사라지는 현상이 발생했습니다.
- 부모-자식 레이아웃을 `flex-1 w-full relative` 구조로 전면 수정하여, 브라우저 엔진의 dvh 지원 여부와 무관하게 모든 디바이스에서 뷰파인더가 화면을 가득 채우도록 하드닝했습니다.

### 15. 4단계 보안 검증 및 깃허브 퍼블릭(Public) 안전 보장
- **Phase 1 (입력 검증)**: 모든 외부 파라미터는 `zod`를 통해 런타임 타입 검증을 거치며 에러 메시지는 안전하게 위생화됩니다.
- **Phase 2 (Zero-Leak)**: 서버 측 비밀키는 `NEXT_PUBLIC_` 접두사를 금지하고, 사용자가 입력한 API 키는 오직 브라우저 `localStorage`에만 저장됩니다.
- **Phase 3 (스크립트 경로 위생화)**: 내부 검증 스크립트(`scripts/`) 내 로컬 PC 절대 경로를 상대 경로로 치환하여 개발자 로컬 식별 정보(윈도우 계정명 등)의 유출을 원천 차단했습니다.
- **Phase 4 (보안 헤더)**: `next.config.ts`에 엄격한 CSP, HSTS, X-Frame-Options, Permissions-Policy(`camera=(self), microphone=(), geolocation=()`)를 선언하여 XSS 및 클릭재킹을 방어합니다.

### 16. PWA 오프라인 폰트 내장 및 정밀 캐싱 (Serwist)
- 텍스트 가독성을 위한 '리디바탕(RIDIBatang)' 웹폰트를 `public/fonts/`에 내장하여 오프라인에서도 외부 CDN 요청 없이 폰트를 렌더링합니다.
- `app/sw.ts`에서 정적 자산(CacheFirst 1년), Tesseract 엔진 CDN(CacheFirst), 구글 폰트(StaleWhileRevalidate 30일), HTML 문서(StaleWhileRevalidate) 등 규칙 기반 다단 캐시를 구성했습니다.

### 17. 개인정보처리방침 연동 및 캐시 리셋 파이프라인
- 앱 안내 모달(`AboutModal.tsx`) 하단에 `@footer`와 통일된 디자인으로 **개인정보처리방침** 링크(`https://landing-doohee2.vercel.app/privacy`)를 배치했습니다.
- 서비스 워커 캐시 꼬임이나 새 빌드 배포 시 사용자가 손쉽게 상태를 갱신할 수 있도록 [최신 버전으로 업데이트 (캐시 초기화)] 버튼을 제공하여 서비스 워커 등록 해제 및 `caches.delete()`를 전수 실행합니다.

---

## 🚀 로컬 개발 및 사용법 (Getting Started & Usage)

### 1. 환경 설정 및 로컬 서버 구동
```bash
# 의존성 패키지 설치
npm install

# 개발 모드 실행 (Webpack 번들러 적용)
npm run dev

# 프로덕션 빌드 및 실행
npm run build
npm run start
```

### 2. 모바일 디바이스 테스트 (HTTPS 환경 권장)
- 카메라 API(`getUserMedia`)는 보안 컨텍스트(HTTPS 또는 localhost)에서만 작동합니다.
- 모바일 기기에서 테스트할 경우 터널링 도구를 활용합니다:
  ```bash
  npx localtunnel --port 3000
  ```

### 3. 사전 데이터 적재 (최초 1회)
1. 상단 앱바의 톱니바퀴(⚙️) 아이콘을 눌러 설정 모달을 엽니다.
2. [사전 데이터 관리] 섹션에서 "파일 선택" 버튼을 클릭합니다.
3. 준비된 `Dong-A_Prime_EKKE_Dictionary.zip` 등 StarDict 형식의 압축 파일을 선택합니다.
4. 백그라운드 워커에서 파싱이 진행되며 수 초 내로 20만 개 이상의 표제어가 로컬 IndexedDB에 적재됩니다.

### 4. 권장 사용 시나리오
- **책 읽으며 단어 찾기**: 카메라를 켜고 읽고 있는 책의 문단을 촬영합니다. 화면에 문단이 뜨면 모르는 단어를 손가락으로 톡톡 터치하여 즉시 뜻을 확인합니다.
- **긴 문맥 파악하기**: 모르는 문장이 포함된 문단을 스캔한 후 하단의 **[전체 문단 AI 번역]**을 눌러 Gemini의 자연스러운 한국어 번역을 확인합니다.
- **영한사전 단독 모드**: 설정에서 "영한사전모드로 시작"을 활성화하거나 뷰파인더의 책 모양 아이콘을 눌러 일반 사전처럼 타이핑 및 클립보드 붙여넣기로 단어를 검색합니다.
- **고해상도 사진 남기기**: 책의 중요한 페이지를 스캔한 후 저장 버튼을 길게 꾹 눌러 4K 원본 사진을 앨범에 아카이빙합니다.

---

## 📜 주요 변경 및 릴리즈 이력 (Changelog & Evolution)

- **오프라인 StarDict 코어 및 WebRTC 뷰파인더 구축**
  - StarDict zip 파싱 Web Worker 및 Dexie.js Bulk Insert 파이프라인 구현
  - Tesseract.js WASM 기반 카메라 뷰 전체 텍스트 추출 및 단어 터치 바인딩 UX 완성
  - RIDIBatang 오프라인 로컬 웹폰트 내장 및 다크 모드/시스템 테마 동기화

- **하드웨어 카메라 제어 및 4K 듀얼 저장 아키텍처**
  - WebRTC W3C Image Capture 기반 하이브리드 터치 초점(Tap-to-Focus) 및 진동 햅틱 적용
  - 4K UHD 스트림 확보, 스마트 1,600px OCR 안티앨리어싱 전처리 분리
  - 짧은 탭(크롭) vs 긴 탭(4K 원본) 듀얼 사진 저장 및 동기식 atob PWA 앨범 저장 하드닝

- **스마트 표제어 복원 및 다단 하이브리드 폴백 고도화**
  - `wink-lemmatizer` 기반 영단어 불규칙 동사/명사 오프라인 원형 복원 파이프라인 구축
  - 한국어 조사 자동 제거(Stemming) 및 타이핑 보호 가드(`isTyping`) 적용
  - Free Dictionary API 및 한/영 위키피디아 다단 폴백, 500ms 디바운스 & AbortController 최적화
  - Google Cloud Vision 고정밀 OCR 엔진 선택 옵션 추가

- **AI 번역, 히스토리, 크로스 디바이스 UI 안정화 및 퍼블릭 오픈**
  - Google Gemini Flash API 기반 전체 문단 AI 실시간 양방향 번역 기능 탑재
  - 스캔 및 클립보드 히스토리 관리 모달(`HistoryModal`) 신설
  - 클립보드 텍스트 모드 강화 및 텍스트 블록 빈 여백 탭 시 자동 포커스/가상 키보드 연동
  - 설정창(SettingsModal) 컴팩트 UI 개편 (단어 수 안내 및 파일 인풋 통합, 진행률 바 재배치)
  - 크로스 디바이스 Flexbox 높이 0px 붕괴 버그 해결 (`flex-1` 레이아웃 하드닝)
  - AboutModal 내 개인정보처리방침 링크 및 캐시 초기화/원클릭 업데이트 기능 추가
  - 깃허브 퍼블릭 전환 대비 절대 경로 제거 및 보안 아키텍처 점검 완료
