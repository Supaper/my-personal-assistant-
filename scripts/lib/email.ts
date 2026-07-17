import type { CalendarEvent, EconomyNewsItem, EducationNewsItem } from '../../shared/types.ts';

interface BriefEmailInput {
  dateLabel: string;
  events: CalendarEvent[];
  eventsFailed: boolean;
  economy: EconomyNewsItem[];
  education: EducationNewsItem[];
  dashboardUrl: string;
}

/** 매일 아침 통합 브리핑 이메일 HTML 본문. */
export function buildBriefEmail(input: BriefEmailInput): string {
  const { dateLabel, events, eventsFailed, economy, education, dashboardUrl } = input;

  const scheduleHtml = eventsFailed
    ? `<p style="color:#d97706">⚠️ 일정 갱신에 실패했습니다. 대시보드에서 이전 데이터를 확인하세요.</p>`
    : events.length === 0
      ? `<p>오늘은 특별한 일정이 없습니다.</p>`
      : `<ul>${events
          .map((e) => `<li><b>${fmt(e.start)}</b> ${esc(e.title)} <em>(${e.type})</em></li>`)
          .join('')}</ul>`;

  const economyHtml = newsListHtml(
    economy.map((it) => ({ ...it, sub: it.keywords.join(', ') })),
  );
  const educationHtml = newsListHtml(
    education.map((it) => ({ ...it, sub: it.category })),
  );

  return `<!doctype html><html lang="ko"><body style="font-family:system-ui,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;max-width:640px;margin:0 auto;padding:16px;color:#1a1d21">
    <h1 style="font-size:20px">☀️ ${esc(dateLabel)} 오늘의 브리핑</h1>

    <h2 style="font-size:16px;border-bottom:2px solid #2563eb;padding-bottom:4px">📅 오늘의 일정</h2>
    ${scheduleHtml}

    <h2 style="font-size:16px;border-bottom:2px solid #2563eb;padding-bottom:4px">💹 경제 동향</h2>
    ${economyHtml}

    <h2 style="font-size:16px;border-bottom:2px solid #2563eb;padding-bottom:4px">🎓 교육 이슈</h2>
    ${educationHtml}

    <p style="margin-top:24px">
      <a href="${esc(dashboardUrl)}" style="background:#2563eb;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">대시보드에서 자세히 보기</a>
    </p>
    <p style="color:#9aa0a6;font-size:12px">본 메일은 개인 업무 자동화 어시스턴트가 자동 발송했습니다.</p>
  </body></html>`;
}

function newsListHtml(items: Array<{ headline: string; summary: string; url: string; sub: string }>): string {
  if (items.length === 0) return `<p style="color:#9aa0a6">요약된 뉴스가 없습니다.</p>`;
  return items
    .map(
      (it) => `<div style="margin-bottom:12px">
        <a href="${esc(it.url)}" style="font-weight:600;color:#2563eb;text-decoration:none">${esc(it.headline)}</a>
        ${it.sub ? `<span style="color:#9aa0a6;font-size:12px"> · ${esc(it.sub)}</span>` : ''}
        <div style="font-size:14px;color:#444;margin-top:2px">${esc(it.summary)}</div>
      </div>`,
    )
    .join('');
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '종일';
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' });
}
