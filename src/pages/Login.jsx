import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import logoImg from '../assets/gamevault_logo_transparent.png';
import {
  supabase,
  isSupabaseConfigured,
  REMEMBER_KEY,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import '../styles/login.css';

const MIN_PASSWORD = 8;

const MODES = {
  login: {
    titleLines: ['Inicia sesión con tu cuenta de', 'GameVault'],
    submit: 'Continuar',
    passwordAutocomplete: 'current-password',
  },
  register: {
    titleLines: ['Creá tu cuenta de', 'GameVault'],
    submit: 'Crear cuenta',
    passwordAutocomplete: 'new-password',
  },
  forgot: {
    titleLines: ['Recuperá tu contraseña'],
    submit: 'Enviar enlace',
    passwordAutocomplete: 'new-password',
  },
  reset: {
    titleLines: ['Elegí una nueva contraseña'],
    submit: 'Guardar contraseña',
    passwordAutocomplete: 'new-password',
  },
};

function translateError(err) {
  const code = err?.code || '';
  const msg = (err?.message || '').toLowerCase();

  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) {
    return 'Correo o contraseña incorrectos.';
  }
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
    return 'Todavía no confirmaste tu correo. Revisá tu bandeja de entrada.';
  }
  if (code === 'user_already_exists' || msg.includes('already registered')) {
    return 'Ya existe una cuenta con ese correo.';
  }
  if (code === 'weak_password' || msg.includes('password should')) {
    return `La contraseña es muy débil. Usá al menos ${MIN_PASSWORD} caracteres.`;
  }
  if (code === 'same_password' || msg.includes('different from the old')) {
    return 'La nueva contraseña tiene que ser distinta a la anterior.';
  }
  if (code.includes('rate_limit') || msg.includes('rate limit')) {
    return 'Demasiados intentos. Esperá unos minutos y volvé a probar.';
  }
  if (err?.name === 'AuthRetryableFetchError' || msg.includes('failed to fetch')) {
    return 'No pude conectarme al servidor. Revisá tu conexión.';
  }
  return 'Ocurrió un error inesperado. Intentá de nuevo.';
}

function getSetupProblem() {
  if (!isSupabaseConfigured) {
    return 'Falta configurar Supabase: completá supabaseClient.js con la URL y la clave pública de tu proyecto.';
  }
  if (!supabase) {
    return 'No se pudo iniciar el cliente de Supabase.';
  }
  return null;
}

