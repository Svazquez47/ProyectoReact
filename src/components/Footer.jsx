import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="site-footer">
      <p>
        © 2026 GameVault · Proyecto de Desarrollo Web, UCC ·{' '}
        <Link to="/about">Sobre nosotros</Link>
      </p>
    </footer>
  );
}

export default Footer;
