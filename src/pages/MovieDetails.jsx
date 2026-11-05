import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Play, Star } from 'lucide-react';
import useRequest from '../hooks/useRequest.js';
import MovieImage from '../components/MovieImage.jsx';
import MovieGrid from '../components/MovieGrid.jsx';
import ErrorState from '../components/ErrorState.jsx';
import NotFound from './NotFound.jsx';
import { formatRating, formatRuntime, formatYear } from '../utils/movies.js';

function releaseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Not available';
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(date);
}

function MovieDetailsContent({ id }) {
  const request = useRequest('details', { id });
  const navigate = useNavigate();
  const location = useLocation();
  const [playingTrailer, setPlayingTrailer] = useState(false);
  const backButton = (
    <button
      type="button"
      className="button button-ghost mb-6 -ml-4"
      onClick={() => navigate(location.key === 'default' ? '/' : -1)}
    >
      <ArrowLeft size={16} aria-hidden="true" />
      Back
    </button>
  );

  if (request.loading) {
    return (
      <main id="main-content" className="container page-main" aria-busy="true">
        {backButton}
        <div role="status" aria-label="Loading movie details" className="grid gap-8 sm:grid-cols-[180px_1fr] lg:grid-cols-[240px_1fr]">
          <span className="sr-only">Loading movie details...</span>
          <div className="skeleton aspect-[2/3] w-40 sm:w-full" aria-hidden="true" />
          <div className="space-y-5 py-6" aria-hidden="true">
            <div className="skeleton h-10 w-3/4" />
            <div className="skeleton h-5 w-1/3" />
            <div className="skeleton h-28 w-full max-w-2xl" />
          </div>
        </div>
      </main>
    );
  }

  if (request.error?.code === 'MOVIE_NOT_FOUND') {
    return <NotFound title="Movie not found" description="We could not find that movie. Head back to discovery to find your next watch." />;
  }

  if (request.error || !request.data) {
    return (
      <main id="main-content" className="container page-main">
        {backButton}
        <ErrorState error={request.error} onRetry={request.retry} />
      </main>
    );
  }

  const movie = request.data;
  const rating = formatRating(movie.vote_average);
  const cast = (movie.credits?.cast || []).slice(0, 12);
  const recommendations = (movie.recommendations?.results || [])
    .filter((recommendation) => recommendation.id !== movie.id)
    .slice(0, 6);
  const trailer = (movie.videos?.results || []).find((video) => (
    video.official === true
    && video.site === 'YouTube'
    && video.type === 'Trailer'
    && /^[A-Za-z0-9_-]{11}$/.test(video.key)
  ));

  return (
    <main id="main-content">
      <section className="relative overflow-hidden border-b border-white/5 bg-[#10131d]">
        {movie.backdrop_path && (
          <MovieImage
            path={movie.backdrop_path}
            size="w1280"
            alt=""
            eager
            className="absolute inset-0 h-full w-full object-cover opacity-35"
          />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-cinema via-cinema/85 to-cinema/30" />
        <div className="container relative py-7 md:py-10">
          {backButton}
          <div className="grid items-start gap-8 pb-6 sm:grid-cols-[180px_1fr] lg:grid-cols-[240px_1fr] lg:gap-12">
            <MovieImage
              path={movie.poster_path}
              alt={`${movie.title} poster`}
              eager
              className="aspect-[2/3] w-40 rounded-xl border border-white/10 object-cover shadow-xl sm:w-full"
            />

            <div className="min-w-0 self-center">
              <span className="eyebrow">IN THE SPOTLIGHT</span>
              <h1 className="mb-5 text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
                {movie.title}
              </h1>
              <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-300">
                <span className="rating" aria-label={rating === 'NR' ? 'Not rated' : `Rated ${rating} out of 10`}>
                  <Star size={15} fill="currentColor" aria-hidden="true" />
                  {rating}
                </span>
                <span>{formatYear(movie.release_date)}</span>
                <span>{formatRuntime(movie.runtime)}</span>
              </div>
              {movie.genres?.length ? (
                <ul aria-label="Genres" className="mb-6 flex flex-wrap gap-2">
                  {movie.genres.map((genre) => (
                    <li key={genre.id} className="rounded-md border border-white/15 bg-white/4 px-3 py-1 text-xs text-slate-300">
                      {genre.name}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-xs text-slate-400">Genre information is not available.</p>}

              <h2 className="mb-3 text-sm font-semibold">The story</h2>
              <p className="mb-6 max-w-3xl text-sm leading-7 text-slate-300">
                {movie.overview || 'An overview is not available for this movie yet.'}
              </p>

              <div className="flex flex-wrap gap-3">
                {trailer && (
                  <a href="#trailer" className="button button-primary">
                    <Play size={16} fill="currentColor" aria-hidden="true" />
                    Watch trailer
                  </a>
                )}
              </div>

              <dl className="mt-7 flex flex-wrap gap-x-10 gap-y-5 border-t border-white/10 pt-6">
                <div>
                  <dt className="mb-2 text-xs text-slate-500">Release date</dt>
                  <dd className="text-sm text-slate-300">{releaseDate(movie.release_date)}</dd>
                </div>
                <div>
                  <dt className="mb-2 text-xs text-slate-500">Runtime</dt>
                  <dd className="text-sm text-slate-300">{formatRuntime(movie.runtime)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      <div className="container py-10 md:py-14">
        <section className="content-section" aria-labelledby="cast-heading">
          <div className="section-heading">
            <div>
              <h2 id="cast-heading">The people behind the story</h2>
              <p>Meet the cast.</p>
            </div>
          </div>
          {cast.length ? (
            <ul className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {cast.map((person) => (
                <li key={person.id} className="min-w-0">
                  <MovieImage
                    path={person.profile_path}
                    size="w185"
                    alt={person.name}
                    className="mb-3 aspect-[2/3] w-full rounded-lg object-cover"
                  />
                  <h3 className="mb-1 truncate text-xs font-medium" title={person.name}>{person.name}</h3>
                  <p className="mb-0 truncate text-xs text-slate-500" title={person.character}>
                    {person.character || 'Cast member'}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-white/10 bg-white/2 p-6 text-sm text-slate-400">
              Cast details are not available for this movie.
            </p>
          )}
        </section>

        <section id="trailer" className="content-section" aria-labelledby="trailer-heading">
          <div className="section-heading">
            <div>
              <h2 id="trailer-heading">Official trailer</h2>
              <p>A first look before you press play.</p>
            </div>
          </div>
          {trailer ? (
            <div className="relative aspect-video max-w-4xl overflow-hidden rounded-xl border border-white/10 bg-white/3">
              {playingTrailer ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=1&rel=0`}
                  title={`${movie.title} official trailer`}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full border-0"
                />
              ) : (
                <>
                  {movie.backdrop_path && (
                    <MovieImage path={movie.backdrop_path} size="w1280" alt="" className="absolute inset-0 h-full w-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => setPlayingTrailer(true)}
                    aria-label={`Play ${movie.title} trailer`}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 text-white hover:bg-black/50"
                  >
                    <span className="grid size-14 place-items-center rounded-full border border-white/30 bg-white/10 sm:size-18">
                      <Play size={24} fill="currentColor" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-medium">Play official trailer</span>
                    <span className="text-xs text-slate-300">Loads YouTube when you play</span>
                  </button>
                </>
              )}
            </div>
          ) : (
            <p className="rounded-xl border border-white/10 bg-white/2 p-6 text-sm text-slate-400">
              An official trailer is not available for this movie.
            </p>
          )}
        </section>

        <section className="content-section" aria-labelledby="recommendations-heading">
          <div className="section-heading">
            <div>
              <h2 id="recommendations-heading">Keep the story going</h2>
              <p>A few more movies you might enjoy.</p>
            </div>
          </div>
          {recommendations.length ? (
            <MovieGrid movies={recommendations} />
          ) : (
            <p className="rounded-xl border border-white/10 bg-white/2 p-6 text-sm text-slate-400">
              There are no recommendations for this movie yet.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

export default function MovieDetails() {
  const { id } = useParams();
  const movieId = Number(id);
  const valid = /^[1-9]\d*$/.test(id || '')
    && Number.isSafeInteger(movieId)
    && movieId <= 2_147_483_647;

  if (!valid) {
    return <NotFound title="Movie not found" description="That movie link is not valid. Head back to discovery to choose a movie." />;
  }

  return <MovieDetailsContent key={id} id={movieId} />;
}
