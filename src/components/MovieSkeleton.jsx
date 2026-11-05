export default function MovieSkeleton({ count = 6 }) {
  return (
    <div className="movie-grid" role="status" aria-label="Loading movies">
      <span className="sr-only">Loading movies…</span>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} aria-hidden="true">
          <div className="skeleton skeleton-poster" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line short" />
        </div>
      ))}
    </div>
  );
}
