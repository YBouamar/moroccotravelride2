// Copies the MapLibre worker into public/vendor (git-ignored). MapLibre 6 finds its worker next to
// its own module file, which no longer holds once Turbopack renames the chunks: the live map sets
// this URL with setWorkerUrl(). The version in the path busts the browser cache on upgrades.
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';

const dist = new URL('./', import.meta.resolve('maplibre-gl/dist/maplibre-gl-worker.mjs'));
const { version } = JSON.parse(readFileSync(new URL('../package.json', dist), 'utf8'));
const target = new URL(`../public/vendor/maplibre-gl/${version}/`, import.meta.url);

mkdirSync(target, { recursive: true });
// The worker imports the shared chunk from its own folder.
for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  copyFileSync(new URL(file, dist), new URL(file, target));
}
