import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useInfiniteMovies from './useInfiniteMovies.js';
import PopularMovies from '../components/PopularMovies.jsx';
import { requestMovies } from '../services/tmdb.js';

vi.mock('../services/tmdb.js', () => ({ requestMovies: vi.fn() }));
vi.mock('../components/MovieGrid.jsx', () => ({
  default: ({ movies }) => <div>{movies.map((movie) => <p key={movie.id}>{movie.title}</p>)}</div>,
}));

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

function moviePage(ids, totalPages = 2) {
  return {
    results: ids.map((id) => ({ id, title: `Movie ${id}` })),
    total_pages: totalPages,
    total_results: totalPages * 20,
  };
}

beforeEach(() => vi.resetAllMocks());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('useInfiniteMovies', () => {
  it('starts page one automatically and locks repeated calls until a request finishes', async () => {
    const first = deferred();
    const second = deferred();
    requestMovies.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result } = renderHook(() => useInfiniteMovies());

    expect(requestMovies).toHaveBeenCalledWith('popular', { page: 1 }, { signal: expect.any(AbortSignal) });
    act(() => {
      result.current.loadMore();
      result.current.loadMore();
    });
    expect(requestMovies).toHaveBeenCalledTimes(1);

    await act(async () => first.resolve(moviePage([1])));
    act(() => {
      result.current.loadMore();
      result.current.loadMore();
    });
    expect(requestMovies).toHaveBeenCalledTimes(2);
    expect(requestMovies.mock.calls[1][1]).toEqual({ page: 2 });
    expect(result.current.loading).toBe(true);
    await act(async () => second.resolve(moviePage([2])));
    expect(result.current.movies.map((movie) => movie.id)).toEqual([1, 2]);
  });

  it('removes duplicate IDs within and across pages, then stops at the last page', async () => {
    requestMovies.mockResolvedValueOnce(moviePage([1, 1, 2])).mockResolvedValueOnce(moviePage([2, 3, 3]));
    const { result } = renderHook(() => useInfiniteMovies());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.movies.map((movie) => movie.id)).toEqual([1, 2]);

    await act(async () => result.current.loadMore());
    expect(result.current.movies.map((movie) => movie.id)).toEqual([1, 2, 3]);
    expect(result.current).toMatchObject({ hasMore: false, totalResults: 40, error: null });
    act(() => { result.current.loadMore(); });
    expect(requestMovies).toHaveBeenCalledTimes(2);
  });

  it('stops on an empty page while keeping movies already loaded', async () => {
    requestMovies.mockResolvedValueOnce(moviePage([1], 5)).mockResolvedValueOnce(moviePage([], 5));
    const { result } = renderHook(() => useInfiniteMovies());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => result.current.loadMore());
    expect(result.current.movies.map((movie) => movie.id)).toEqual([1]);
    expect(result.current.hasMore).toBe(false);
    act(() => { result.current.loadMore(); });
    expect(requestMovies).toHaveBeenCalledTimes(2);
  });

  it('handles an empty first page without requesting more pages', async () => {
    requestMovies.mockResolvedValue(moviePage([], 0));
    const { result } = renderHook(() => useInfiniteMovies());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current).toMatchObject({ movies: [], error: null, hasMore: false });
    act(() => { result.current.loadMore(); });
    expect(requestMovies).toHaveBeenCalledTimes(1);
  });

  it('preserves loaded movies after a failure and retries the same page explicitly', async () => {
    const error = new Error('The connection was interrupted.');
    requestMovies
      .mockResolvedValueOnce(moviePage([1], 3))
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(moviePage([2], 3));
    const { result } = renderHook(() => useInfiniteMovies());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => result.current.loadMore());

    expect(result.current).toMatchObject({ loading: false, error, hasMore: true });
    expect(result.current.movies.map((movie) => movie.id)).toEqual([1]);
    act(() => {
      result.current.loadMore();
      result.current.loadMore();
    });
    expect(requestMovies).toHaveBeenCalledTimes(2);

    await act(async () => result.current.retry());
    expect(requestMovies.mock.calls[2][1]).toEqual({ page: 2 });
    expect(result.current.movies.map((movie) => movie.id)).toEqual([1, 2]);
    expect(result.current.error).toBeNull();
  });

  it('can retry a failed first page', async () => {
    requestMovies.mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce(moviePage([1], 1));
    const { result } = renderHook(() => useInfiniteMovies());
    await waitFor(() => expect(result.current.error?.message).toBe('Offline'));
    await act(async () => result.current.retry());
    expect(requestMovies.mock.calls[1][1]).toEqual({ page: 1 });
    expect(result.current).toMatchObject({ error: null, loading: false, hasMore: false });
  });

  it('aborts on unmount and ignores a late response', async () => {
    const pending = deferred();
    requestMovies.mockReturnValue(pending.promise);
    const { result, unmount } = renderHook(() => useInfiniteMovies());
    const signal = requestMovies.mock.calls[0][2].signal;
    unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => pending.resolve(moviePage([1])));
    expect(result.current.movies).toEqual([]);
    act(() => { result.current.loadMore(); });
    expect(requestMovies).toHaveBeenCalledTimes(1);
  });

  it.each(['resolve', 'reject'])('ignores a stale StrictMode request that later %ss', async (outcome) => {
    const stale = deferred();
    const current = deferred();
    requestMovies.mockReturnValueOnce(stale.promise).mockReturnValueOnce(current.promise);
    const { result } = renderHook(() => useInfiniteMovies(), { wrapper: StrictMode });
    expect(requestMovies).toHaveBeenCalledTimes(2);
    expect(requestMovies.mock.calls[0][2].signal.aborted).toBe(true);
    expect(requestMovies.mock.calls[1][2].signal.aborted).toBe(false);

    await act(async () => {
      if (outcome === 'resolve') stale.resolve(moviePage([99]));
      else stale.reject(new Error('An old request failed.'));
    });
    expect(result.current).toMatchObject({ movies: [], error: null, loading: true });
    act(() => { result.current.loadMore(); });
    expect(requestMovies).toHaveBeenCalledTimes(2);

    await act(async () => current.resolve(moviePage([1], 1)));
    expect(result.current.movies.map((movie) => movie.id)).toEqual([1]);
    expect(result.current.loading).toBe(false);
  });

  it('never requests a page above the API limit of 500', async () => {
    requestMovies.mockImplementation((_endpoint, { page }) => Promise.resolve(moviePage([page], 800)));
    const { result } = renderHook(() => useInfiniteMovies());
    await waitFor(() => expect(result.current.loading).toBe(false));
    for (let page = 2; page <= 500; page += 1) {
      await act(async () => result.current.loadMore());
    }
    expect(result.current.movies).toHaveLength(500);
    expect(result.current.hasMore).toBe(false);
    act(() => { result.current.loadMore(); });
    expect(requestMovies).toHaveBeenCalledTimes(500);
    expect(requestMovies.mock.calls.at(-1)[1]).toEqual({ page: 500 });
  });
});

