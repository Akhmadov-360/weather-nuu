import { z } from 'zod';
import type { WeatherHistoryItem, WeatherLatest } from './weather.types';

const weatherRawSchema = z
  .object({
    fused_temp: z.coerce.number().optional(),
    temp: z.coerce.number().optional(),
    hum: z.coerce.number().optional(),
    humidity: z.coerce.number().optional(),
    bmp_press: z.coerce.number().optional(),
    pressure: z.coerce.number().optional(),
    mq5: z.coerce.number().optional(),
    mq_5: z.coerce.number().optional(),
    mq3: z.coerce.number().optional(),
    mq_3: z.coerce.number().optional(),
    date: z.string().optional(),
    created_at: z.string().optional(),
    timestamp: z.string().optional(),
  })
  .passthrough();

type WeatherRaw = z.infer<typeof weatherRawSchema>;

const weatherListSchema = z.union([z.array(weatherRawSchema), z.object({ data: z.array(weatherRawSchema) })]);

export function mapWeatherLatest(input: unknown): WeatherLatest {
  const raw = weatherRawSchema.parse(input);
  return normalizeWeather(raw);
}

export function mapWeatherHistory(input: unknown): WeatherHistoryItem[] {
  const parsed = weatherListSchema.parse(input);
  const items = Array.isArray(parsed) ? parsed : parsed.data;
  return items.map(normalizeWeather);
}

function normalizeWeather(raw: WeatherRaw): WeatherLatest {
  return {
    temp: raw.fused_temp ?? raw.temp ?? 0,
    hum: raw.hum ?? raw.humidity ?? 0,
    press: raw.bmp_press ?? raw.pressure ?? 0,
    mq5: raw.mq5 ?? raw.mq_5 ?? 0,
    mq3: raw.mq3 ?? raw.mq_3 ?? 0,
    date: raw.date ?? raw.created_at ?? raw.timestamp ?? new Date().toISOString(),
  };
}
