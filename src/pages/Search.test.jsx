import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Search from './Search.jsx';
import { requestMovies } from '../services/tmdb.js';

vi.mock('../services/tmdb.js', () => ({ requestMovies: vi.fn() }));
vi.mock('../components/MovieGrid.jsx', () => ({
  default: ({ movies }) => <div>{movies.map((movie) => <p key={movie.id}>{movie.title}</p>)}</div>,
}));

function Location() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
}

function renderSearch(path = '/search') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Search />
      <Location />
    </MemoryRouter>,
  );
}

async function advance(milliseconds = 0) {
  await act(async () => vi.advanceTimersByTimeAsync(milliseconds));
}

function resultPage(title = 'Alien', page = 1, totalPages = 1) {
  return { page, total_pages: totalPages, total_results: 1, results: [{ id: page, title }] };
}

describe('movie search', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetAllMocks();
    requestMovies.mockResolvedValue(resultPage());
  });

  afterEach(() => vi.useRealTimers());

  it('starts with an explanation and makes no empty searches', () => {
    renderSearch();
    expect(screen.getByText('A good movie is one search away')).toBeInTheDocument();
    expect(requestMovies).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Movie title')).toHaveAttribute('maxlength', '150');
  });

  it('debounces input for 450 milliseconds and updates the URL', async () => {
    renderSearch();
    fireEvent.change(screen.getByLabelText('Movie title'), { target: { value: 'Ali' } });
    await advance(300);
    fireEvent.change(screen.getByLabelText('Movie title'), { target: { value: 'Alien' } });
    await advance(449);
    expect(requestMovies).not.toHaveBeenCalled();
    expect(screen.getByTestId('location')).toHaveTextContent('/search?q=Alien');
    await advance(1);
    expect(requestMovies).toHaveBeenCalledTimes(1);
    expect(requestMovies).toHaveBeenCalledWith('search', { query: 'Alien', page: 1 }, expect.any(Object));
    expect(screen.getByText('Alien')).toBeInTheDocument();
  });

  it('loads a shared URL immediately and preserves its page', async () => {
    renderSearch('/search?q=Alien&page=2');
    await advance();
    expect(screen.getByLabelText('Movie title')).toHaveValue('Alien');
    expect(requestMovies).toHaveBeenCalledWith('search', { query: 'Alien', page: 2 }, expect.any(Object));
  });

  it('hides previous results immediately and resets pagination for a new title', async () => {
    renderSearch('/search?q=Alien&page=2');
    await advance();
    expect(screen.getByText('Alien')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Movie title'), { target: { value: 'Arrival' } });
    expect(screen.queryByText('Alien')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Loading movies')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/search?q=Arrival');
    await advance(450);
    expect(requestMovies).toHaveBeenLastCalledWith('search', { query: 'Arrival', page: 1 }, expect.any(Object));
  });

  it('ignores a late response from an older search', async () => {
    let resolveOld;
    requestMovies.mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve; }));
    requestMovies.mockResolvedValueOnce(resultPage('Arrival'));
    renderSearch('/search?q=Alien');
    const oldSignal = requestMovies.mock.calls[0][2].signal;
    fireEvent.change(screen.getByLabelText('Movie title'), { target: { value: 'Arrival' } });
    expect(oldSignal.aborted).toBe(true);
    await advance(450);
    expect(screen.getByText('Arrival')).toBeInTheDocument();
    await act(async () => resolveOld(resultPage('Alien')));
    expect(screen.queryByText('Alien')).not.toBeInTheDocument();
  });

  it('shows no results without treating an empty response as an error', async () => {
    requestMovies.mockResolvedValue({ results: [], total_pages: 0, total_results: 0 });
    renderSearch('/search?q=unknown');
    await advance();
    expect(screen.getByText('No movies found')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows API errors and supports retry', async () => {
    requestMovies.mockRejectedValueOnce(new Error('Movie data is not configured yet.'));
    renderSearch('/search?q=Alien');
    await advance();
    expect(screen.getByRole('alert')).toHaveTextContent('Movie data is not configured yet.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await advance();
    expect(screen.getByText('Alien')).toBeInTheDocument();
    expect(requestMovies).toHaveBeenCalledTimes(2);
  });

  it('loads the next page and updates the shareable URL', async () => {
    requestMovies.mockImplementation((endpoint, { page }) => Promise.resolve(resultPage(`Page ${page} movie`, page, 3)));
    renderSearch('/search?q=Alien');
    await advance();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await advance();
    expect(screen.getByText('Page 2 movie')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/search?q=Alien&page=2');
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
  });

  it('caps pagination at TMDB page 500', async () => {
    requestMovies.mockResolvedValue(resultPage('Last available movie', 500, 700));
    renderSearch('/search?q=Alien&page=500');
    await advance();
    expect(screen.getByText('Page 500 of 500')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('clears results, removes the URL query and returns focus to the input', async () => {
    renderSearch('/search?q=Alien');
    await advance();
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByLabelText('Movie title')).toHaveValue('');
    expect(screen.getByLabelText('Movie title')).toHaveFocus();
    expect(screen.getByTestId('location')).toHaveTextContent('/search');
    expect(screen.queryByText('Alien')).not.toBeInTheDocument();
    await advance(450);
    expect(requestMovies).toHaveBeenCalledTimes(1);
  });
});
