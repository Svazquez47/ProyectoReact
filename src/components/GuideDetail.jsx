import { useState } from 'react';
import { askAboutGuide } from '../services/geminiApi';
import { updateGuideMessages } from '../services/guidesApi';

// Muestra una guía guardada y permite seguir preguntándole cosas a la IA en forma de chat.
// guide.messages[0] es el texto de la guía; el resto es la conversación.
function GuideDetail({ guide, onBack, onDelete }) {
  const [messages, setMessages] = useState(guide.messages);
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const [guideText, ...chat] = messages;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = question.trim();
    if (!text || sending) return;

    const withQuestion = [...messages, { role: 'user', text }];
    setMessages(withQuestion);
    setQuestion('');
    setSending(true);
    setError('');

    try {
      const answer = await askAboutGuide(guide.game_name, withQuestion);
      const withAnswer = [...withQuestion, { role: 'model', text: answer }];
      setMessages(withAnswer);
      // Guardamos la conversación para que siga ahí la próxima vez
      await updateGuideMessages(guide.id, withAnswer);
    } catch (err) {
      console.error(err);
      setError(err.message || 'No se pudo obtener la respuesta.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="guide-detail">
      <div className="guide-detail-top">
        <button type="button" className="btn-ghost" onClick={onBack}>
          ← Volver
        </button>
        <button type="button" className="btn-ghost" onClick={() => onDelete(guide)}>
          Eliminar guía
        </button>
      </div>

      <h2 className="guide-detail-title">{guide.title}</h2>
      <p className="guide-detail-game">{guide.game_name}</p>
      <div className="guide-text">{guideText?.text}</div>

      <h3 className="guide-chat-title">Preguntale a la IA sobre esta guía</h3>
      <div className="guide-chat">
        {chat.length === 0 && (
          <p className="guide-empty">Todavía no hiciste preguntas. Escribí la primera abajo.</p>
        )}
        {chat.map((msg, index) => (
          <div key={index} className={`chat-bubble chat-${msg.role}`}>
            {msg.text}
          </div>
        ))}
        {sending && <div className="chat-bubble chat-model">Pensando...</div>}
      </div>

      {error && <p className="guide-error">{error}</p>}

      <form className="guide-chat-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="field"
          placeholder="Ej: ¿Qué build me conviene para el primer jefe?"
          value={question}
          maxLength={500}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={sending}>
          Enviar
        </button>
      </form>
    </div>
  );
}

export default GuideDetail;