function mockIntersectionObservers() {
  const observers = [];
  class TestIntersectionObserver {
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
      observers.push(this);
    }
    observe = vi.fn();
    disconnect = vi.fn();
  }
  vi.stubGlobal('IntersectionObserver', TestIntersectionObserver);
  return observers;
}

describe('PopularMovies scrolling', () => {
  it('prefetches near the sentinel once even when the observer fires twice', async () => {
    const observers = mockIntersectionObservers();
    const next = deferred();
    requestMovies.mockResolvedValueOnce(moviePage([1])).mockReturnValueOnce(next.promise);
    render(<PopularMovies />);
    await screen.findByRole('button', { name: 'Load more movies' });
    await waitFor(() => expect(observers).toHaveLength(1));
    const observer = observers.at(-1);
    expect(observer.options).toEqual({ rootMargin: '400px' });
    expect(observer.observe).toHaveBeenCalledTimes(1);

    act(() => {
      observer.callback([{ isIntersecting: false }]);
      observer.callback([{ isIntersecting: true }]);
      observer.callback([{ isIntersecting: true }]);
    });
    expect(requestMovies).toHaveBeenCalledTimes(2);
    expect(observer.disconnect).toHaveBeenCalled();
    await act(async () => next.resolve(moviePage([2])));
    expect(screen.getByText('Movie 1')).toBeInTheDocument();
    expect(screen.getByText('Movie 2')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load more movies' })).not.toBeInTheDocument();
  });

  it('disconnects its observer on unmount', async () => {
    const observers = mockIntersectionObservers();
    requestMovies.mockResolvedValue(moviePage([1]));
    const { unmount } = render(<PopularMovies />);
    await screen.findByRole('button', { name: 'Load more movies' });
    await waitFor(() => expect(observers).toHaveLength(1));
    const observer = observers.at(-1);
    unmount();
    expect(observer.disconnect).toHaveBeenCalledTimes(1);
  });

  it('keeps the load more button usable when IntersectionObserver is unavailable', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    requestMovies.mockResolvedValueOnce(moviePage([1])).mockResolvedValueOnce(moviePage([2]));
    render(<PopularMovies />);
    fireEvent.click(await screen.findByRole('button', { name: 'Load more movies' }));
    expect(await screen.findByText('Movie 2')).toBeInTheDocument();
    expect(requestMovies).toHaveBeenCalledTimes(2);
    expect(screen.getByText("You've reached the end of the popular movies.")).toBeInTheDocument();
  });

  it('does not retry a scroll failure until the user chooses Try again', async () => {
    const observers = mockIntersectionObservers();
    requestMovies
      .mockResolvedValueOnce(moviePage([1]))
      .mockRejectedValueOnce(new Error('The service is unavailable.'))
      .mockResolvedValueOnce(moviePage([2]));
    render(<PopularMovies />);
    await screen.findByRole('button', { name: 'Load more movies' });
    await waitFor(() => expect(observers).toHaveLength(1));
    const observer = observers.at(-1);
    act(() => observer.callback([{ isIntersecting: true }]));
    expect(await screen.findByRole('alert')).toHaveTextContent('The service is unavailable.');
    expect(screen.getByText('Movie 1')).toBeInTheDocument();
    expect(observer.disconnect).toHaveBeenCalled();

    act(() => {
      observer.callback([{ isIntersecting: true }]);
      observer.callback([{ isIntersecting: true }]);
    });
    expect(requestMovies).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Movie 2')).toBeInTheDocument();
    expect(requestMovies.mock.calls[2][1]).toEqual({ page: 2 });
  });
});