function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session } = useAuth();

  // Inicializamos el modo verificando si el usuario viene de un enlace de recuperación
  const [mode, setMode] = useState(() => {
    return window.location.hash.includes('type=recovery') ? 'reset' : 'login';
  });

  // Inicializamos el mensaje verificando problemas de configuración o enlaces expirados
  const [message, setMessage] = useState(() => {
    const problem = getSetupProblem();
    if (problem) return { text: problem, type: 'error' };
    if (window.location.hash.includes('error_code=')) {
      return {
        text: 'El enlace expiró o ya fue usado. Pedí uno nuevo desde "¿Olvidaste tu contraseña?".',
        type: 'error',
      };
    }
    return { text: '', type: '' };
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [projectSettings, setProjectSettings] = useState(null);

  // Redirección segura después de autenticarse (adaptado a rutas de React Router)
  const redirectAfterAuth = useCallback(() => {
    const nextParam = searchParams.get('next');
    const safeNext =
      nextParam && /^\/[\w-]*$/i.test(nextParam) && nextParam !== '/login'
        ? nextParam
        : '/';
    navigate(safeNext, { replace: true });
  }, [navigate, searchParams]);

  // Si ya hay sesión activa (y no estamos cambiando contraseña), redirigir
  useEffect(() => {
    if (session && mode !== 'reset') {
      redirectAfterAuth();
    }
  }, [session, mode, redirectAfterAuth]);

  // Verificar eventos de recuperación de contraseña y conexión inicial con Supabase
  useEffect(() => {
    if (window.location.hash.includes('error_code=')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      return;
    }

    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset');
        setMessage({ text: '', type: '' });
      }
    });

    async function checkConnection() {
      const base = SUPABASE_URL.trim().replace(/\/+$/, '');
      try {
        const res = await fetch(`${base}/auth/v1/settings`, {
          headers: { apikey: SUPABASE_ANON_KEY.trim() },
        });
        if (res.status === 401 || res.status === 403) {
          setMessage({
            text: 'Supabase rechazó la clave pública. Revisá que hayas copiado la clave "anon" completa.',
            type: 'error',
          });
          return;
        }
        if (res.status === 404) {
          setMessage({
            text: 'Esa URL no parece ser la de un proyecto de Supabase.',
            type: 'error',
          });
          return;
        }
        if (!res.ok) {
          setMessage({ text: `Supabase respondió con el error ${res.status}.`, type: 'error' });
          return;
        }
        const settings = await res.json();
        setProjectSettings(settings);
      } catch (err) {
        console.error('Fallo la conexión con Supabase:', err);
        setMessage({
          text: 'No pude conectarme con esa URL de Supabase. Revisá tu conexión a internet.',
          type: 'error',
        });
      }
    }

    checkConnection();

    return () => subscription.unsubscribe();
  }, []);

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setMessage({ text: '', type: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    const problem = getSetupProblem();
    if (problem) {
      setMessage({ text: problem, type: 'error' });
      return;
    }

    if (mode === 'register' && projectSettings?.disable_signup) {
      setMessage({
        text: 'El registro de nuevas cuentas está deshabilitado en tu proyecto de Supabase.',
        type: 'error',
      });
      return;
    }

    const trimmedEmail = email.trim();

    if ((mode === 'register' || mode === 'reset') && password.length < MIN_PASSWORD) {
      setMessage({
        text: `La contraseña tiene que tener al menos ${MIN_PASSWORD} caracteres.`,
        type: 'error',
      });
      return;
    }

    if ((mode === 'register' || mode === 'reset') && password !== confirmPassword) {
      setMessage({ text: 'Las contraseñas no coinciden.', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const backHere = window.location.origin + '/login';

      if (mode === 'login') {
        localStorage.setItem(REMEMBER_KEY, String(remember));
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (error) throw error;
        redirectAfterAuth();
        return;
      }

      if (mode === 'register') {
        localStorage.setItem(REMEMBER_KEY, 'true');
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: { emailRedirectTo: backHere },
        });
        if (error) throw error;
        if (data.session) {
          redirectAfterAuth();
        } else {
          setMessage({
            text: 'Listo. Si el correo es válido, te enviamos un enlace para confirmar tu cuenta.',
            type: 'success',
          });
        }
        return;
      }

      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
          redirectTo: backHere,
        });
        if (error) throw error;
        setMessage({
          text: 'Si existe una cuenta con ese correo, te enviamos un enlace para cambiar la contraseña.',
          type: 'success',
        });
        return;
      }

      if (mode === 'reset') {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setMessage({
          text: 'Contraseña actualizada. Te llevamos a tu Vault…',
          type: 'success',
        });
        setTimeout(redirectAfterAuth, 1200);
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: translateError(err), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const cfg = MODES[mode];
  // Condiciones de visibilidad equivalentes a tus atributos data-modes
  const showEmail = ['login', 'register', 'forgot'].includes(mode);
  const showPassword = ['login', 'register', 'reset'].includes(mode);
  const showConfirm = ['register', 'reset'].includes(mode);

  return (
    <div className="login-page">
      <div className="login-card">
        <Link to="/" className="brand-mark" title="Volver al inicio">
          <img src={logoImg} alt="GameVault" className="brand-mark" />
        </Link>

        <h1 id="authTitle">
          {cfg.titleLines.map((line, idx) => (
            <span key={line}>
              {line}
              {idx < cfg.titleLines.length - 1 && <br />}
            </span>
          ))}
        </h1>

        <form id="authForm" onSubmit={handleSubmit}>
          {showEmail && (
            <input
              className="field"
              type="email"
              name="email"
              placeholder="Correo electrónico"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}

          {showPassword && (
            <input
              className="field"
              type="password"
              name="password"
              placeholder="Contraseña"
              autoComplete={cfg.passwordAutocomplete}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}

          {showConfirm && (
            <input
              className="field"
              type="password"
              name="confirmPassword"
              placeholder="Repetí la contraseña"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          )}

          {mode === 'login' && (
            <div className="options-row">
              <label className="remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Recordarme
              </label>
              <a
                href="#forgot"
                onClick={(e) => {
                  e.preventDefault();
                  changeMode('forgot');
                }}
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>
          )}

          {message.text && (
            <p className={`form-message form-message--${message.type}`} role="alert" aria-live="polite">
              {message.text}
            </p>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Un momento…' : cfg.submit}
          </button>

          {mode === 'login' && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => changeMode('register')}
            >
              Crear cuenta
            </button>
          )}
        </form>

        {mode === 'register' && (
          <p className="signup-hint">
            ¿Ya tenés cuenta?{' '}
            <a
              href="#login"
              onClick={(e) => {
                e.preventDefault();
                changeMode('login');
              }}
            >
              Iniciá sesión
            </a>
          </p>
        )}

        {mode === 'forgot' && (
          <p className="signup-hint">
            <a
              href="#login"
              onClick={(e) => {
                e.preventDefault();
                changeMode('login');
              }}
            >
              Volver a iniciar sesión
            </a>
          </p>
        )}
      </div>
    </div>
  );
}

export default Login;