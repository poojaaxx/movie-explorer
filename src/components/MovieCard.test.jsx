import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import MovieCard from './MovieCard.jsx';
import FavouritesProvider from '../context/FavouritesProvider.jsx';

const movie = {
  id: 42,
  title: 'A good story',
  release_date: '2025-04-18',
  vote_average: 8.34,
  poster_path: '/poster.jpg',
};

function renderCard(overrides = {}) {
  return render(
    <FavouritesProvider>
      <MemoryRouter>
        <MovieCard movie={{ ...movie, ...overrides }} />
      </MemoryRouter>
    </FavouritesProvider>,
  );
}

describe('MovieCard', () => {
  it('links to the correct movie and displays its metadata', () => {
    renderCard();
    expect(screen.getByRole('link', { name: 'View A good story' })).toHaveAttribute(
      'href',
      '/movie/42',
    );
    expect(screen.getByText('2025')).toBeInTheDocument();
    expect(screen.getByText('8.3')).toBeInTheDocument();
    expect(screen.getByAltText('A good story poster')).toHaveAttribute(
      'src',
      'https://image.tmdb.org/t/p/w500/poster.jpg',
    );
  });

  it('provides fallbacks when poster and metadata are missing', () => {
    renderCard({ poster_path: null, release_date: '', vote_average: 0 });
    expect(screen.getByText('Image unavailable')).toBeInTheDocument();
    expect(screen.getByText('TBA')).toBeInTheDocument();
    expect(screen.getByText('NR')).toBeInTheDocument();
  });

  it('replaces a broken poster with a labelled fallback', () => {
    renderCard();
    fireEvent.error(screen.getByAltText('A good story poster'));
    expect(screen.getByRole('img', { name: 'A good story poster' }).tagName).toBe('DIV');
  });
});
