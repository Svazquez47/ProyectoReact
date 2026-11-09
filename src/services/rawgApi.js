import { MOCK_BY_CATEGORY, getMockGameById, isMockId, searchMockGames } from '../data/gamesMock';

const API_KEY = import.meta.env.VITE_RAWG_API_KEY;
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const BASE_URL = 'https://api.rawg.io/api/games';

const cache = {};

export function getRecentDatesRange() {
  const today = new Date();
  const pastDate = new Date();
  pastDate.setMonth(today.getMonth() - 3);
  const format = (date) => date.toISOString().split('T')[0];
  return `${format(pastDate)},${format(today)}`;
}


function describeStatus(status) {
  if (status === 401 || status === 403) {
    return `RAWG rechazó la clave (error ${status}). Revisá VITE_RAWG_API_KEY en el .env.`;
  }
  if (status === 429) {
    return 'Se superó el límite de pedidos de RAWG (error 429). Probá más tarde o creá otra clave.';
  }
  return `RAWG respondió con el error ${status}.`;
}

async function request(url) {
  if (!API_KEY) {
    throw new Error('Falta la clave de RAWG: creá el archivo .env con VITE_RAWG_API_KEY.');
  }

  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error('No se pudo conectar con RAWG. Revisá tu conexión a internet.');
  }

  if (!response.ok) {
    throw new Error(describeStatus(response.status));
  }
  return response.json();
}

function getJson(url) {
  if (!cache[url]) {
    cache[url] = request(url).catch((err) => {
      delete cache[url];
      throw err;
    });
  }
  return cache[url];
}

function mockCategoryFromParams(endpointParams) {
  if (endpointParams.includes('sony') || endpointParams.includes('playstation')) return 'playstation';
  if (endpointParams.includes('microsoft') || endpointParams.includes('xbox')) return 'xbox';
  if (endpointParams.includes('nintendo')) return 'nintendo';
  if (endpointParams.includes('dates=')) return 'new';
  return 'trending';
}

export async function fetchGamesByCategory(endpointParams) {
  const mockGames = MOCK_BY_CATEGORY[mockCategoryFromParams(endpointParams)];
  if (USE_MOCK) return mockGames;

  try {
    const data = await getJson(`${BASE_URL}?key=${API_KEY}&page_size=15&${endpointParams}`);
    return data.results && data.results.length > 0 ? data.results : mockGames;
  } catch (err) {
    // Si RAWG no responde, devolvemos las tarjetas de mock de esa categoría
    console.warn('RAWG no responde, usando datos MOCK:', err);
    return mockGames;
  }
}

export async function searchGames(query) {
  if (USE_MOCK) return searchMockGames(query);

  try {
    const data = await getJson(
      `${BASE_URL}?search=${encodeURIComponent(query)}&key=${API_KEY}&page_size=5`
    );
    return data.results || [];
  } catch (err) {
    // Si RAWG no responde, buscamos entre los juegos de mock
    console.warn('RAWG no responde, buscando en datos MOCK:', err);
    return searchMockGames(query);
  }
}


export async function fetchGameDetails(gameId) {
  // Los juegos de mock no existen en RAWG: se leen del archivo local
  if (USE_MOCK || isMockId(gameId)) {
    const mockGame = getMockGameById(gameId);
    if (mockGame) return mockGame;
    throw new Error('Juego de mock no encontrado.');
  }
  return getJson(`${BASE_URL}/${gameId}?key=${API_KEY}`);
}

export async function fetchGameRawgReviews(gameId) {
  if (USE_MOCK || isMockId(gameId)) return [];

  let json;
  try {
    json = await getJson(`${BASE_URL}/${gameId}/reviews?key=${API_KEY}`);
  } catch {
    return [];
  }

  const spam = [
    'casino', 'bet', '1xbet', 'slot', 'promo', 'bonus',
    'free spins', 'gamble', 'crypto', 'binance', 'invest', 'http', 'www.',
  ];

  return (json.results || [])
    .filter(
      (r) =>
        r.text &&
        r.text.length >= 20 &&
        !spam.some((k) => r.text.toLowerCase().includes(k))
    )
    .map((r) => ({
      id: `rawg-${r.id}`,
      username: r.user?.username || 'Usuario RAWG',
      rating: r.rating,
      comment: r.text,
      avatar: r.user?.avatar || '',
    }));
}
