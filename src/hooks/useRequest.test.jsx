// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useRequest from './useRequest.js';
import { requestMovies } from '../services/tmdb.js';

vi.mock('../services/tmdb.js', () => ({ requestMovies: vi.fn() }));

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

describe('useRequest', () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(() => cleanup());

  it('stays idle without an endpoint', () => {
    const { result } = renderHook(() => useRequest(null));
    expect(result.current).toMatchObject({ data: null, error: null, loading: false });
    expect(requestMovies).not.toHaveBeenCalled();
  });

  it('does not refetch when scalar parameters are equivalent or reordered', async () => {
    requestMovies.mockResolvedValue({ results: [] });
    const { result, rerender } = renderHook(({ params }) => useRequest('search', params), {
      initialProps: { params: { query: 'Alien', page: 1 } },
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    rerender({ params: { page: 1, query: 'Alien' } });
    expect(requestMovies).toHaveBeenCalledTimes(1);
  });

  it('hides stale data immediately and ignores stale promises even when cancellation is ignored', async () => {
    const first = deferred();
    const second = deferred();
    requestMovies.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result, rerender } = renderHook(({ query }) => useRequest('search', { query }), {
      initialProps: { query: 'Alien' },
    });
    const firstSignal = requestMovies.mock.calls[0][2].signal;
    rerender({ query: 'Arrival' });
    expect(firstSignal.aborted).toBe(true);
    expect(result.current).toMatchObject({ data: null, error: null, loading: true });

    await act(async () => second.resolve({ results: [{ id: 2 }] }));
    expect(result.current.data.results[0].id).toBe(2);
    await act(async () => first.resolve({ results: [{ id: 1 }] }));
    expect(result.current.data.results[0].id).toBe(2);
  });

  it('does not reuse a completed result when returning to an earlier request', async () => {
    requestMovies.mockResolvedValueOnce({ results: [{ id: 1 }] });
    const next = deferred();
    const returning = deferred();
    requestMovies.mockReturnValueOnce(next.promise).mockReturnValueOnce(returning.promise);
    const { result, rerender } = renderHook(({ query }) => useRequest('search', { query }), {
      initialProps: { query: 'Alien' },
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    rerender({ query: 'Arrival' });
    rerender({ query: 'Alien' });
    expect(result.current).toMatchObject({ data: null, loading: true });
  });

  it('exposes failures and lets the user retry', async () => {
    const error = new Error('Movie data is not configured yet.');
    requestMovies.mockRejectedValueOnce(error).mockResolvedValueOnce({ results: [] });
    const { result } = renderHook(() => useRequest('popular'));
    await waitFor(() => expect(result.current.error).toBe(error));
    act(() => result.current.retry());
    expect(result.current).toMatchObject({ data: null, error: null, loading: true });
    await waitFor(() => expect(result.current.data).toEqual({ results: [] }));
    expect(requestMovies).toHaveBeenCalledTimes(2);
  });

  it('aborts and removes active work on unmount', () => {
    const pending = deferred();
    requestMovies.mockReturnValue(pending.promise);
    const { unmount } = renderHook(() => useRequest('popular'));
    const signal = requestMovies.mock.calls[0][2].signal;
    unmount();
    expect(signal.aborted).toBe(true);
  });
});
