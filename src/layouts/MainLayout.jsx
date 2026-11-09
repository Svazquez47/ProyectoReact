import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// Estructura que se repite en casi todas las páginas:
// Navbar arriba, Footer abajo y, en el medio, la página que corresponda a la ruta.
function MainLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
      <Footer />
    </>
  );
}

export default MainLayout;
