import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { createGuide, deleteGuide, fetchGuides } from '../services/guidesApi';
import { generateGuide, isGeminiConfigured } from '../services/geminiApi';
import guidesData from '../data/guides.json';
import GuideDetail from './GuideDetail';

const SECTIONS = [
  { key: 'mine', label: 'Mis guías' },
  { key: 'prearmed', label: 'Prearmadas' },
  { key: 'links', label: 'Enlaces' },
  { key: 'ai', label: 'Crear con IA' },
];

const SOURCE_LABELS = { prearmed: 'Prearmada', link: 'Enlace', ai: 'IA' };

function GuidesTab() {
  const { user } = useAuth();

  const [section, setSection] = useState('mine');
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openGuide, setOpenGuide] = useState(null);

  // Formulario "Crear con IA"
  const [gameName, setGameName] = useState('');
  const [focus, setFocus] = useState('');
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    if (!user || !supabase) return;

    let isMounted = true;

    fetchGuides(user.id)
      .then((data) => {
        if (isMounted) setGuides(data);
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
  }, [user]);

  // Guarda una guía nueva y la suma a la lista sin recargar
  const saveGuide = async (guide) => {
    try {
      const saved = await createGuide(user.id, guide);
      setGuides((prev) => [saved, ...prev]);
      return saved;
    } catch (err) {
      console.error('Error guardando la guía:', err);
      window.alert('No se pudo guardar la guía.');
      return null;
    }
  };

  const handleSavePrearmed = (item) =>
    saveGuide({
      game_name: item.game,
      title: item.title,
      source: 'prearmed',
      messages: [{ role: 'model', text: item.text }],
    });

  const handleSaveLink = (item) =>
    saveGuide({
      game_name: item.game,
      title: item.title,
      source: 'link',
      url: item.url,
      messages: [],
    });

  const handleGenerate = async (e) => {
    e.preventDefault();
    const name = gameName.trim();
    if (!name) return;

    setGenerating(true);
    setAiError('');
    try {
      const text = await generateGuide(name, focus);
      const saved = await saveGuide({
        game_name: name,
        title: focus.trim() ? `${name}: ${focus.trim()}` : `Guía de ${name}`,
        source: 'ai',
        messages: [{ role: 'model', text }],
      });
      if (saved) {
        setGameName('');
        setFocus('');
        setOpenGuide(saved);
      }
    } catch (err) {
      console.error(err);
      setAiError(err.message || 'No se pudo crear la guía.');
    } finally {
      setGenerating(false);
    }
  };

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

  const isSaved = (title) => guides.some((g) => g.title === title);

  if (!supabase) {
    return <p className="guide-empty">Supabase no está configurado, así que no se pueden guardar guías.</p>;
  }

  // Vista de una guía abierta (con su chat)
  if (openGuide) {
    return <GuideDetail guide={openGuide} onBack={() => setOpenGuide(null)} onDelete={handleDelete} />;
  }

  return (
    <div className="guides">
      <div className="guide-sections">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`guide-section-btn ${section === s.key ? 'active' : ''}`}
            onClick={() => setSection(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === 'mine' && (
        <div className="guide-list">
          {loading && <p className="guide-empty">Cargando tus guías...</p>}
          {!loading && error && <p className="guide-error">{error}</p>}
          {!loading && !error && guides.length === 0 && (
            <p className="guide-empty">
              Todavía no guardaste guías. Guardá una prearmada o un enlace, o creá una con IA.
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
      )}

      {section === 'prearmed' && (
        <div className="guide-list">
          {guidesData.prearmed.map((item) => (
            <div key={item.id} className="guide-card guide-card--column">
              <div className="guide-card-info">
                <span className="guide-badge">{item.game}</span>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
              </div>
              <details>
                <summary>Leer guía</summary>
                <div className="guide-text">{item.text}</div>
              </details>
              <button
                type="button"
                className="btn-primary"
                disabled={isSaved(item.title)}
                onClick={() => handleSavePrearmed(item)}
              >
                {isSaved(item.title) ? 'Guardada ✓' : 'Guardar en mi vault'}
              </button>
            </div>
          ))}
        </div>
      )}

      {section === 'links' && (
        <div className="guide-list">
          {guidesData.links.map((item) => (
            <div key={item.url} className="guide-card">
              <div className="guide-card-info">
                <span className="guide-badge">{item.game}</span>
                <h3>{item.title}</h3>
                <p>{item.site}</p>
              </div>
              <div className="guide-card-actions">
                <a className="btn-ghost" href={item.url} target="_blank" rel="noreferrer">
                  Visitar
                </a>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={isSaved(item.title)}
                  onClick={() => handleSaveLink(item)}
                >
                  {isSaved(item.title) ? 'Guardado ✓' : 'Guardar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {section === 'ai' && (
        <form className="guide-ai-form" onSubmit={handleGenerate}>
          <h3>Pedile a la IA una guía personalizada</h3>
          {!isGeminiConfigured && (
            <p className="guide-error">Falta VITE_GEMINI_API_KEY en el .env, así que la IA no está disponible.</p>
          )}
          <label htmlFor="guideGame">Juego</label>
          <input
            id="guideGame"
            type="text"
            className="field"
            placeholder="Ej: Hollow Knight"
            value={gameName}
            required
            maxLength={100}
            onChange={(e) => setGameName(e.target.value)}
          />
          <label htmlFor="guideFocus">¿Qué querés que cubra? (opcional)</label>
          <input
            id="guideFocus"
            type="text"
            className="field"
            placeholder="Ej: build de mago para principiantes"
            value={focus}
            maxLength={200}
            onChange={(e) => setFocus(e.target.value)}
          />
          {aiError && <p className="guide-error">{aiError}</p>}
          <button type="submit" className="btn-primary" disabled={generating || !isGeminiConfigured}>
            {generating ? 'Creando guía...' : 'Crear guía'}
          </button>
        </form>
      )}
    </div>
  );
}

export default GuidesTab;
