// ==========================================================
// gamesMock.js — datos de respaldo para cuando la API de RAWG no responde
// Tienen la MISMA forma que devuelve RAWG (id, name, rating, released,
// background_image, description, ratings, parent_platforms...), así que
// el resto de la app no sabe si los datos son reales o de mentira.
// Los datos salen de games.json.
// ==========================================================

import gamesData from './games.json';

// Los ids de mock arrancan en 900000 para no chocar con los ids reales de RAWG
export const MOCK_ID_START = 900000;

export function isMockId(id) {
  return Number(id) >= MOCK_ID_START;
}

// Portada generada con SVG (no necesita internet ni archivos de imagen).
// Cada juego usa un color distinto según su id.
export function makeCover(id, name, wide = false) {
  // wide = true genera una portada horizontal (para las tarjetas de guías)
  const [width, height] = wide ? [460, 215] : [220, 320];
  const hue = (id * 47) % 360;
  // Solo las iniciales: el nombre completo ya lo muestra la tarjeta
  const initials = name
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .split(' ')
    .filter((w) => w.length > 2 || /\d/.test(w))
    .slice(0, 3)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  const text = `<text x="${width / 2}" y="${wide ? 130 : 140}" text-anchor="middle" font-size="${wide ? 72 : 64}" opacity="0.35">${initials}</text>`;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="hsl(${hue},70%,45%)"/>` +
    `<stop offset="1" stop-color="hsl(${(hue + 50) % 360},65%,18%)"/>` +
    `</linearGradient></defs>` +
    `<rect width="${width}" height="${height}" fill="url(#g)"/>` +
    `<g fill="#fff" font-family="Poppins, Arial, sans-serif" font-size="22" font-weight="700">${text}</g>` +
    `</svg>`;

  // encodeURIComponent no codifica el apóstrofe, y la URL va entre comillas simples
  return `data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, '%27')}`;
}

// Porcentajes de la barra de ratings (RAWG: exceptional / recommended / meh / skip)
function makeRatings(rating) {
  const exceptional = Math.round((rating - 3) * 45);
  const skip = Math.round((5 - rating) * 4);
  const meh = Math.round((5 - rating) * 10);
  const recommended = 100 - exceptional - skip - meh;
  return [
    { title: 'exceptional', percent: exceptional },
    { title: 'recommended', percent: recommended },
    { title: 'meh', percent: meh },
    { title: 'skip', percent: skip },
  ];
}

const PLATFORMS = {
  PC: { id: 1, name: 'PC' },
  PlayStation: { id: 2, name: 'PlayStation' },
  Xbox: { id: 3, name: 'Xbox' },
  Nintendo: { id: 7, name: 'Nintendo' },
};

// Portadas reales: si ponés una imagen en src/assets/mock/ con el nombre del
// slug (por ejemplo elden-ring.jpg) se usa esa; si no, la portada generada.
const localCovers = import.meta.glob('../assets/mock/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
  import: 'default',
});

function findLocalCover(slug) {
  const key = Object.keys(localCovers).find((path) => path.split('/').pop().split('.')[0] === slug);
  return key ? localCovers[key] : null;
}

let nextId = MOCK_ID_START + 1;

// Convierte cada juego de games.json a la forma que devuelve RAWG
function build(entries) {
  return entries.map((entry) => {
    const id = nextId++;
    return {
      id,
      name: entry.name,
      released: entry.released,
      rating: entry.rating,
      ratings_count: 800 + (id - MOCK_ID_START) * 137,
      background_image: findLocalCover(entry.slug) || entry.cover_url || makeCover(id, entry.name),
      description: `<p>${entry.description}</p>`,
      ratings: makeRatings(entry.rating),
      parent_platforms: entry.platforms.map((p) => ({ platform: PLATFORMS[p] })),
    };
  });
}

// Una lista por categoría: las claves coinciden con las de Homepage.jsx
export const MOCK_BY_CATEGORY = {
  trending: build(gamesData.trending),
  new: build(gamesData.new),
  playstation: build(gamesData.playstation),
  xbox: build(gamesData.xbox),
  nintendo: build(gamesData.nintendo),
};

const ALL_MOCK_GAMES = Object.values(MOCK_BY_CATEGORY).flat();

export function getMockGameById(id) {
  return ALL_MOCK_GAMES.find((game) => game.id === Number(id)) || null;
}

// Búsqueda simple por nombre (para el SearchBox)
export function searchMockGames(query, limit = 5) {
  const q = query.toLowerCase();
  return ALL_MOCK_GAMES.filter((game) => game.name.toLowerCase().includes(q)).slice(0, limit);
}
