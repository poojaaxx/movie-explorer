import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MovieDetails from './MovieDetails.jsx';
import NotFound from './NotFound.jsx';
import FavouritesProvider from '../context/FavouritesProvider.jsx';
import { requestMovies } from '../services/tmdb.js';

vi.mock('../services/tmdb.js', () => ({ requestMovies: vi.fn() }));
vi.mock('../components/MovieGrid.jsx', () => ({
  default: ({ movies }) => <div>{movies.map((movie) => <p key={movie.id}>{movie.title}</p>)}</div>,
}));

const movie = {
  id: 11,
  title: 'Arrival',
  overview: 'A linguist searches for meaning when mysterious visitors arrive.',
  release_date: '2016-11-11',
  runtime: 116,
  vote_average: 7.6,
  poster_path: '/poster.jpg',
  backdrop_path: '/backdrop.jpg',
  genres: [{ id: 18, name: 'Drama' }],
  credits: { cast: [{ id: 1, name: 'Amy Adams', character: 'Louise Banks', profile_path: '/amy.jpg' }] },
  videos: { results: [{ official: true, site: 'YouTube', type: 'Trailer', key: 'Abc123_-xyz' }] },
  recommendations: { results: [{ id: 12, title: 'Contact' }] },
};

function renderDetails(entries = ['/movie/11']) {
  return render(
    <MemoryRouter initialEntries={entries}>
      <Link to="/movie/12">Another movie</Link>
      <Routes>
        <Route path="/movie/:id" element={<MovieDetails />} />
        <Route path="/" element={<h1>Discovery home</h1>} />
        <Route path="/search" element={<h1>Search page</h1>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MemoryRouter>,
    { wrapper: FavouritesProvider },
  );
}

describe('movie details', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requestMovies.mockResolvedValue(movie);
  });

  it('loads a movie and displays its details, cast and recommendations', async () => {
    renderDetails();
    expect(screen.getByLabelText('Loading movie details')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Arrival', level: 1 })).toBeInTheDocument();
    expect(requestMovies).toHaveBeenCalledWith('details', { id: 11 }, expect.any(Object));
    expect(screen.getByText(movie.overview)).toBeInTheDocument();
    expect(screen.getByText('Drama')).toBeInTheDocument();
    expect(screen.getByText('11 November 2016')).toBeInTheDocument();
    expect(screen.getAllByText('1h 56m')).toHaveLength(2);
    expect(screen.getByLabelText('Rated 7.6 out of 10')).toBeInTheDocument();
    expect(screen.getByText('Amy Adams')).toBeInTheDocument();
    expect(screen.getByText('Louise Banks')).toBeInTheDocument();
    expect(screen.getByText('Contact')).toBeInTheDocument();
  });

  it.each(['-1', '0', 'abc', '2147483648', '11.5'])('rejects invalid movie ID %s before fetching', (id) => {
    renderDetails([`/movie/${id}`]);
    expect(screen.getByRole('heading', { name: 'Movie not found' })).toBeInTheDocument();
    expect(requestMovies).not.toHaveBeenCalled();
  });

  it('handles unavailable movies with a useful route back to discovery', async () => {
    requestMovies.mockRejectedValue(Object.assign(new Error('Missing movie'), { code: 'MOVIE_NOT_FOUND' }));
    renderDetails();
    expect(await screen.findByRole('heading', { name: 'Movie not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to discovery' })).toHaveAttribute('href', '/');
  });

  it('shows an API failure and lets the visitor retry', async () => {
    requestMovies.mockRejectedValueOnce(new Error('The movie service is temporarily unavailable.'));
    renderDetails();
    expect(await screen.findByRole('alert')).toHaveTextContent('The movie service is temporarily unavailable.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Arrival', level: 1 })).toBeInTheDocument();
    expect(requestMovies).toHaveBeenCalledTimes(2);
  });

  it('creates a privacy-enhanced trailer iframe only after the play button is clicked', async () => {
    renderDetails();
    const play = await screen.findByRole('button', { name: 'Play Arrival trailer' });
    expect(screen.queryByTitle('Arrival official trailer')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Watch trailer' })).toHaveAttribute('href', '#trailer');
    fireEvent.click(play);
    expect(screen.getByTitle('Arrival official trailer')).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/Abc123_-xyz?autoplay=1&rel=0');
  });

  it.each([
    { official: false, site: 'YouTube', type: 'Trailer', key: 'Abc123_-xyz' },
    { official: true, site: 'YouTube', type: 'Teaser', key: 'Abc123_-xyz' },
    { official: true, site: 'Vimeo', type: 'Trailer', key: 'Abc123_-xyz' },
    { official: true, site: 'YouTube', type: 'Trailer', key: '../../unsafe' },
  ])('does not embed an unofficial or unsafe video: %j', async (video) => {
    requestMovies.mockResolvedValue({ ...movie, videos: { results: [video] } });
    renderDetails();
    expect(await screen.findByText('An official trailer is not available for this movie.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Watch trailer' })).not.toBeInTheDocument();
  });

  it('handles missing optional movie information gracefully', async () => {
    requestMovies.mockResolvedValue({ id: 11, title: 'Arrival' });
    renderDetails();
    expect(await screen.findByText('Cast details are not available for this movie.')).toBeInTheDocument();
    expect(screen.getByText('An official trailer is not available for this movie.')).toBeInTheDocument();
    expect(screen.getByText('There are no recommendations for this movie yet.')).toBeInTheDocument();
    expect(screen.getByText('An overview is not available for this movie yet.')).toBeInTheDocument();
    expect(screen.getByText('Genre information is not available.')).toBeInTheDocument();
  });

  it('limits cast and recommendations to a manageable number', async () => {
    requestMovies.mockResolvedValue({
      ...movie,
      credits: { cast: Array.from({ length: 20 }, (_, id) => ({ id, name: `Actor ${id}`, character: 'Role' })) },
      recommendations: { results: Array.from({ length: 10 }, (_, index) => ({ id: index + 100, title: `Recommendation ${index}` })) },
    });
    renderDetails();
    expect(await screen.findByText('Actor 11')).toBeInTheDocument();
    expect(screen.queryByText('Actor 12')).not.toBeInTheDocument();
    expect(screen.getByText('Recommendation 5')).toBeInTheDocument();
    expect(screen.queryByText('Recommendation 6')).not.toBeInTheDocument();
  });

  it('resets playback when navigating to another movie', async () => {
    requestMovies.mockResolvedValueOnce(movie).mockResolvedValueOnce({ ...movie, id: 12, title: 'Contact' });
    renderDetails();
    fireEvent.click(await screen.findByRole('button', { name: 'Play Arrival trailer' }));
    expect(screen.getByTitle('Arrival official trailer')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Another movie' }));
    expect(await screen.findByRole('button', { name: 'Play Contact trailer' })).toBeInTheDocument();
    expect(screen.queryByTitle('Arrival official trailer')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Contact official trailer')).not.toBeInTheDocument();
  });

  it('returns a direct visitor to discovery', async () => {
    renderDetails();
    await screen.findByRole('heading', { name: 'Arrival', level: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Back', exact: true }));
    expect(await screen.findByRole('heading', { name: 'Discovery home' })).toBeInTheDocument();
  });

  it('returns an in-app visitor to the previous page', async () => {
    renderDetails(['/search?q=Arrival', '/movie/11']);
    await screen.findByRole('heading', { name: 'Arrival', level: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Back', exact: true }));
    expect(await screen.findByRole('heading', { name: 'Search page' })).toBeInTheDocument();
  });

  it('provides the custom page-not-found screen for unmatched routes', async () => {
    renderDetails(['/missing-page']);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'This scene is missing.' })).toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'Back to discovery' })).toHaveAttribute('href', '/');
  });
});
