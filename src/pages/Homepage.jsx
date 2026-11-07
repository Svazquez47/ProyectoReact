import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchGamesByCategory, getRecentDatesRange } from '../services/rawgApi';
import SearchBox from '../components/SearchBox';
import '../styles/homepage.css';

// Subcomponente reutilizable para cada fila de categoría (reemplaza a loadGameCategory de api.js)
function CategoryRow({ title, bgClass, endpointParams }) {
  const [games, setGames] = useState([]);
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    fetchGamesByCategory(endpointParams)
      .then((results) => {
        if (isMounted) setGames(results);
      })
      .catch((err) => {
        console.error(`Error cargando la categoría ${title}:`, err);
        if (isMounted) setError(true);
      });

    return () => {
      isMounted = false;
    };
  }, [endpointParams, title]);

  return (
    <section className={`game-category ${bgClass}`}>
      <div className="category-header">
        <h2>{title}</h2>
        <a href="#see-more" onClick={(e) => e.preventDefault()}>See more</a>
      </div>

      <div className="card-grid">
        {error ? (
          <p style={{ padding: '20px', color: 'var(--text-muted)' }}>
            No se pudo cargar el catálogo.
          </p>
        ) : (
          games.map((game) => {
            const bgImage = game.background_image || '';
            const year = game.released ? game.released.substring(0, 4) : 'N/A';

            return (
              <div
                key={game.id}
                className="game-cover"
                style={{
                  backgroundImage: `url('${bgImage}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
                onClick={() => navigate(`/review?id=${game.id}`)}
              >
                <div
                  style={{
                    background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    padding: '15px',
                  }}
                >
                  <h3
                    style={{
                      color: '#ffffff',
                      margin: '0 0 5px 0',
                      fontSize: '15px',
                      fontWeight: '600',
                    }}
                  >
                    {game.name}
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: '500' }}>
                    <span style={{ color: 'var(--color-star)' }}>⭐ {game.rating}</span>{' '}
                    <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>{year}</span>
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function Homepage() {
  const { session } = useAuth();

  // Definimos las 5 categorías en un arreglo limpio
  const categories = [
    {
      title: 'Trending Games',
      bgClass: 'bg-trending',
      endpointParams: 'ordering=-added',
    },
    {
      title: 'New Releases',
      bgClass: 'bg-new',
      endpointParams: `dates=${getRecentDatesRange()}&ordering=-released`,
    },
    {
      title: 'PlayStation Exclusives',
      bgClass: 'bg-playstation',
      endpointParams: 'publishers=sony-computer-entertainment,playstation-studios&ordering=-added',
    },
    {
      title: 'Xbox Exclusives',
      bgClass: 'bg-xbox',
      endpointParams: 'publishers=microsoft-studios,xbox-game-studios&ordering=-added',
    },
    {
      title: 'Nintendo Exclusives',
      bgClass: 'bg-nintendo',
      endpointParams: 'publishers=nintendo&ordering=-added',
    },
  ];

  return (
    <>
      <section className="hero hero-backdrop hero-photo noise">
        <div className="hero-content">
          <div className="hero-text">
            <div className="logo">GameVault</div>
            <p className="tagline">Collect, rate, discover — powered by AI</p>
            <div className="cta-row" id="heroCtaContainer">
              {session ? (
                <Link to="/vault" className="btn-primary">
                  Go to My Vault
                </Link>
              ) : (
                <Link to="/login" className="btn-primary">
                  Create Account
                </Link>
              )}
            </div>
          </div>

          <SearchBox />
        </div>
      </section>

      {/* Renderizamos las 5 secciones dinámicamente */}
      {categories.map((cat) => (
        <CategoryRow
          key={cat.title}
          title={cat.title}
          bgClass={cat.bgClass}
          endpointParams={cat.endpointParams}
        />
      ))}
    </>
  );
}

export default Homepage;