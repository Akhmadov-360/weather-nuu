// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { readViewportBox, useVisualViewportBox } from './useVisualViewportBox';

describe('readViewportBox', () => {
  it('takes the height and the top edge of the visible part, rounded', () => {
    expect(readViewportBox({ height: 640.4, offsetTop: 0 })).toEqual({ top: 0, height: 640 });
    expect(readViewportBox({ height: 410.6, offsetTop: 32.2 })).toEqual({ top: 32, height: 411 });
  });

  it('gives nothing when there is no visual viewport or it has no height', () => {
    expect(readViewportBox(null)).toBeNull();
    expect(readViewportBox(undefined)).toBeNull();
    expect(readViewportBox({ height: 0, offsetTop: 0 })).toBeNull();
  });

  it('never gives a negative top edge', () => {
    expect(readViewportBox({ height: 500, offsetTop: -4 })?.top).toBe(0);
  });
});

describe('useVisualViewportBox', () => {
  const original = Object.getOwnPropertyDescriptor(window, 'visualViewport');
  afterEach(() => {
    if (original) Object.defineProperty(window, 'visualViewport', original);
    else delete (window as unknown as Record<string, unknown>).visualViewport;
  });

  function fakeViewport(height: number, offsetTop = 0) {
    const listeners = new Map<string, Set<() => void>>();
    const viewport = {
      height,
      offsetTop,
      addEventListener: (type: string, fn: () => void) => listeners.set(type, (listeners.get(type) ?? new Set()).add(fn)),
      removeEventListener: (type: string, fn: () => void) => listeners.get(type)?.delete(fn),
    };
    Object.defineProperty(window, 'visualViewport', { value: viewport, configurable: true });
    return { viewport, fire: (type: string) => listeners.get(type)?.forEach((fn) => fn()), count: () => [...listeners.values()].reduce((n, s) => n + s.size, 0) };
  }

  it('follows the visible part when the keyboard comes and goes', () => {
    const vv = fakeViewport(800);
    const { result } = renderHook(() => useVisualViewportBox(true));
    expect(result.current).toEqual({ top: 0, height: 800 });
    act(() => {
      vv.viewport.height = 460;
      vv.fire('resize');
    });
    expect(result.current).toEqual({ top: 0, height: 460 });
    act(() => {
      vv.viewport.height = 800;
      vv.fire('resize');
    });
    expect(result.current).toEqual({ top: 0, height: 800 });
  });

  it('follows the top edge when the page is scrolled under the keyboard', () => {
    const vv = fakeViewport(460, 0);
    const { result } = renderHook(() => useVisualViewportBox(true));
    act(() => {
      vv.viewport.offsetTop = 120;
      vv.fire('scroll');
    });
    expect(result.current).toEqual({ top: 120, height: 460 });
  });

  it('does nothing when it is off, and lets go of the viewport when it is switched off or removed', () => {
    const vv = fakeViewport(800);
    const off = renderHook(() => useVisualViewportBox(false));
    expect(off.result.current).toBeNull();
    expect(vv.count()).toBe(0);
    const on = renderHook(() => useVisualViewportBox(true));
    expect(vv.count()).toBe(2);
    on.unmount();
    expect(vv.count()).toBe(0);
  });

  it('gives nothing in a browser without a visual viewport', () => {
    Object.defineProperty(window, 'visualViewport', { value: undefined, configurable: true });
    expect(renderHook(() => useVisualViewportBox(true)).result.current).toBeNull();
  });
});
