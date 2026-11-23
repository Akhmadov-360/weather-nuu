// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@/app/providers/i18n/i18n';
import { i18n } from '@/app/providers/i18n/i18n';
import type { EventsResponse } from '../model/events';
import { EventTimeline } from './EventTimeline';

type QueryState = { data?: EventsResponse | null; isLoading?: boolean; isError?: boolean };
let state: QueryState = {};
vi.mock('../api/events.queries', () => ({ useRoomEventsQuery: () => ({ data: undefined, isLoading: false, isError: false, ...state }) }));

const response = (over: Partial<EventsResponse> = {}): EventsResponse => ({
  from: '2026-11-22T10:00:00.000Z',
  to: '2026-11-23T10:00:00.000Z',
  events: [],
  method: { name: 'cusum-rules-v1', experimental: true, classes: ['ventilation', 'cleaning', 'ac'] },
  coverageMinutes: 1400,
  ...over,
});
const ev = (cls: EventsResponse['events'][number]['cls'], start: string, confirmedByStreet: boolean | null = null) => ({ cls, start, detected: start, confirmedByStreet });

beforeEach(async () => {
  await i18n.changeLanguage('ru');
  vi.setSystemTime(new Date('2026-11-23T10:00:00Z'));
});
afterEach(() => {
  cleanup();
  state = {};
  vi.useRealTimers();
});

describe('EventTimeline', () => {
  it('lists the events newest first with their names and the note that the system found them', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-23T10:00:00Z'));
    state = { data: response({ events: [ev('ac', '2026-11-23T05:20:00.000Z'), ev('ventilation', '2026-11-23T08:00:00.000Z', true)] }) };
    render(<EventTimeline enabled />);
    const items = screen.getAllByRole('listitem').map((li) => li.textContent ?? '');
    expect(items[0]).toContain('Проветривание');
    expect(items[1]).toContain('Кондиционер');
    expect(screen.getByText(/воздух сблизился с уличным/)).toBeTruthy();
    expect(screen.getByText(/находит система по показаниям/)).toBeTruthy();
  });

  it('shows the time on the clock of the station (Tashkent), not of the visitor', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-23T10:00:00Z'));
    state = { data: response({ events: [ev('cleaning', '2026-11-23T08:00:00.000Z')] }) };
    render(<EventTimeline enabled />);
    expect(screen.getByText('13:00')).toBeTruthy();
  });

  it('says there are no events when the day has readings, and that there is little data when it has not', () => {
    state = { data: response() };
    render(<EventTimeline enabled />);
    expect(screen.getByText('За сутки событий не найдено.')).toBeTruthy();
    cleanup();
    state = { data: response({ coverageMinutes: 100 }) };
    render(<EventTimeline enabled />);
    expect(screen.getByText(/мало показаний/)).toBeTruthy();
  });

  it('counts the events it does not show', () => {
    const many = Array.from({ length: 9 }, (_, i) => ev('cleaning', `2026-11-23T0${i}:00:00.000Z`));
    state = { data: response({ events: many }) };
    render(<EventTimeline enabled />);
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    expect(screen.getByText(/Ещё событий: 3/)).toBeTruthy();
  });

  it('is not shown when it is off, when the request failed or when the API is not set', () => {
    for (const s of [{ data: response() }, { isError: true }, { data: null }]) {
      state = s;
      const { container } = render(<EventTimeline enabled={s.data === undefined && !s.isError ? false : true} />);
      if ('isError' in s || s.data === null) expect(container.firstChild).toBeNull();
      cleanup();
    }
    state = { data: response() };
    const { container } = render(<EventTimeline enabled={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('writes the names in the other languages too', async () => {
    state = { data: response({ events: [ev('ventilation', '2026-11-23T08:00:00.000Z')] }) };
    await i18n.changeLanguage('en');
    render(<EventTimeline enabled />);
    expect(screen.getByText('Ventilation')).toBeTruthy();
    cleanup();
    await i18n.changeLanguage('uz');
    render(<EventTimeline enabled />);
    expect(screen.getByText('Shamollatish')).toBeTruthy();
  });
});
