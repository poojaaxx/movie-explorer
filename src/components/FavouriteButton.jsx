import { Heart } from 'lucide-react';
import useFavourites from '../hooks/useFavourites.js';

export default function FavouriteButton({ movie, compact = false }) {
  const { isFavourite, toggleFavourite } = useFavourites();
  const selected = isFavourite(movie.id);
  const label = `${selected ? 'Remove' : 'Add'} ${movie.title} ${selected ? 'from' : 'to'} favourites`;

  return (
    <button
      type="button"
      className={compact ? 'favourite-toggle' : 'button button-secondary'}
      onClick={() => toggleFavourite(movie)}
      aria-label={label}
      aria-pressed={selected}
      title={label}
    >
      <Heart
        size={compact ? 18 : 16}
        fill={selected ? 'currentColor' : 'none'}
        aria-hidden="true"
      />
      {!compact && <span>{selected ? 'Saved to favourites' : 'Add to favourites'}</span>}
    </button>
  );
}
