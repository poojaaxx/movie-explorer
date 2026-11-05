import MovieCard from './MovieCard.jsx';

export default function MovieGrid({ movies, compact = false }) {
  return <div className={`movie-grid ${compact ? 'movie-grid-compact' : ''}`}>{movies.map((movie) => <MovieCard key={movie.id} movie={movie} />)}</div>;
}
