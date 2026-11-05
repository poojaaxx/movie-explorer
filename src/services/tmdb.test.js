// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestMovies } from './tmdb.js';

afterEach(() => vi.unstubAllGlobals());

describe('movie API client', () => {
  it('uses a relative URL and safely encodes query text', async () => {
    const data = { results: [{ id: 11, title: 'A movie' }] };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(data)));
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();

    await expect(requestMovies('search', { query: 'love & war', page: 2 }, { signal: controller.signal })).resolves.toEqual(data);
    const [path, options] = fetchMock.mock.calls[0];
    expect(path).toBe('/api/tmdb?endpoint=search&page=2&query=love+%26+war');
    expect(options.signal).toBe(controller.signal);
    expect(options.headers.Authorization).toBeUndefined();
  });

  it('preserves useful proxy error messages and codes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { code: 'CONFIGURATION_MISSING', message: 'Movie data is not configured yet.' },
    }), { status: 503 })));
    await expect(requestMovies('popular')).rejects.toMatchObject({
      message: 'Movie data is not configured yet.', code: 'CONFIGURATION_MISSING', status: 503,
    });
  });

  it('replaces non-JSON responses with a safe message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Private platform details</html>', { status: 502 })));
    const pending = requestMovies('popular');
    await expect(pending).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    await expect(pending).rejects.not.toThrow('Private platform details');
  });

  it('replaces network errors with a useful connection message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Internal fetch details')));
    await expect(requestMovies('popular')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('preserves cancellation so callers can ignore aborted requests', async () => {
    const abort = new DOMException('Cancelled', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abort));
    await expect(requestMovies('popular')).rejects.toBe(abort);
  });

  it('rejects nested parameters and endpoint overrides before fetching', async () => {
    vi.stubGlobal('fetch', vi.fn());
    await expect(requestMovies('popular', { endpoint: 'details' })).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
    await expect(requestMovies('search', { query: { text: 'Alien' } })).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
    expect(fetch).not.toHaveBeenCalled();
  });
});
