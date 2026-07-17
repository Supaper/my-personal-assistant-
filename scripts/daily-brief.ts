/**
 * 매일 아침 브리핑 워크플로우 (PRD 4.1 ~ 4.3).
 * 1) Google Calendar 오늘 일정
 * 2) 경제 뉴스 수집 + Claude 요약
 * 3) 교육 뉴스 수집 + Claude 요약(카테고리 태깅)
 * 4) Firestore 저장
 * 5) 통합 이메일 HTML 생성 → scripts/.tmp/email.html
 *
 * 실행: npm run brief:daily  (GitHub Actions daily-brief.yml)
 */
import './lib/bootstrap.ts';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { getDb } from './lib/firestore.ts';
import { fetchTodayEvents } from './lib/calendar.ts';
import { searchNaverNews, fetchRss, type RawArticle } from './lib/news.ts';
import { askJson } from './lib/claude.ts';
import { buildBriefEmail } from './lib/email.ts';
import { optionalEnv } from './lib/env.ts';
import {
  DEFAULT_ECONOMY_KEYWORDS,
  DEFAULT_EDUCATION_KEYWORDS,
  type CalendarEvent,
  type EconomyNewsItem,
  type EducationCategory,
  type EducationNewsItem,
} from '../shared/types.ts';

const EMAIL_OUT = 'scripts/.tmp/email.html';

// 경제 RSS(공개 피드). 필요 시 자유롭게 추가/교체.
const ECONOMY_RSS: string[] = [
  'https://www.cnbc.com/id/100003114/device/rss/rss.html', // CNBC Top News
];
// 교육 RSS.
const EDUCATION_RSS: string[] = [];

function todayKey(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}

async function loadKeywords(field: 'economyKeywords' | 'educationKeywords', fallback: string[]) {
  try {
    const snap = await getDb().doc(`config/${field}`).get();
    const data = snap.data() as { keywords?: string[] } | undefined;
    if (data?.keywords?.length) return data.keywords;
  } catch {
    /* 무시하고 기본값 사용 */
  }
  return fallback;
}

async function collectEconomy(): Promise<EconomyNewsItem[]> {
  const keywords = await loadKeywords('economyKeywords', DEFAULT_ECONOMY_KEYWORDS);
  const raw = await gather(keywords, ECONOMY_RSS, 6);
  if (raw.length === 0) return [];
  return askJson<EconomyNewsItem[]>(
    '너는 경제 뉴스 브리핑 편집자다. 저작권 보호를 위해 원문을 복제하지 말고 완전히 재구성한 문장으로만 요약한다. 인용은 15단어 미만으로 제한한다.',
    `아래 기사들 중 중요도 높은 순(정책금리→지수→환율/금리→개별 기사)으로 최대 5개를 골라, 각각 다음 JSON 배열로만 응답하라. 다른 텍스트 금지.
[{"headline":"핵심을 담은 한 줄 제목","summary":"쉬운 말로 2~3문장 요약","source":"출처 도메인","url":"원문 링크","keywords":["키워드1","키워드2","키워드3"]}]

기사 목록:
${serialize(raw)}`,
    3072,
  );
}

async function collectEducation(): Promise<EducationNewsItem[]> {
  const keywords = await loadKeywords('educationKeywords', DEFAULT_EDUCATION_KEYWORDS);
  const raw = await gather(keywords, EDUCATION_RSS, 6);
  if (raw.length === 0) return [];
  const cats: EducationCategory[] = ['유아교육', '특수교육', '교권'];
  return askJson<EducationNewsItem[]>(
    '너는 교육 정책 뉴스 큐레이터다. 원문 복제 없이 재구성된 문장으로만 요약한다.',
    `아래 기사들을 카테고리(${cats.join(', ')})로 분류하고, 각 카테고리별 중요 기사를 골라 최대 6개를 다음 JSON 배열로만 응답하라. 다른 텍스트 금지.
[{"headline":"제목","summary":"2~3문장 요약","source":"출처 도메인","url":"원문 링크","category":"유아교육|특수교육|교권"}]

기사 목록:
${serialize(raw)}`,
    3072,
  );
}

/** 키워드별 네이버 검색 + RSS를 모아 중복 제거. */
async function gather(keywords: string[], feeds: string[], perKeyword: number): Promise<RawArticle[]> {
  const results: RawArticle[] = [];
  for (const kw of keywords) {
    try {
      results.push(...(await searchNaverNews(kw, perKeyword)));
    } catch (e) {
      console.warn(`[news] 네이버 검색 실패(${kw}):`, (e as Error).message);
    }
  }
  for (const feed of feeds) {
    try {
      results.push(...(await fetchRss(feed, perKeyword)));
    } catch (e) {
      console.warn(`[news] RSS 실패(${feed}):`, (e as Error).message);
    }
  }
  const seen = new Set<string>();
  return results.filter((a) => {
    if (!a.link || seen.has(a.link)) return false;
    seen.add(a.link);
    return true;
  });
}

function serialize(items: RawArticle[]): string {
  return items
    .map((a, i) => `${i + 1}. [${a.source}] ${a.title}\n   ${a.description}\n   ${a.link}`)
    .join('\n');
}

async function main() {
  const date = todayKey();

  // 이메일 발송 스텝(if: always())이 파일 부재로 실패하지 않도록,
  // 본격 처리 전에 폴백 본문을 먼저 남겨둔다. 성공 시 실제 본문으로 덮어쓴다.
  await mkdir(dirname(EMAIL_OUT), { recursive: true });
  await writeFile(
    EMAIL_OUT,
    `<p>⚠️ ${date} 브리핑 생성 중 오류가 발생했습니다. Actions 로그를 확인하세요.</p>`,
    'utf8',
  );

  const db = getDb();
  const now = new Date().toISOString();

  // 1) 일정
  let events: CalendarEvent[] = [];
  let eventsFailed = false;
  try {
    events = await fetchTodayEvents();
    await db.doc(`dailyBrief/${date}`).set({ events, generatedAt: now, stale: false });
  } catch (e) {
    eventsFailed = true;
    console.error('[calendar] 실패, 이전 캐시 유지:', (e as Error).message);
    await db.doc(`dailyBrief/${date}`).set({ stale: true, generatedAt: now }, { merge: true });
  }

  // 2) 경제 / 3) 교육 (실패해도 브리핑은 계속)
  const economy = await safe(collectEconomy, '경제');
  const education = await safe(collectEducation, '교육');
  await db.doc(`newsDigest/economy/${date}`).set({ items: economy, generatedAt: now });
  await db.doc(`newsDigest/education/${date}`).set({ items: education, generatedAt: now });

  // 5) 이메일 본문
  const html = buildBriefEmail({
    dateLabel: date,
    events,
    eventsFailed,
    economy,
    education,
    dashboardUrl: optionalEnv('DASHBOARD_URL', 'https://supaper.github.io/my-personal-assistant-/'),
  });
  await mkdir(dirname(EMAIL_OUT), { recursive: true });
  await writeFile(EMAIL_OUT, html, 'utf8');

  console.log(`✅ 브리핑 완료: 일정 ${events.length}건, 경제 ${economy.length}건, 교육 ${education.length}건`);
  console.log(`📧 이메일 본문 → ${EMAIL_OUT}`);
}

async function safe<T>(fn: () => Promise<T[]>, label: string): Promise<T[]> {
  try {
    return await fn();
  } catch (e) {
    console.error(`[${label}] 요약 실패:`, (e as Error).message);
    return [];
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
