import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Homepage from './pages/Homepage';
import Login from './pages/Login';
import Vault from './pages/Vault';
import Profile from './pages/Profile';
import Review from './pages/Review';
import About from './pages/About';
import Guides from './pages/Guides';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rutas con Navbar y Footer: el contenido se muestra en el <Outlet /> del layout */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Homepage />} />
            <Route
              path="vault"
              element={
                <ProtectedRoute>
                  <Vault />
                </ProtectedRoute>
              }
            />
            <Route
              path="profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="review" element={<Review />} />
            <Route path="guides" element={<Guides />} />
            <Route path="about" element={<About />} />
          </Route>

          {/* El login va afuera del layout: no muestra Navbar ni Footer */}
          <Route path="/login" element={<Login />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
