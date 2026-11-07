const API_KEY = 'a3ce13daa9974764926de77336692c0b';
const BASE_URL = 'https://api.rawg.io/api/games';

export function getRecentDatesRange() {
  const today = new Date();
  const pastDate = new Date();
  pastDate.setMonth(today.getMonth() - 3);
  const format = (date) => date.toISOString().split('T')[0];
  return `${format(pastDate)},${format(today)}`;
}

export async function fetchGamesByCategory(endpointParams) {
  const url = `${BASE_URL}?key=${API_KEY}&page_size=15&${endpointParams}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Error en la petición: ${response.status}`);
  }
  const data = await response.json();
  return data.results || [];
}

export async function searchGames(query) {
  const url = `${BASE_URL}?search=${encodeURIComponent(query)}&key=${API_KEY}&page_size=5`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Error en la petición a RAWG');
  }
  const data = await response.json();
  return data.results || [];
}

// NUEVO: Obtener los detalles completos de un juego por su ID (usado en Review y Profile)
export async function fetchGameDetails(gameId) {
  const url = `${BASE_URL}/${gameId}?key=${API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Error al obtener los datos del juego');
  }
  return await response.json();
}

// NUEVO: Obtener y filtrar reseñas de RAWG (con tu filtro anti-spam de review.js)
export async function fetchGameRawgReviews(gameId) {
  const url = `${BASE_URL}/${gameId}/reviews?key=${API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) return [];

  const json = await response.json();
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