import { Link } from 'react-router';
import { ArrowRight, Play, Star, TrendingUp } from 'lucide-react';
import useRequest from '../hooks/useRequest.js';
import MovieImage from '../components/MovieImage.jsx';
import MovieGrid from '../components/MovieGrid.jsx';
import MovieSkeleton from '../components/MovieSkeleton.jsx';
import ErrorState from '../components/ErrorState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import PopularMovies from '../components/PopularMovies.jsx';
import { formatRating, formatYear } from '../utils/movies.js';

function MovieSection({ title, subtitle, icon: Icon, request }) {
  return (
    <section className="content-section">
      <div className="section-heading">
        <div>
          <h2>
            {Icon && <Icon size={20} aria-hidden="true" />}
            {title}
          </h2>
          <p>{subtitle}</p>
        </div>
      </div>
      {request.loading ? (
        <MovieSkeleton />
      ) : request.error ? (
        <ErrorState error={request.error} onRetry={request.retry} />
      ) : request.data?.results?.length ? (
        <MovieGrid movies={request.data.results.slice(0, 12)} />
      ) : (
        <EmptyState title="No movies just yet">Check back in a little while.</EmptyState>
      )}
    </section>
  );
}

export default function Home() {
  const trending = useRequest('trending');
  const featured = trending.data?.results?.find((movie) => movie.backdrop_path && movie.overview);
  return (
    <>
      <section
        className={`hero ${!featured ? 'hero-placeholder' : ''}`}
        aria-label="Featured movie"
      >
        {featured && (
          <MovieImage
            path={featured.backdrop_path}
            size="w1280"
            alt=""
            className="hero-backdrop"
            eager
          />
        )}
        <div className="hero-shade" />
        <div className="container hero-inner">
          <div className="hero-copy">
            <span className="hero-label">
              <span />
              YOUR NEXT GREAT WATCH
            </span>
            <h1>{featured?.title || 'Good stories.\nGreat discoveries.'}</h1>
            {featured && (
              <div className="hero-meta">
                <span className="rating">
                  <Star size={15} fill="currentColor" aria-hidden="true" />
                  {formatRating(featured.vote_average)}
                </span>
                <span>{formatYear(featured.release_date)}</span>
                <span className="hero-tag">Trending this week</span>
              </div>
            )}
            <p>
              {featured?.overview ||
                'From the films everyone’s talking about to your next unexpected favourite. Find something worth watching.'}
            </p>
            <div className="hero-actions">
              {featured ? (
                <Link to={`/movie/${featured.id}`} className="button button-primary">
                  <Play size={17} fill="currentColor" aria-hidden="true" />
                  Explore movie
                </Link>
              ) : (
                <Link to="/search" className="button button-primary">
                  Find a movie
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              )}
              <a href="#trending" className="button button-ghost">
                Browse movies
                <ArrowRight size={17} aria-hidden="true" />
              </a>
            </div>
          </div>
          <div className="hero-note">
            <span className="hero-note-line" />
            <span>
              DISCOVER SOMETHING
              <br />
              <strong>worth your time.</strong>
            </span>
          </div>
        </div>
        {featured && (
          <div className="container hero-feature-caption">
            <span>IN THE SPOTLIGHT</span>
            <span>{featured.title}</span>
          </div>
        )}
      </section>
      <main id="main-content" className="container home-content">
        <div className="discovery-intro">
          <div>
            <span className="eyebrow">THE WORLD OF CINEMA, ONE FILM AT A TIME</span>
            <h2>
              Find your next favourite<span>.</span>
            </h2>
          </div>
          <Link to="/search" className="text-link">
            Explore all movies
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <div id="trending">
          <MovieSection
            title="Trending this week"
            subtitle="The movies making their way onto everyone’s watchlist."
            icon={TrendingUp}
            request={trending}
          />
        </div>
        <PopularMovies />
        <section className="discovery-banner">
          <div>
            <span className="eyebrow">SOMETHING IN MIND?</span>
            <h2>Every great movie night starts with a search.</h2>
            <p>Find an old favourite, a new release, or that film you keep meaning to watch.</p>
          </div>
          <Link to="/search" className="button button-secondary">
            Find your movie
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>
      </main>
    </>
  );
}
