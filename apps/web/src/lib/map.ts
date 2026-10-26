/**
 * Map tiles of the live map (step 20). OpenStreetMap standard tiles for the MVP: their usage
 * policy limits heavy use (À VÉRIFIER before launch: own tile server or a provider, BACKLOG).
 * The CSP allows this origin only.
 */
export const MAP_TILES_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const MAP_TILES_ORIGIN = 'https://tile.openstreetmap.org';
export const MAP_ATTRIBUTION = '© OpenStreetMap contributors';

/** Morocco, roughly centred on Casablanca and Marrakech. */
export const MOROCCO_CENTER: [number, number] = [-7.4, 32.4];
