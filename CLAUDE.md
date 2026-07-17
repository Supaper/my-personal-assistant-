# CLAUDE.md

이 파일은 Claude Code가 이 저장소에서 작업할 때 참고하는 개발 가이드입니다.

## 프로젝트 개요

개인용 업무 자동화 어시스턴트. 매일 아침 **일정·경제·교육 뉴스**를 자동 수집·요약해 대시보드에 보여준다. 전체 요구사항은 [`docs/PRD.md`](docs/PRD.md)가 기준이나, **카드뉴스(PRD 4.4)는 범위에서 제외(descoped)** 되었다. 기능을 바꿀 때는 PRD와의 정합성을 먼저 확인하되 카드뉴스 관련 항목은 무시한다.

## 아키텍처 핵심 원칙 (반드시 지킬 것)

1. **저장소는 Public 유지** → GitHub Actions 무제한 무료. 대신 **모든 키/토큰은 GitHub Secrets**로만 관리하고 코드·커밋에 절대 하드코딩하지 않는다.
2. **개인 데이터(일정 등)는 저장소에 커밋하지 않는다.** GitHub Pages 정적 파일은 URL만 알면 누구나 열람 가능하므로, 실제 데이터는 **Firestore에만** 저장하고 Firebase Auth + 보안 규칙으로 접근을 통제한다.
3. **뉴스는 요약+링크만.** 원문을 통째로 복제하지 않고 Claude가 재구성한 문장으로만 요약한다(인용 15단어 미만). 이 규칙은 Claude 프롬프트(`scripts/daily-brief.ts`)에 명시되어 있으니 프롬프트 수정 시 유지한다.
4. **이메일은 GitHub Actions에서 직접 발송**(Gmail SMTP). Firebase 유료 확장을 쓰지 않아 Firestore를 Spark 무료 플랜으로 유지한다.

## 기술 스택 / 실행 환경

- 프론트엔드: React 19 + TypeScript + Vite (`src/`)
- 자동화 스크립트: TypeScript, `tsx`로 실행 (`scripts/`) — Node 20+
- DB/인증: Firebase Firestore + Authentication(Spark)
- AI: Anthropic Claude API (`@anthropic-ai/sdk`) — 뉴스 요약
- 뉴스: 네이버 뉴스 검색 API + RSS
- 캘린더: 비공개 iCal(ICS) 주소(권장) 또는 Google Calendar OAuth
- 배포: GitHub Pages, 스케줄: GitHub Actions cron

## 자주 쓰는 명령

```bash
npm run dev            # 대시보드 개발 서버
npm run build          # tsc -b + vite build (배포 전 반드시 통과해야 함)
npm run typecheck      # 타입만 검사
npm run brief:daily        # 아침 브리핑 스크립트 (.env 필요)
npm run google:auth        # Google Calendar refresh token 발급 도우미(OAuth 사용 시)
```

> 변경 후에는 최소한 `npm run build`(타입체크 포함)가 통과하는지 확인한다.

## 코드 구조 & 규칙

- **공용 타입은 `shared/types.ts` 한 곳에서만 정의**한다. 프론트엔드(`src`)와 스크립트(`scripts`) 양쪽 tsconfig가 `shared`를 include한다. 데이터 모델을 바꾸면 PRD 5장, Firestore 저장/읽기 코드, UI를 함께 갱신한다.
- 스크립트 내부 import는 `tsx`/NodeNext 특성상 **`.ts` 확장자를 명시**한다 (예: `./lib/env.ts`). 프론트엔드(bundler)는 확장자 생략 가능.
- tsconfig는 프로젝트 참조 구조:
  - `tsconfig.app.json` → `src` + `shared` (DOM, jsx)
  - `tsconfig.node.json` → `scripts` + `shared` + `vite.config.ts` (node)
- 환경 변수:
  - `VITE_*` 는 클라이언트 번들에 포함(공개돼도 되는 Firebase 설정 키). 접근 통제는 Firestore 규칙으로.
  - 그 외(`ANTHROPIC_API_KEY`, `FIREBASE_SERVICE_ACCOUNT`, `GOOGLE_*`, `NAVER_*`, `MAIL_*`)는 **서버/CI 전용**. 절대 클라이언트로 노출하지 않는다.
  - 새 환경 변수를 추가하면 `.env.example`, 관련 워크플로우 YAML, `README.md`의 Secrets 표를 함께 갱신한다.
- UI 문구·주석은 한국어를 기본으로 한다(이 프로젝트의 관례).

## Firestore 데이터 모델 (요약)

`shared/types.ts`의 `fsPaths`가 정확한 경로 정의(프론트/스크립트 공용). Firestore 문서 경로는 **세그먼트 수가 짝수**여야 한다:
- `dailyBrief/{yyyy-mm-dd}` — 일정
- `newsDigest/economy/items/{yyyy-mm-dd}`, `newsDigest/education/items/{yyyy-mm-dd}` — 뉴스 요약(하위 컬렉션 `items`로 짝수 세그먼트 유지)
- `config/economyKeywords`, `config/educationKeywords` — 키워드 설정

날짜 키는 **KST 기준**으로 계산한다(`src/data.ts`, 스크립트의 `todayKey`).

## GitHub Actions

- `daily-brief.yml`: 매일 06:40 KST. 실행 지연(최대 10~30분) 가능성 때문에 “07:00 정각”이 아니라 “07:00 이전 확인 가능”이 SLA. 메일 시크릿(`MAIL_*`)이 없으면 이메일 스텝은 자동 스킵.
- `keepalive.yml`: 60일 미활동 시 스케줄 자동 비활성화를 막기 위한 주간 빈 커밋.
- `deploy-pages.yml`: `main` 푸시 시 대시보드 빌드·배포.
- cron `timezone` 필드로 `Asia/Seoul`을 직접 지정한다(UTC 환산 불필요).

## 보안 체크리스트 (변경 시 확인)

- [ ] 새 코드에 API 키/토큰/서비스 계정을 하드코딩하지 않았는가
- [ ] 개인 일정 원문 등 민감 데이터를 저장소에 커밋하지 않았는가 (Firestore에만)
- [ ] `firestore.rules`가 소유자 이메일만 허용하는가 (`OWNER_EMAIL` = `src/firebaseConfig.ts`의 `defaultAllowedEmail`과 일치)
- [ ] 새 시크릿을 `.env.example` / 워크플로우 / README에 반영했는가
- [ ] 뉴스 요약 프롬프트가 원문 복제 금지·재구성 규칙을 유지하는가

## 연동(사용자 액션 필요) 항목

아래는 코드만으로 끝나지 않고 **사용자가 외부 콘솔에서 발급/등록**해야 동작한다. 작업 중 이 부분이 필요해지면 사용자에게 알린다.
- Firebase 프로젝트 + 서비스 계정 (Firestore 규칙은 소유자 이메일 기반이라 UID 조회 불필요)
- Google Calendar: 비공개 iCal 주소(`GOOGLE_CALENDAR_ICS_URL`, 권장) 또는 OAuth
- 네이버 뉴스 API 키
- Anthropic API 키
- Gmail 앱 비밀번호
- GitHub Pages 활성화 및 Secrets/Variables 등록

## 개발 로드맵

PRD 8장 참조(단, 카드뉴스 Phase는 제외). 현재 **Phase 0 완료 + Phase 1(캘린더) 배포**, 대시보드는 GitHub Pages에 게시됨. 다음은 뉴스(경제·교육) 파이프라인 실연동. `CHANGELOG.md`에 단계별로 기록한다.
