// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@/app/providers/i18n/i18n';
import { i18n } from '@/app/providers/i18n/i18n';
import type { VentilationAdvice } from '../model/advice';
import { VentilationCard } from './VentilationCard';

type QueryState = { data?: VentilationAdvice | null; isLoading?: boolean; isError?: boolean };
let state: QueryState = {};
vi.mock('../api/ventilation.queries', () => ({ useVentilationAdviceQuery: () => ({ data: undefined, isLoading: false, isError: false, ...state }) }));

const NOW = '2026-11-23T10:05:00.000Z';
const advice = (over: Partial<VentilationAdvice> = {}): VentilationAdvice => ({
  verdict: 'open',
  reason: 'outside_cleaner',
  computedAt: NOW,
  inside: { pm25: 48.2, at: NOW },
  outside: { pm25: 14.1, at: NOW, kind: 'model', source: 'CAMS ENSEMBLE via Open-Meteo', attributionUrl: 'https://open-meteo.com/' },
  outsideTemp: 9.3,
  horizonMinutes: 15,
  predicted: 17.6,
  predictedRange: [14.9, 24.3],
  gain: 30.6,
  lambda: { value: 5, source: 'prior', verified: false, range: null },
  forecast: [],
  ...over,
});

beforeEach(async () => {
  await i18n.changeLanguage('ru');
});
afterEach(() => {
  cleanup();
  state = {};
});

describe('VentilationCard', () => {
  it('shows the verdict, the reason and the numbers, with the dust outside marked as a model', () => {
    state = { data: advice() };
    render(<VentilationCard enabled />);
    expect(screen.getByText('Откройте окно')).toBeTruthy();
    expect(screen.getByText(/На улице воздух чище, чем в аудитории \(по модели\)/)).toBeTruthy();
    expect(screen.getByText('48,2')).toBeTruthy();
    expect(screen.getByText('14,1')).toBeTruthy();
    expect(screen.getByText(/Пыль PM2.5 на улице \(модель\)/)).toBeTruthy();
    expect(screen.getByText(/модельная оценка, не измерение/)).toBeTruthy();
    expect(screen.getByText(/Через 15 мин в аудитории/)).toBeTruthy();
    expect(screen.getByText(/14,9–24,3/)).toBeTruthy();
  });

  it('links the source of the model data, safely, as its licence asks', () => {
    state = { data: advice() };
    render(<VentilationCard enabled />);
    const link = screen.getByRole('link', { name: /CAMS через Open-Meteo/ });
    expect(link.getAttribute('href')).toBe('https://open-meteo.com/');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('says that the speed of air exchange is a literature value, and does not say it when it was measured', () => {
    state = { data: advice() };
    render(<VentilationCard enabled />);
    expect(screen.getByText(/взята из литературы/)).toBeTruthy();
    cleanup();
    state = { data: advice({ lambda: { value: 8, source: 'data', verified: true, range: [6, 10] } }) };
    render(<VentilationCard enabled />);
    expect(screen.queryByText(/взята из литературы/)).toBeNull();
  });

  it('says plainly that there is not enough data, without numbers it does not have', () => {
    state = { data: advice({ verdict: 'unknown', reason: 'no_outdoor_data', outside: null, predicted: null, predictedRange: null, gain: null }) };
    render(<VentilationCard enabled />);
    expect(screen.getByText('Недостаточно данных')).toBeTruthy();
    expect(screen.getByText('Нет данных о пыли на улице.')).toBeTruthy();
    expect(screen.queryByText(/Через 15 мин/)).toBeNull();
    expect(screen.queryByText(/модельная оценка/)).toBeNull();
    expect(screen.queryByText(/взята из литературы/)).toBeNull();
  });

  it('is not shown when it is off, when the request failed or when the API is not set', () => {
    state = { data: advice() };
    expect(render(<VentilationCard enabled={false} />).container.firstChild).toBeNull();
    cleanup();
    state = { isError: true };
    expect(render(<VentilationCard enabled />).container.firstChild).toBeNull();
    cleanup();
    state = { data: null };
    expect(render(<VentilationCard enabled />).container.firstChild).toBeNull();
  });

  it('has the texts in the other languages', async () => {
    state = { data: advice({ verdict: 'dont_open', reason: 'outside_dirty' }) };
    await i18n.changeLanguage('en');
    render(<VentilationCard enabled />);
    expect(screen.getByText('Better keep the window shut')).toBeTruthy();
    expect(screen.getByText('The air outside is bad (by the model).')).toBeTruthy();
    cleanup();
    await i18n.changeLanguage('uz');
    render(<VentilationCard enabled />);
    expect(screen.getByText('Ko‘chada havo yomon (model bo‘yicha).')).toBeTruthy();
  });
});
