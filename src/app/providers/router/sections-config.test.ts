import { describe, expect, it } from 'vitest';
import { ROOM_CONFIG, STREET_CONFIG } from '@/entities/weather/model/weather.constants';
import { SECTIONS } from '@/shared/config/sections';

/** The registry repeats the dashboards' keys (shared cannot import entities); this keeps the two from drifting. */
describe('sections registry against the dashboard configs', () => {
  it.each([
    ['room', ROOM_CONFIG],
    ['street', STREET_CONFIG],
  ] as const)('%s uses the same title, nav key and path as its config', (id, config) => {
    const section = SECTIONS.find((s) => s.id === id)!;
    expect(section.titleKey).toBe(config.titleKey);
    expect(section.navKey).toBe(config.navKey);
    expect(section.to).toBe(config.oppositePath === '/room' ? '/street' : '/room');
  });
});
