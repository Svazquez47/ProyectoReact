import { useState } from 'react';
import { makeCover } from '../data/gamesMock';

function GuideCover({ appid, game, className = '' }) {
  const [failed, setFailed] = useState(false);
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
