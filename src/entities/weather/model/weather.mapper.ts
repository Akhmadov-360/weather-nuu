import { z } from 'zod';
import type { WeatherHistoryItem, WeatherLatest } from './weather.types';

const weatherRawSchema = z
  .object({
    fused_temp: z.coerce.number().optional(),
    fusedTemp:  z.coerce.number().optional(), // apps/api WS payload (camelCase contract)
    temp:       z.coerce.number().optional(),
    hum:        z.coerce.number().optional(),
    humidity:   z.coerce.number().optional(),
    bmp_press:  z.coerce.number().optional(),
    bmpPress:   z.coerce.number().optional(), // apps/api WS payload
    pressure:   z.coerce.number().optional(),
    mq5:        z.coerce.number().optional(),
    mq_5:       z.coerce.number().optional(),
    mq3:        z.coerce.number().optional(),
    mq_3:       z.coerce.number().optional(),
    date:       z.string().optional(),
    recordedAt: z.string().optional(), // apps/api WS payload
    created_at: z.string().optional(),
    timestamp:  z.string().optional(),
  })
  .passthrough();

type WeatherRaw = z.infer<typeof weatherRawSchema>;

const weatherListSchema = z.union([
  z.array(weatherRawSchema),
  z.object({ data: z.array(weatherRawSchema) }),
  z.object({ items: z.array(weatherRawSchema) }), // apps/api /v1/sensors/:source/history shape
]);

/**
 * Нормализует дату из API в ISO-строку.
 *
 * API присылает несколько форматов:
 *   "10-05 10:15"           — MM-DD HH:mm (без года) — основной формат
 *   "2025-10-05 10:15:00"   — полный формат (если починят бэк)
 *   "2001-10-05 10:00:00"   — баг прошивки: Unix timestamp в секундах
 *                             интерпретированный как миллисекунды
 *
 * Возвращает epoch (0) для заведомо некорректных дат — они будут
 * отфильтрованы на уровне MIN_VALID_TS в filter-by-range.
 */
function parseApiDate(raw: string | undefined | null): string {
  if (!raw) return new Date(0).toISOString();

  const trimmed = raw.trim();

  // ── Case 1: полный формат с годом ────────────────────────────────────
  // Примеры: "2025-10-05 10:15:00", "2025-10-05T10:15:00Z"
  if (/^\d{4}[-/]/.test(trimmed)) {
    // Браузеры по-разному парсят "YYYY-MM-DD HH:mm:ss" — явно заменяем пробел на T
    const d = new Date(trimmed.replace(' ', 'T'));
    if (!Number.isNaN(d.getTime())) {
      if (d.getFullYear() >= 2020) return d.toISOString();
      // Год < 2020 → corrupted timestamp → sentinel
      return new Date(0).toISOString();
    }
  }

  // ── Case 2: "DD-MM HH:mm" или "DD-MM HH:mm:ss" (без года) ───────────
  // Формат сенсора: день-месяц, НЕ месяц-день.
  // "09-05 11:00" = 9 мая, 11:00 (не 5 сентября).
  const short = trimmed.match(
    /^(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (short) {
    const [, day, month, hh, mn, ss = '0'] = short;
    const now = new Date();
    const candidate = new Date(
      now.getFullYear(),
      Number(month) - 1, // month → 0-indexed
      Number(day),
      Number(hh),
      Number(mn),
      Number(ss),
    );

    // Если дата оказалась в будущем (больше чем на сутки вперёд) →
    // скорее всего запись прошлого года, отнимаем год.
    if (candidate.getTime() > now.getTime() + 86_400_000) {
      candidate.setFullYear(now.getFullYear() - 1);
    }

    return candidate.toISOString();
  }

  // ── Fallback: epoch → будет отфильтрован ─────────────────────────────
  return new Date(0).toISOString();
}

export function mapWeatherLatest(input: unknown): WeatherLatest {
  const raw = weatherRawSchema.parse(input);
  return normalizeWeather(raw);
}

export function mapWeatherHistory(input: unknown): WeatherHistoryItem[] {
  const parsed = weatherListSchema.parse(input);
  const items  = Array.isArray(parsed) ? parsed : 'items' in parsed ? parsed.items : parsed.data;
  return items.map(normalizeWeather);
}

function normalizeWeather(raw: WeatherRaw): WeatherLatest {
  const rawDate = raw.date ?? raw.recordedAt ?? raw.created_at ?? raw.timestamp;
  return {
    temp:  raw.fusedTemp ?? raw.fused_temp ?? raw.temp ?? 0,
    hum:   raw.hum ?? raw.humidity ?? 0,
    press: raw.bmpPress ?? raw.bmp_press ?? raw.pressure ?? 0,
    mq5:   raw.mq5 ?? raw.mq_5 ?? 0,
    mq3:   raw.mq3 ?? raw.mq_3 ?? 0,
    date:  parseApiDate(rawDate),
  };
}
