// 로컬 실행 시 .env 파일을 자동으로 로드한다(있을 때만).
// GitHub Actions에서는 env가 이미 주입되므로 .env가 없어도 문제없다.
// Node 20.12+ / 22 의 내장 process.loadEnvFile 사용 — 추가 의존성 없음.
import { existsSync } from 'node:fs';

const envPath = '.env';
if (existsSync(envPath)) {
  try {
    process.loadEnvFile(envPath);
    console.log(`[env] .env 로드됨`);
  } catch (e) {
    console.warn(`[env] .env 로드 실패:`, (e as Error).message);
  }
}
