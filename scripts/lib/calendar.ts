import { google } from 'googleapis';
import { requireEnv, optionalEnv } from './env.ts';
import type { CalendarEvent, EventType } from '../../shared/types.ts';

/**
 * Google Calendar에서 오늘(KST 00:00~23:59) 일정을 시간순으로 가져온다.
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

function todayRangeKst(): { start: string; end: string } {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth();
  const d = kst.getUTCDate();
  // KST 자정 = UTC 전날 15:00
  const startUtc = new Date(Date.UTC(y, m, d, -9, 0, 0));
  const endUtc = new Date(Date.UTC(y, m, d, 14, 59, 59));
  return { start: startUtc.toISOString(), end: endUtc.toISOString() };
}
