import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  // Mientras comprueba si hay sesión guardada, no mostramos nada (evita parpadeos)
  if (loading) {
    return null;
  }

  // Si no hay sesión, redirigimos a /login guardando la página destino en ?next=
  if (!session) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return children;
}

export default ProtectedRoute;