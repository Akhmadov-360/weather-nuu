export type Level = 'off' | 'calm' | 'full';

export type DeviceSignals = {
  reducedMotion: boolean;
  saveData: boolean;
  /** navigator.connection.effectiveType, when the browser reports it. */
  effectiveType?: string;
  /** navigator.deviceMemory (GB), when reported. */
  memoryGb?: number;
  /** navigator.hardwareConcurrency, when reported. */
  cores?: number;
  isPhone: boolean;
};

const WEAK_MEMORY_GB = 2;
const WEAK_CORES = 2;
const PARTICLES_DESKTOP = 120;
const PARTICLES_PHONE = 60;

/**
 * The most a device should be given on its own: motion preferences, a data
 * saver, a slow connection or very little memory or CPU lower it to "calm".
 * What the browser does not report counts for nothing.
 */
export function deviceCap(s: DeviceSignals): Level {
  if (s.reducedMotion || s.saveData) return 'calm';
  if (s.effectiveType === '2g' || s.effectiveType === 'slow-2g' || s.effectiveType === '3g') return 'calm';
  if (s.memoryGb !== undefined && s.memoryGb <= WEAK_MEMORY_GB) return 'calm';
  if (s.cores !== undefined && s.cores <= WEAK_CORES) return 'calm';
  return 'full';
}

/**
 * What actually runs. Without a choice from the user the device cap applies and
 * the FPS governor may step it down; a choice from the user always wins, so a
 * manual "full" is never lowered behind their back.
 */
export function effectiveLevel(userChoice: Level | null, cap: Level, governorDrop: boolean): Level {
  if (userChoice !== null) return userChoice;
  if (governorDrop && cap === 'full') return 'calm';
  return cap;
}

export function particleBudget(level: Level, isPhone: boolean): number {
  if (level !== 'full') return 0;
  return isPhone ? PARTICLES_PHONE : PARTICLES_DESKTOP;
}

const WINDOW_MS = 2000;
const SLOW_FRAME_MS = 25;
const SLOW_WINDOWS_IN_A_ROW = 2;

/**
 * Judges frame times in two-second windows: two slow windows in a row (about
 * 40 FPS or worse) call for a lighter scene. One bad window is forgiven.
 */
export function createFpsGovernor(): { sample(frameMs: number): 'ok' | 'drop' } {
  let elapsed = 0;
  let frames = 0;
  let slowInARow = 0;
  return {
    sample(frameMs: number) {
      elapsed += frameMs;
      frames += 1;
      if (elapsed < WINDOW_MS) return slowInARow >= SLOW_WINDOWS_IN_A_ROW ? 'drop' : 'ok';
      slowInARow = elapsed / frames > SLOW_FRAME_MS ? slowInARow + 1 : 0;
      elapsed = 0;
      frames = 0;
      return slowInARow >= SLOW_WINDOWS_IN_A_ROW ? 'drop' : 'ok';
    },
  };
}
