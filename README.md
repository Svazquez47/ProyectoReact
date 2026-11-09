# Proyecto Integrador: Catálogo de Videojuegos

## Descripción
GameVault es una aplicación web para llevar el seguimiento de los videojuegos que se juegan, similar a Letterboxd pero orientada a videojuegos. Tiene un catálogo organizado por categorías, permite guardar juegos en una colección personal llamada Vault, calificarlos y escribir reseñas que ven todos los usuarios, y consultar guías de juegos (prearmadas, enlaces a otras paginas de la comunidad, wikis, etc o crearlas con inteligencia artificial). El proyecto se desarrolló para la materia Taller de Desarrollo Web. Originalmente estaba escrito en HTML, CSS y JavaScript; esta versión es la versión hecha con React, Vite y Sass.

## Estructura del proyecto
 
```
src/
  main.jsx            punto de entrada: monta <App /> en el HTML
  App.jsx             declara las rutas y envuelve todo con AuthProvider
  layouts/            MainLayout: Navbar + <Outlet /> + Footer
  pages/              Homepage, Review, Vault, Profile, Guides, Login, About
  components/         Navbar, Footer, SearchBox, ProtectedRoute,
                      GuidesTab, GuideDetail, GuideCover
  context/            AuthContext: estado de la sesión
  services/           rawgApi, supabaseClient, guidesApi, geminiApi
  data/               games.json, gamesMock.js, guides.json
  styles/             un .scss por página, más _variables y _mixins
```


## 1. Arquitectura de Componentes y Flujo de Datos
La interfaz se divide en componentes jerárquicos. La comunicación de datos ocurre de componentes padres a componentes hijos.

*   **El componente padre (`App.jsx`):** Funciona como el contenedor principal. Aca se declara el estado de la aplicación utilizando el hook `useState`. Por ejemplo, se definen variables de estado para la lista de juegos (`juegos`), el estado de carga (`cargando`) y los errores (`error`). `App.jsx` le pasa estos datos a los componentes hijos a través de propiedades (`props`).
*   **Los componentes hijos (UI):** Componentes como listas o tarjetas reciben la información a través de las `props` y la renderizan en el DOM. Cuando el estado en el componente padre se actualiza, Se detecta el cambio y se hace un re-renderizado automático de estos componentes hijos con la información nueva, asi manetenemos la interfaz sincronizada con los datos.

## 2. Funcionamiento de las páginas y componentes
 
`App.jsx` declara las rutas. Todas, salvo el login, depende de `MainLayout`, que renderiza la barra superior, el pie y, en el medio, la página correspondiente mediante `Outlet`. El login queda fuera del layout porque se muestra a pantalla completa. Las rutas `/vault` y `/profile` depedne de `ProtectedRoute`, un componente que lee la sesión y, si no existe, se redirige a `/login` guardando la ruta de origen para volver luego de que el usuario haya iniciado sesión.
 
La sesión se comparte con toda la aplicación mediante un contexto (`AuthContext`). Consultamos a Supabase si hay una sesión activa al iniciar y se guardan los cambios (inicio de sesión, cierre, expiración). Cualquier componente lo consulta con el hook `useAuth`. Este es uno de los puntos donde deidimos avanzar un poco más allá de lo explicado en clase, ya que en clase vimos `useContext` entre los hooks pero no lo desarrollamos del todo.
 
La página de inicio (`Homepage`) muestra un buscador y cinco filas de juegos: Trending, New Releases y los exclusivos de PlayStation, Xbox y Nintendo. Cada fila es una instancia del subcomponente `CategoryRow`, que pide sus juegos al servicio, los guarda en un estado y los dibuja con `map()`. Al pasar el mouse por una tarjeta aparece una barra rosa para agregar el juego a la Vault sin entrar a la reseña; si el usuario no inició sesión, se le avisa y se lo envía al login. Hacer clic en la tarjeta lleva a `/review?id=...`.
 
`Review` es la ficha de un juego. Lee el identificador desde la dirección, pide el detalle del juego, muestra puntaje, plataformas, descripción y el grafico de las calificaciones, nos permite agregar o sacar el juego de la Vault y tiene un formulario controlado para dejar una calificación de uno a cinco estrellas y un comentario. Las reseñas que se muestran combinan las guardadas en la base propia con las que provee RAWG.
 
`Vault` lista los juegos guardados por el usuario, con la opción de sacarlos. Tiene dos pestañas: Juegos y Guías. La segunda muestra las guías que el usuario guardó y permite abrir cada una para seguir charlando con la inteligencia artificial sobre ese contenido. `Profile` muestra los datos del usuario, sus reseñas y hasta cuatro juegos destacados elegidos entre los de su Vault. `Login` resuelse encarga del inicio de sesión, el registro y la recuperación de contraseña, con la opción «Recordarme». `About` es una página estática.
 
