import { describe, expect, it, vi } from 'vitest';
import { createProgressStore } from './progress-store';

describe('createProgressStore', () => {
  it('starts with the text it was given', () => {
    expect(createProgressStore('Готовим файл…').get()).toBe('Готовим файл…');
  });

  it('tells subscribers when the text changes, and returns the new text', () => {
    const store = createProgressStore('a');
    const listener = vi.fn();
    store.subscribe(listener);
    store.set('1,0 MB');
    expect(store.get()).toBe('1,0 MB');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does not wake subscribers for the same text', () => {
    const store = createProgressStore('a');
    const listener = vi.fn();
    store.subscribe(listener);
    store.set('a');
    expect(listener).not.toHaveBeenCalled();
  });

  it('stops telling a subscriber that has left', () => {
    const store = createProgressStore('a');
    const listener = vi.fn();
    const leave = store.subscribe(listener);
    leave();
    store.set('b');
    expect(listener).not.toHaveBeenCalled();
  });
});
