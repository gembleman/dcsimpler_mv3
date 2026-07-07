# 현대화 로드맵

작성일: 2026-07-07

## 목적

DCSimpler MV3 코드베이스는 WXT 기반 빌드, `strict` 타입스크립트, 공유 메시지 타입, `chrome.storage.local` 설정 계층 등 핵심 이전 작업은 이미 진행되어 있다. 남은 현대화는 한 번에 구조를 뒤집기보다, 타입 기준선을 먼저 고정하고 DOM 문자열 조립과 저장소 접근을 단계적으로 줄이는 방식이 안전하다.

## 탐색 기준

- codebase-memory MCP 도구는 세션에 노출되지 않아 직접 호출하지 못했다. 로컬에는 `.codebase-memory/graph.db.zst` 아티팩트가 있으나, 사용 가능한 MCP 도구 목록에는 검색/스니펫 도구가 없었다.
- 대신 로컬 파일 탐색과 정적 검색으로 확인했다.
- 기준 명령:
  - `pnpm build`
  - `pnpm exec tsc --noEmit`
  - `rg -n "\bvar\b" src`
  - `rg -n "innerHTML|outerHTML|insertAdjacentHTML" src`
  - `rg -n "localStorage" src`
  - `rg -n ": any\b| as any\b|\bany\b" src`

## 현재 상태 요약

- `pnpm build`는 통과한다.
- 명시적 `any`는 `src` 기준으로 발견되지 않는다.
- 별도 타입체크는 이번 1단계 패치 전에는 실패했다.
  - `src/background/auto-image.ts`: `Required<WritePageInfo>`로 반환하기 전에 `rKey`, `gallId`가 실제 문자열로 좁혀졌음을 타입이 알지 못했다.
  - `src/entrypoints/content/comment-iframe.ts`: `dialogElement`가 초기 null 체크 뒤 클로저 내부에서 다시 nullable로 취급됐다.
- 주요 레거시 패턴:
  - TypeScript 코드의 `var`: 30건, 이번 2단계 패치 후 0건
  - HTML 문자열 삽입/치환: 24건
  - content script의 직접 `localStorage` 접근: 9건
  - 콜백 기반 Chrome API: `background.ts`의 `chrome.tabs.query` 1건

## 현대화 대상

### 1. 타입체크 기준선 고정

`pnpm build`만으로는 `strict` 타입 오류가 드러나지 않을 수 있으므로 `pnpm exec tsc --noEmit`를 기본 검증으로 유지한다.

대상:
- `src/background/auto-image.ts`
- `src/entrypoints/content/comment-iframe.ts`
- 향후 `options` import/export JSON 처리 경로

완료 기준:
- `pnpm check` 통과
- `pnpm build` 통과
- `src/types/chrome.d.ts`를 다시 넓히지 않음

### 2. 레거시 변수 선언 정리

`var`를 `const`/`let`으로 바꾸되, 루프/클로저 동작과 DOM 생명주기 변경이 섞이지 않도록 파일 단위로 진행한다.

우선순위:
- `src/entrypoints/content/comment-iframe.ts`
- `src/entrypoints/content/direct-view.ts`
- `src/entrypoints/content/filters.ts`
- `src/entrypoints/content/list-loader.ts`
- `src/entrypoints/content/hotkeys.ts`
- `src/entrypoints/content/postprocess.ts`
- `src/entrypoints/content/page-ui.ts`

완료 기준:
- TypeScript 파일 기준 `rg -n "\bvar\b" src/**/*.ts` 결과가 비어 있음
- 타입체크와 빌드 통과

### 3. DOM 문자열 조립 축소

`innerHTML`, `insertAdjacentHTML`는 DCInside 원본 HTML 일부를 유지해야 하는 지점과 확장 UI를 새로 만드는 지점이 섞여 있다. 원본 HTML 이식은 보수적으로 유지하고, 확장 UI 생성은 `document.createElement`, `replaceChildren`, `textContent` 중심으로 바꾼다.

