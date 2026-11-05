import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FavouritesProvider from './FavouritesProvider.jsx';
import useFavourites from '../hooks/useFavourites.js';
import FavouriteButton from '../components/FavouriteButton.jsx';
import Favourites from '../pages/Favourites.jsx';

const STORAGE_KEY = 'movie-explorer:favourites:v1';
const arrival = {
  id: 11,
  title: 'Arrival',
  poster_path: '/arrival.jpg',
  release_date: '2016-11-11',
  vote_average: 7.6,
  overview: 'This extra detail does not need to be stored.',
};
const contact = { id: 12, title: 'Contact' };

function SavedMovies() {
  const { favourites, storageError, toggleFavourite } = useFavourites();
  return (
    <>
      <output data-testid="saved-movies">
        {favourites.map((movie) => movie.title).join(', ')}
      </output>
      {storageError && <p role="alert">{storageError}</p>}
      <button
        onClick={() => {
          toggleFavourite(arrival);
          toggleFavourite(contact);
        }}
      >
        Save two movies
      </button>
    </>
  );
}

function renderControls() {
  return render(
    <FavouritesProvider>
      <FavouriteButton movie={arrival} />
      <FavouriteButton movie={arrival} compact />
      <SavedMovies />
    </FavouritesProvider>,
  );
}

describe('favourites', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  afterEach(() => vi.restoreAllMocks());

  it('adds and removes a movie while synchronizing buttons in separate components', () => {
    renderControls();
    const addButtons = screen.getAllByRole('button', { name: 'Add Arrival to favourites' });
    expect(addButtons).toHaveLength(2);
    expect(addButtons[0]).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(addButtons[0]);
    const removeButtons = screen.getAllByRole('button', { name: 'Remove Arrival from favourites' });
    expect(removeButtons.every((button) => button.getAttribute('aria-pressed') === 'true')).toBe(
      true,
    );
    expect(screen.getByTestId('saved-movies')).toHaveTextContent('Arrival');
    fireEvent.click(removeButtons[1]);
    expect(screen.getByTestId('saved-movies')).toBeEmptyDOMElement();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual([]);
  });

  it('persists a small movie snapshot and restores it after remounting', () => {
    const first = renderControls();
    fireEvent.click(screen.getAllByRole('button', { name: 'Add Arrival to favourites' })[0]);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual([
      {
        id: 11,
        title: 'Arrival',
        poster_path: '/arrival.jpg',
        release_date: '2016-11-11',
        vote_average: 7.6,
      },
    ]);
    first.unmount();
    renderControls();
    expect(screen.getByTestId('saved-movies')).toHaveTextContent('Arrival');
    expect(screen.getAllByRole('button', { name: 'Remove Arrival from favourites' })).toHaveLength(
      2,
    );
  });

  it('keeps multiple toggles in the same event from overwriting each other', () => {
    renderControls();
    fireEvent.click(screen.getByRole('button', { name: 'Save two movies' }));
    expect(screen.getByTestId('saved-movies')).toHaveTextContent('Contact, Arrival');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toHaveLength(2);
  });

  it('recovers from corrupt JSON without crashing', () => {
    localStorage.setItem(STORAGE_KEY, '{broken JSON');
    renderControls();
    expect(screen.getByRole('alert')).toHaveTextContent('Saved favourites could not be read.');
    expect(screen.getByTestId('saved-movies')).toBeEmptyDOMElement();
    fireEvent.click(screen.getAllByRole('button', { name: 'Add Arrival to favourites' })[0]);
    expect(screen.getByTestId('saved-movies')).toHaveTextContent('Arrival');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('drops invalid entries, removes duplicates and normalizes optional fields', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        arrival,
        arrival,
        { id: -1, title: 'Invalid' },
        { id: 2, title: ' ' },
        {
          id: 3,
          title: 'Safe title',
          poster_path: 'https://other.example/photo.jpg',
          release_date: 'invalid',
          vote_average: 999,
        },
      ]),
    );
    renderControls();
    expect(screen.getByTestId('saved-movies')).toHaveTextContent('Arrival, Safe title');
    expect(screen.getByRole('alert')).toHaveTextContent('Some saved favourites could not be read.');
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove Arrival from favourites' })[0]);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual([
      {
        id: 3,
        title: 'Safe title',
        poster_path: null,
        release_date: '',
        vote_average: 0,
      },
    ]);
  });

  it('keeps favourites usable when browser storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    renderControls();
    expect(screen.getByRole('alert')).toHaveTextContent('could not be saved in this browser');
    fireEvent.click(screen.getAllByRole('button', { name: 'Add Arrival to favourites' })[0]);
    expect(screen.getByTestId('saved-movies')).toHaveTextContent('Arrival');
    expect(screen.getAllByRole('button', { name: 'Remove Arrival from favourites' })).toHaveLength(
      2,
    );
  });

  it('keeps changes in memory when localStorage runs out of space', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError');
    });
    renderControls();
    fireEvent.click(screen.getAllByRole('button', { name: 'Add Arrival to favourites' })[0]);
    expect(screen.getByTestId('saved-movies')).toHaveTextContent('Arrival');
    expect(screen.getByRole('alert')).toHaveTextContent('available for this visit');
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove Arrival from favourites' })[0]);
    expect(screen.getByTestId('saved-movies')).toBeEmptyDOMElement();
  });

  it('synchronizes changes from another tab without writing them back', () => {
    renderControls();
    const write = vi.spyOn(Storage.prototype, 'setItem');
    act(() =>
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: STORAGE_KEY,
          newValue: JSON.stringify([arrival]),
        }),
      ),
    );
    expect(screen.getByTestId('saved-movies')).toHaveTextContent('Arrival');
    expect(screen.getAllByRole('button', { name: 'Remove Arrival from favourites' })).toHaveLength(
      2,
    );
    expect(write).not.toHaveBeenCalled();

    act(() => window.dispatchEvent(new StorageEvent('storage', { key: null, newValue: null })));
    expect(screen.getByTestId('saved-movies')).toBeEmptyDOMElement();
  });

  it('removes the cross-tab listener on unmount', () => {
    const removeListener = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderControls();
    unmount();
    expect(removeListener).toHaveBeenCalledWith('storage', expect.any(Function));
  });

  it('shows a useful empty page and a link to discovery', () => {
    render(
      <MemoryRouter>
        <FavouritesProvider>
          <Favourites />
        </FavouritesProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText('Keep the movies you want to come back to')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Discover movies' })).toHaveAttribute('href', '/');
    expect(screen.getByText('0 saved movies for your next movie night.')).toBeInTheDocument();
  });

  it('shows saved cards, the count and any storage warning on the favourites page', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([arrival, { id: -1, title: 'Invalid' }]));
    render(
      <MemoryRouter>
        <FavouritesProvider>
          <Favourites />
        </FavouritesProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Arrival', exact: true })).toBeInTheDocument();
    expect(screen.getByText('1 saved movie for your next movie night.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Some saved favourites could not be read.');
  });
});
