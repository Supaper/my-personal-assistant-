import { initializeApp, cert, getApps, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { requireEnv } from './env.ts';

let app: App | undefined;

/**
 * Firebase Admin SDK 초기화.
 * FIREBASE_SERVICE_ACCOUNT 에는 서비스 계정 JSON 전체를 한 줄 문자열로 넣는다.
 * Admin SDK는 Firestore 보안 규칙을 우회하므로 자동화 쓰기에 사용한다.
 */
export function getDb(): Firestore {
  if (!app) {
    const raw = requireEnv('FIREBASE_SERVICE_ACCOUNT');
    const serviceAccount = JSON.parse(raw);
    app = getApps()[0] ?? initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore(app);
}
