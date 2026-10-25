// Copies the official logo kit (assets/brand/logos, ADR-014) into the web app.
// Outputs are git-ignored: the kit stays the single source of truth.
import { copyFileSync, mkdirSync } from 'node:fs';

const kit = new URL('../../../assets/brand/logos/', import.meta.url);
const publicBrand = new URL('../public/brand/', import.meta.url);
const app = new URL('../src/app/', import.meta.url);

const toPublic = [
  'svg/MTR_horizontal_couleur.svg',
  'svg/MTR_horizontal_negatif.svg',
  'svg/MTR_horizontal_blanc.svg',
  'svg/MTR_vertical_couleur.svg',
  'svg/MTR_vertical_negatif.svg',
  'svg/MTR_symbole_couleur.svg',
  'svg/MTR_symbole_negatif.svg',
  'favicon/MTR_icone_navy_192.png',
  'favicon/MTR_icone_navy_512.png',
];

// Next.js metadata file conventions (app/favicon.ico, app/icon.png, app/apple-icon.png).
const toApp = {
  'favicon/favicon.ico': 'favicon.ico',
  'favicon/MTR_icone_navy_512.png': 'icon.png',
  'favicon/MTR_icone_navy_180.png': 'apple-icon.png',
};

mkdirSync(publicBrand, { recursive: true });
for (const file of toPublic) {
  copyFileSync(new URL(file, kit), new URL(file.split('/').pop(), publicBrand));
}
for (const [from, to] of Object.entries(toApp)) {
  copyFileSync(new URL(from, kit), new URL(to, app));
}
