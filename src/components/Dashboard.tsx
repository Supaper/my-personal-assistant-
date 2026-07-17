import { useEffect, useState } from 'react';
import type { AuthState } from '../useAuth';
import type { DailyBrief, EconomyDigest, EducationDigest } from '../../shared/types';
import { getDailyBrief, getEconomyDigest, getEducationDigest, todayKey } from '../data';

export function Dashboard({ authState }: { authState: AuthState }) {
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [economy, setEconomy] = useState<EconomyDigest | null>(null);
  const [education, setEducation] = useState<EducationDigest | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [b, ec, ed] = await Promise.all([
          getDailyBrief(),
          getEconomyDigest(),
          getEducationDigest(),
        ]);
        setBrief(b);
        setEconomy(ec);
        setEducation(ed);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  return (
    <div className="dashboard">
      <header className="topbar">
        <div>
          <strong>오늘의 브리핑</strong>
          <span className="muted"> · {todayKey()}</span>
        </div>
        <button className="btn-ghost" onClick={() => void authState.logout()}>
          로그아웃
        </button>
      </header>

      <main className="grid">
        <ScheduleCard brief={brief} loaded={loaded} />
        <EconomyCard digest={economy} loaded={loaded} />
        <EducationCard digest={education} loaded={loaded} />
      </main>
    </div>
  );
}

function ScheduleCard({ brief, loaded }: { brief: DailyBrief | null; loaded: boolean }) {
  return (
    <section className="card">
      <h2>📅 오늘의 일정</h2>
      {!loaded && <p className="muted">불러오는 중…</p>}
      {loaded && !brief && <p className="muted">아직 오늘 일정 데이터가 없습니다.</p>}
      {brief?.stale && <span className="badge-warn">일정 갱신 실패(이전 데이터)</span>}
      {brief && brief.events.length === 0 && <p>오늘은 특별한 일정이 없습니다.</p>}
      {brief && brief.events.length > 0 && (
        <ul className="timeline">
          {brief.events.map((e, i) => (
            <li key={i}>
              <span className="time">{formatTime(e.start)}</span>
              <span className="title">{e.title}</span>
              <span className={`tag tag-${e.type}`}>{e.type}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EconomyCard({ digest, loaded }: { digest: EconomyDigest | null; loaded: boolean }) {
  return (
    <section className="card">
      <h2>💹 경제 동향</h2>
      {!loaded && <p className="muted">불러오는 중…</p>}
      {loaded && !digest && <p className="muted">아직 경제 뉴스 요약이 없습니다.</p>}
      <ul className="news">
        {digest?.items.map((it, i) => (
          <li key={i}>
            <a href={it.url} target="_blank" rel="noreferrer">
              {it.headline}
            </a>
            <p>{it.summary}</p>
            <div className="chips">
              {it.keywords.map((k) => (
                <span key={k} className="chip">
                  {k}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EducationCard({ digest, loaded }: { digest: EducationDigest | null; loaded: boolean }) {
  return (
    <section className="card">
      <h2>🎓 교육 이슈</h2>
      {!loaded && <p className="muted">불러오는 중…</p>}
      {loaded && !digest && <p className="muted">아직 교육 뉴스 요약이 없습니다.</p>}
      <ul className="news">
        {digest?.items.map((it, i) => (
          <li key={i}>
            <span className={`chip chip-cat`}>{it.category}</span>{' '}
            <a href={it.url} target="_blank" rel="noreferrer">
              {it.headline}
            </a>
            <p>{it.summary}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Seoul',
  });
}