우선순위:
- 확장 UI 생성:
  - `src/entrypoints/content/page-ui.ts`
  - `src/entrypoints/content/dialog.ts`
  - `src/entrypoints/options/main.ts`
  - `src/entrypoints/options/sections.ts`
- 사용자/페이지 문자열이 섞이는 지점:
  - `src/entrypoints/content/direct-view.ts`
  - `src/entrypoints/content/list-loader.ts`
  - `src/entrypoints/content/filters.ts`

완료 기준:
- 확장 UI 생성 경로에서 문자열 HTML 삽입 제거
- 외부 페이지 HTML을 그대로 옮기는 지점은 주석으로 의도 명시
- 검색어 하이라이트 등 사용자 입력 기반 문자열 조작은 DOM Range 또는 텍스트 노드 기반으로 변경

### 4. 저장소 계층 정리

설정은 이미 `chrome.storage.local` 기반으로 옮겨졌지만, content UI 상태와 방문 기록 일부는 `localStorage`에 남아 있다. MV3 관점에서 extension-owned 상태는 저장소 계층으로 모으고, 사이트가 제공하는 방문 기록을 읽는 경로와 분리한다.

대상:
- `src/entrypoints/content/page-ui.ts`
  - 우측 패널 표시 상태 `io2`
  - 최근 방문 갤러리 `lately_gallery`

완료 기준:
- 확장 자체 상태는 `chrome.storage.local` 래퍼를 통해 접근
- 사이트 DOM/사이트 `localStorage`와 동기화해야 하는 경우에는 함수명과 주석으로 경계 명시

### 5. Chrome API Promise화

남은 콜백 기반 API를 Promise 기반으로 바꿔 에러 처리를 통일한다.

대상:
- `src/entrypoints/background.ts`
  - `chrome.tabs.query`
  - 필요 시 `chrome.tabs.sendMessage`

완료 기준:
- async listener 내부에서 early return과 try/catch로 처리
- `chrome.runtime.lastError`가 필요한 content messaging 경로는 기존 호환성을 확인한 뒤 별도 단계로 처리

### 6. 옵션 페이지 타입/구조 정리

기존 문서 `docs/type-cleanup-next.md`의 다음 작업과 연결된다.

대상:
- `src/entrypoints/options/main.ts`
- `src/entrypoints/options/handlers.ts`
- `src/entrypoints/options/sections.ts`

완료 기준:
- JSON import/export 값에 타입 가드 적용
- DOM 헬퍼 제네릭화
- `event.target`, `dataset`, 커스텀 속성 접근을 실제 타입으로 좁힘

## 단계별 진행 계획

1. 타입체크 기준선 복구
   - 현재 실패하는 `tsc --noEmit` 오류를 최소 변경으로 수정한다.
   - 검증: `pnpm exec tsc --noEmit`, `pnpm build`

2. content script 레거시 선언 정리
   - `comment-iframe.ts`, `direct-view.ts`, `list-loader.ts`부터 `var` 제거.
   - 동작 변경 없이 타입 추론만 개선한다.

3. 확장 UI DOM 생성 현대화
   - `dialog.ts`, `page-ui.ts`의 확장 UI 생성 코드를 DOM API로 전환.
   - DCInside 원본 페이지 조각을 그대로 옮기는 코드는 별도로 표시한다.

4. 저장소 경계 정리
   - `localStorage.io2`는 extension storage로 이동.
   - `lately_gallery`는 사이트 상태와 확장 렌더링 캐시의 경계를 분리한다.

5. 옵션 페이지 검증 강화
   - import/export JSON 타입 가드.
   - 옵션 저장/복원 경로에서 잘못된 값 입력 시 기본값 병합.

