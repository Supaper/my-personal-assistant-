// Firebase 웹 앱 공개 설정 (client-safe).
//
// 이 값들은 비밀이 아니다. Firebase 웹 API 키는 프로젝트를 "식별"할 뿐 인증하지 않으며,
// 클라이언트 번들에 노출되는 것이 정상이다(Google 공식 문서 기준).
// 실제 접근 통제는 아래 두 가지로 수행한다:
//   1) Firestore 보안 규칙(firestore.rules) — 소유자 UID만 read/write
//   2) Firebase Authentication — 허용된 Google 계정만 로그인(VITE_ALLOWED_EMAIL)
//
// 환경 변수(VITE_FIREBASE_*)가 있으면 그 값이 우선하고, 없으면 아래 기본값을 쓴다.
export const defaultFirebaseConfig = {
  apiKey: 'AIzaSyCYlRlc7i7jSzKD4y0uWBxBX-xmw3Kel7U',
  authDomain: 'my-personal-assistant-a59ed.firebaseapp.com',
  projectId: 'my-personal-assistant-a59ed',
  storageBucket: 'my-personal-assistant-a59ed.firebasestorage.app',
  messagingSenderId: '644185140253',
  appId: '1:644185140253:web:6e6b0240f5d15d4359eaf4',
} as const;

/** 로그인을 허용할 단일 사용자 이메일(기본값). VITE_ALLOWED_EMAIL로 덮어쓸 수 있다. */
export const defaultAllowedEmail = 'soojhann@seoulav.co.kr';
