import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';
import { requestMovies } from './services/tmdb.js';

vi.mock('./services/tmdb.js', () => ({ requestMovies: vi.fn() }));

const movie = {
  id: 42,
  title: 'A good story',
  release_date: '2025-04-18',
  vote_average: 8.3,
  poster_path: null,
};

beforeEach(() => {
  window.scrollTo = vi.fn();
  window.history.replaceState({}, '', '/');
  localStorage.clear();
  vi.mocked(requestMovies).mockImplementation(async (endpoint) =>
    endpoint === 'details'
      ? {
          ...movie,
          overview: 'A story worth watching.',
          genres: [],
          credits: { cast: [] },
          videos: { results: [] },
        }
      : { results: [movie], total_pages: 1, total_results: 1 },
  );
});

describe('application routing', () => {
  it('opens details from a homepage card', async () => {
    const user = userEvent.setup();
    render(<App />);
    const cards = await screen.findAllByRole('link', { name: 'View A good story' });
    await user.click(cards[0]);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'A good story' }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe('/movie/42');
  });

  it('opens the search route through navigation', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      within(screen.getByRole('navigation', { name: 'Main navigation' })).getByRole('link', {
        name: 'Search',
      }),
    );
    expect(screen.getByRole('searchbox', { name: 'Movie title' })).toBeInTheDocument();
    expect(document.title).toBe('Search — Movie Explorer');
  });

  it('renders a custom 404 for an unknown path', () => {
    window.history.replaceState({}, '', '/not-a-page');
    render(<App />);
    expect(screen.getByRole('link', { name: /back to discovery/i })).toHaveAttribute('href', '/');
    expect(document.title).toBe('Page not found — Movie Explorer');
  });

  it('keeps favourite indicators and the favourites route in sync', async () => {
    const user = userEvent.setup();
    render(<App />);
    const buttons = await screen.findAllByRole('button', {
      name: 'Add A good story to favourites',
    });
    await user.click(buttons[0]);
    expect(
      screen.getAllByRole('button', { name: 'Remove A good story from favourites' }),
    ).toHaveLength(2);
    await user.click(
      within(screen.getByRole('navigation', { name: 'Main navigation' })).getByRole('link', {
        name: 'Favourites',
      }),
    );
    expect(screen.getByRole('link', { name: 'View A good story' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove A good story from favourites' }));
    expect(screen.queryByRole('link', { name: 'View A good story' })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('movie-explorer:favourites:v1'))).toEqual([]);
  });
});
