import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { defaultFirebaseConfig, defaultAllowedEmail } from './firebaseConfig';

// 환경 변수(VITE_FIREBASE_*)가 있으면 우선 사용하고, 없으면 커밋된 공개 기본값을 쓴다.
const env = import.meta.env;
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || defaultFirebaseConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || defaultFirebaseConfig.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || defaultFirebaseConfig.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || defaultFirebaseConfig.storageBucket,
  messagingSenderId:
    env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultFirebaseConfig.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || defaultFirebaseConfig.appId,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
}

export const auth = authInstance;
export const db = dbInstance;
export const googleProvider = new GoogleAuthProvider();

/** 로그인을 허용할 단일 사용자 이메일. VITE_ALLOWED_EMAIL 로 덮어쓸 수 있다. */
export const allowedEmail: string | undefined =
  import.meta.env.VITE_ALLOWED_EMAIL || defaultAllowedEmail;
