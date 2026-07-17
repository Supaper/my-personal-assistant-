import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { fsPaths } from '../shared/types';
import type { DailyBrief, EconomyDigest, EducationDigest } from '../shared/types';

/** yyyy-mm-dd (KST 기준) */
export function todayKey(d = new Date()): string {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

async function readDoc<T>(path: string): Promise<T | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, path));
  return snap.exists() ? (snap.data() as T) : null;
}

export const getDailyBrief = (date = todayKey()) =>
  readDoc<DailyBrief>(fsPaths.dailyBrief(date));

export const getEconomyDigest = (date = todayKey()) =>
  readDoc<EconomyDigest>(fsPaths.economyDigest(date));

export const getEducationDigest = (date = todayKey()) =>
  readDoc<EducationDigest>(fsPaths.educationDigest(date));
