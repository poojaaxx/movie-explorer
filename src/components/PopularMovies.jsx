import { useEffect, useRef } from 'react';
import useInfiniteMovies from '../hooks/useInfiniteMovies.js';
import MovieGrid from './MovieGrid.jsx';
import MovieSkeleton from './MovieSkeleton.jsx';
import ErrorState from './ErrorState.jsx';
import EmptyState from './EmptyState.jsx';

export default function PopularMovies() {
  const { movies, loading, error, hasMore, totalResults, loadMore, retry } = useInfiniteMovies();
  const sentinel = useRef(null);
  const loadedCount = totalResults > 0
    ? `${movies.length} of ${totalResults.toLocaleString()} movies loaded`
    : `${movies.length} movies loaded`;

  useEffect(() => {
    if (loading || error || !hasMore || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMore();
    }, { rootMargin: '400px' });
    if (sentinel.current) observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [loading, error, hasMore, loadMore]);

  return (
    <section className="content-section" aria-labelledby="popular-heading">
      <div className="section-heading">
        <div>
          <h2 id="popular-heading">Popular right now</h2>
          <p>A good place to start when you can't decide.</p>
        </div>
      </div>
      {movies.length > 0 && <MovieGrid movies={movies} />}
      {loading && <MovieSkeleton count={movies.length ? 6 : 12} />}
      {error && <ErrorState error={error} onRetry={retry} />}
      {!loading && !error && movies.length === 0 && (
        <EmptyState title="No movies just yet">Check back in a little while.</EmptyState>
      )}
      <div ref={sentinel} className="load-more-section">
        {movies.length > 0 && hasMore && !error && (
          <button className="button button-secondary" onClick={loadMore} disabled={loading}>
            {loading ? 'Loading more movies...' : 'Load more movies'}
          </button>
        )}
        {movies.length > 0 && (
          <p className="results-count" role="status">
            {hasMore ? loadedCount : "You've reached the end of the popular movies."}
          </p>
        )}
      </div>
    </section>
  );
}