`Guides` es la página pública de guías. Tiene tres secciones: Populares, que son guías ya redactadas que se leen en pantalla y se pueden guardar; Enlaces, que apuntan a wikis y sitios externos; y Crear con IA, un formulario donde se indica el juego y, opcionalmente, un enfoque, para que Gemini genere una guía a medida. Para guardar o crear se pide también iniciar sesión.
 
Entre los componentes, `Navbar` muestra los enlaces principales y el buscador compacto en todas las páginas excepto la de inicio, que ya lo trae en el cuerpo. `SearchBox` consulta la API mientras se escribe; para no hacer un pedido por cada tecla espera 150 milisegundos desde la última pulsación y cancela el pedido anterior con la función de limpieza de `useEffect`, y usa `useRef` para cerrar la lista de resultados cuando se hace clic fuera. `ProtectedRoute` protege rutas, `Footer` es el pie común, `GuideCover` muestra la portada de una guía con una imagen de respaldo si la original no carga, y `GuideDetail` muestra una guía guardada junto con su chat.


## 3. APIS y Servicios Externos
En nuestro proyecto integramos tres servicios principales:

1. **Supabase:** Se utilizó como el backend como servicio (BaaS) de la aplicación. Lo usamos para gestionar la base de datos y los servicios de autenticación, permitiendo guardar el catálogo de videojuegos, las reseñas de los usuarios y mantener las sesiones de forma segura sin necesidad de usar un servidor propio desde cero.
2. **RAWG API:** Funciona como la fuente de datos externa principal para el catálogo de juegos. La consultamos de manera asíncrona para obtener información detallada, portadas, descripciones, calificaciones y plataformas de una gran variedad de videojuegos de forma automatizada.
3. **Gemini API:** Fue integrada para habilitar funcionalidades de inteligencia artificial dentro de la plataforma. La idea principal es ayudar en la generación de guías y recomendaciones personalizadas de videojuegos basadas en las consultas y preferencias de los usuarios.
 
También nos dimos cuenta que en React, si hacemos un fetch a una API directamente, cada vez que lleguen datos la pantalla se va a volver a dibujar. Si la volvemos a dibujar, el código se lee de nuevo, volviendo a ejecutar el fetch, lo que crea un bucle infinito que rompe la aplicación. Para controlar esto, usamos los siguientes conceptos:

* **El hook `useEffect` con `[]`:** Funciona como una barrera. El arreglo vacío `[]` le da una instrucción estricta a React: "ejecutá este `fetch` únicamente la primera vez que el componente aparece en pantalla". 

* **El flujo paso a paso (Asincronía y Re-renderizado):**
  1. **Render inicial:** El componente se lee por primera vez. Como todavía no hay datos de la API, se dibuja la pantalla mostrando un indicador de "Cargando...".
  2. **Petición:** Se dispara el `useEffect` que va a buscar los datos al servidor en segundo plano.
  3. **Guardar los datos:** Cuando el servidor responde con el JSON, guardamos esa información en la memoria del componente usando el estado (por ejemplo, con `setJuegos(data)`).
  4. **Re-renderizado automático:** Al cambiar el estado con `setJuegos`, React vuelve a dibujar la interfaz, pero esta vez se saltea la pantalla de carga y muestra las tarjetas con los videojuegos.

## 4. Mocking (Datos Simulados)
Al querer rehacer el proyecto en React nos dimos cuenta que RAWG, la api que estabamos usando para obtener los datos de las tarjetas de los juegos, las reseñas y la calificaciones, estaba caída desde el 2 de noviembre, por ende para la entrega decidimos crear artificialmente informacion de juegos correspondientes a cada categoria para cargarlas en las tarjetas y poder probar todas las funcionalidades de la pagina sin depender de la api. 
Para poder hacer mas facil el cambio entre la api y los datos nuestros, se implementó una variable de entorno en el archivo `.env`.

*   El sistema lee la variable `VITE_USE_MOCK`.
*   Si el valor es `true`, en lugar de hacer un `fetch` a internet, la función devuelve una Promesa que resuelve un archivo `.json` local de forma inmediata.
*   Si es `false`, la aplicación ejecuta la petición real.

## 5. Preprocesamiento de Estilos
La interfaz utiliza Sass (SCSS) en lugar de CSS estándar. Esto permite el uso de variables para definir esquemas de colores de forma centralizada y anidamiento de selectores, lo que asocia visualmente el bloque de estilos con la estructura del HTML devuelto por el componente.

---

## Instrucciones de Instalación y Ejecución

1. **Clonar el repositorio:**
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd ProyectoReact-main
   ```

2. **Instalar las dependencias de Node:**
   ```bash
   npm install
   ```

3. **Configurar el entorno:**
   Crea un archivo llamado `.env` en la raíz del proyecto (Se puede copiar el contenido de `.env.example`).

   ```env
   VITE_USE_MOCK=true
   ```

4. **Levantar el entorno de desarrollo:**
   ```bash
   npm run dev
   ```
   El compilador de Vite iniciará un servidor local (por defecto en `http://localhost:5173`).