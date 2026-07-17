# 개인 업무 자동화 어시스턴트

매일 아침 업무 시작 전에 확인할 정보(**일정 · 경제 뉴스 · 교육 뉴스**)를 자동 수집·요약해 하나의 대시보드에서 보여주고, **주 1회 신앙 카드뉴스(8장)** 초안을 자동 제작하는 개인용 자동화 시스템입니다.

상세 요구사항은 [`docs/PRD.md`](docs/PRD.md)를 참고하세요.

---

## 핵심 기능

| # | 기능 | 설명 |
|---|---|---|
| 1 | 매일 07:00 일정 브리핑 | Google Calendar 오늘 일정을 시간순으로 정리 |
| 2 | 경제 동향 요약 | 미국/국내 경제 뉴스를 Claude가 쉬운 말로 요약 |
| 3 | 교육 이슈 큐레이션 | 유아교육·특수교육·교권 키워드 뉴스 요약 |
| 4 | 주간 카드뉴스 제작 | 입력한 소재로 8장 카드뉴스 PNG 자동 생성 |
| — | 이메일 알림 | 매일 통합 브리핑 + 주간 카드뉴스 완료 알림을 Gmail로 발송 |

---

## 아키텍처 한눈에 보기

```
GitHub Actions (cron)  ──►  외부 API (Google Calendar / 네이버 뉴스 / Claude)
        │                        │
        ├── Firestore(Spark) 에 결과 저장
        ├── 카드뉴스 PNG 를 저장소(Git)에 커밋
        └── Gmail SMTP 로 이메일 발송

GitHub Pages (React 대시보드)  ──►  Firebase Auth 로그인 후 Firestore 읽기
```

- **저장소는 Public** → GitHub Actions 무제한 무료. 단, 모든 키/토큰은 GitHub Secrets로 분리.
- **개인 데이터는 정적 파일에 굽지 않음** → Firestore에만 저장하고 Firebase Auth + 보안 규칙으로 접근 통제.
- **뉴스는 요약+링크만** → 원문 복제 금지(저작권).

---

## 기술 스택

- **프론트엔드**: React 19 + TypeScript + Vite
- **호스팅**: GitHub Pages
- **자동화**: GitHub Actions (scheduled workflow, `timezone: Asia/Seoul`)
- **DB / 인증**: Firebase Firestore + Authentication (Spark 무료 플랜)
- **AI**: Anthropic Claude API (요약 / 카드뉴스 생성)
- **뉴스**: 네이버 뉴스 검색 API + RSS
- **카드뉴스 렌더링**: Playwright(headless Chromium) + HTML/CSS 템플릿
- **이메일**: Gmail SMTP(App Password) + `dawidd6/action-send-mail`

---

## 로컬 개발

```bash
# 1) 의존성 설치
npm install

# 2) 환경 변수 설정
cp .env.example .env
#   → .env 의 VITE_FIREBASE_* 값을 채운다 (Firebase 콘솔 → 프로젝트 설정)

# 3) 개발 서버
npm run dev          # http://localhost:5173

# 그 외
npm run build        # 타입체크 + 프로덕션 빌드
npm run typecheck    # 타입체크만
npm run brief:daily      # 아침 브리핑 스크립트 로컬 실행 (.env 필요)
npm run cardnews:weekly  # 카드뉴스 생성 스크립트 로컬 실행 (.env 필요)
npm run google:auth      # Google Calendar refresh token 1회 발급 도우미
```

> 자동화 스크립트는 실행 시 프로젝트 루트의 `.env` 를 자동으로 로드합니다(있을 때만).
> CI(GitHub Actions)에서는 Secrets/Variables가 주입되므로 `.env` 없이 동작합니다.

> Firebase 환경 변수가 없으면 대시보드는 “초기 설정 필요” 안내 화면을 표시합니다.

---

## 배포 & 연동 설정 (요약)

실제 운영을 위해 필요한 외부 연동은 아래와 같습니다. 각 값은 **GitHub Secrets(민감)** 또는 **GitHub Variables(공개 가능)** 에 등록합니다. 자세한 단계는 팀에 문의하거나 각 서비스 콘솔을 참고하세요.

