import { useLocation } from 'react-router-dom';

/**
 * Returns the route prefix based on whether we're in the client or suite context.
 * Client routes start with /client, suite routes have no prefix.
 */
export function useRoutePrefix() {
  const location = useLocation();
  const isClient = location.pathname.startsWith('/client');
  const prefix = isClient ? '/client' : '';

  /** Prepend prefix to a route, e.g. prefixRoute('/cafe') → '/client/cafe' or '/cafe' */
  const prefixRoute = (route: string) => `${prefix}${route}`;

  return { isClient, prefix, prefixRoute };
}
