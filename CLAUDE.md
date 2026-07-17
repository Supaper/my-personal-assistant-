# CLAUDE.md

이 파일은 Claude Code가 이 저장소에서 작업할 때 참고하는 개발 가이드입니다.

## 프로젝트 개요

개인용 업무 자동화 어시스턴트. 매일 아침 **일정·경제·교육 뉴스**를 자동 수집·요약해 대시보드에 보여주고, **주 1회 신앙 카드뉴스(8장)** 를 자동 제작한다. 전체 요구사항은 [`docs/PRD.md`](docs/PRD.md)가 단일 기준(source of truth)이다. 기능을 바꿀 때는 PRD와의 정합성을 먼저 확인한다.

## 아키텍처 핵심 원칙 (반드시 지킬 것)

1. **저장소는 Public 유지** → GitHub Actions 무제한 무료. 대신 **모든 키/토큰은 GitHub Secrets**로만 관리하고 코드·커밋에 절대 하드코딩하지 않는다.
2. **개인 데이터(일정 등)는 저장소에 커밋하지 않는다.** GitHub Pages 정적 파일은 URL만 알면 누구나 열람 가능하므로, 실제 데이터는 **Firestore에만** 저장하고 Firebase Auth + 보안 규칙으로 접근을 통제한다.
3. **뉴스는 요약+링크만.** 원문을 통째로 복제하지 않고 Claude가 재구성한 문장으로만 요약한다(인용 15단어 미만). 이 규칙은 Claude 프롬프트(`scripts/daily-brief.ts`)에 명시되어 있으니 프롬프트 수정 시 유지한다.
4. **이메일은 GitHub Actions에서 직접 발송**(Gmail SMTP). Firebase 유료 확장을 쓰지 않아 Firestore를 Spark 무료 플랜으로 유지한다.
5. **카드뉴스 이미지는 개인정보가 없으므로 저장소(`cardnews/`)에 커밋**해도 된다. CI가 커밋한다.

## 기술 스택 / 실행 환경

- 프론트엔드: React 19 + TypeScript + Vite (`src/`)
- 자동화 스크립트: TypeScript, `tsx`로 실행 (`scripts/`) — Node 20+
- DB/인증: Firebase Firestore + Authentication(Spark)
- AI: Anthropic Claude API (`@anthropic-ai/sdk`)
- 뉴스: 네이버 뉴스 검색 API + RSS
- 카드뉴스 렌더링: Playwright(headless Chromium)
- 배포: GitHub Pages, 스케줄: GitHub Actions cron

## 자주 쓰는 명령

```bash
npm run dev            # 대시보드 개발 서버
npm run build          # tsc -b + vite build (배포 전 반드시 통과해야 함)
npm run typecheck      # 타입만 검사
npm run brief:daily        # 아침 브리핑 스크립트 (.env 필요)
npm run cardnews:weekly    # 카드뉴스 스크립트 (.env, playwright 필요)
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

`shared/types.ts`가 정확한 정의. 경로 규칙:
- `dailyBrief/{yyyy-mm-dd}` — 일정
- `newsDigest/economy/{yyyy-mm-dd}`, `newsDigest/education/{yyyy-mm-dd}` — 뉴스 요약
- `cardNewsSubmission/{week}`, `cardNewsOutput/{week}` — 카드뉴스 (week = `yyyy-Www`)
- `config/economyKeywords`, `config/educationKeywords` — 키워드 설정

날짜/주차 키는 **KST 기준**으로 계산한다(`src/data.ts`, 각 스크립트의 `todayKey`/`weekKey`).

## GitHub Actions

- `daily-brief.yml`: 매일 06:40 KST. 실행 지연(최대 10~30분) 가능성 때문에 “07:00 정각”이 아니라 “07:00 이전 확인 가능”이 SLA.
- `weekly-cardnews.yml`: 매주 월 06:00 KST. 소재 미입력이면 안내 메일만 보내고 스킵(`scripts/.tmp/cardnews-skip` 플래그).
- `keepalive.yml`: 60일 미활동 시 스케줄 자동 비활성화를 막기 위한 주간 빈 커밋.
- `deploy-pages.yml`: `main` 푸시 시 대시보드 빌드·배포.
- cron `timezone` 필드로 `Asia/Seoul`을 직접 지정한다(UTC 환산 불필요).

## 보안 체크리스트 (변경 시 확인)

- [ ] 새 코드에 API 키/토큰/서비스 계정을 하드코딩하지 않았는가
- [ ] 개인 일정 원문 등 민감 데이터를 저장소에 커밋하지 않았는가 (Firestore에만)
- [ ] `firestore.rules`가 소유자 UID만 허용하는가 (`REPLACE_WITH_OWNER_UID` 교체 필요)
- [ ] 새 시크릿을 `.env.example` / 워크플로우 / README에 반영했는가
- [ ] 뉴스 요약 프롬프트가 원문 복제 금지·재구성 규칙을 유지하는가

## 연동(사용자 액션 필요) 항목

아래는 코드만으로 끝나지 않고 **사용자가 외부 콘솔에서 발급/등록**해야 동작한다. 작업 중 이 부분이 필요해지면 사용자에게 알린다.
- Firebase 프로젝트 + 서비스 계정, Firestore 규칙의 소유자 UID
- Google Calendar OAuth (client id/secret, refresh token)
- 네이버 뉴스 API 키
- Anthropic API 키
- Gmail 앱 비밀번호
- GitHub Pages 활성화 및 Secrets/Variables 등록

## 개발 로드맵

PRD 8장 참조. 현재 **Phase 0(인프라 세팅) 완료**, 다음은 Phase 1(캘린더 MVP 실연동). `CHANGELOG.md`에 단계별로 기록한다.
