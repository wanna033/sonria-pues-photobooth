# Sonría Pues Photobooth 📸

Cabina de fotos para eventos: fotos impresas, GIF animados, boomerangs y video mensajes,
con descarga por código QR desde el celular de los invitados.

Todo el programa está en esta carpeta, **incluido Node.js** (carpeta `node`), así que no hay que
instalar nada. Sólo necesita **Microsoft Edge** (viene con Windows 10 y 11) o Google Chrome.

**¿Otra computadora?** Copia la carpeta completa `Sonria PJs` (por ejemplo, en una USB) y abre
`Sonria Pues.exe`. Si copias también la carpeta `datos`, te llevas tus ajustes y tus fotos.

---

## Primeros pasos

La aplicación es **`Sonria Pues.exe`** (con el icono del diafragma). En el Escritorio y en el
menú Inicio hay dos accesos directos:

1. **Sonría Pues - Ajustes:** abre la cabina en una ventana con los ajustes, para preparar el evento.
   El PIN inicial es **`1234`** (cámbialo en *General*).
   - *Evento y marca:* nombre del evento, mensaje, colores y logotipo.
   - *Cámara:* elige tu cámara y resolución.
   - *Diseño:* plantillas, fondo, tipografía, filtros y stickers.
   - *Impresión y QR:* usa **Imprimir página de prueba** para revisar tu impresora.
2. **Sonría Pues:** abre la cabina a pantalla completa para el evento. La impresión sale directo,
   sin ventanas de diálogo.
3. **Para salir:** `Alt + F4`. Al cerrar la cabina se apaga todo solo (servidor y enlace por internet).

No aparecen ventanas negras: el servidor funciona escondido. Los archivos `Iniciar Sonria PJs.bat`
y `Configurar Sonria PJs.bat` siguen funcionando igual, por si los prefieres.

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
| **Código QR** | Los invitados escanean y descargan sus fotos, GIF o video desde el celular, con datos móviles o cualquier Wi-Fi. Con Cloudinary, el QR funciona **para siempre**. |
| **QR impreso en la foto** | Opcional: cada tira lleva un QR de ~2 cm para descargar las fotos días después. |
| **Galería del evento** | Un solo QR / enlace con TODAS las fotos del evento, para el cliente o en una esquina del inicio. |
| **Compartir** | En la página de descarga, botón para enviar la foto directo a WhatsApp, Instagram, etc. |
| **Pestaña Estado** | Revisión antes del evento: cámara, impresora (y sus errores: sin papel, atasco…), papel, QR por internet, fotos en la nube y disco. |
| **Contador de papel** | Descuenta una hoja por copia, avisa cuando queda poco y deja de ofrecer imprimir cuando se acaba. |
| **Exportar evento (ZIP)** | Un archivo ordenado (impresiones, GIF y boomerang, videos, fotos) para entregar al cliente. |
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
| Copias, prueba de impresión, papel, dirección del QR | Ajustes → Impresión y QR |
| Guardar fotos en internet (QR permanentes), QR impreso, galería del evento | Ajustes → Impresión y QR |
| Revisar que todo funcione, cargar papel, exportar el evento | Ajustes → **Estado** |
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

## QR con datos móviles o desde cualquier Wi-Fi (automático)

**No hay que configurar nada.** Al abrir la cabina se abre solo un enlace público y seguro
de Cloudflare (`https://…trycloudflare.com`, gratis y sin cuenta), y el código QR de cada
sesión usa ese enlace. Los invitados descargan sus fotos **con sus datos móviles o desde
cualquier Wi-Fi**. En la pantalla final el QR dice "(funciona con tus datos móviles)".

- Por ese enlace **sólo** se ven las fotos de cada sesión: los ajustes, la galería y la
  cabina quedan cerrados. Cada sesión tiene un código largo imposible de adivinar.
- La computadora de la cabina necesita internet (el Wi-Fi del lugar, un módem o los datos
  del celular compartidos). Si no hay, el QR usa solo el Wi-Fi del evento y el enlace se
  reabre en cuanto vuelve la conexión.
- El enlace cambia cada vez que abres el programa; los QR se generan en el momento, así que
  no importa. Las fotos se descargan de la computadora: deben estar encendida y conectada.
- **Se vigila solo:** cada 30 segundos la cabina comprueba desde internet que el enlace
  responda. Si Cloudflare lo da de baja o se cae, abre uno nuevo en unos 15 segundos, y
  **nunca pone en un QR un enlace sin comprobar** (mientras tanto usa el Wi-Fi del evento).
