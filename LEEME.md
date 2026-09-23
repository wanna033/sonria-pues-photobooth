# Sonría PJs 📸

Cabina de fotos para eventos: fotos impresas, GIF animados, boomerangs y video mensajes,
con descarga por código QR desde el celular de los invitados.

Todo el programa está en esta carpeta, **incluido Node.js** (carpeta `node`), así que no hay que
instalar nada. Sólo necesita **Microsoft Edge** (viene con Windows 10 y 11) o Google Chrome.

**¿Otra computadora?** Copia la carpeta completa `Sonria PJs` (por ejemplo, en una USB) y abre
los mismos archivos `.bat`. Si copias también la carpeta `datos`, te llevas tus ajustes y tus fotos.

---

## Primeros pasos

1. **Configura el evento:** doble clic en **`Configurar Sonria PJs.bat`**.
   Se abre la cabina en una ventana con los ajustes. El PIN inicial es **`1234`** (cámbialo en *General*).
   - *Evento y marca:* nombre del evento, mensaje, colores y logotipo.
   - *Cámara:* elige tu cámara y resolución.
   - *Diseño:* plantillas, fondo, tipografía, filtros y stickers.
   - *Impresión y QR:* usa **Imprimir página de prueba** para revisar tu impresora.
2. **Abre la cabina para el evento:** doble clic en **`Iniciar Sonria PJs.bat`**.
   Se abre a pantalla completa y la impresión sale directo, sin ventanas de diálogo.
3. **Para salir:** `Alt + F4`.

> La primera vez, Windows preguntará si **Node.js** puede usar la red. Acepta **“Redes privadas”**:
> es necesario para que los invitados descarguen sus fotos con el QR.

## Imagen de la marca

La cabina viene con la identidad de **Sonría Pues Photobooth**:

- `public\marca\logo.png`: logotipo sin fondo, para fondos claros.
- `public\marca\logo-claro.png`: versión con "PHOTOBOOTH" en crema, para fondos oscuros. Se usa
  sola en el pie de las plantillas con degradado.
- `public\marca\icono.png`: el diafragma, como icono del programa.
- `public\marca\carga.mp4`: animación que se reproduce al abrir el programa y mientras se crea cada recuerdo.
- Colores: dorado `#D6A545`, azul marino `#184659`, fondo blanco cálido `#FFFDF8`.

Todo se puede cambiar en *Ajustes → Evento y marca*: estilo claro u oscuro, colores, logotipos,
mostrar u ocultar el nombre en texto y activar o desactivar la animación.

## Tus propios diseños (Photoshop, Canva, Illustrator)

1. Diseña la tira o postal completa: fondo, logos y textos. Donde van las fotos, deja
   **recuadros de un solo color** (por ejemplo rojo, verde y turquesa con los números 1, 2 y 3).
   También sirve un **PNG con huecos transparentes**: la foto se ve a través del hueco.
