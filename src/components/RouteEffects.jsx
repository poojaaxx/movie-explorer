import { useEffect } from 'react';
import { useLocation } from 'react-router';

export default function RouteEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const page =
      pathname === '/'
        ? 'Discover'
        : pathname === '/search'
          ? 'Search'
          : pathname === '/favourites'
            ? 'Favourites'
            : pathname.startsWith('/movie/')
              ? 'Movie details'
              : 'Page not found';
    document.title = `${page} — Movie Explorer`;
  }, [pathname]);
  return null;
}
