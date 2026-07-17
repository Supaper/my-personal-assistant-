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

/** Firestore: cardNewsSubmission/{week} — week 형식: yyyy-Www (예: 2026-W29) */
export interface CardNewsSubmission {
  topicText: string;
  submittedAt: string;
}

export interface CardNewsSlide {
  index: number; // 1..8
  imagePath: string; // 저장소 상대 경로 (예: cardnews/2026-W29/1.png)
  text: string;
}

/** Firestore: cardNewsOutput/{week} */
export interface CardNewsOutput {
  slides: CardNewsSlide[];
  status: 'generated' | 'downloaded';
  generatedAt: string;
}

/** Firestore: config/educationKeywords, config/economyKeywords */
export interface KeywordConfig {
  keywords: string[];
}

export const DEFAULT_EDUCATION_KEYWORDS: string[] = ['유아교육', '특수교육', '교권'];
export const DEFAULT_ECONOMY_KEYWORDS: string[] = ['코스피', '환율', '기준금리', '한국은행'];
