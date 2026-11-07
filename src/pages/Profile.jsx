import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { fetchGameDetails } from '../services/rawgApi';
import { useAuth } from '../context/AuthContext';
import '../styles/profile.css';

const MAX_FEATURED = 4;

function Profile() {
  const { user } = useAuth();

  const [vaultGames, setVaultGames] = useState([]);
  const [myReviews, setMyReviews] = useState([]);
  const [gameNames, setGameNames] = useState({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [updatingGameId, setUpdatingGameId] = useState(null);
  const [reviewsError, setReviewsError] = useState(false);

  const email = user?.email || '';
  const username = email.split('@')[0] || 'Usuario';

  useEffect(() => {
    document.title = `${username} — GameVault`;
  }, [username]);

  // Cargar juegos de la Vault y reseñas del usuario
  useEffect(() => {
    if (!user || !supabase) return;

    let isMounted = true;

    async function loadProfileData() {
      // 1. Cargar Vault del usuario
      const { data: vaultData, error: vaultErr } = await supabase
        .from('vault_games')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!isMounted) return;

      const gamesList = vaultErr ? [] : vaultData || [];
      if (vaultErr) console.error('Error cargando la Vault:', vaultErr);
      setVaultGames(gamesList);

      // 2. Cargar reseñas del usuario
      const { data: reviewsData, error: revErr } = await supabase
        .from('game_reviews')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!isMounted) return;

      if (revErr) {
        console.error('Error cargando reseñas:', revErr);
        setReviewsError(true);
        return;
      }

      const reviewsList = reviewsData || [];
      setMyReviews(reviewsList);

      // 3. Armar diccionario de nombres de juegos (usando la Vault primero y consultando RAWG si falta alguno)
      const nameMap = {};
      gamesList.forEach((g) => {
        nameMap[g.game_id] = g.game_name;
      });

      const missingIds = [...new Set(reviewsList.map((r) => r.game_id))].filter(
        (id) => !nameMap[id]
      );

      await Promise.all(
        missingIds.map(async (id) => {
          try {
            const details = await fetchGameDetails(id);
            nameMap[id] = details?.name || `Juego #${id}`;
          } catch (e) {
            console.error('Error buscando el nombre del juego:', e);
            nameMap[id] = `Juego #${id}`;
          }
        })
      );

      if (isMounted) {
        setGameNames(nameMap);
      }
    }

    loadProfileData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Destacar o quitar destacado de un juego (máximo 4)
  const handleToggleFeatured = async (game) => {
    const makeFeatured = !game.featured;
    const currentFeaturedCount = vaultGames.filter((g) => g.featured).length;

    if (makeFeatured && currentFeaturedCount >= MAX_FEATURED) {
      window.alert(`Podés destacar hasta ${MAX_FEATURED} juegos. Quitá uno primero.`);
      return;
    }

    setUpdatingGameId(game.game_id);
    const { error } = await supabase
      .from('vault_games')
      .update({ featured: makeFeatured })
      .eq('user_id', user.id)
      .eq('game_id', game.game_id);
    setUpdatingGameId(null);

    if (error) {
      console.error('Error actualizando destacado:', error);
      window.alert('No se pudo actualizar el juego destacado.');
      return;
    }

    // Actualizamos el estado local y React redibuja automáticamente el expositor y el selector
    setVaultGames((prev) =>
      prev.map((g) =>
        g.game_id === game.game_id ? { ...g, featured: makeFeatured } : g
      )
    );
  };

  const featuredGames = vaultGames.filter((g) => g.featured).slice(0, MAX_FEATURED);

  return (
    <main className="profile">
      <section className="profile-header">
        <div className="profile-avatar" id="profileAvatar" aria-hidden="true">
          {username.charAt(0)}
        </div>
        <div className="profile-info">
          <h1 className="profile-name" id="profileName">
            {username}
          </h1>
          <p className="profile-email" id="profileEmail">
            {email}
          </p>
          <div className="profile-stats">
            <div className="stat">
              <span className="stat-num" id="statGames">
                {vaultGames.length}
              </span>
              <span className="stat-label">juegos en la Vault</span>
            </div>
            <div className="stat">
              <span className="stat-num" id="statReviews">
                {myReviews.length}
              </span>
              <span className="stat-label">reseñas</span>
            </div>
          </div>
        </div>
      </section>

      {/* Expositor de Juegos Destacados */}
      <section className="profile-section">
        <div className="section-head">
          <h2>Juegos destacados</h2>
          <button
            type="button"
            className="btn-ghost"
            id="editFeaturedBtn"
            onClick={() => setPickerOpen((prev) => !prev)}
          >
            {pickerOpen ? 'Listo' : 'Editar destacados'}
          </button>
        </div>

        <div className="showcase" id="showcase">
          {featuredGames.length === 0 ? (
            <p className="empty-msg">
              {vaultGames.length === 0
                ? 'Tu Vault está vacía. Agregá juegos para poder destacarlos.'
                : 'Todavía no elegiste juegos destacados. Tocá "Editar destacados".'}
            </p>
          ) : (
            featuredGames.map((game) => (
              <Link
                key={game.game_id}
                to={`/review?id=${encodeURIComponent(game.game_id)}`}
                className="showcase-item"
                style={{
                  backgroundImage: game.background_image
                    ? `url(${JSON.stringify(game.background_image)})`
                    : undefined,
                }}
              >
                <span>{game.game_name}</span>
              </Link>
            ))
          )}
        </div>

        {/* Selector de destacados */}
        <div className={`picker ${pickerOpen ? '' : 'is-hidden'}`} id="featuredPicker">
          <p className="picker-hint">
            Tocá un juego para destacarlo o quitarlo (máximo 4).
          </p>
          <div className="picker-grid" id="pickerGrid">
            {vaultGames.length === 0 ? (
              <p className="empty-msg">No hay juegos en tu Vault todavía.</p>
            ) : (
              vaultGames.map((game) => (
                <button
                  key={game.game_id}
                  type="button"
                  className={`picker-item ${game.featured ? 'picked' : ''}`}
                  title={game.game_name}
                  aria-pressed={Boolean(game.featured)}
                  disabled={updatingGameId === game.game_id}
                  style={{
                    backgroundImage: game.background_image
                      ? `url(${JSON.stringify(game.background_image)})`
                      : undefined,
                  }}
                  onClick={() => handleToggleFeatured(game)}
                />
              ))
            )}
          </div>
        </div>
      </section>

      {/* Mis Reseñas */}
      <section className="profile-section">
        <div className="section-head">
          <h2>Mis reseñas</h2>
        </div>
        <div id="myReviews">
          {reviewsError ? (
            <p className="empty-msg">No se pudieron cargar tus reseñas.</p>
          ) : myReviews.length === 0 ? (
            <p className="empty-msg">Todavía no escribiste ninguna reseña.</p>
          ) : (
            myReviews.map((review) => {
              const rating = Math.min(
                5,
                Math.max(0, Math.round(Number(review.rating) || 0))
              );
              const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
              const dateStr = review.created_at
                ? new Date(review.created_at).toLocaleDateString('es-AR')
                : '';

              return (
                <div key={review.id} className="my-review">
                  <div className="my-review-head">
                    <Link
                      to={`/review?id=${encodeURIComponent(review.game_id)}`}
                      className="my-review-game"
                    >
                      {gameNames[review.game_id] || `Juego #${review.game_id}`}
                    </Link>
                    <span className="stars">{stars}</span>
                    <span className="my-review-date">{dateStr}</span>
                  </div>
                  <p className="my-review-text">{review.comment}</p>
                </div>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}

export default Profile;