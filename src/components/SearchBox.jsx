import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { searchGames } from '../services/rawgApi';

function SearchBox({ compact = false }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const boxRef = useRef(null);
  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);

    if (val.trim().length < 3) {
      setIsOpen(false);
      setResults([]);
      setLoading(false);
      setError(false);
    }
  };

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 3) return;

    const timeoutId = setTimeout(async () => {
      // Todo cambio de estado ocurre dentro del callback asíncrono
      setIsOpen(true);
      setLoading(true);
      setError(false);

      try {
        const games = await searchGames(trimmed);
        setResults(games);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError(true);
        setLoading(false);
      }
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className={`search-box ${compact ? 'search-box--compact' : ''}`} ref={boxRef}>
      <input
        type="text"
        placeholder="Search"
        value={query}
        onChange={handleInputChange}
        onFocus={() => {
          if (query.trim().length >= 3) setIsOpen(true);
        }}
      />
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>

      <div className={`search-results ${isOpen ? 'active' : ''}`}>
        {loading && <div className="search-loading">Buscando...</div>}

        {!loading && error && <div className="search-loading">Error de conexión</div>}

        {!loading && !error && results.length === 0 && (
          <div className="search-loading">No se encontraron juegos</div>
        )}

        {!loading &&
          !error &&
          results.map((game) => {
            const bgImage = game.background_image || '';
            const year = game.released ? game.released.substring(0, 4) : 'N/A';

            return (
              <Link
                key={game.id}
                to={`/review?id=${game.id}`}
                className="search-result-item"
                onClick={() => setIsOpen(false)}
              >
                <img src={bgImage} alt={game.name} />
                <div className="search-result-info">
                  <span className="search-result-title">{game.name}</span>
                  <span className="search-result-year">
                    {year} ⭐ {game.rating}
                  </span>
                </div>
              </Link>
            );
          })}
      </div>
    </div>
  );
}

export default SearchBox;