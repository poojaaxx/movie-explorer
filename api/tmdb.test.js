// @vitest-environment node
import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from './tmdb.js';

function makeRequest(query = 'endpoint=popular', method = 'GET') {
  const req = new EventEmitter();
  req.method = method;
  req.url = `/api/tmdb?${query}`;

  const res = new EventEmitter();
  res.headers = {};
  res.setHeader = (name, value) => {
    res.headers[name] = value;
  };
  res.end = vi.fn((body) => {
    res.body = JSON.parse(body);
    res.writableEnded = true;
  });
  return { req, res };
}

describe('TMDB proxy', () => {
  beforeEach(() => {
    vi.stubEnv('TMDB_READ_ACCESS_TOKEN', 'test-server-token');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [] }))),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('keeps authentication server-side and builds a fixed popular request', async () => {
    const { req, res } = makeRequest('endpoint=popular&page=2');
    await handler(req, res);

    const [url, options] = fetch.mock.calls[0];
    expect(url.origin).toBe('https://api.themoviedb.org');
    expect(url.pathname).toBe('/3/movie/popular');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('language')).toBe('en-US');
    expect(options.headers.Authorization).toBe('Bearer test-server-token');
    expect(options.redirect).toBe('error');
    expect(res.statusCode).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain('test-server-token');
    expect(res.headers['Cache-Control']).toContain('s-maxage=300');
  });

  it('uses weekly movie trending and defaults to page one', async () => {
    const { req, res } = makeRequest('endpoint=trending');
    await handler(req, res);
    const [url] = fetch.mock.calls[0];
    expect(url.pathname).toBe('/3/trending/movie/week');
    expect(url.searchParams.get('page')).toBe('1');
  });

  it('appends only the required detail resources', async () => {
    const { req, res } = makeRequest('endpoint=details&id=11');
    await handler(req, res);
    const [url] = fetch.mock.calls[0];
    expect(url.pathname).toBe('/3/movie/11');
    expect(url.searchParams.get('append_to_response')).toBe('credits,videos,recommendations');
    expect(url.searchParams.has('page')).toBe(false);
  });

  it('encodes search text as one parameter and does not cache searches', async () => {
    const query = '  Amélie & include_adult=true  ';
    const { req, res } = makeRequest(`endpoint=search&query=${encodeURIComponent(query)}&page=1`);
    await handler(req, res);
    const [url] = fetch.mock.calls[0];
    expect(url.pathname).toBe('/3/search/movie');
    expect(url.searchParams.get('query')).toBe(query.trim());
    expect(url.searchParams.getAll('include_adult')).toEqual(['false']);
    expect(res.headers['Cache-Control']).toBe('no-store');
  });

  it.each([
    'endpoint=https://attacker.example',
    'endpoint=constructor',
    'endpoint=popular&url=https://attacker.example',
    'endpoint=popular&api_key=another-key',
    'endpoint=popular&endpoint=search',
    'endpoint=popular&page=1&page=2',
    'endpoint=popular&page=0',
    'endpoint=popular&page=501',
    'endpoint=popular&page=1.5',
    'endpoint=popular&page=1e2',
    'endpoint=popular&id=11',
    'endpoint=details&id=11&page=1',
    'endpoint=details&id=11&append_to_response=account_states',
    'endpoint=details&id=-1',
    'endpoint=details&id=2147483648',
    'endpoint=details&id=1/credits',
    'endpoint=search',
    'endpoint=search&query=%20%20',
    'endpoint=search&query=hello%00world',
    `endpoint=search&query=${'a'.repeat(151)}`,
  ])('rejects invalid or unsupported input: %s', async (query) => {
    const { req, res } = makeRequest(query);
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe('INVALID_REQUEST');
    expect(res.headers['Cache-Control']).toBe('no-store');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects writes before contacting TMDB', async () => {
    const { req, res } = makeRequest('endpoint=popular', 'POST');
    await handler(req, res);
    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe('GET');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects unknown API paths', async () => {
    const { req, res } = makeRequest();
    req.url = '/api/other?endpoint=popular';
    await handler(req, res);
    expect(res.statusCode).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns a clear configuration error when the server token is missing', async () => {
    vi.stubEnv('TMDB_READ_ACCESS_TOKEN', '');
    const { req, res } = makeRequest();
    await handler(req, res);
    expect(res.statusCode).toBe(503);
    expect(res.body.error).toEqual({
      code: 'CONFIGURATION_MISSING',
      message: 'Movie data is not configured yet.',
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([401, 403, 500, 503])('sanitizes upstream errors with status %s', async (status) => {
    fetch.mockResolvedValue(new Response('private token or server details', { status }));
    const { req, res } = makeRequest();
    await handler(req, res);
    expect(res.statusCode).toBe(502);
    expect(res.body.error.code).toBe('UPSTREAM_ERROR');
    expect(JSON.stringify(res.body)).not.toContain('private');
    expect(res.headers['Cache-Control']).toBe('no-store');
  });

  it('preserves a missing movie response', async () => {
    fetch.mockResolvedValue(new Response('{}', { status: 404 }));
    const { req, res } = makeRequest('endpoint=details&id=11');
    await handler(req, res);
    expect(res.statusCode).toBe(404);
    expect(res.body.error.code).toBe('MOVIE_NOT_FOUND');
  });

  it('handles upstream rate limiting without automatic request loops', async () => {
    fetch.mockResolvedValue(new Response('{}', { status: 429 }));
    const { req, res } = makeRequest();
    await handler(req, res);
    expect(res.statusCode).toBe(429);
    expect(res.headers['Retry-After']).toBe('30');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('does not expose network exception details', async () => {
    fetch.mockRejectedValue(new Error('Authorization: Bearer secret-token'));
    const { req, res } = makeRequest();
    await handler(req, res);
    expect(res.statusCode).toBe(502);
    expect(res.body.error.code).toBe('NETWORK_ERROR');
    expect(JSON.stringify(res.body)).not.toContain('secret-token');
  });

  it('handles malformed upstream JSON without exposing its body', async () => {
    fetch.mockResolvedValue(new Response('<html>private error</html>'));
    const { req, res } = makeRequest();
    await handler(req, res);
    expect(res.statusCode).toBe(502);
    expect(JSON.stringify(res.body)).not.toContain('private');
  });

  it('stops a slow upstream request after ten seconds', async () => {
    vi.useFakeTimers();
    fetch.mockImplementation(
      (url, { signal }) =>
        new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
        }),
    );
    const { req, res } = makeRequest();
    const pending = handler(req, res);
    await vi.advanceTimersByTimeAsync(10_000);
    await pending;
    expect(res.statusCode).toBe(504);
    expect(res.body.error.code).toBe('UPSTREAM_TIMEOUT');
  });

  it('cancels upstream work when the client disconnects and cleans up listeners', async () => {
    fetch.mockImplementation(
      (url, { signal }) =>
        new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
        }),
    );
    const { req, res } = makeRequest();
    const pending = handler(req, res);
    res.emit('close');
    await pending;
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
    expect(res.end).not.toHaveBeenCalled();
    expect(req.listenerCount('aborted')).toBe(0);
    expect(res.listenerCount('close')).toBe(0);
  });
});
