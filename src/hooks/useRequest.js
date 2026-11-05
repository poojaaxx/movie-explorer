import { useCallback, useEffect, useMemo, useState } from 'react';
import { requestMovies } from '../services/tmdb.js';

export default function useRequest(endpoint, params = {}) {
  const paramsKey = JSON.stringify(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .sort(([first], [second]) => first.localeCompare(second)),
  );
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ request: null, data: null, error: null });
  const request = useMemo(
    () => ({
      endpoint,
      params: Object.fromEntries(JSON.parse(paramsKey)),
      attempt,
    }),
    [endpoint, paramsKey, attempt],
  );

  useEffect(() => {
    if (request.endpoint === null || request.endpoint === undefined) return;
    const controller = new AbortController();
    let active = true;

    requestMovies(request.endpoint, request.params, { signal: controller.signal })
      .then((data) => {
        if (active) setResult({ request, data, error: null });
      })
      .catch((error) => {
        if (active) setResult({ request, data: null, error });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [request]);

  const retry = useCallback(() => setAttempt((previous) => previous + 1), []);
  const idle = endpoint === null || endpoint === undefined;
  const current = result.request === request;

  // A new request hides old data during render, before its effect has started.
  return {
    data: !idle && current ? result.data : null,
    error: !idle && current ? result.error : null,
    loading: !idle && !current,
    retry,
  };
}