2. Exporta a **300 ppp** como PNG o JPG (en Photoshop: *Archivo › Exportar › Exportar como… › PNG*):
   - Tira 5×15 cm (2×6"): **600 × 1800 px**. Se imprimen dos tiras por hoja de 10×15 cm.
   - Postal 10×15 cm (4×6"): **1800 × 1200 px** (horizontal) o **1200 × 1800 px** (vertical).
3. En *Ajustes → Mis diseños* pulsa **＋ Subir un diseño**. La cabina encuentra sola los recuadros.
   Revísalos: se arrastran para moverlos, sus esquinas cambian el tamaño y las flechas del
   teclado los mueven de a 1 px. Con **👁 Vista previa** ves cómo queda con fotos.
4. **Guardar diseño**. Si dejaste marcado *Usar sólo este diseño en el evento*, es el único
   que verán los invitados.

Consejos: los recuadros no deben tocar la orilla de la imagen, y conviene que tengan la
misma proporción que la cámara (3:2 o 16:9) para que no se recorten caras.

## Lo que hace

| Función | Detalle |
|---|---|
| **Mis diseños** | Sube tu tira o postal hecha en Photoshop o Canva; la cabina detecta los recuadros y pone ahí las fotos. |
| **Modo Fotos** | 6 plantillas: tira clásica de 4, tira de 3 (2 tiras por hoja de 10×15 cm), postal, cuadrícula, una grande y tres, retrato. |
| **Modo GIF** | Varias fotos animadas en un GIF que se repite. |
| **Modo Boomerang** | Graba un par de segundos y los reproduce hacia adelante y hacia atrás. |
| **Modo Video** | Video mensaje con audio (MP4, compatible con iPhone y Android). |
| **Filtros** | Natural, blanco y negro, glamour, sepia, vintage, cálido, frío, vívido y piel suave, con vista previa en vivo. |
| **Stickers** | Emojis y frases personalizadas que se arrastran, giran y cambian de tamaño (también con dos dedos). |
| **Repetir fotos** | El invitado puede repetir una foto o todas antes de imprimir. |
| **Impresión** | Hasta N copias por sesión, en la impresora predeterminada de Windows (10×15 cm / 4×6"). |
| **Código QR** | Los invitados escanean y descargan sus fotos, GIF o video desde el celular (misma red Wi-Fi). |
| **Tu marca** | Nombre, frase, 3 colores, logotipo, fondo e imagen de fondo personalizados. |
| **Asistente** | Cuenta regresiva con pitidos, obturador, destello y voz en español. |
| **Pantalla de inicio** | Muestra un collage con las últimas fotos del evento. |
| **Galería y estadísticas** | Sesiones e impresiones por evento (o de todos los eventos). Toca una sesión para verla en grande con **su código QR** y que el invitado la descargue después; también se puede reimprimir o quitar. |
| **Seguridad** | Los ajustes piden PIN; desde la red sólo se pueden ver las sesiones propias (no los ajustes ni la galería). |

## Dónde se cambia cada cosa

Casi todo se cambia desde los **Ajustes**, sin tocar el código:

| Quiero cambiar… | Dónde |
|---|---|
| Nombre del evento, mensaje de la impresión y fecha | Ajustes → Evento y marca |
| Logotipo, colores, estilo claro u oscuro, animación de carga | Ajustes → Evento y marca |
| **Cualquier texto que ven los invitados** (botones, títulos, avisos, voz) | Ajustes → **Textos** |
| Nombres y descripciones de los modos (Fotos, GIF, Boomerang, Video) | Ajustes → Textos |
| Texto de la marca de agua de GIF y video, o quitarla | Ajustes → Textos y Ajustes → Diseño |
| Qué modos ve el invitado y sus tiempos | Ajustes → Modos |
| Cámara, cuenta regresiva, sonidos, voz, repetir fotos | Ajustes → Cámara |
| Plantillas activas, fondo, tipografía, filtros | Ajustes → Diseño |
| Frases y **emojis** de los stickers | Ajustes → Diseño |
| Tus tiras y postales, y el tamaño de la hoja impresa | Ajustes → Mis diseños |
| Copias, prueba de impresión, dirección del QR | Ajustes → Impresión y QR |
| PIN, tiempos de inactividad, fotos recientes en el inicio | Ajustes → General |

En los textos, lo que va entre llaves se reemplaza solo: `{n}`, `{total}`, `{segundos}`,
`{ancho}`, `{alto}`, `{evento}` y `{marca}`. Si borras un texto, vuelve el original.

Y si quieres meterte en el código:

| Quiero cambiar… | Archivo |
|---|---|
| Textos de fábrica | `public\js\textos.js` |
| Plantillas integradas (medidas de los recuadros) | `public\js\plantillas.js` |
| Filtros de color | `public\js\filtros.js` |
| Emojis de fábrica de los stickers | `public\js\stickers.js` |
| Pasos de la sesión (orden de las pantallas) | `public\js\app.js` |
| Colores y estilos de las pantallas | `public\css\app.css` |
| Valores iniciales de toda la configuración | `config.default.json` |

## Que el QR funcione con datos móviles

Por defecto el código QR sólo abre desde el Wi-Fi del evento. Para que funcione desde
**cualquier red o con datos móviles**, la cabina sube cada sesión a **Cloudinary** (plan
gratuito) y el QR abre tu página de descarga publicada en GitHub Pages.

Se configura una sola vez, en *Ajustes → Impresión y QR*:

1. Crea una cuenta gratis en [cloudinary.com](https://cloudinary.com) y copia tu **Cloud name**.
2. En *Settings → Upload → Upload presets*, crea un preset con **Signing Mode: Unsigned** y copia su nombre.
3. Pega los dos datos en los ajustes, escribe la dirección de tu página de descarga
   (por ejemplo `https://tuusuario.github.io/sonria-pues-photobooth/g`) y activa
   **"Subir cada sesión a internet"**.
4. Pulsa **"Probar la conexión con la nube"**.

Ninguno de esos dos datos es una clave secreta. Ten en cuenta dos cosas:

- Las fotos quedan alojadas en internet y **cualquiera con el enlace puede verlas**.
- Si en el evento no hay internet, la subida falla sin romper nada: el QR vuelve
  automáticamente a la dirección de la red local.

Por defecto sólo se suben la tira, el GIF y el video (no las fotos sueltas), para que la
espera sea corta y el código QR sencillo.

## La versión web (misma cabina en el navegador)

El mismo código funciona publicado como página web, por ejemplo en GitHub Pages. Ahí:

- Sí funcionan: la cámara, los modos, filtros, stickers, plantillas, tus diseños y la
  descarga del recuerdo; y el código QR si configuraste la nube.
- No funcionan: la impresión desde la cabina, la galería y las fotos guardadas en disco.
  Los ajustes y los diseños se guardan **en ese mismo dispositivo**, no en la computadora.

La cabina detecta sola si hay servidor detrás; no hay que configurar nada.

## Atajos

- **Ajustes:** engrane casi invisible arriba a la derecha del inicio, o `Ctrl + Shift + A`.
- **Botón o pedal USB:** cualquier dispositivo que envíe `Espacio` o `Enter` comienza la sesión.
- **Salir del kiosco:** `Alt + F4`.

## Impresora

**La hoja impresa mide exactamente lo que mide la plantilla**, sin bandas blancas, recortes ni
deformación, y la imagen llena toda la hoja:

- Plantillas integradas: 10×15 cm (4×6").
- Tus diseños: la medida que indiques en *Mis diseños → Tamaño de la hoja impresa*. Ancho y alto van
  enlazados para respetar la forma del diseño.
- La pantalla final muestra el tamaño ("Hoja de 10.2 × 15.2 cm").

Pon tu impresora como **predeterminada** en Windows, **sin bordes**, y con **el mismo tamaño de papel
que la plantilla**. Las impresoras de fotos (DNP, Citizen, etc.) sólo usan tamaños estándar: diseña a
600×1800 px (tira 2×6"), 1200×1800 px (4×6") o 1500×2100 px (5×7") para que coincidan.
Las tiras de 5×15 cm salen dos por hoja; muchas impresoras de sublimación (DNP, Citizen, Mitsubishi)
las cortan solas con la opción de corte a 2".

## Qué cámara usa

En modo **Automática** (*Ajustes → Cámara*) usa la cámara conectada por USB o tu cámara profesional,
y si no hay ninguna, **la cámara de la portátil**. Si conectas o desconectas una cámara, cambia sola al
volver a la pantalla de inicio. Las cámaras virtuales (OBS, 3uAirPlayer, etc.) se ignoran.
En la misma pestaña se ve cuál está en uso.

## Cámara profesional

Canon (*EOS Webcam Utility*), Nikon (*Webcam Utility*), Sony (*Imaging Edge Webcam*) y Fujifilm
(*X Webcam*) convierten tu cámara en webcam. Instala la utilidad, conecta por USB y elígela en
*Ajustes → Cámara*. Sin cámara, la cabina usa una **cámara de demostración** para que puedas probarla.

## Dónde quedan las fotos

```
Sonria PJs\datos\fotos\<nombre-del-evento>\<sesión>\
    recuerdo.jpg      ← la impresión
    foto-1.jpg …      ← cada foto en resolución completa
    animacion.gif     ← GIF (modo GIF, o también en modo Fotos)
    boomerang.gif / video.mp4
```

Lo que quitas desde la galería se mueve a `datos\papelera` (no se borra).

## Archivos del programa

| Archivo | Para qué sirve |
|---|---|
| `Iniciar Sonria PJs.bat` | Abre la cabina a pantalla completa para el evento. |
| `Configurar Sonria PJs.bat` | Abre la cabina en una ventana, con los ajustes. |
| `node\node.exe` | Node.js incluido (licencia en `node\LICENCIA-NODEJS.txt`). |
| `datos\` | Tus ajustes, logotipo, diseños (`datos\disenos`), fotos de cada evento y papelera. |
| `public\js\disenos.js` | "Mis diseños": detección automática de recuadros y editor visual. |
| `server.js` | Servidor local: guarda las sesiones y publica la página de descarga del QR. |
| `config.default.json` | Valores iniciales. Tus ajustes se guardan en `datos\config.json`. |
| `public\index.html`, `public\css\app.css` | Pantallas y estilos de la cabina. |
| `public\js\app.js` | Flujo de la sesión (inicio → modo → diseño → filtro → fotos → stickers → final). |
| `public\js\plantillas.js` | Plantillas de impresión (medidas en píxeles a 300 ppp). Aquí puedes agregar las tuyas. |
| `public\js\gif.js`, `public\js\qr.js` | Generadores propios de GIF animado y códigos QR. |
| `public\js\camara.js`, `stickers.js`, `ajustes.js`, `sonidos.js`, `filtros.js` | Cámara, stickers, panel de ajustes, sonidos y filtros. |

## Ideas para después

- Envío por correo o WhatsApp (requiere internet y una cuenta de un servicio de envío).
- Galería en línea para compartir fuera del Wi-Fi del evento.
- Pantalla verde / quitar el fondo.
- Control directo de cámaras réflex (disparo a resolución completa de la cámara).
