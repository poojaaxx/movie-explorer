import { Link } from 'react-router';
import { ArrowRight, CircleAlert, Heart } from 'lucide-react';
import useFavourites from '../hooks/useFavourites.js';
import MovieGrid from '../components/MovieGrid.jsx';
import EmptyState from '../components/EmptyState.jsx';

export default function Favourites() {
  const { favourites, storageError } = useFavourites();

  return (
    <main id="main-content" className="container page-main">
      <header className="page-heading">
        <span className="eyebrow">YOUR PERSONAL SHORTLIST</span>
        <h1>Your favourites.</h1>
        <p>
          {favourites.length} saved {favourites.length === 1 ? 'movie' : 'movies'} for your next
          movie night.
        </p>
      </header>

      {storageError && (
        <p
          role="alert"
          className="mb-8 flex items-start gap-3 rounded-lg border border-amber-300/20 bg-amber-300/5 p-5 text-sm leading-relaxed text-amber-200"
        >
          <CircleAlert size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
          {storageError}
        </p>
      )}

      {favourites.length ? (
        <MovieGrid movies={favourites} />
      ) : (
        <EmptyState
          title="Keep the movies you want to come back to"
          icon={Heart}
          action={
            <Link to="/" className="button button-primary">
              Discover movies
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          }
        >
          Tap the heart on a movie to save it here. Your favourites stay in this browser, ready for
          your next movie night.
        </EmptyState>
      )}
    </main>
  );
}
