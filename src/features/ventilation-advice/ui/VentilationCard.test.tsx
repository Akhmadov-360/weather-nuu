// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@/app/providers/i18n/i18n';
import { i18n } from '@/app/providers/i18n/i18n';
import type { VentilationAdvice } from '../model/advice';
import { VentilationCard } from './VentilationCard';

// The (i) is tested on its own (info-hint.test.tsx); here its content is shown in place.
vi.mock('@/shared/ui/info-hint', () => ({
  InfoHint: ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div data-testid="hint" aria-label={label}>
      {children}
    </div>
  ),
}));

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
  it('shows the verdict in large type, the reason and the three numbers with their captions', () => {
    state = { data: advice() };
    render(<VentilationCard enabled />);
    expect(screen.getByText('Откройте окно')).toBeTruthy();
    expect(screen.getByText(/На улице воздух чище, чем в аудитории \(по модели\)/)).toBeTruthy();
    expect(screen.getByText('Пыль PM2.5, мкг/м³')).toBeTruthy();
    expect(screen.getByText('48,2')).toBeTruthy();
    expect(screen.getByText('14,1')).toBeTruthy();
    expect(screen.getByText('17,6')).toBeTruthy();
    expect(screen.getByText('14,9–24,3')).toBeTruthy();
    expect(screen.getByText('В аудитории')).toBeTruthy();
    expect(screen.getByText('На улице (модель)')).toBeTruthy();
    expect(screen.getByText('Через 15 мин')).toBeTruthy();
  });

  it('says in the (i), not on the face of the card, that the dust outside is a model', () => {
    state = { data: advice() };
    render(<VentilationCard enabled />);
    const hint = screen.getByTestId('hint');
    expect(hint.getAttribute('aria-label')).toBe('О данных карточки');
    expect(hint.textContent).toMatch(/модельная оценка, не измерение/);
    expect(hint.textContent).toMatch(/Совет не является медицинской рекомендацией/);
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
    expect(screen.getByTestId('hint').textContent).toMatch(/взята из литературы/);
    cleanup();
    state = { data: advice({ lambda: { value: 8, source: 'data', verified: true, range: [6, 10] } }) };
    render(<VentilationCard enabled />);
    expect(screen.getByTestId('hint').textContent).not.toMatch(/взята из литературы/);
  });

  it('says plainly that there is not enough data, without numbers it does not have', () => {
    state = { data: advice({ verdict: 'unknown', reason: 'no_outdoor_data', outside: null, predicted: null, predictedRange: null, gain: null }) };
    render(<VentilationCard enabled />);
    expect(screen.getByText('Недостаточно данных')).toBeTruthy();
    expect(screen.getByText('Нет данных о пыли на улице.')).toBeTruthy();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId('hint').textContent).not.toMatch(/модельная оценка/);
    expect(screen.getByTestId('hint').textContent).not.toMatch(/взята из литературы/);
  });

  it('says how long to wait when the forecast promises a clean street', () => {
    state = { data: advice({ verdict: 'wait', reason: 'forecast_better', waitHours: 2, predicted: 40.2, predictedRange: null }) };
    render(<VentilationCard enabled />);
    expect(screen.getByText('Подождите')).toBeTruthy();
    expect(screen.getByText(/станет чище примерно через 2 ч/)).toBeTruthy();
  });

  it('says minutes, rounded to five, when the wait is under an hour', () => {
    state = { data: advice({ verdict: 'wait', reason: 'forecast_better', waitHours: 0.7 }) };
    render(<VentilationCard enabled />);
    expect(screen.getByText(/станет чище примерно через 40 мин/)).toBeTruthy();
  });

  it('says that the air outside is above the norm, not that it is worse than the room, when it is cleaner than the room', () => {
    state = { data: advice({ verdict: 'wait', reason: 'forecast_better', waitHours: 2, inside: { pm25: 51.7, at: '2026-11-23T18:16:00.000Z' }, outside: { ...advice().outside!, pm25: 38 } }) };
    render(<VentilationCard enabled />);
    expect(screen.getByText(/Сейчас воздух на улице выше нормы/)).toBeTruthy();
  });

  it('says that the street is not cleaner than the room when it is not', () => {
    state = { data: advice({ verdict: 'wait', reason: 'forecast_better', waitHours: 2, inside: { pm25: 30, at: '2026-11-23T18:16:00.000Z' }, outside: { ...advice().outside!, pm25: 45 } }) };
    render(<VentilationCard enabled />);
    expect(screen.getByText(/Сейчас на улице не чище, чем в аудитории/)).toBeTruthy();
  });

  it('says plainly that the wait has no hours when the answer is older and does not have them', () => {
    state = { data: advice({ verdict: 'wait', reason: 'forecast_better', waitHours: undefined }) };
    render(<VentilationCard enabled />);
    expect(screen.getByText('По прогнозу улица скоро станет чище.')).toBeTruthy();
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
