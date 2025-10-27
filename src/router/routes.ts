import { RouteDefinition } from './Router';

/**
 * Centralized route definitions for RASP Map
 */
export const routes: RouteDefinition[] = [
  {
    path: '/',
    name: 'home',
    overlay: false,
  },
  {
    path: '/search',
    name: 'search',
    overlay: true,
  },
  {
    path: '/favourites',
    name: 'favourites',
    overlay: true,
  },
  {
    path: '/spot/:id',
    name: 'spot',
    overlay: true,
  },
  {
    path: '/search/spot/:id',
    name: 'search-spot',
    overlay: true,
  },
  {
    path: '/favourites/spot/:id',
    name: 'favourites-spot',
    overlay: true,
  },
  {
    path: '/logout',
    name: 'logout',
    overlay: true,
  },
];