- Su estado se ve en *Ajustes → Estado* y en *Impresión y QR*, donde se puede apagar (al momento,
  sin reiniciar) o pedir un enlace nuevo con **🔄 Renovar enlace**.
- Usa el programa `herramientas\cloudflared.exe`. Si falta (por ejemplo, si descargaste el
  proyecto de GitHub), doble clic en **`Activar QR por internet.bat`** una sola vez.

## QR que funcionan siempre: fotos guardadas en internet (Cloudinary)

Con el enlace automático, las fotos se descargan de la computadora mientras está encendida.
Para que los QR sigan funcionando **después del evento, con la computadora apagada**, la
cabina sube cada sesión a **Cloudinary** (plan gratuito) y el QR abre tu página de descarga
en GitHub Pages con un **enlace fijo**.

Se configura una sola vez, en *Ajustes → Impresión y QR*:

1. Crea una cuenta gratis en [cloudinary.com](https://cloudinary.com) y copia tu **Cloud name**.
2. En *Settings → Upload → Upload presets*, crea un preset con **Signing Mode: Unsigned**
   (deja vacío "Folder") y copia su nombre.
3. Pega los dos datos en los ajustes, activa **"Guardar cada sesión en internet"** y pulsa
   **"Probar la conexión con la nube"**: sube una imagen de prueba, comprueba que se vea desde
   cualquier celular y te dice exactamente qué corregir si algo falla.
4. (Opcional, para la galería de todo el evento) En *Settings → Security → Restricted media
   types* desmarca **Resource list** y guarda.
5. En *Ajustes → Galería*, **"☁️ Guardar en internet las N sesiones anteriores"** sube también
   lo que ya tenías.

Cómo funciona:

- El QR sale **al instante**; la subida sigue en segundo plano. Si el invitado escanea antes de
  que termine, su celular muestra "Tus fotos se están subiendo…" y aparecen solas.
- **Sin internet en el evento no se pierde nada:** cada sesión queda en fila y se sube sola
  cuando vuelve la conexión (se revisa cada 15 segundos). Una sesión con problemas no detiene
  a las demás, y la del invitado que está esperando siempre va primero.
- Un boomerang muy pesado (más de 10 MB, el límite del plan gratis) se guarda como video y la
  página lo muestra igual.
- Si cambias de cuenta de Cloudinary, lo pendiente se sube a la cuenta nueva.
- Ninguno de los dos datos es una clave secreta. Las fotos quedan en internet: **cualquiera con
  el enlace de una sesión puede verla**, pero nadie puede ver la lista de todas (la galería del
  evento usa un código secreto propio de cada evento).
- Por defecto sólo se suben la tira, el GIF y el video (no las fotos sueltas), para que la
  espera sea corta y el código QR sencillo.

### QR impreso en la foto

Con las fotos en internet, activa **"Imprimir el código QR en la foto"**: cada tira o postal
lleva un QR pequeño (unos 2 cm) en la esquina que elijas. El enlace se reserva antes de
imprimir, así que funciona aunque la subida termine después.

### Galería de todo el evento

En *Ajustes → Galería* aparece el QR y el enlace con **todas** las fotos del evento, para
compartirlo con el cliente. También puedes mostrarlo en una esquina del inicio
(**"QR de la galería del evento en el inicio"**).

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

## Antes de cada evento

1. Abre *Ajustes → **Estado***: todo debe estar en ✅ (cámara, impresora, QR por internet, fotos
   en internet y espacio en disco).
2. Si llevas la cuenta del papel, escribe cuántas hojas cargaste y pulsa **🧻 Cargué papel**.
3. Imprime la **página de prueba** y escanea un QR con **datos móviles** (no con el Wi-Fi).

Al terminar, **📦 Exportar evento (ZIP)** arma un archivo con carpetas `impresiones`,
`gif-y-boomerang`, `videos` y `fotos-individuales` (queda en `datos\exportaciones`).

## Dónde quedan las fotos

```
Sonria PJs\datos\fotos\<nombre-del-evento>\<sesión>\
    recuerdo.jpg      ← la impresión
    foto-1.jpg …      ← cada foto en resolución completa
    animacion.gif     ← GIF (modo GIF, o también en modo Fotos)
    boomerang.gif / video.mp4
    miniatura.jpg     ← vista chica para la galería (uso interno)
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
- Pantalla verde / quitar el fondo.
- Control directo de cámaras réflex (disparo a resolución completa de la cámara).
