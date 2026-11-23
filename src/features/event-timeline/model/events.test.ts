import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EventsResponseSchema, hasLittleData, latestEvents, type RoomEvent } from './events';

const example = JSON.parse(readFileSync(new URL('./events.example.json', import.meta.url), 'utf8')) as { response: unknown };

const ev = (cls: RoomEvent['cls'], start: string): RoomEvent => ({ cls, start, detected: start, confirmedByStreet: null });

describe('the events contract', () => {
  it('accepts the documented answer', () => {
    expect(EventsResponseSchema.safeParse(example.response).success).toBe(true);
  });

  it('rejects an unknown class of event', () => {
    const response = example.response as { events: object[] };
    expect(EventsResponseSchema.safeParse({ ...response, events: [{ ...response.events[0], cls: 'heating' }] }).success).toBe(false);
  });
});

describe('latestEvents', () => {
  const events = [ev('ac', '2026-11-23T08:00:00Z'), ev('cleaning', '2026-11-23T13:00:00Z'), ev('ventilation', '2026-11-23T10:00:00Z')];

  it('puts the newest first', () => {
    expect(latestEvents(events).shown.map((e) => e.cls)).toEqual(['cleaning', 'ventilation', 'ac']);
  });

  it('shows at most the limit and counts the rest', () => {
    const r = latestEvents(events, 2);
    expect(r.shown).toHaveLength(2);
    expect(r.hidden).toBe(1);
    expect(latestEvents([]).shown).toEqual([]);
    expect(latestEvents([]).hidden).toBe(0);
  });

  it('does not change the list it was given', () => {
    const copy = [...events];
    latestEvents(events);
    expect(events).toEqual(copy);
  });
});

describe('hasLittleData', () => {
  it('is true when under half of the day has readings', () => {
    expect(hasLittleData({ coverageMinutes: 100 })).toBe(true);
    expect(hasLittleData({ coverageMinutes: 719 })).toBe(true);
    expect(hasLittleData({ coverageMinutes: 720 })).toBe(false);
    expect(hasLittleData({ coverageMinutes: 1400 })).toBe(false);
  });
});
