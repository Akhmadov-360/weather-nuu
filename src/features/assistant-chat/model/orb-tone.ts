import { categorize, categoryTone, getStandard, type AqiTone } from '@/shared/lib/air-quality';

/** The colour family of the assistant's orb: the air as the dashboard shows it now, or neutral when there is no reading. */
export type OrbTone = AqiTone | 'idle';

/** Green and teal when the dust is low, amber when it is raised, orange and rose when it is bad (same bands as the dust card). */
export function orbToneFor(pm25: number | null | undefined): OrbTone {
  const category = categorize(getStandard(), 'pm25', pm25);
  return category ? categoryTone(category) : 'idle';
}
