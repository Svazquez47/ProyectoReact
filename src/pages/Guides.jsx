import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { createGuide, fetchGuides } from '../services/guidesApi';
import { generateGuide, isGeminiConfigured } from '../services/geminiApi';
import guidesData from '../data/guides.json';
import GuideCover from '../components/GuideCover';
import '../styles/guides.scss';

const SECTIONS = [
  { key: 'prearmed', label: 'Populares' },
  { key: 'links', label: 'Enlaces' },
  { key: 'ai', label: 'Crear con IA' },
];

// Ideas para completar el formulario de IA con un clic
const IDEAS = [
  { game: 'Hollow Knight', focus: 'cómo vencer a los primeros jefes' },
  { game: 'Elden Ring', focus: 'build de mago para principiantes' },
  { game: 'Minecraft', focus: 'cómo conseguir diamantes rápido' },
];

function Guides() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [section, setSection] = useState('prearmed');
  const [savedGuides, setSavedGuides] = useState([]);
  const [reading, setReading] = useState(null);

  // Formulario "Crear con IA"
  const [gameName, setGameName] = useState('');
  const [focus, setFocus] = useState('');
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    document.title = 'Guías — GameVault';
  }, []);

  // Traemos lo que ya guardó el usuario para marcar las guías como "Guardada ✓"
  useEffect(() => {
    if (!user || !supabase) return;

    let isMounted = true;

    fetchGuides(user.id)
      .then((data) => {
        if (isMounted) setSavedGuides(data);
      })
      .catch((err) => console.error('Error cargando guías guardadas:', err));

    return () => {
      isMounted = false;
    };
  }, [user]);

  const isSaved = (title) => savedGuides.some((g) => g.title === title);

  // Guardar requiere sesión iniciada (igual que reseñar o agregar a la Vault)
  const saveGuide = async (guide) => {
    if (!user) {
      window.alert('Debes iniciar sesión para guardar guías.');
      navigate('/login?next=/guides');
      return null;
    }
    if (!supabase) return null;

    try {
      const saved = await createGuide(user.id, guide);
      setSavedGuides((prev) => [saved, ...prev]);
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

    if (!user) {
      window.alert('Debes iniciar sesión para crear guías con IA.');
      navigate('/login?next=/guides');
      return;
    }

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
      // La guía queda en la Vault: la abrimos ahí para poder seguir con el chat
      if (saved) navigate(`/vault?tab=guides&open=${saved.id}`);
    } catch (err) {
      console.error(err);
      setAiError(err.message || 'No se pudo crear la guía.');
    } finally {
      setGenerating(false);
    }
  };

  // ---------- Vista de lectura de una guía popular ----------
  if (reading) {
    return (
      <div className="guides-page">
        <main className="guides-main guide-reader">
          <button type="button" className="btn-ghost" onClick={() => setReading(null)}>
            ← Volver a las guías
          </button>

          <div className="reader-banner">
            <GuideCover appid={reading.appid} game={reading.game} />
            <div className="reader-banner-text">
              <span className="guide-badge">{reading.game}</span>
              <h1>{reading.title}</h1>
              <p>{reading.summary}</p>
            </div>
          </div>

          <div className="guide-text">{reading.text}</div>

          <button
            type="button"
            className="btn-primary"
            disabled={isSaved(reading.title)}
            onClick={() => handleSavePrearmed(reading)}
          >
            {isSaved(reading.title) ? 'Guardada en tu Vault ✓' : 'Guardar en mi Vault'}
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="guides-page">
      <main className="guides-main">
        <header className="guides-header">
          <h1>Guías de juegos</h1>
          <p>
            Leé guías ya armadas, visitá wikis de otras páginas o pedile a la IA una guía a tu medida.
            Lo que guardes aparece en <Link to="/vault?tab=guides">tu Vault</Link>.
          </p>
        </header>

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

        {section === 'prearmed' && (
          <div className="guide-grid">
            {guidesData.prearmed.map((item) => (
              <article key={item.id} className="g-card">
                <GuideCover appid={item.appid} game={item.game} />
                <div className="g-card-body">
                  <span className="guide-badge">{item.game}</span>
                  <h3>{item.title}</h3>
                  <p>{item.summary}</p>
                  <div className="g-card-actions">
                    <button type="button" className="btn-primary" onClick={() => setReading(item)}>
                      Leer guía
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      disabled={isSaved(item.title)}
                      onClick={() => handleSavePrearmed(item)}
                    >
                      {isSaved(item.title) ? 'Guardada ✓' : 'Guardar'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {section === 'links' && (
          <div className="guide-grid">
            {guidesData.links.map((item) => (
              <article key={item.url} className="g-card">
                <GuideCover appid={item.appid} game={item.game} />
                <div className="g-card-body">
                  <span className="guide-badge">{item.game}</span>
                  <h3>{item.title}</h3>
                  <p>{item.site}</p>
                  <div className="g-card-actions">
                    <a className="btn-primary" href={item.url} target="_blank" rel="noreferrer">
                      Visitar
                    </a>
                    <button
                      type="button"
                      className="btn-ghost"
                      disabled={isSaved(item.title)}
                      onClick={() => handleSaveLink(item)}
                    >
                      {isSaved(item.title) ? 'Guardado ✓' : 'Guardar'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {section === 'ai' && (
          <form className="guide-ai-form" onSubmit={handleGenerate}>
            <h3>Pedile a la IA una guía personalizada</h3>
            <p className="guide-hint">
              Se guarda en tu Vault y después podés seguir preguntándole cosas en un chat.
            </p>
            {!isGeminiConfigured && (
              <p className="guide-error">
                Falta VITE_GEMINI_API_KEY en el .env, así que la IA no está disponible.
              </p>
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

            <div className="guide-ideas">
              <span>Ideas:</span>
              {IDEAS.map((idea) => (
                <button
                  key={idea.game}
                  type="button"
                  className="guide-idea"
                  onClick={() => {
                    setGameName(idea.game);
                    setFocus(idea.focus);
                  }}
                >
                  {idea.game}
                </button>
              ))}
            </div>

            {aiError && <p className="guide-error">{aiError}</p>}
            <button type="submit" className="btn-primary" disabled={generating || !isGeminiConfigured}>
              {generating ? 'Creando guía...' : 'Crear guía'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

export default Guides;