6. 검증 자동화 보강
   - `package.json`에 `typecheck` 스크립트 추가.
   - 필요하면 `check` 스크립트로 `typecheck`와 `build`를 묶는다.

## 이번 단계 완료

1단계로 타입체크 기준선 복구를 진행했다.

- `src/background/auto-image.ts`
  - write page 정보가 실제 문자열일 때 `{ rKey, gallId }` 객체를 새로 만들어 반환하도록 수정했다.
- `src/entrypoints/content/comment-iframe.ts`
  - null 체크가 끝난 `HTMLDialogElement`를 `dialog` 상수로 고정해 클로저 내부 타입을 안정화했다.

2단계로 TypeScript 파일의 `var` 선언을 제거했다.

- 대상 파일:
  - `src/entrypoints/content/comment-iframe.ts`
  - `src/entrypoints/content/dialog.ts`
  - `src/entrypoints/content/direct-view.ts`
  - `src/entrypoints/content/filters.ts`
  - `src/entrypoints/content/hotkeys.ts`
  - `src/entrypoints/content/list-loader.ts`
  - `src/entrypoints/content/page-ui.ts`
  - `src/entrypoints/content/postprocess.ts`
- `rg -n "\bvar\b" src` 결과는 CSS custom property `var(...)` 2건만 남는다.

검증 자동화 보강도 함께 진행했다.

- `package.json`
  - `typecheck`: `tsc --noEmit`
  - `check`: `pnpm typecheck && pnpm build`

3단계 일부로 확장이 직접 만드는 다이얼로그/오류 UI를 DOM API 기반으로 전환했다.

- `src/entrypoints/content/dialog.ts`
  - 기본 다이얼로그 구조를 `innerHTML` 대신 `createElement`, `replaceChildren`으로 생성한다.
- `src/entrypoints/content/direct-view.ts`
  - 오류 화면을 문자열 반환 함수 대신 `createErrorPage()` DOM 생성 함수로 만든다.
- `dialog.ts`, `direct-view.ts` 기준 `innerHTML|outerHTML|insertAdjacentHTML` 검색 결과가 없어졌다.
- `src/entrypoints/content/page-ui.ts`
  - `arrayTab`의 필터 버튼 생성, `navigator`의 우측 네비게이터 생성, `outerButton`의 외부 버튼 생성을 DOM API로 전환했다.
  - `page-ui.ts` 기준 `innerHTML|outerHTML|insertAdjacentHTML` 검색 결과가 없어졌다.
- 전체 `src` 기준 HTML 문자열 API 잔여 건수는 24건에서 15건으로 줄었다.

## 다음 단계 진행 완료

options 페이지의 확장 UI 생성 코드와 content 검색어 하이라이트를 추가로 정리했다.

- `src/entrypoints/options/main.ts`
  - 옵션 메뉴의 버전 표시를 `insertAdjacentHTML` 대신 `document.createElement`, `textContent`, `prepend`로 생성한다.
- `src/entrypoints/options/sections.ts`
  - 업데이트 알림과 footprint 생성을 `innerHTML`/`insertAdjacentHTML` 대신 DOM API 기반으로 전환했다.
- `src/entrypoints/content/list-loader.ts`
  - 검색어 하이라이트를 `anchor.innerHTML` 문자열 치환 대신 텍스트 노드 분할과 `span.mark` 삽입 방식으로 변경했다.
  - 외부 원본 페이지네이션 HTML을 그대로 이식하는 잔여 `innerHTML` 경로에는 의도를 주석으로 표시했다.

검증:

- `pnpm exec tsc --noEmit` 통과
- `pnpm check` 통과

## 다음 권장 작업

로드맵의 현대화 작업은 현재 완료됐다. 이후에는 옵션 페이지 HTML 자체의 중복 `id`, 인라인 스타일, 구형 주석 블록을 정리하는 UI 마크업 정돈을 별도 범위로 진행할 수 있다.

## 추가 진행 완료

