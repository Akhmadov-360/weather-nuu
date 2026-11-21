import { describe, expect, it } from 'vitest';
import { summarizeTools } from './tool-summary';

const step = (name: string, status: 'working' | 'done' | 'error') => ({ id: name + status, name, status });

describe('summarizeTools', () => {
  it('is nothing when no tool was used', () => {
    expect(summarizeTools([])).toBeNull();
  });

  it('is one line, not one per tool: three finished tools read as "done" once', () => {
    expect(summarizeTools([step('get_current', 'done'), step('get_current', 'done'), step('get_period_summary', 'done')])).toEqual({ name: 'get_period_summary', status: 'done' });
  });

  it('shows the tool that is working now while others are finished', () => {
    expect(summarizeTools([step('get_current', 'done'), step('compare_room_street', 'working'), step('get_period_summary', 'working')])).toEqual({ name: 'compare_room_street', status: 'working' });
  });

  it('says error only when nothing worked', () => {
    expect(summarizeTools([step('get_current', 'error'), step('get_period_summary', 'error')])).toEqual({ name: 'get_period_summary', status: 'error' });
  });

  it('counts a turn as done if at least one tool gave data', () => {
    expect(summarizeTools([step('get_current', 'error'), step('get_period_summary', 'done')])?.status).toBe('done');
  });
});
