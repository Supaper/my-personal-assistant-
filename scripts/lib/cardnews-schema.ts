/** Claude가 생성하는 카드뉴스 한 슬라이드의 콘텐츠 구조. */
export interface CardNewsSlideContent {
  /** 슬라이드의 핵심 문장(1장은 후킹 카피, 8장은 질문) */
  title: string;
  /** 보충 설명 또는 부제 (없을 수 있음) */
  body?: string;
}

/** 8장 고정 구조 전체. */
export interface CardNewsContent {
  slides: CardNewsSlideContent[]; // 정확히 8개
}
