import { useCallback, useEffect, useRef, useState } from 'react';
import { requestMovies } from '../services/tmdb.js';

export default function useInfiniteMovies() {
  const [result, setResult] = useState({
    movies: [],
    loading: true,
    error: null,
    hasMore: true,
    totalResults: 0,
  });
  const mounted = useRef(false);
  const busy = useRef(false);
  const nextPage = useRef(1);
  const hasMore = useRef(true);
  const failed = useRef(false);
  const activeRequest = useRef(null);

  const loadNextPage = useCallback(async (retryFailed = false) => {
    if (!mounted.current || busy.current || !hasMore.current) return;
    // Scrolling must wait for an explicit retry after a failed request.
    if (failed.current && !retryFailed) return;

    const page = nextPage.current;
    const controller = new AbortController();
    activeRequest.current = controller;
    // The ref locks immediately, before React renders a new loading state.
    busy.current = true;
    failed.current = false;
    setResult((previous) => ({ ...previous, loading: true, error: null }));

    try {
      const data = await requestMovies('popular', { page }, { signal: controller.signal });
      // A cancelled request may still resolve if the transport ignores its signal.
      if (controller.signal.aborted || activeRequest.current !== controller) return;

      const incomingMovies = Array.isArray(data.results) ? data.results : [];
      const lastPage = Math.min(data.total_pages || 1, 500);
      const moreAvailable = incomingMovies.length > 0 && page < lastPage;
      nextPage.current = page + 1;
      hasMore.current = moreAvailable;

      setResult((previous) => {
        const movieIds = new Set(previous.movies.map((movie) => movie.id));
        const newMovies = incomingMovies.filter((movie) => {
          if (movieIds.has(movie.id)) return false;
          movieIds.add(movie.id);
          return true;
        });
        return {
          movies: [...previous.movies, ...newMovies],
          loading: false,
          error: null,
          hasMore: moreAvailable,
          totalResults: data.total_results || 0,
        };
      });
    } catch (error) {
      if (controller.signal.aborted || activeRequest.current !== controller) return;
      failed.current = true;
      setResult((previous) => ({ ...previous, loading: false, error }));
    } finally {
      // StrictMode can start a replacement request before the cancelled one settles.
      if (activeRequest.current === controller) {
        busy.current = false;
        activeRequest.current = null;
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    loadNextPage();
    return () => {
      mounted.current = false;
      activeRequest.current?.abort();
      activeRequest.current = null;
      busy.current = false;
    };
  }, [loadNextPage]);

  const loadMore = useCallback(() => loadNextPage(), [loadNextPage]);
  const retry = useCallback(() => loadNextPage(true), [loadNextPage]);

  return { ...result, loadMore, retry };
}
