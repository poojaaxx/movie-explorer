import { useRef } from 'react';
import { useSearchParams } from 'react-router';
import { ArrowLeft, ArrowRight, Search as SearchIcon, X } from 'lucide-react';
import useDebounce from '../hooks/useDebounce.js';
import useRequest from '../hooks/useRequest.js';
import MovieGrid from '../components/MovieGrid.jsx';
import MovieSkeleton from '../components/MovieSkeleton.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const inputRef = useRef(null);
  const inputValue = (searchParams.get('q') || '').slice(0, 150);
  const query = inputValue.trim();
  const debouncedQuery = useDebounce(query, 450);
  const requestedPage = Number(searchParams.get('page') || 1);
  const page =
    Number.isInteger(requestedPage) && requestedPage >= 1 && requestedPage <= 500
      ? requestedPage
      : 1;
  const waitingForInput = query !== debouncedQuery;
  const request = useRequest(query && !waitingForInput ? 'search' : null, {
    query: debouncedQuery,
    page,
  });
  const loading = Boolean(query) && (waitingForInput || request.loading);
  const movies = request.data?.results || [];
  const totalPages = Math.min(request.data?.total_pages || 0, 500);
  const totalResults = request.data?.total_results || 0;

  function changeQuery(value) {
    const nextValue = value.slice(0, 150);
    const next = new URLSearchParams(searchParams);
    if (nextValue) next.set('q', nextValue);
    else next.delete('q');
    if (nextValue.trim() !== query) next.delete('page');
    setSearchParams(next, { replace: true });
  }

  function changePage(nextPage) {
    const next = new URLSearchParams(searchParams);
    next.set('q', query);
    if (nextPage === 1) next.delete('page');
    else next.set('page', String(nextPage));
    setSearchParams(next);
  }

  function clearSearch() {
    changeQuery('');
    inputRef.current?.focus();
  }

  return (
    <main id="main-content" className="container page-main">
      <header className="page-heading">
        <span className="eyebrow">A WORLD OF STORIES</span>
        <h1>Find your next watch.</h1>
        <p>An old favourite, a new discovery, or that film you keep meaning to see.</p>
      </header>

      <form role="search" onSubmit={(event) => event.preventDefault()} className="mb-10 max-w-2xl">
        <label htmlFor="movie-search" className="mb-3 block text-sm font-medium text-slate-300">
          Movie title
        </label>
        <div className="flex min-h-14 items-center gap-3 rounded-xl border border-white/15 bg-white/4 px-4 focus-within:border-violet-400">
          <SearchIcon size={20} aria-hidden="true" className="shrink-0 text-violet-300" />
          <input
            ref={inputRef}
            id="movie-search"
            type="search"
            name="q"
            value={inputValue}
            maxLength={150}
            onChange={(event) => changeQuery(event.target.value)}
            placeholder="Search by movie title..."
            aria-describedby="search-help"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent py-4 text-sm text-white outline-none placeholder:text-slate-500"
          />
          {inputValue && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear search"
              className="grid size-10 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white"
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>
        <p id="search-help" className="mt-3 text-xs leading-relaxed text-slate-500">
          Results appear as you type. Try an original or translated movie title.
        </p>
      </form>

      <section aria-label="Search results" aria-busy={loading}>
        {query ? (
          <div className="section-heading">
            <div>
              <h2 className="break-words">Results for &ldquo;{query}&rdquo;</h2>
              <p aria-live="polite">
                {loading
                  ? 'Looking for movies...'
                  : request.data
                    ? `${totalResults.toLocaleString()} ${totalResults === 1 ? 'movie' : 'movies'} found`
                    : 'Search the world of cinema.'}
              </p>
            </div>
          </div>
        ) : null}

        {!query ? (
          <EmptyState title="A good movie is one search away" icon={SearchIcon}>
            Enter a title above to find something you would love to watch.
          </EmptyState>
        ) : loading ? (
          <MovieSkeleton />
        ) : request.error ? (
          <ErrorState error={request.error} onRetry={request.retry} />
        ) : movies.length ? (
          <>
            <MovieGrid movies={movies} />
            {totalPages > 1 && (
              <nav
                aria-label="Search result pages"
                className="mt-10 flex flex-wrap items-center justify-center gap-4 sm:gap-6"
              >
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={page <= 1}
                  onClick={() => changePage(page - 1)}
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                  Previous
                </button>
                <span className="text-xs text-slate-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={page >= totalPages}
                  onClick={() => changePage(page + 1)}
                >
                  Next
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </nav>
            )}
          </>
        ) : (
          <EmptyState
            title={page > 1 ? 'No movies on this page' : 'No movies found'}
            icon={SearchIcon}
            action={
              page > 1 ? (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => changePage(1)}
                >
                  Back to first page
                </button>
              ) : undefined
            }
          >
            {page > 1
              ? 'Search results can change. Return to the first page to see what is available.'
              : 'Try a different title or check the spelling. Sometimes a shorter search helps.'}
          </EmptyState>
        )}
      </section>
    </main>
  );
}
