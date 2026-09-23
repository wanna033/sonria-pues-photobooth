# Sonría Pues Photobooth 📸

Cabina de fotos para eventos: **tiras impresas, GIF, boomerang y video**, con descarga por
**código QR** y diseños propios hechos en Photoshop o Canva.

Funciona de dos maneras con el mismo código:

| | Para PC (Windows) | En el navegador |
|---|---|---|
| Fotos, GIF, boomerang y video | ✅ | ✅ |
| Filtros, stickers y diseños propios | ✅ | ✅ |
| Impresión a la medida exacta del diseño | ✅ | ❌ |
| Galería y fotos guardadas en la computadora | ✅ | ❌ (se descargan en el dispositivo) |
| Código QR con datos móviles o cualquier Wi-Fi (automático) | ✅ | ❌ |
| Código QR subiendo las fotos a la nube (opcional) | ✅ | ✅ |

👉 **Probar la cabina en el navegador:** <https://wanna033.github.io/sonria-pues-photobooth/public/>

---

## Usarla en la computadora (Windows)

1. Instala [Node.js](https://nodejs.org) (versión LTS) y descarga este repositorio.
2. Doble clic en **`Activar QR por internet.bat`** (una sola vez).
3. Abre **`Sonria Pues.exe`**: la cabina a pantalla completa, con impresión directa.
   Con `Sonria Pues.exe --configurar` se abre en una ventana con los ajustes (PIN inicial `1234`).
   Para salir, `Alt + F4`; al cerrar se apaga todo solo.

`Sonria Pues.exe` es un lanzador pequeño; su código está en `lanzador/SonriaPues.cs` y se
compila con `lanzador/compilar.bat`. Al descargarlo de internet, Windows puede mostrar un aviso
de SmartScreen porque no está firmado: *Más información → Ejecutar de todas formas*.

Todo lo demás (textos, colores, plantillas, tiempos, impresión) se cambia desde los ajustes,
sin tocar el código. Las instrucciones completas están en [LEEME.md](LEEME.md).

## QR con datos móviles o desde cualquier Wi-Fi

La cabina abre sola un enlace público y seguro de Cloudflare (`trycloudflare.com`, gratis
y sin cuenta) y el QR de cada sesión lo usa. Por ese enlace **sólo** se ven las fotos de
cada sesión; los ajustes y la galería quedan cerrados.

La primera vez, doble clic en **`Activar QR por internet.bat`** para descargar el programa
oficial de Cloudflare. Sin internet, el QR vuelve solo a la dirección de la red local.

Opcional: para que los enlaces sigan funcionando con la computadora apagada, la cabina
puede subir cada sesión a [Cloudinary](https://cloudinary.com) (plan gratuito) y el QR abre
la página `g/` de este mismo sitio. Se configura en *Ajustes → Impresión y QR*.

## Qué hay en cada carpeta

| Carpeta / archivo | Para qué sirve |
|---|---|
| `public/` | La cabina: pantallas, estilos y toda la lógica. Sirve igual en PC y en la web. |
| `public/js/` | Módulos: `app.js` (flujo), `plantillas.js`, `disenos.js`, `camara.js`, `gif.js`, `qr.js`, `nube.js`, `textos.js`, `web.js`. |
| `public/marca/` | Logotipo, icono y animación de la marca. |
| `g/` | Página de descarga que abre el código QR. |
| `server.js` | Servidor local (sólo versión PC): guarda las sesiones y publica la galería. |
| `config.default.json` | Valores iniciales de toda la configuración. |
| `datos/` | Fotos, ajustes y diseños del usuario. **No se sube al repositorio.** |

## Hecho sin dependencias

Todo es código propio y sin librerías externas: el codificador de **códigos QR**, el de
**GIF animado**, el motor de plantillas, la detección automática de recuadros en los diseños
y el servidor. Sólo necesita Node.js y un navegador basado en Chromium.

## Licencia

© 2026 Sonría Pues Photobooth. Todos los derechos reservados.
Node.js se distribuye con su propia licencia MIT.
