import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useDebounce from './useDebounce.js';

describe('useDebounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns the initial value so direct search links can load immediately', () => {
    const { result } = renderHook(() => useDebounce('Alien'));
    expect(result.current).toBe('Alien');
  });

  it('waits 450 milliseconds after the latest change', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: '' },
    });
    rerender({ value: 'Ali' });
    act(() => vi.advanceTimersByTime(300));
    rerender({ value: 'Alien' });
    act(() => vi.advanceTimersByTime(449));
    expect(result.current).toBe('');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('Alien');
  });

  it('clears its timer when unmounted', () => {
    const { rerender, unmount } = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: '' },
    });
    rerender({ value: 'Alien' });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
