import { AlertCircle, RotateCcw } from 'lucide-react';

export default function ErrorState({ error, onRetry }) {
  return (
    <div className="error-state" role="alert">
      <AlertCircle aria-hidden="true" size={22} />
      <div>
        <h3>We couldn’t load the movies</h3>
        <p>{error?.message || 'Please check your connection and try again.'}</p>
      </div>
      {onRetry && (
        <button className="button button-secondary" onClick={onRetry}>
          <RotateCcw size={15} aria-hidden="true" />
          Try again
        </button>
      )}
    </div>
  );
}
