const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export const isGeminiConfigured = Boolean(API_KEY) && API_KEY !== 'tu_clave_aca';

const SYSTEM_PROMPT =
  'Sos un experto en videojuegos que escribe guías claras en español. ' +
  'Respondé en texto plano: sin markdown, sin asteriscos y sin #. ' +
  'Usá títulos en MAYÚSCULAS y listas con guiones. ' +
  'Si no estás seguro de un dato, decilo; no inventes información.';

function describeStatus(status) {
  if (status === 400) return 'Gemini rechazó el pedido (error 400). Revisá la clave y el modelo del .env.';
  if (status === 403) return 'Gemini rechazó la clave (error 403). Revisá VITE_GEMINI_API_KEY.';
  if (status === 404) return 'El modelo de Gemini no existe (error 404). Cambiá VITE_GEMINI_MODEL.';
  if (status === 429) return 'Se superó el límite gratuito de Gemini (error 429). Esperá un rato y probá de nuevo.';
  return `Gemini respondió con el error ${status}.`;
}

async function askGemini(messages) {
  if (!isGeminiConfigured) {
    throw new Error('Falta la clave de Gemini: agregá VITE_GEMINI_API_KEY en el .env.');
  }

  let response;
  try {
    response = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
      }),
    });
  } catch {
    throw new Error('No se pudo conectar con Gemini. Revisá tu conexión a internet.');
  }

  if (!response.ok) {
    throw new Error(describeStatus(response.status));
  }

  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const text = parts.map((part) => part.text || '').join('').trim();
  if (!text) {
    throw new Error('Gemini no devolvió ninguna respuesta. Probá reformular el pedido.');
  }
  return text;
}

export function generateGuide(gameName, focus) {
  const topic = focus.trim() || 'guía general para empezar a jugar';
  return askGemini([
    {
      role: 'user',
      text:
        `Creá una guía del videojuego "${gameName}". Enfoque: ${topic}. ` +
        'Incluí: resumen, consejos para empezar, pasos principales y errores comunes.',
    },
  ]);
}

export function askAboutGuide(gameName, messages) {
  const [guide, ...rest] = messages;
  const context = {
    role: 'user',
    text: `Esta es mi guía de "${gameName}". Usala como contexto para mis próximas preguntas:\n\n${guide.text}`,
  };
  return askGemini([context, { role: 'model', text: 'Entendido, preguntame lo que quieras.' }, ...rest]);
}
