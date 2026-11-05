function movieError(message, code, status) {
  const error = new Error(message);
  error.code = code;
  if (status) error.status = status;
  return error;
}

export async function requestMovies(endpoint, params = {}, { signal } = {}) {
  const query = new URLSearchParams({ endpoint });
  for (const [name, value] of Object.entries(params).sort(([first], [second]) =>
    first.localeCompare(second),
  )) {
    if (value === undefined || value === null) continue;
    if (!['string', 'number', 'boolean'].includes(typeof value) || name === 'endpoint') {
      throw movieError('The movie request is invalid.', 'INVALID_REQUEST');
    }
    query.set(name, String(value));
  }

  let response;
  try {
    response = await fetch(`/api/tmdb?${query}`, {
      headers: { Accept: 'application/json' },
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError' || signal?.aborted) throw error;
    throw movieError('Unable to connect. Check your connection and try again.', 'NETWORK_ERROR');
  }

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    if (error.name === 'AbortError' || signal?.aborted) throw error;
    throw movieError(
      'Movie data could not be loaded. Please try again.',
      'INVALID_RESPONSE',
      response.status,
    );
  }

  if (!response.ok || payload?.error) {
    throw movieError(
      payload?.error?.message || 'Movie data could not be loaded. Please try again.',
      payload?.error?.code || 'REQUEST_FAILED',
      response.status,
    );
  }

  if (!payload || typeof payload !== 'object') {
    throw movieError(
      'Movie data could not be loaded. Please try again.',
      'INVALID_RESPONSE',
      response.status,
    );
  }
  return payload;
}
