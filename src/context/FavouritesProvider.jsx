import { useEffect, useRef, useState } from 'react';
import FavouritesContext from './FavouritesContext.js';
import { imageUrl } from '../utils/movies.js';

const STORAGE_KEY = 'movie-explorer:favourites:v1';
const READ_ERROR = 'Saved favourites could not be read. You can start a new list for this visit.';
const SAVE_ERROR =
  'Your favourites are available for this visit, but could not be saved in this browser.';

function savedMovie(movie) {
  if (!movie || !Number.isInteger(movie.id) || movie.id <= 0 || movie.id > 2_147_483_647)
    return null;
  if (typeof movie.title !== 'string' || !movie.title.trim()) return null;

  // Cards only need this small snapshot, even when saving from a full details response.
  return {
    id: movie.id,
    title: movie.title.trim(),
    poster_path: imageUrl(movie.poster_path) ? movie.poster_path : null,
    release_date:
      typeof movie.release_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(movie.release_date)
        ? movie.release_date
        : '',
    vote_average:
      Number.isFinite(movie.vote_average) && movie.vote_average >= 0 && movie.vote_average <= 10
        ? movie.vote_average
        : 0,
  };
}

function parseStoredFavourites(value) {
  if (value === null) return { favourites: [], storageError: null };

  try {
    const stored = JSON.parse(value);
    if (!Array.isArray(stored)) throw new Error('Invalid saved list');
    const favourites = [];
    const seen = new Set();
    let invalidEntry = false;

    for (const entry of stored) {
      const movie = savedMovie(entry);
      if (!movie) {
        invalidEntry = true;
      } else if (!seen.has(movie.id)) {
        favourites.push(movie);
        seen.add(movie.id);
      }
    }

    return {
      favourites,
      storageError: invalidEntry ? 'Some saved favourites could not be read.' : null,
    };
  } catch {
    return { favourites: [], storageError: READ_ERROR };
  }
}

function readInitialFavourites() {
  try {
    return parseStoredFavourites(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return { favourites: [], storageError: SAVE_ERROR };
  }
}

export default function FavouritesProvider({ children }) {
  const [state, setState] = useState(readInitialFavourites);
  const favouritesRef = useRef(state.favourites);

  useEffect(() => {
    function syncFavourites(event) {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      const next = parseStoredFavourites(event.key === null ? null : event.newValue);
      favouritesRef.current = next.favourites;
      setState(next);
    }

    window.addEventListener('storage', syncFavourites);
    return () => window.removeEventListener('storage', syncFavourites);
  }, []);

  function toggleFavourite(movie) {
    const snapshot = savedMovie(movie);
    if (!snapshot) return;

    // Use the latest list if several toggles happen before React renders again.
    const current = favouritesRef.current;
    const next = current.some((entry) => entry.id === snapshot.id)
      ? current.filter((entry) => entry.id !== snapshot.id)
      : [snapshot, ...current];
    let storageError = null;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      storageError = SAVE_ERROR;
    }

    favouritesRef.current = next;
    setState({ favourites: next, storageError });
  }

  function isFavourite(id) {
    return state.favourites.some((movie) => movie.id === id);
  }

  return (
    <FavouritesContext.Provider
      value={{
        favourites: state.favourites,
        storageError: state.storageError,
        isFavourite,
        toggleFavourite,
      }}
    >
      {children}
    </FavouritesContext.Provider>
  );
}
