/**
 * Google Calendar refresh token 1회 발급 도우미 (PRD 4.1 인증).
 *
 * 사용법 (로컬 PC에서 실행):
 *   1) Google Cloud Console에서 OAuth 2.0 클라이언트(데스크톱/웹) 생성
 *   2) 승인된 리디렉션 URI에 http://localhost:5555 추가
 *   3) .env 에 GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET 입력
 *   4) npm run google:auth
 *   5) 터미널에 출력된 URL을 브라우저에서 열고 캘린더 접근을 허용
 *   6) 발급된 refresh token을 GitHub Secrets(GOOGLE_REFRESH_TOKEN)에 저장
 *
 * refresh token은 최초 동의 시 1회만 발급되므로 prompt=consent 로 강제 재동의한다.
 */
import './lib/bootstrap.ts';
import { createServer } from 'node:http';
import { google } from 'googleapis';
import { requireEnv } from './lib/env.ts';

const PORT = 5555;
const REDIRECT_URI = `http://localhost:${PORT}`;
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

function main() {
  const oauth2 = new google.auth.OAuth2(
    requireEnv('GOOGLE_CLIENT_ID'),
    requireEnv('GOOGLE_CLIENT_SECRET'),
    REDIRECT_URI,
  );

  const authUrl = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });

  console.log('\n다음 URL을 브라우저에서 열어 캘린더 접근을 허용하세요:\n');
  console.log(authUrl);
  console.log(`\n승인 후 브라우저가 ${REDIRECT_URI} 로 리디렉션되면 자동으로 토큰을 발급합니다.\n`);

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '', REDIRECT_URI);
      const code = url.searchParams.get('code');
      if (!code) {
        res.writeHead(400).end('code 파라미터가 없습니다.');
        return;
      }
      const { tokens } = await oauth2.getToken(code);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h2>발급 완료!</h2><p>터미널로 돌아가 refresh token을 확인하세요. 이 창은 닫아도 됩니다.</p>');

      if (!tokens.refresh_token) {
        console.error(
          '\n⚠️ refresh_token이 반환되지 않았습니다. 기존 동의를 취소(https://myaccount.google.com/permissions)한 뒤 다시 시도하세요.',
        );
      } else {
        console.log('\n✅ refresh token 발급 완료. 아래 값을 GitHub Secret GOOGLE_REFRESH_TOKEN 에 저장하세요:\n');
        console.log(tokens.refresh_token);
        console.log('');
      }
      server.close();
    } catch (e) {
      res.writeHead(500).end('토큰 교환 실패');
      console.error('토큰 교환 실패:', (e as Error).message);
      server.close();
    }
  });

  server.listen(PORT, () => {
    console.log(`[oauth] http://localhost:${PORT} 에서 리디렉션 대기 중…`);
  });
}

main();
