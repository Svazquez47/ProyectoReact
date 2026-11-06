import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Componentes temporales de prueba (en los próximos pasos los crearemos en la carpeta pages/)
const Homepage = () => <h1>Bienvenido a GameVault (Homepage)</h1>;
const Home = () => <h1>Catálogo Principal (Home)</h1>;
const Login = () => <h1>Iniciar Sesión (Login)</h1>;
const Vault = () => <h1>Mi Bóveda (Vault)</h1>;
const Profile = () => <h1>Mi Perfil (Profile)</h1>;
const Review = () => <h1>Reseñas (Review)</h1>;
const About = () => <h1>Sobre Nosotros (About)</h1>;

function App() {
  return (
    <BrowserRouter>
      {/* Aquí arriba colocaremos pronto tu <Navbar /> para que sea visible en todas las páginas */}
      
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/vault" element={<Vault />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/review" element={<Review />} />
        <Route path="/about" element={<About />} />
      </Routes>

      {/* Aquí abajo colocaremos tu <Footer /> */}
    </BrowserRouter>
  );
}

export default App;