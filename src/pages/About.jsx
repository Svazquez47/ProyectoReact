import '../styles/about.css';

function About() {
  return (
    <main className="about">
      <h1 className="about-title">Sobre GameVault</h1>

      <section className="about-section">
        <h2>¿Quiénes somos?</h2>
        <p>
          Somos dos estudiantes de la Universidad Católica de Córdoba (UCC).
          GameVault es un proyecto de la materia Desarrollo Web, creado en 2026.
        </p>
      </section>

      <section className="about-section">
        <h2>¿Qué es GameVault?</h2>
        <p>
          Una plataforma para llevar el seguimiento de lo que jugamos: guardar juegos
          en tu Vault, calificarlos y escribir reseñas que pueden ver todos los usuarios.
        </p>
      </section>

      <section className="about-section">
        <h2>La idea</h2>
        <p>
          Queremos mezclar la inteligencia artificial con los videojuegos: guías
          de juegos específicos y recomendaciones basadas en lo que calificaste.
        </p>
      </section>
    </main>
  );
}

export default About;