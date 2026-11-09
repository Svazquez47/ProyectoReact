import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import '../styles/vault.scss';

function Vault() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user || !supabase) return;

    let isMounted = true;

    async function fetchVaultGames() {
      const { data, error: dbError } = await supabase
        .from('vault_games')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!isMounted) return;

      if (dbError) {
        console.error('Error cargando Vault:', dbError);
        setError(true);
      } else {
        setGames(data || []);
      }
      setLoading(false);
    }

    fetchVaultGames();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleRemoveGame = async (e, game) => {
    e.stopPropagation();

    const confirmed = window.confirm(
      `¿Seguro que deseas eliminar "${game.game_name}" de tu Vault?`
    );
    if (!confirmed) return;

    const { error: deleteError } = await supabase
      .from('vault_games')
      .delete()
      .eq('user_id', user.id)
      .eq('game_id', game.game_id);

    if (!deleteError) {
      setGames((prevGames) => prevGames.filter((g) => g.game_id !== game.game_id));
    } else {
      console.error('Error al eliminar:', deleteError);
      window.alert('Ocurrió un error al quitar el juego.');
    }
  };

  return (
    <div className="vault-page">
      <main className="vault-main">
        <div className="vault-header">
          <h1 className="vault-title">My Vault</h1>
          <Link to="/" className="btn-primary">
            Add Game
          </Link>
        </div>

        <div className="vault-grid" id="vaultGrid">
          {loading && (
            <p style={{ color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
              Cargando tu colección...
            </p>
          )}

          {!loading && error && (
            <p style={{ color: '#ef2d63', gridColumn: '1 / -1' }}>
              Ocurrió un error al cargar la base de datos.
            </p>
          )}

          {!loading && !error && games.length === 0 && (
            <p style={{ color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
              Tu Vault está vacía. Ve al Home y añade algunos juegos.
            </p>
          )}

          {!loading &&
            !error &&
            games.map((game) => {
              const bgImage = game.background_image || '';

              return (
                <div key={game.id || game.game_id} className="vault-item">
                  <div className="title-label">{game.game_name}</div>
                  <div
                    className="cover"
                    style={{
                      backgroundImage: bgImage ? `url('${bgImage}')` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                    onClick={() => navigate(`/review?id=${game.game_id}`)}
                  >
                    <div className="remove-bar">
                      <button
                        type="button"
                        className="remove-btn"
                        title="Quitar de la Vault"
                        onClick={(e) => handleRemoveGame(e, game)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </main>
    </div>
  );
}

export default Vault;