### 1. Firebase
- Firebase 프로젝트 생성 → Firestore(네이티브 모드) + Authentication(Google 로그인) 활성화
- 웹 앱 등록 후 설정 키를 `VITE_FIREBASE_*` 로 등록 (Variables)
- `firestore.rules` 의 `REPLACE_WITH_OWNER_UID` 를 본인 UID로 교체 후 배포:
  ```bash
  npx firebase deploy --only firestore:rules
  ```
- 서비스 계정 키(JSON) 발급 → `FIREBASE_SERVICE_ACCOUNT` Secret에 한 줄 문자열로 저장

### 2. Google Calendar (OAuth2)
- Google Cloud Console → **API 및 서비스**에서 **Google Calendar API** 사용 설정
- **OAuth 2.0 클라이언트 ID** 생성 → **승인된 리디렉션 URI**에 `http://localhost:5555` 추가
- `.env` 에 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` 입력 후 refresh token 발급:
  ```bash
  npm run google:auth
  # 출력된 URL을 브라우저에서 열고 캘린더 접근 허용 → refresh token 확인
  ```
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` 을 Secret으로 등록
- (선택) 특정 캘린더를 쓰려면 `GOOGLE_CALENDAR_ID` Variable 지정(기본 `primary`)

### 3. 네이버 뉴스 검색 API
- 네이버 개발자센터에서 애플리케이션 등록
- `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` Secret 등록

### 4. Anthropic Claude API
- `ANTHROPIC_API_KEY` Secret 등록, `CLAUDE_MODEL` Variable(예: `claude-sonnet-5`)

### 5. Gmail SMTP
- Google 계정 2단계 인증 → 앱 비밀번호 발급
- `MAIL_USERNAME`, `MAIL_APP_PASSWORD` Secret / `MAIL_TO` Variable 등록

### 6. GitHub Pages
- 저장소 Settings → Pages → Source: **GitHub Actions**
- `main` 브랜치에 푸시하면 `deploy-pages.yml` 이 자동 배포

> 연동에 필요한 키/토큰이 준비되면 알려 주세요. 등록 위치(Secret/Variable)와 이름은 위 표기와 `.env.example` 을 기준으로 맞추면 됩니다.

---

## 필요한 Secrets / Variables 목록

| 종류 | 이름 | 용도 |
|---|---|---|
| Secret | `FIREBASE_SERVICE_ACCOUNT` | Admin SDK Firestore 쓰기 |
| Secret | `ANTHROPIC_API_KEY` | Claude API |
| Secret | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REFRESH_TOKEN` | 캘린더 OAuth |
| Secret | `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` | 네이버 뉴스 API |
| Secret | `MAIL_USERNAME` / `MAIL_APP_PASSWORD` | Gmail 발송 |
| Variable | `CLAUDE_MODEL` | 사용할 Claude 모델 |
| Variable | `GOOGLE_CALENDAR_ID` | 대상 캘린더(기본 `primary`) |
| Variable | `MAIL_TO` / `DASHBOARD_URL` | 수신자 / 대시보드 링크 |
| Variable | `VITE_FIREBASE_*`, `VITE_ALLOWED_EMAIL` | 프론트엔드 빌드 설정 |

---

## 디렉터리 구조

```
├─ src/                 React 대시보드 (프론트엔드)
├─ scripts/             GitHub Actions에서 실행되는 자동화 스크립트
│  ├─ lib/              공통 라이브러리(firestore/claude/calendar/news/email …)
│  ├─ daily-brief.ts    아침 브리핑
│  ├─ weekly-cardnews.ts 주간 카드뉴스
│  └─ google-auth.ts    Google refresh token 발급 도우미
├─ shared/types.ts      프론트엔드·스크립트 공용 데이터 모델
├─ .github/workflows/   daily-brief / weekly-cardnews / keepalive / deploy-pages
├─ cardnews/            생성된 카드뉴스 PNG (CI가 커밋)
├─ docs/PRD.md          제품 요구사항 문서
├─ firestore.rules      Firestore 보안 규칙
└─ CLAUDE.md            Claude Code 개발 가이드
```

---

## 라이선스

개인 프로젝트. 저장소는 Public이지만 개인 데이터는 저장소에 포함되지 않습니다.
