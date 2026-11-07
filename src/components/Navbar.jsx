import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import logoImg from '../assets/gamevault_logo_transparent.png';
import { useAuth } from '../context/AuthContext';
import SearchBox from './SearchBox';

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { session, signOut } = useAuth();

  // Mostramos el buscador compacto en la barra superior cuando no estamos en Home ('/') ni en '/about'
  const showCompactSearch = location.pathname !== '/' && location.pathname !== '/about';

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleAvatarClick = () => {
    if (!session) {
      navigate('/login');
      return;
    }
    setMenuOpen((prev) => !prev);
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <header className="topbar noise">
      <Link to="/" className="brand">
        <img src={logoImg} alt="GV" />
        <span>GameVault</span>
      </Link>

      <div className="topbar-right">
        <nav className="links">
          <Link to="/">Home</Link>
          <Link to="/vault">My Vault</Link>
          <Link to="/about">About</Link>
        </nav>

        {/* Buscador compacto reutilizando el mismo componente SearchBox */}
        {showCompactSearch && <SearchBox compact />}

        <div className={`user-menu ${menuOpen ? 'open' : ''}`} ref={menuRef}>
          <button
            type="button"
            className="nav-avatar"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            aria-label="Menú de usuario"
            onClick={handleAvatarClick}
          >
            👤︎
          </button>

          <div className="user-dropdown" role="menu">
            <Link to="/profile" role="menuitem" onClick={() => setMenuOpen(false)}>
              Mi perfil
            </Link>
            <button type="button" role="menuitem" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;