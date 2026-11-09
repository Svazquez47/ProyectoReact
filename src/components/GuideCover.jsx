import { useState } from 'react';
import { makeCover } from '../data/gamesMock';

// Portada de una guía: usa la imagen del juego en Steam y, si no hay o no carga,
// una portada generada con las iniciales del juego.
function GuideCover({ appid, game, className = '' }) {
  const [failed, setFailed] = useState(false);

  // Número simple a partir del nombre, para que cada juego tenga siempre el mismo color
  const seed = [...game].reduce((total, char) => total + char.charCodeAt(0), 0);
  const fallback = makeCover(seed, game, true);
  const steamImage = appid
    ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`
    : null;

  return (
    <img
      className={`guide-cover ${className}`}
      src={failed || !steamImage ? fallback : steamImage}
      alt={`Portada de ${game}`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export default GuideCover;
