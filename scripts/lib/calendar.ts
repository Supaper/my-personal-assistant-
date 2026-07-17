import { google } from 'googleapis';
import ical from 'node-ical';
import { requireEnv, optionalEnv } from './env.ts';
import type { CalendarEvent, EventType } from '../../shared/types.ts';

/**
 * 오늘 일정을 가져온다. 두 가지 소스를 지원하며 우선순위는 다음과 같다:
 *   1) GOOGLE_CALENDAR_ICS_URL — 구글 캘린더 "비공개 iCal 주소"(OAuth 불필요, 권장)
 *   2) OAuth2 refresh token (GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN)
 */
export async function fetchTodayEventsAuto(): Promise<CalendarEvent[]> {
  const icsUrl = optionalEnv('GOOGLE_CALENDAR_ICS_URL');
  if (icsUrl) return fetchTodayEventsFromIcs(icsUrl);
  return fetchTodayEvents();
}

/**
 * 구글 캘린더 비공개 iCal(ICS) 주소에서 오늘(KST) 일정을 파싱한다.
 * 반복 일정(RRULE)은 오늘 발생분만 전개하고, 제외일(EXDATE)은 건너뛴다.
 */
export async function fetchTodayEventsFromIcs(url: string): Promise<CalendarEvent[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ICS 다운로드 실패 ${res.status}`);
  const data = ical.sync.parseICS(await res.text());

  const { startDate, endDate } = todayRangeKstDates();
  const events: CalendarEvent[] = [];

  for (const key of Object.keys(data)) {
    const ev = data[key];
    if (!ev || ev.type !== 'VEVENT' || !ev.start) continue;

    const isAllDay = (ev as { datetype?: string }).datetype === 'date';
    const durationMs = ev.end ? +ev.end - +ev.start : 0;

    // 시작 시각 후보들(단발 또는 반복 전개)
    const starts: Date[] = [];
    if (ev.rrule) {
      const exdates = Object.values(ev.exdate ?? {}).map((d) => +new Date(d as Date));
      for (const occ of ev.rrule.between(startDate, endDate, true)) {
        if (!exdates.includes(+occ)) starts.push(occ);
      }
    } else if (+ev.start < +endDate && +ev.start + durationMs >= +startDate) {
      starts.push(ev.start as Date);
    }

    for (const s of starts) {
      const e = new Date(+s + durationMs);
      events.push({
        title: ev.summary ?? '(제목 없음)',
        start: s.toISOString(),
        end: e.toISOString(),
        type: classifyEvent(ev.summary ?? '', isAllDay),
      });
    }
  }

  events.sort((a, b) => a.start.localeCompare(b.start));
  return events;
}

/**
 * Google Calendar API(OAuth2)에서 오늘(KST 00:00~23:59) 일정을 시간순으로 가져온다.
 * OAuth2 refresh token으로 access token을 갱신해 사용한다.
 */
export async function fetchTodayEvents(): Promise<CalendarEvent[]> {
  const oauth2 = new google.auth.OAuth2(
    requireEnv('GOOGLE_CLIENT_ID'),
    requireEnv('GOOGLE_CLIENT_SECRET'),
  );
  oauth2.setCredentials({ refresh_token: requireEnv('GOOGLE_REFRESH_TOKEN') });

  const calendar = google.calendar({ version: 'v3', auth: oauth2 });
  const calendarId = optionalEnv('GOOGLE_CALENDAR_ID', 'primary');

  const { start, end } = todayRangeKst();

  const res = await calendar.events.list({
    calendarId,
    timeMin: start,
    timeMax: end,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return (res.data.items ?? []).map((e) => {
    const isAllDay = Boolean(e.start?.date && !e.start?.dateTime);
    return {
      title: e.summary ?? '(제목 없음)',
      start: e.start?.dateTime ?? e.start?.date ?? '',
      end: e.end?.dateTime ?? e.end?.date ?? '',
      type: classifyEvent(e.summary ?? '', isAllDay),
    };
  });
}

function classifyEvent(title: string, isAllDay: boolean): EventType {
  if (isAllDay) return 'allday';
  const t = title.toLowerCase();
  if (/(회의|미팅|meeting|회의실|콜|call)/.test(t)) return 'meeting';
  if (/(이동|출장|방문|travel|픽업|공항)/.test(t)) return 'travel';
  return 'etc';
}

function todayRangeKstDates(): { startDate: Date; endDate: Date } {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth();
  const d = kst.getUTCDate();
  // KST 자정 = UTC 기준 그 날 -9시. 하루 끝은 +14:59:59.
  return {
    startDate: new Date(Date.UTC(y, m, d, -9, 0, 0)),
    endDate: new Date(Date.UTC(y, m, d, 14, 59, 59)),
  };
}

function todayRangeKst(): { start: string; end: string } {
  const { startDate, endDate } = todayRangeKstDates();
  return { start: startDate.toISOString(), end: endDate.toISOString() };
}
