# Changelog

이 프로젝트의 주요 변경사항을 기록합니다. 형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 따르며, 버전은 [유의적 버전](https://semver.org/lang/ko/)을 사용합니다.

## [Unreleased]

### Removed
- **카드뉴스 기능 전체 제거**(사용자 요청). 스크립트(`weekly-cardnews.ts`,
  카드뉴스 템플릿/스키마), 워크플로우(`weekly-cardnews.yml`), 대시보드 입력 카드,
  관련 타입/경로, `playwright`·`jszip` 의존성 삭제. PRD 4.4는 "범위 제외"로 표기

### Fixed
- Firestore 뉴스 경로 버그 수정: `newsDigest/economy/{date}`(3세그먼트=컬렉션)로
  문서 쓰기가 실패하던 문제를 하위 컬렉션 경로(`newsDigest/economy/items/{date}`)로 교정.
  프론트/스크립트 공용 경로 헬퍼(`fsPaths`) 도입으로 읽기·쓰기 경로 불일치 방지

### Added — Phase 1: 캘린더 소스 간소화 + 배포
- **캘린더 비공개 iCal(ICS) 주소 지원** — OAuth 없이 `GOOGLE_CALENDAR_ICS_URL` 하나로 일정 수집
  (`scripts/lib/calendar.ts`: `fetchTodayEventsFromIcs`, 반복 일정 RRULE 전개·EXDATE 처리).
  ICS 주소가 있으면 우선 사용하고 없으면 기존 OAuth 방식으로 폴백(`fetchTodayEventsAuto`)
- `daily-brief.yml`: 메일 시크릿 미설정 시 이메일 스텝을 자동으로 건너뛰도록 처리(`HAS_MAIL`)
- Firebase 웹 공개 설정 커밋 + 이메일 기반 Firestore 규칙(이전 커밋)
- GitHub Pages 배포 완료(`deploy-pages.yml` + Pages 자동 활성화)

### Added — Phase 1: 캘린더 MVP 실연동 (진행 중)
- `scripts/google-auth.ts`: Google Calendar refresh token 1회 발급 도우미
  (로컬 loopback OAuth, `npm run google:auth`) — 캘린더 연동의 최대 진입장벽 해소
- `scripts/lib/bootstrap.ts`: 로컬 실행 시 `.env` 자동 로드(Node 내장, 무의존성).
  `daily-brief`·`weekly-cardnews`·`google-auth` 진입점에 적용
- `daily-brief`: 이메일 발송 스텝이 파일 부재로 실패하지 않도록 폴백 본문 선기록
- 문서: README에 Google OAuth 발급 절차(리디렉션 URI, 도우미 사용법) 보강

### 예정 (PRD 로드맵)
- Phase 1(잔여): 실제 Firebase/Calendar 자격증명 주입 후 파이프라인 end-to-end 검증
- Phase 2: 네이버 API·Claude 요약 파이프라인 실연동 및 튜닝
- Phase 3: 카드뉴스 다운로드(zip) 및 미리보기 UI, 완료 알림 이메일에 미리보기 첨부
- Phase 4: 키워드 커스터마이징 UI, 실행 이력/에러 모니터링, 이메일 발송 실패 재시도

## [0.1.0] - 2026-07-17

### Added — Phase 0: 인프라 세팅
- 프로젝트 스캐폴드: React 19 + TypeScript + Vite, `tsc -b` 프로젝트 참조 구성
- 공용 데이터 모델(`shared/types.ts`) — PRD 5장 Firestore 데이터 모델과 1:1 대응
- 프론트엔드 대시보드 골격
  - Firebase 초기화 및 Google 로그인(단일 사용자 화이트리스트) 인증 흐름
  - 오늘의 일정 / 경제 / 교육 / 카드뉴스 소재 입력 카드 UI
  - Firestore 읽기·쓰기 데이터 접근 계층(`src/data.ts`)
- 자동화 스크립트 골격(`scripts/`)
  - `daily-brief.ts`: 캘린더·경제·교육 수집 → Claude 요약 → Firestore 저장 → 이메일 본문 생성
  - `weekly-cardnews.ts`: 소재 조회 → Claude 8장 생성 → Playwright PNG 렌더링 → Firestore 기록
  - 공통 라이브러리: `firestore`, `claude`, `calendar`, `news`, `email`, 카드뉴스 템플릿
- GitHub Actions 워크플로우
  - `daily-brief.yml` (매일 06:40 KST), `weekly-cardnews.yml` (매주 월 06:00 KST)
  - `keepalive.yml` (스케줄 자동 비활성화 방지), `deploy-pages.yml` (Pages 배포)
- Firestore 보안 규칙(`firestore.rules`) — 소유자 UID만 read/write 허용
- 프로젝트 문서: `README.md`, `CLAUDE.md`, `docs/PRD.md`, `.env.example`

### Security
- 모든 API 키/토큰은 GitHub Secrets로 분리, 코드/커밋에 하드코딩 금지
- `.gitignore` 에 `.env`, 서비스 계정 JSON 등 민감 파일 제외 규칙 추가

[Unreleased]: https://github.com/Supaper/my-personal-assistant-/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Supaper/my-personal-assistant-/releases/tag/v0.1.0
