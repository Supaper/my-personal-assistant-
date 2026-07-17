/** 필수 환경 변수를 읽고, 없으면 명확한 에러를 던진다. */
export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === '') {
    throw new Error(`환경 변수 ${name} 가 설정되지 않았습니다. (GitHub Secrets 또는 .env 확인)`);
  }
  return v;
}

/** 선택 환경 변수. 없으면 기본값. */
export function optionalEnv(name: string, fallback = ''): string {
  return process.env[name]?.trim() || fallback;
}
