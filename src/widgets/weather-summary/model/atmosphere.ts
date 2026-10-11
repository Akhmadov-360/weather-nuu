export type AtmosphereKind = 'snow' | 'heat' | 'calm';

const SNOW_AT_OR_BELOW = 2;
const HEAT_AT_OR_ABOVE = 29;

/**
 * What the temperature card's background does. Only outdoor air snows or
 * shimmers; the classroom stays calm whatever the number says.
 */
export function atmosphereFor(temp: number, source: 'room' | 'street'): AtmosphereKind {
  if (source === 'room') return 'calm';
  if (temp <= SNOW_AT_OR_BELOW) return 'snow';
  if (temp >= HEAT_AT_OR_ABOVE) return 'heat';
  return 'calm';
}

/** [temperature, hue, saturation%] keypoints: icy blue, slate, warm paper, amber, hot orange. */
const KEYPOINTS: [number, number, number][] = [
  [-20, 212, 70],
  [5, 205, 55],
  [15, 200, 25],
  [22, 38, 40],
  [30, 24, 75],
  [40, 14, 80],
];

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

function hueAndSaturation(temp: number): [number, number] {
  const t = Math.min(KEYPOINTS[KEYPOINTS.length - 1]![0], Math.max(KEYPOINTS[0]![0], temp));
  for (let i = 0; i < KEYPOINTS.length - 1; i++) {
    const [t0, h0, s0] = KEYPOINTS[i]!;
    const [t1, h1, s1] = KEYPOINTS[i + 1]!;
    if (t <= t1) {
      const k = (t - t0) / (t1 - t0);
      return [lerp(h0, h1, k), lerp(s0, s1, k)];
    }
  }
  const last = KEYPOINTS[KEYPOINTS.length - 1]!;
  return [last[1], last[2]];
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const a = sat * Math.min(light, 1 - light);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    const v = light - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(v * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

/** Gradient stops behind the upper part of the temperature card: a light wash in the light theme, a deep one in the dark. */
export function temperatureTint(temp: number, theme: 'light' | 'dark'): { from: string; to: string } {
  const [h, s] = hueAndSaturation(temp);
  return theme === 'light'
    ? { from: hslToHex(h, s, 90), to: hslToHex(h, s * 0.5, 97) }
    : { from: hslToHex(h, s * 0.8, 20), to: hslToHex(h, s * 0.6, 12) };
}

const MERCURY: Record<'light' | 'dark', [number, string][]> = {
  light: [
    [-20, '#2B6CB0'],
    [5, '#3A86C8'],
    [15, '#B8860B'],
    [25, '#D9731A'],
    [40, '#B0342C'],
  ],
  dark: [
    [-20, '#6CA6EE'],
    [5, '#7FB5E8'],
    [15, '#E0B84A'],
    [25, '#F29B4B'],
    [40, '#F2866B'],
  ],
};

const hexChannel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);

/** Colour of the mercury: cold blue to hot red, clamped to the −20…40 °C scale, and always visible on the card surface. */
export function thermometerColor(temp: number, theme: 'light' | 'dark'): string {
  const stops = MERCURY[theme];
  const t = Math.min(stops[stops.length - 1]![0], Math.max(stops[0]![0], temp));
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i]!;
    const [t1, c1] = stops[i + 1]!;
    if (t <= t1) {
      const k = (t - t0) / (t1 - t0);
      const channel = (n: number) =>
        Math.round(lerp(hexChannel(c0, n), hexChannel(c1, n), k))
          .toString(16)
          .padStart(2, '0');
      return `#${channel(0)}${channel(1)}${channel(2)}`;
    }
  }
  return stops[stops.length - 1]![1];
}
