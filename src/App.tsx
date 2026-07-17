import { useAuth, isFirebaseConfigured } from './useAuth';
import { Dashboard } from './components/Dashboard';
import { LoginScreen } from './components/LoginScreen';

export default function App() {
  const authState = useAuth();

  if (!isFirebaseConfigured) {
    return (
      <main className="setup-notice">
        <h1>⚙️ 초기 설정 필요</h1>
        <p>
          Firebase 환경 변수가 아직 설정되지 않았습니다. <code>.env.example</code> 를{' '}
          <code>.env</code> 로 복사하고 <code>VITE_FIREBASE_*</code> 값을 채운 뒤 다시 실행하세요.
        </p>
        <p className="muted">
          연동 방법은 <code>README.md</code> 의 “Firebase 설정” 절을 참고하세요.
        </p>
      </main>
    );
  }

  if (authState.loading) {
    return <main className="center">불러오는 중…</main>;
  }

  if (!authState.user) {
    return <LoginScreen authState={authState} />;
  }

  return <Dashboard authState={authState} />;
}
