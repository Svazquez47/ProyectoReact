import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { fetchGameDetails, fetchGameRawgReviews } from '../services/rawgApi';
import { useAuth } from '../context/AuthContext';
import '../styles/review.css';

function Review() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const rawId = searchParams.get('id');
  const gameId = rawId ? parseInt(rawId, 10) : null;

  const [game, setGame] = useState(null);
  const [loadingGame, setLoadingGame] = useState(true);
  const [errorGame, setErrorGame] = useState(false);

  const [inVault, setInVault] = useState(false);
  const [vaultLoading, setVaultLoading] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Función para cargar y combinar reseñas de Supabase + RAWG (igual que loadGameReviews en review.js)
  const loadReviews = useCallback(async (id) => {
    let dbReviews = [];
    if (supabase) {
      const { data, error } = await supabase
        .from('game_reviews')
        .select('*')
        .eq('game_id', id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error leyendo reseñas:', error);
      } else {
        dbReviews = data || [];
      }
    }

    let rawgReviews = [];
    try {
      rawgReviews = await fetchGameRawgReviews(id);
    } catch (e) {
      console.error('Error al buscar en RAWG:', e);
    }

    const combined = [
      ...dbReviews.map((r) => ({
        id: `db-${r.id}`,
        username: r.username || 'Usuario de GameVault',
        rating: r.rating,
        comment: r.comment,
        avatar: '',
      })),
      ...rawgReviews,
    ];

    setReviews(combined);
  }, []);

  // Cargar datos del juego y reseñas cuando cambia el gameId
  useEffect(() => {
    if (!gameId || Number.isNaN(gameId)) return;

    let isMounted = true;

    async function fetchAll() {
      setLoadingGame(true);
      setErrorGame(false);

      try {
        const data = await fetchGameDetails(gameId);
        if (!isMounted) return;
        setGame(data);
        document.title = `${data.name} — GameVault`;
        setLoadingGame(false);
      } catch (err) {
        console.error('Error:', err);
        if (!isMounted) return;
        setErrorGame(true);
        setLoadingGame(false);
      }
    }

    fetchAll();
    // Solucionar error en loadReviewed !!
    loadReviews(gameId);

    return () => {
      isMounted = false;
    };
  }, [gameId, loadReviews]);

  // Verificar si el juego ya está en la Vault del usuario
  useEffect(() => {
    if (!user || !supabase || !gameId || Number.isNaN(gameId)) return;

    let isMounted = true;

    supabase
      .from('vault_games')
      .select('id')
      .eq('user_id', user.id)
      .eq('game_id', gameId)
      .maybeSingle()
      .then(({ data }) => {
        if (isMounted) {
          setInVault(Boolean(data));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user, gameId]);

  // Manejar el botón Add to Vault / Remove from Vault
  const handleVaultAction = async () => {
    if (!user) {
      window.alert('Debes iniciar sesión para guardar juegos.');
      navigate('/login');
      return;
    }

    if (!game || !supabase) return;

    setVaultLoading(true);
    if (inVault) {
      const { error } = await supabase
        .from('vault_games')
        .delete()
        .eq('user_id', user.id)
        .eq('game_id', game.id);

      if (error) {
        console.error('Error:', error);
        window.alert('Error al remover el juego.');
      } else {
        setInVault(false);
      }
    } else {
      const { error } = await supabase.from('vault_games').insert([
        {
          user_id: user.id,
          game_id: game.id,
          game_name: game.name,
          background_image: game.background_image,
        },
      ]);

      if (error && error.code !== '23505') {
        console.error('Error:', error);
        window.alert('Error al guardar el juego.');
      } else {
        setInVault(true);
      }
    }
    setVaultLoading(false);
  };

  // Manejar el envío de una nueva reseña
  const handleReviewSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      window.alert('Debes iniciar sesión para publicar una reseña.');
      navigate('/login');
      return;
    }

    if (!gameId || Number.isNaN(gameId)) {
      window.alert('Error crítico: El ID del juego en la URL no es válido.');
      return;
    }

    const comment = reviewComment.trim();
    if (!comment) {
      window.alert('El comentario no puede estar vacío.');
      return;
    }

    const username = user.email ? user.email.split('@')[0] : 'Usuario';

    setSubmittingReview(true);
    try {
      const { error } = await supabase.from('game_reviews').insert([
        {
          user_id: user.id,
          game_id: gameId,
          username,
          rating: Number(reviewRating),
          comment,
        },
      ]);

      if (error) {
        console.error('Error devuelto por Supabase:', error);
        window.alert(`No se pudo guardar la reseña: ${error.message}`);
      } else {
        setReviewComment('');
        await loadReviews(gameId);
      }
    } catch (err) {
      console.error('Excepción en la red o en el cliente de Supabase:', err);
      window.alert('Ocurrió un error inesperado al conectar con la base de datos.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Cálculos de estrellas y barras de porcentaje (igual que en tu review.js)
  const starCount = game ? Math.min(5, Math.max(0, Math.round(game.rating || 0))) : 5;
  const starsString = '★'.repeat(starCount) + '☆'.repeat(5 - starCount);

  const getPercent = (title) => {
    if (!game?.ratings) return 0;
    const found = game.ratings.find((x) => x.title === title);
    return found ? found.percent : 0;
  };

  const bgStyle = game?.background_image
    ? {
        backgroundImage: `url('${game.background_image}')`,
        backgroundSize: 'cover',
      }
    : {};

  // Estado si no se pasó un ?id= válido en la URL
  if (!gameId || Number.isNaN(gameId)) {
    return (
      <div className="review-page">
        <div className="banner noise"></div>
        <div className="content">
          <div className="main-col">
            <h1 className="game-title">Juego no encontrado</h1>
            <div className="description">
              <p>Por favor, vuelve a la página principal y selecciona un juego válido.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="review-page">
      <div
        className="banner noise"
        id="game-banner"
        style={{ ...bgStyle, backgroundPosition: 'top center' }}
      ></div>

      <div className="content">
        <div className="left-col">
          <div
            className="cover"
            id="game-cover"
            style={{ ...bgStyle, backgroundPosition: 'center' }}
          ></div>

          <div className="platform-list">
            <h3>¿Dónde jugar?</h3>
            <div id="game-platforms">
              {game?.parent_platforms && game.parent_platforms.length > 0 ? (
                game.parent_platforms.map((item) => (
                  <div key={item.platform.id} className="platform-item">
                    <span className="platform-dot"></span>
                    {item.platform.name}
                  </div>
                ))
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  Plataformas no especificadas
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="main-col">
          <h1 className="game-title" id="game-title">
            {loadingGame
              ? 'Cargando...'
              : errorGame
              ? 'Error de conexión'
              : game?.name}
          </h1>

          <p className="game-year" id="game-year">
            {loadingGame
              ? '-'
              : game?.released
              ? game.released.substring(0, 4)
              : 'Fecha desconocida'}
          </p>

          {loadingGame ? (
            <div className="description">Obteniendo información del servidor...</div>
          ) : errorGame ? (
            <div className="description">
              <p>No se pudo conectar con la base de datos.</p>
            </div>
          ) : (
            <div
              className="description"
              id="game-description"
              dangerouslySetInnerHTML={{
                __html: game?.description || 'No hay descripción disponible para este título.',
              }}
            />
          )}

          <div className="popular-reviews">
            <h2>Popular Reviews</h2>

            {user && (
              <div className="review-card" id="reviewFormContainer" style={{ marginBottom: '25px' }}>
                <h3>Escribe tu reseña</h3>
                <form id="submitReviewForm" onSubmit={handleReviewSubmit}>
                  <div style={{ marginBottom: '10px' }}>
                    <label htmlFor="reviewRating">Calificación (1 al 5 estrellas)</label>
                    <select
                      id="reviewRating"
                      className="field"
                      value={reviewRating}
                      onChange={(e) => setReviewRating(Number(e.target.value))}
                    >
                      <option value="5">★★★★★ (5)</option>
                      <option value="4">★★★★☆ (4)</option>
                      <option value="3">★★★☆☆ (3)</option>
                      <option value="2">★★☆☆☆ (2)</option>
                      <option value="1">★☆☆☆☆ (1)</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <textarea
                      id="reviewComment"
                      className="field"
                      placeholder="¿Qué te pareció el juego?"
                      rows="3"
                      required
                      maxLength="2000"
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                    ></textarea>
                  </div>
                  <button
                    type="submit"
                    className="btn-primary"
                    id="sendReviewBtn"
                    disabled={submittingReview}
                  >
                    {submittingReview ? 'Publicando...' : 'Publicar reseña'}
                  </button>
                </form>
              </div>
            )}

            <div id="reviewsList">
              {reviews.length === 0 ? (
                <div className="review-card">
                  <p className="review-text" style={{ textAlign: 'center' }}>
                    Aún no hay reseñas. ¡Sé el primero en escribir una!
                  </p>
                </div>
              ) : (
                reviews.map((rev, idx) => {
                  const rating = Math.min(5, Math.max(0, Math.round(Number(rev.rating) || 0)));
                  const revStars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
                  const hasValidAvatar = /^https:\/\//.test(rev.avatar || '');

                  return (
                    <div
                      key={rev.id || idx}
                      className="review-card"
                      style={{ marginBottom: '15px' }}
                    >
                      <div className="review-head">
                        <div
                          className="review-avatar"
                          style={
                            hasValidAvatar
                              ? {
                                  backgroundImage: `url("${rev.avatar}")`,
                                  backgroundSize: 'cover',
                                }
                              : undefined
                          }
                        ></div>
                        <span className="review-user">{rev.username}</span>
                        <span className="stars">{revStars}</span>
                      </div>
                      <p className="review-text">{rev.comment}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="sidebar">
          <div className="side-panel">
            <h3>Ratings</h3>

            <div className="rating-average">
              <span className="stars" id="game-stars">
                {starsString}
              </span>
              <span className="score" id="game-rating">
                {game ? game.rating : '0.0'}
              </span>
            </div>
            <div className="rating-count" id="game-rating-count">
              {game ? `${game.ratings_count} ratings` : '0 ratings'}
            </div>

            <div className="bar-row">
              <span>5</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${getPercent('exceptional')}%` }}></div>
              </div>
            </div>
            <div className="bar-row">
              <span>4</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${getPercent('recommended')}%` }}></div>
              </div>
            </div>
            <div className="bar-row">
              <span>3</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${getPercent('meh')}%` }}></div>
              </div>
            </div>
            <div className="bar-row">
              <span>2</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: '0%' }}></div>
              </div>
            </div>
            <div className="bar-row">
              <span>1</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${getPercent('skip')}%` }}></div>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn-primary btn-vault"
            id="btn-add-vault"
            disabled={vaultLoading || loadingGame}
            onClick={handleVaultAction}
            style={{
              backgroundColor: user && inVault ? '#4a1f7d' : '',
            }}
          >
            {user && inVault ? 'Remove from Vault' : 'Add to Vault'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Review;