저장소 경계, DOM 문자열 API, Chrome API Promise화, 설정 값 검증을 추가로 정리했다.

- `src/lib/storage.ts`
  - 우측 패널 표시 상태 `rightPanelVisibility`를 `chrome.storage.local` 래퍼로 추가했다.
  - 저장된 `config`를 기본값 기준으로 정규화해 잘못된 타입의 값은 기본값으로 병합한다.
- `src/entrypoints/content/page-ui.ts`
  - `localStorage.io2`를 제거하고 우측 패널 상태를 저장소 래퍼로 읽고 쓴다.
  - `lately_gallery`는 DCInside 사이트 상태와 동기화해야 하는 값이므로 `readDcinsideLatelyGalleryStore`, `saveDcinsideLatelyGalleryStore` 함수로 경계를 분리했다.
- `src/entrypoints/background.ts`
  - `chrome.tabs.query` 콜백을 async/await 기반으로 변경했다.
  - content messaging 실패는 content script가 없는 탭의 호환 경로로 보고 무시한다.
- `src/entrypoints/content/filters.ts`
  - 사용자 메모 표시를 `innerHTML` 대신 `textContent`로 바꿨다.
  - 공지/현재글 판별의 HTML 문자열 검사를 DOM 질의와 텍스트 검사로 바꿨다.
- `src/background/auto-image.ts`, `src/entrypoints/content/comment-iframe.ts`, `src/entrypoints/content/list-loader.ts`, `src/entrypoints/content/main.ts`
  - 잔여 `innerHTML` 사용을 `replaceChildren`, `textContent`, DOM 클론 기반 처리로 제거했다.

검증:

- `pnpm check` 통과
- `rg -n "innerHTML|outerHTML|insertAdjacentHTML" src` 결과 없음
- `rg -n "\bvar\b|: any\b| as any\b|\bany\b" src`는 CSS `var(...)` 2건만 남음

현재 남은 `localStorage` 접근은 `lately_gallery` 사이트 상태 동기화 경로뿐이다.

## 남은 단계 진행 완료

옵션 전체 설정 JSON import/export와 가져온 설정 값 검증을 추가했다.

- `src/lib/storage.ts`
  - 저장소 정규화 함수 `normalizeConfig`를 export해 외부 JSON import 경로에서도 같은 타입 기준선을 사용한다.
  - `normalizeConfig`가 기존 `.visit_history` 셀렉터 마이그레이션까지 적용해 import/export와 저장 경로의 동작을 일치시킨다.
- `src/entrypoints/options/sections.ts`
  - 기본설정 화면에 설정 백업 UI를 DOM API 기반으로 추가한다.
- `src/entrypoints/options/handlers.ts`
  - 전체 설정을 `dcsimpler-config.json`으로 내보낸다.
  - 가져온 JSON은 객체 JSON인지 먼저 확인한 뒤 `normalizeConfig`로 기본값과 병합한다.
  - 잘못된 타입의 값은 기본값으로 대체하고, import 후 토글/텍스트 입력 UI를 현재 설정과 동기화한다.
  - import 후 textarea `input` 이벤트를 발생시켜 라인넘버와 자동 높이 조정을 즉시 갱신한다.
- `src/entrypoints/options/text-files.ts`
  - 기존 텍스트 파일 import 헬퍼가 호출 위치별 accept 값을 받을 수 있게 확장했다.
  - download 헬퍼가 호출 위치별 MIME type을 받을 수 있게 해 설정 JSON export는 `application/json`으로 내려받는다.

검증:

- `pnpm exec tsc --noEmit` 통과
- `pnpm check` 통과
- `rg -n "innerHTML|outerHTML|insertAdjacentHTML|localStorage|\bvar\b|: any\b| as any\b|\bany\b" src` 결과는 의도된 `localStorage` 주석/`lately_gallery` 동기화 경로와 CSS `var(...)` 2건만 남음
