const API_BASE_URL = 'https://api.themoviedb.org/3';
const REQUEST_TIMEOUT_MS = 10_000;

const allowedParameters = {
  trending: ['endpoint', 'page'],
  popular: ['endpoint', 'page'],
  search: ['endpoint', 'page', 'query'],
  details: ['endpoint', 'id'],
};

function sendJson(res, status, body) {
  if (res.destroyed || res.writableEnded) return;
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function sendError(res, status, code, message) {
  res.setHeader('Cache-Control', 'no-store');
  sendJson(res, status, { error: { code, message } });
}

function parsePositiveInteger(value, maximum) {
  if (!/^[1-9]\d*$/.test(value ?? '')) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number <= maximum ? number : null;
}

function buildUpstreamUrl(parameters) {
  const endpoint = parameters.get('endpoint');
  if (!Object.hasOwn(allowedParameters, endpoint)) throw new Error('Choose a valid movie endpoint.');
  const allowed = allowedParameters[endpoint];

  const seen = new Set();
  for (const name of parameters.keys()) {
    if (seen.has(name)) throw new Error('Request parameters must not be repeated.');
    if (!allowed.includes(name)) throw new Error('This request contains an unsupported parameter.');
    seen.add(name);
  }

  let path;
  let page;
  if (endpoint === 'details') {
    const id = parsePositiveInteger(parameters.get('id'), 2_147_483_647);
    if (!id) throw new Error('Choose a valid movie ID.');
    path = `/movie/${id}`;
  } else {
    page = parsePositiveInteger(parameters.get('page') ?? '1', 500);
    if (!page) throw new Error('Page must be a whole number between 1 and 500.');
    path = {
      trending: '/trending/movie/week',
      popular: '/movie/popular',
      search: '/search/movie',
    }[endpoint];
  }

  // Build the destination ourselves: callers cannot choose a host or upstream path.
  const upstreamUrl = new URL(`${API_BASE_URL}${path}`);
  upstreamUrl.searchParams.set('language', 'en-US');
  if (page) upstreamUrl.searchParams.set('page', String(page));

  if (endpoint === 'search') {
    const query = parameters.get('query')?.trim();
    const hasControlCharacters = [...(query ?? '')].some((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127;
    });
    if (!query || query.length > 150 || hasControlCharacters) {
      throw new Error('Enter a movie title between 1 and 150 characters.');
    }
    upstreamUrl.searchParams.set('query', query);
    upstreamUrl.searchParams.set('include_adult', 'false');
  }

  if (endpoint === 'details') {
    upstreamUrl.searchParams.set('append_to_response', 'credits,videos,recommendations');
  }

  return { endpoint, upstreamUrl };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Only GET requests are supported.');
  }

  let request;
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== '/api/tmdb' && url.pathname !== '/api/tmdb/') {
      return sendError(res, 404, 'NOT_FOUND', 'This API route could not be found.');
    }
    request = buildUpstreamUrl(url.searchParams);
  } catch (error) {
    return sendError(res, 400, 'INVALID_REQUEST', error.message);
  }

  const token = process.env.TMDB_READ_ACCESS_TOKEN?.trim();
  if (!token) {
    return sendError(res, 503, 'CONFIGURATION_MISSING', 'Movie data is not configured yet.');
  }

  const controller = new AbortController();
  let timedOut = false;
  let clientDisconnected = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  function abortOnDisconnect() {
    if (!res.writableEnded) {
      clientDisconnected = true;
      controller.abort();
    }
  }

  req.once?.('aborted', abortOnDisconnect);
  res.once?.('close', abortOnDisconnect);

  try {
    const response = await fetch(request.upstreamUrl, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: controller.signal,
      redirect: 'error',
    });

    if (clientDisconnected) return;

    if (response.status === 404 && request.endpoint === 'details') {
      return sendError(res, 404, 'MOVIE_NOT_FOUND', 'This movie could not be found.');
    }
    if (response.status === 429) {
      res.setHeader('Retry-After', '30');
      return sendError(res, 429, 'RATE_LIMITED', 'Too many movie requests. Please try again shortly.');
    }
    if (!response.ok) {
      return sendError(res, 502, 'UPSTREAM_ERROR', 'Movie data is temporarily unavailable. Please try again.');
    }

    const data = await response.json();
    if (!data || typeof data !== 'object' || data.success === false) {
      return sendError(res, 502, 'UPSTREAM_ERROR', 'Movie data is temporarily unavailable. Please try again.');
    }
    if (clientDisconnected) return;

    // Searches may reveal a visitor's interests, so only public discovery data is cached.
    if (request.endpoint !== 'search') {
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');
    }
    sendJson(res, 200, data);
  } catch {
    if (clientDisconnected) return;
    if (timedOut) {
      return sendError(res, 504, 'UPSTREAM_TIMEOUT', 'The movie service took too long to respond. Please try again.');
    }
    sendError(res, 502, 'NETWORK_ERROR', 'Unable to reach the movie service. Please try again.');
  } finally {
    clearTimeout(timeout);
    req.off?.('aborted', abortOnDisconnect);
    res.off?.('close', abortOnDisconnect);
  }
}
