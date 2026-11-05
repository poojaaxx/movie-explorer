import { Link } from 'react-router';
import { Star } from 'lucide-react';
import MovieImage from './MovieImage.jsx';
import FavouriteButton from './FavouriteButton.jsx';
import { formatRating, formatYear } from '../utils/movies.js';

export default function MovieCard({ movie }) {
  return (
    <article className="movie-card group">
      <Link className="poster-link" to={`/movie/${movie.id}`} aria-label={`View ${movie.title}`}>
        <MovieImage
          path={movie.poster_path}
          alt={`${movie.title} poster`}
          className="movie-poster"
        />
        <span className="poster-overlay">
          <span>
            Explore movie <span aria-hidden="true">↗</span>
          </span>
        </span>
      </Link>
      <FavouriteButton movie={movie} compact />
      <div className="card-caption">
        <Link to={`/movie/${movie.id}`} className="movie-title">
          {movie.title}
        </Link>
        <div className="card-meta">
          <span>{formatYear(movie.release_date)}</span>
          <span className="rating">
            <Star size={12} aria-hidden="true" />
            {formatRating(movie.vote_average)}
          </span>
        </div>
      </div>
    </article>
  );
}
