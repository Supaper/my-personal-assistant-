import type { CardNewsSlideContent } from './cardnews-schema.ts';

/**
 * 1080×1080 정사각형 카드뉴스 슬라이드 HTML.
 * 고정 레이아웃에 텍스트만 슬라이드별로 치환한다(PRD 4.4 렌더링 파이프라인).
 */
export function renderSlideHtml(slide: CardNewsSlideContent, index: number, total: number): string {
  const kind = index === 1 ? 'hook' : index === total ? 'question' : 'body';
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    html,body { width:1080px; height:1080px; }
    body {
      font-family:'Noto Sans KR', system-ui, sans-serif;
      background: linear-gradient(160deg, #1e3a8a 0%, #2563eb 55%, #3b82f6 100%);
      color:#fff; display:flex; flex-direction:column; justify-content:center;
      padding:110px 96px; position:relative;
    }
    .kicker { font-size:30px; font-weight:700; opacity:.85; letter-spacing:.02em; margin-bottom:28px; }
    .title { font-size:${kind === 'hook' ? 82 : 60}px; font-weight:900; line-height:1.22; }
    .subtitle { font-size:38px; font-weight:400; line-height:1.5; margin-top:36px; opacity:.95; }
    .question .title { font-size:56px; }
    .pageno { position:absolute; bottom:56px; right:72px; font-size:26px; opacity:.7; }
    .brand { position:absolute; bottom:56px; left:72px; font-size:26px; opacity:.7; font-weight:700; }
  </style></head>
  <body class="${kind}">
    <div class="kicker">${kickerFor(kind)}</div>
    <div class="title">${esc(slide.title)}</div>
    ${slide.body ? `<div class="subtitle">${esc(slide.body)}</div>` : ''}
    <div class="brand">weekly card</div>
    <div class="pageno">${index} / ${total}</div>
  </body></html>`;
}

function kickerFor(kind: string): string {
  if (kind === 'hook') return '이번 주 이야기';
  if (kind === 'question') return '오늘의 질문';
  return '';
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
