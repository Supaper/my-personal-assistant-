import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type {
  DailyBrief,
  EconomyDigest,
  EducationDigest,
  CardNewsOutput,
} from '../shared/types';

/** yyyy-mm-dd (KST 기준) */
export function todayKey(d = new Date()): string {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/** ISO week 문자열 yyyy-Www (예: 2026-W29) — KST 기준 */
export function weekKey(d = new Date()): string {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const target = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const weekNo =
    1 +
    Math.round(
      ((target.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    );
  return `${target.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

async function readDoc<T>(path: string): Promise<T | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, path));
  return snap.exists() ? (snap.data() as T) : null;
}

export const getDailyBrief = (date = todayKey()) =>
  readDoc<DailyBrief>(`dailyBrief/${date}`);

export const getEconomyDigest = (date = todayKey()) =>
  readDoc<EconomyDigest>(`newsDigest/economy/${date}`);

export const getEducationDigest = (date = todayKey()) =>
  readDoc<EducationDigest>(`newsDigest/education/${date}`);

export const getCardNewsOutput = (week = weekKey()) =>
  readDoc<CardNewsOutput>(`cardNewsOutput/${week}`);

export async function submitCardNewsTopic(topicText: string, week = weekKey()): Promise<void> {
  if (!db) throw new Error('Firestore가 설정되지 않았습니다.');
  await setDoc(doc(db, `cardNewsSubmission/${week}`), {
    topicText,
    submittedAt: serverTimestamp(),
  });
}
