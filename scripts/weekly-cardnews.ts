/**
 * 주 1회 카드뉴스(8장) 자동 제작 워크플로우 (PRD 4.4).
 * 1) Firestore에서 이번 주 소재(cardNewsSubmission/{week}) 조회
 * 2) 없으면 "미입력" 이메일 플래그만 남기고 종료
 * 3) Claude로 8장 구조 JSON 생성
 * 4) HTML 템플릿 → Playwright로 슬라이드별 1080×1080 PNG 캡처
 * 5) cardnews/{week}/{n}.png 저장 + Firestore cardNewsOutput/{week} 기록
 * 6) "카드뉴스 준비 완료" 이메일 본문 생성
 *
 * 실행: npm run cardnews:weekly  (GitHub Actions weekly-cardnews.yml)
 */
import './lib/bootstrap.ts';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { getDb } from './lib/firestore.ts';
import { askJson } from './lib/claude.ts';
import { renderSlideHtml } from './lib/cardnews-template.ts';
import { optionalEnv } from './lib/env.ts';
import type { CardNewsContent } from './lib/cardnews-schema.ts';
import type { CardNewsSlide, CardNewsSubmission } from '../shared/types.ts';

const TOTAL = 8;
const SIZE = 1080;
const SKIP_FLAG = 'scripts/.tmp/cardnews-skip';
const EMAIL_OUT = 'scripts/.tmp/cardnews-email.html';

function weekKey(): string {
  const d = new Date(Date.now() + 9 * 3600_000);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const weekNo =
    1 +
    Math.round(
      ((target.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7,
    );
  return `${target.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

async function generateContent(topic: string): Promise<CardNewsContent> {
  return askJson<CardNewsContent>(
    `너는 신앙 콘텐츠 카드뉴스 작가다. 8장 고정 구조로 쓴다.
- 1장: 시선을 끄는 한 줄 카피 + 짧은 부제
- 2~7장(6장): 소재를 성경적 관점으로 풀되, 비기독교인도 거부감 없이 읽도록 신학 용어 대신 일상 언어·비유·이야기 중심. 각 장 핵심 문장 1개 + 짧은 보충 설명
- 8장: 일상에서 스스로 돌아볼 개방형 질문 1개(예/아니오형 지양)`,
    `주제/소재: "${topic}"

정확히 8개의 슬라이드를 다음 JSON으로만 응답하라. 다른 텍스트 금지.
{"slides":[{"title":"핵심 문장","body":"보충 설명(선택)"}, ... 8개]}`,
    2048,
  );
}

async function main() {
  const week = weekKey();
  const db = getDb();

  const snap = await db.doc(`cardNewsSubmission/${week}`).get();
  const submission = snap.data() as CardNewsSubmission | undefined;

  if (!submission?.topicText?.trim()) {
    console.log(`ℹ️ 이번 주(${week}) 소재 미입력 — 카드뉴스 생성을 건너뜁니다.`);
    await mkdir('scripts/.tmp', { recursive: true });
    await writeFile(SKIP_FLAG, week, 'utf8');
    await writeFile(
      EMAIL_OUT,
      `<p>이번 주(${week}) 카드뉴스 소재가 입력되지 않아 생성을 건너뛰었습니다. 대시보드에서 소재를 입력해 주세요.</p>`,
      'utf8',
    );
    return;
  }

  const content = await generateContent(submission.topicText.trim());
  const slides = content.slides.slice(0, TOTAL);
  if (slides.length !== TOTAL) {
    throw new Error(`Claude가 ${slides.length}장을 반환했습니다(8장 필요).`);
  }

  const outDir = `cardnews/${week}`;
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } });
  const outputSlides: CardNewsSlide[] = [];

  for (let i = 0; i < slides.length; i++) {
    const index = i + 1;
    const html = renderSlideHtml(slides[i], index, TOTAL);
    await page.setContent(html, { waitUntil: 'networkidle' });
    const imagePath = `${outDir}/${index}.png`;
    await page.screenshot({ path: imagePath });
    outputSlides.push({ index, imagePath, text: slides[i].title });
    console.log(`🖼️  슬라이드 ${index}/${TOTAL} → ${imagePath}`);
  }
  await browser.close();

  await db.doc(`cardNewsOutput/${week}`).set({
    slides: outputSlides,
    status: 'generated',
    generatedAt: new Date().toISOString(),
  });

  const dashboardUrl = optionalEnv('DASHBOARD_URL', 'https://supaper.github.io/my-personal-assistant-/');
  await writeFile(
    EMAIL_OUT,
    `<!doctype html><html lang="ko"><body style="font-family:system-ui,'Noto Sans KR',sans-serif;max-width:640px;margin:0 auto;padding:16px">
      <h1 style="font-size:20px">🃏 이번 주 카드뉴스가 준비되었습니다</h1>
      <p>주제: <b>${escapeHtml(submission.topicText.trim())}</b></p>
      <p>8장의 슬라이드가 생성되었습니다. 아래 대시보드에서 미리보고 낱장/zip으로 다운로드하세요.</p>
      <p><a href="${dashboardUrl}" style="background:#2563eb;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">대시보드에서 확인</a></p>
    </body></html>`,
    'utf8',
  );

  console.log(`✅ 카드뉴스 8장 생성 완료 → ${outDir}`);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
