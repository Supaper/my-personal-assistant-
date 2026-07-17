import { requireEnv } from './env.ts';

export interface RawArticle {
  title: string;
  link: string;
  description: string;
  source: string;
}

/** HTML 엔티티/태그를 제거한 순수 텍스트. */
export function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/**
 * 네이버 뉴스 검색 API. sort=date(최신순), display=최대 100.
 * https://developers.naver.com/docs/serviceapi/search/news/news.md
 */
export async function searchNaverNews(query: string, display = 10): Promise<RawArticle[]> {
  const url = new URL('https://openapi.naver.com/v1/search/news.json');
  url.searchParams.set('query', query);
  url.searchParams.set('display', String(display));
  url.searchParams.set('sort', 'date');

  const res = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': requireEnv('NAVER_CLIENT_ID'),
      'X-Naver-Client-Secret': requireEnv('NAVER_CLIENT_SECRET'),
    },
  });
  if (!res.ok) {
    throw new Error(`네이버 뉴스 API 오류 ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { items?: Array<Record<string, string>> };
  return (data.items ?? []).map((it) => ({
    title: stripHtml(it.title ?? ''),
    link: it.originallink || it.link || '',
    description: stripHtml(it.description ?? ''),
    source: hostOf(it.originallink || it.link || ''),
  }));
}

/** 최소 RSS 파서 — <item>의 title/link/description만 추출. */
export async function fetchRss(feedUrl: string, limit = 10): Promise<RawArticle[]> {
  const res = await fetch(feedUrl);
  if (!res.ok) throw new Error(`RSS 오류 ${res.status}: ${feedUrl}`);
  const xml = await res.text();
  const items: RawArticle[] = [];
  const itemRe = /<item[\s\S]*?<\/item>/gi;
  const matches = xml.match(itemRe) ?? [];
  for (const block of matches.slice(0, limit)) {
    items.push({
      title: stripHtml(pick(block, 'title')),
      link: stripHtml(pick(block, 'link')),
      description: stripHtml(pick(block, 'description')),
      source: hostOf(pick(block, 'link')),
    });
  }
  return items;
}

function pick(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m = block.match(re);
  if (!m) return '';
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
