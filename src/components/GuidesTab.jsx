import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { deleteGuide, fetchGuides } from '../services/guidesApi';
import GuideDetail from './GuideDetail';

const SOURCE_LABELS = { prearmed: 'Popular', link: 'Enlace', ai: 'IA' };

function GuidesTab({ openId }) {
  const { user } = useAuth();

  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openGuide, setOpenGuide] = useState(null);

  useEffect(() => {
    if (!user || !supabase) return;

    let isMounted = true;

    fetchGuides(user.id)
      .then((data) => {
        if (!isMounted) return;
        setGuides(data);
        const toOpen = openId && data.find((g) => g.id === openId);
        if (toOpen) setOpenGuide(toOpen);
      })
      .catch((err) => {
        console.error('Error cargando guías:', err);
        if (isMounted) setError('No se pudieron cargar tus guías. ¿Creaste la tabla vault_guides en Supabase?');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user, openId]);

  const handleDelete = async (guide) => {
    if (!window.confirm(`¿Seguro que querés eliminar "${guide.title}"?`)) return;

    try {
      await deleteGuide(guide.id);
      setGuides((prev) => prev.filter((g) => g.id !== guide.id));
      setOpenGuide(null);
    } catch (err) {
      console.error('Error al eliminar:', err);
      window.alert('Ocurrió un error al eliminar la guía.');
    }
  };

  if (!supabase) {
    return <p className="guide-empty">Supabase no está configurado, así que no se pueden guardar guías.</p>;
  }

  if (openGuide) {
    return <GuideDetail guide={openGuide} onBack={() => setOpenGuide(null)} onDelete={handleDelete} />;
  }

  return (
    <div className="guide-list">
      {loading && <p className="guide-empty">Cargando tus guías...</p>}
      {!loading && error && <p className="guide-error">{error}</p>}
      {!loading && !error && guides.length === 0 && (
        <p className="guide-empty">
          Todavía no guardaste guías. Explorá las <Link to="/guides">guías disponibles</Link> o creá una con IA.
        </p>
      )}
      {guides.map((guide) => (
        <div key={guide.id} className="guide-card">
          <div className="guide-card-info">
            <span className="guide-badge">{SOURCE_LABELS[guide.source]}</span>
            <h3>{guide.title}</h3>
            <p>{guide.game_name}</p>
          </div>
          <div className="guide-card-actions">
            {guide.source === 'link' ? (
              <a className="btn-primary" href={guide.url} target="_blank" rel="noreferrer">
                Abrir enlace
              </a>
            ) : (
              <button type="button" className="btn-primary" onClick={() => setOpenGuide(guide)}>
                Abrir
              </button>
            )}
            <button type="button" className="btn-ghost" onClick={() => handleDelete(guide)}>
              Eliminar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default GuidesTab;
