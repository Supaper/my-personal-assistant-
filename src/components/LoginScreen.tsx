import { useState } from 'react';
import type { AuthState } from '../useAuth';

export function LoginScreen({ authState }: { authState: AuthState }) {
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setError(null);
    try {
      await authState.login();
    } catch (e) {
      setError(e instanceof Error ? e.message : '로그인에 실패했습니다.');
    }
  }

  return (
    <main className="center login">
      <h1>개인 업무 어시스턴트</h1>
      <p className="muted">일정 · 경제 · 교육 뉴스 브리핑</p>
      {authState.forbidden && (
        <p className="error">허용되지 않은 계정입니다. 등록된 계정으로 로그인하세요.</p>
      )}
      {error && <p className="error">{error}</p>}
      <button className="btn-primary" onClick={handleLogin}>
        Google 계정으로 로그인
      </button>
    </main>
  );
}
