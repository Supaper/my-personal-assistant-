// 프론트엔드와 자동화 스크립트가 공유하는 Firestore 데이터 모델 타입.
// PRD 5장 "데이터 모델"과 1:1로 대응한다.

export type EventType = 'allday' | 'meeting' | 'travel' | 'etc';

export interface CalendarEvent {
  title: string;
  start: string; // ISO 8601
  end: string; // ISO 8601
  type: EventType;
}

/** Firestore: dailyBrief/{yyyy-mm-dd} */
export interface DailyBrief {
  events: CalendarEvent[];
  generatedAt: string; // ISO 8601
  /** 캘린더 API 실패 시 true, 이전 캐시를 유지했음을 의미 */
  stale?: boolean;
}

export interface NewsItemBase {
  headline: string;
  summary: string;
  source: string;
  url: string;
}

export interface EconomyNewsItem extends NewsItemBase {
  keywords: string[];
}

export type EducationCategory = '유아교육' | '특수교육' | '교권';

export interface EducationNewsItem extends NewsItemBase {
  category: EducationCategory;
}

/** Firestore: newsDigest/economy/{yyyy-mm-dd} */
export interface EconomyDigest {
  items: EconomyNewsItem[];
  generatedAt: string;
  stale?: boolean;
}

/** Firestore: newsDigest/education/{yyyy-mm-dd} */
export interface EducationDigest {
  items: EducationNewsItem[];
  generatedAt: string;
  stale?: boolean;
}

/** Firestore: config/educationKeywords, config/economyKeywords */
export interface KeywordConfig {
  keywords: string[];
}

export const DEFAULT_EDUCATION_KEYWORDS: string[] = ['유아교육', '특수교육', '교권'];
export const DEFAULT_ECONOMY_KEYWORDS: string[] = ['코스피', '환율', '기준금리', '한국은행'];

/**
 * Firestore 문서 경로 빌더 — 프론트엔드/스크립트가 동일한 경로를 쓰도록 한곳에서 정의.
 * Firestore 문서 경로는 세그먼트 수가 짝수여야 하므로 뉴스 요약은 하위 컬렉션(items)을 둔다.
 * (예: newsDigest/economy/items/{yyyy-mm-dd} → 4세그먼트 문서)
 */
export const fsPaths = {
  dailyBrief: (date: string) => `dailyBrief/${date}`,
  economyDigest: (date: string) => `newsDigest/economy/items/${date}`,
  educationDigest: (date: string) => `newsDigest/education/items/${date}`,
  economyKeywords: 'config/economyKeywords',
  educationKeywords: 'config/educationKeywords',
} as const;
