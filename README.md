# Tandil Tech Week

Sitio estático en español con modo oscuro, videos locales, animaciones GSAP ScrollTrigger, sponsors en movimiento, detalles de eventos y un minijuego de conexión de cables para acceder a la inscripción.

## Abrir el sitio

Desde esta carpeta:

```sh
python3 -m http.server 8080
```

Abrí **http://localhost:8080**. No requiere Node ni compilación. Para publicarlo, subí esta carpeta completa a un hosting estático.

## Contenido

- `index.html`: página principal, inscripción y detalles de eventos.
- `styles.css`: diseño responsive, temas y estados de interacción.
- `app.js`: navegación por hash, ScrollTrigger, videos, minijuego y formulario.
- `laptop-transition.js`: transición 3D con el modelo local `laptop.glb`, Three.js y ScrollTrigger. Abre la bisagra y proyecta la sección real de próximos eventos sobre la pantalla; el zoom termina en el contenido interactivo. Las dependencias están en `assets/vendor/three/`.
- `assets/`: fuentes, posters, ícono y GSAP 3.14.2 con ScrollTrigger, incluidos localmente.
- Los dos MP4 originales se usan directamente desde la raíz.
- `distrito_avellaneda.jpg` aparece en el panel de Startup Day. Los detalles de los eventos muestran `hackaton_day_click.png` y `distrito_avellaneda_click.jpg` a todo el ancho, con recorte proporcional para llenar el encabezado sin franjas laterales.

## Inscripciones

El formulario es una **demostración local**, indicada también en la interfaz. Guarda los datos en `localStorage` bajo `ttw-registration`, permite editarlos y los recupera al volver. No envía datos ni confirma plazas. Para recibir inscripciones reales, reemplazá ese guardado en el evento `submit` de `app.js` por una llamada al backend elegido.

Después de cada guardado se reinician los cuatro cables y los seis puertos. «Nueva inscripción» abre otra partida y limpia el formulario; editar los datos también requiere completar nuevamente el juego. Volver a inscribirse desde la portada o desde un evento inicia el mismo recorrido.

## Sponsors

Los logos de Geonosis, Rotonda, Fardo, Payoneer, The Red Guild, TDL 2050 y Bakken están recreados con trazados SVG en `assets/sponsors/`, a partir de las imágenes de `logos_sponsors/`. No contienen imágenes rasterizadas ni dependen de fuentes. Las partes monocromas usan `currentColor` para adaptarse al modo oscuro y los colores de marca se conservan. Novum mantiene su tratamiento tipográfico original. La copia para la animación se genera automáticamente.

Siete sponsors enlazan a sus sitios; el destino de Bakken queda pendiente de confirmación. Los enlaces del listado original son accesibles por teclado y la cinta se detiene al enfocarlos. El pie de página incluye Instagram y X de Tandil Tech Week.

## Interacciones

- Entre los eventos y la invitación final, `#speakers` muestra nueve colaboradores en un carrusel con flechas, desplazamiento táctil y controles de teclado (flechas, Home y End). Los retratos WebP de `assets/speakers/` se recortaron de las piezas originales en `speakers/`; los nombres y cargos se presentan como texto accesible y se adaptan al tema claro u oscuro.

- Los eventos se expanden con mouse o foco de teclado; en móvil se apilan y se abren al tocar.
- El minijuego admite arrastrar, seleccionar cable y tocar puerto, o usar Tab y Enter/Espacio. Cualquier cable entra en cualquier puerto libre.
- El modo oscuro se conserva entre visitas.
- Los videos empiezan sin sonido y tienen controles. Se pausan fuera de pantalla.
- Se respeta la preferencia de movimiento reducido y la cinta de sponsors se puede pausar.
- La laptop sigue el scroll en ambos sentidos. «Ir a los eventos» permite saltar la transición. Si se prefiere movimiento reducido, falla la carga del modelo o WebGL no está disponible, se muestra directamente la sección de próximos eventos.
- La información de cada evento se abre en un diálogo accesible, con cierre mediante Escape.
# Tandil-Tech-Week
