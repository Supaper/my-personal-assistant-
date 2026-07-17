import { useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { auth, googleProvider, allowedEmail, isFirebaseConfigured } from './firebase';

export interface AuthState {
  user: User | null;
  loading: boolean;
  /** 로그인은 됐지만 허용된 사용자가 아닌 경우 */
  forbidden: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u && allowedEmail && u.email !== allowedEmail) {
        // 허용되지 않은 계정: 즉시 로그아웃 처리.
        setForbidden(true);
        setUser(null);
        void signOut(auth!);
      } else {
        setForbidden(false);
        setUser(u);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function login() {
    if (!auth) throw new Error('Firebase가 설정되지 않았습니다. .env 값을 확인하세요.');
    await signInWithPopup(auth, googleProvider);
  }

  async function logout() {
    if (!auth) return;
    await signOut(auth);
  }

  return { user, loading, forbidden, login, logout };
}

export { isFirebaseConfigured };
