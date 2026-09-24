// Sonría Pues — aplicación para Windows.
//
// Abre la cabina como un programa normal, sin ventanas negras:
//   1. arranca el servidor escondido (node\node.exe server.js), si no estaba abierto;
//   2. abre la cabina en Edge (pantalla completa) o, con --configurar, en una ventana con los ajustes;
//   3. mientras la cabina está abierta, vigila el servidor: si se cierra o se traba, lo vuelve a abrir;
//   4. cuando se cierra la cabina, apaga el servidor y el enlace por internet.
//
// Con --presentacion abre la presentación en vivo (para una TV) y termina.
//
// Se compila con "compilar.bat" (usa el compilador de C# que ya trae Windows).

using System;
using System.Diagnostics;
using System.IO;
using System.Management;
using System.Net;
using System.Threading;
using System.Windows.Forms;

static class SonriaPues
{
    // la cabina se abre en "localhost" (ahí guarda Edge los permisos de la cámara)...
    const string Direccion = "http://localhost:5050";
    // ...pero para hablar con el servidor se usa 127.0.0.1: con "localhost" Windows prueba
    // primero IPv6 (::1), el servidor escucha en IPv4 y la consulta se queda esperando
    const string DireccionServidor = "http://127.0.0.1:5050";
    const string Titulo = "Sonría Pues";

    [STAThread]
    static int Main(string[] argumentos)
    {
        string carpeta = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');
        bool configurar = Array.Exists(argumentos, a => a.Equals("--configurar", StringComparison.OrdinalIgnoreCase));
        bool presentacion = Array.Exists(argumentos, a => a.Equals("--presentacion", StringComparison.OrdinalIgnoreCase));

        if (!File.Exists(Path.Combine(carpeta, "server.js")))
        {
            Avisar("No encuentro los archivos de la cabina.\n\nDeja \"Sonria Pues.exe\" dentro de la carpeta del programa (junto a server.js).");
            return 1;
        }

        // presentación en vivo: necesita la cabina abierta; usa su propio perfil del navegador.
        // (El perfil vive dentro de datos\navegador*, así que mientras la presentación esté
        // abierta el servidor no se apaga aunque se cierre la cabina.)
        if (presentacion)
        {
            if (!ServidorResponde())
            {
                Avisar("Abre primero la cabina (Sonría Pues) y después la presentación.");
                return 1;
            }
            string nav = BuscarNavegador();
            if (nav == null)
            {
                Avisar("No encontré Microsoft Edge ni Google Chrome. Instala uno de los dos.");
                return 1;
            }
            string perfilPresentacion = Path.Combine(carpeta, @"datos\navegador-presentacion");
            Process.Start(new ProcessStartInfo(nav,
                "--app=\"" + Direccion + "/presentacion.html\" --window-size=1280,720 --autoplay-policy=no-user-gesture-required" +
                " --user-data-dir=\"" + perfilPresentacion + "\" --no-first-run --disable-features=Translate") { UseShellExecute = false });
            return 0;
        }

        // 1. servidor escondido (si ya estaba abierto, se usa ese)
        Process servidor = null;
        if (!ServidorResponde())
        {
            try
            {
                servidor = IniciarServidor(carpeta);
            }
            catch (Exception error)
            {
                Avisar("No se pudo iniciar el servidor de la cabina.\n\n" + error.Message +
                       "\n\nSi descargaste el programa de GitHub, instala Node.js desde https://nodejs.org");
                return 1;
            }
            for (int i = 0; i < 60 && !ServidorResponde(); i++) Thread.Sleep(500);
            if (!ServidorResponde())
            {
                Avisar("El servidor de la cabina no respondió. Cierra la aplicación e intenta de nuevo.");
                try { servidor.Kill(); } catch { }
                return 1;
            }
        }

        // 2. la cabina en Edge (o Chrome), con su propio perfil
        string navegador = BuscarNavegador();
        if (navegador == null)
        {
            Avisar("No encontré Microsoft Edge ni Google Chrome. Instala uno de los dos.");
            Apagar(servidor);
            return 1;
        }

        string perfil = Path.Combine(carpeta, @"datos\navegador");
        string comunes =
            " --use-fake-ui-for-media-stream --autoplay-policy=no-user-gesture-required" +
            " --user-data-dir=\"" + perfil + "\" --no-first-run --disable-features=Translate";
        string opciones = configurar
            ? "--app=\"" + Direccion + "/?ajustes\" --window-size=1400,900" + comunes
            : "--kiosk \"" + Direccion + "\" --edge-kiosk-type=fullscreen --kiosk-printing" +
              " --overscroll-history-navigation=0 --disable-pinch" + comunes;

        // se comprueba que la ventana aparezca; si Edge no la abre (por ejemplo, porque una
        // ventana anterior se estaba cerrando), se intenta otra vez
        bool abierta = false;
        for (int intento = 0; intento < 3 && !abierta; intento++)
        {
            try
            {
                Process.Start(new ProcessStartInfo(navegador, opciones) { UseShellExecute = false });
            }
            catch (Exception error)
            {
                Avisar("No se pudo abrir la cabina.\n\n" + error.Message);
                Apagar(servidor);
                return 1;
            }
            for (int i = 0; i < 20 && !abierta; i++)
            {
                Thread.Sleep(500);
                abierta = CabinaAbierta(perfil);
            }
        }
        if (!abierta)
        {
            Avisar("La ventana de la cabina no se abrió. Cierra Edge por completo e intenta de nuevo.");
            Apagar(servidor);
            return 1;
        }

        // 3. esperar a que se cierre la cabina, vigilando que el servidor siga vivo
        int fallos = 0;
        while (CabinaAbierta(perfil))
        {
            Thread.Sleep(2000);
            if (ServidorResponde())
            {
                fallos = 0;
                continue;
            }
            // tres revisiones seguidas sin respuesta (unos 10 s): se vuelve a abrir
            if (++fallos < 3) continue;
            fallos = 0;
            try
            {
                if (servidor != null && !servidor.HasExited) servidor.Kill();
            }
            catch { }
            try
            {
                servidor = IniciarServidor(carpeta);
            }
            catch { }
        }

        // 4. apagar lo que abrimos
        Apagar(servidor);
        return 0;
    }

    static Process IniciarServidor(string carpeta)
    {
        string node = Path.Combine(carpeta, @"node\node.exe");
        if (!File.Exists(node)) node = "node";
        return Process.Start(new ProcessStartInfo(node, "server.js")
        {
            WorkingDirectory = carpeta,
            UseShellExecute = false,
            CreateNoWindow = true,
            WindowStyle = ProcessWindowStyle.Hidden,
        });
    }

    static bool ServidorResponde()
    {
        try
        {
            var peticion = (HttpWebRequest)WebRequest.Create(DireccionServidor + "/api/red");
            peticion.Proxy = null;
            peticion.Timeout = 1500;
            using (var respuesta = (HttpWebResponse)peticion.GetResponse())
                return respuesta.StatusCode == HttpStatusCode.OK;
        }
        catch
        {
            return false;
        }
    }

    /**
     * Apaga el servidor y el enlace por internet cuando ya no queda ninguna
     * ventana de la cabina abierta (aunque el servidor lo haya abierto un .bat).
     */
    static void Apagar(Process servidor)
    {
        try
        {
            var peticion = (HttpWebRequest)WebRequest.Create(DireccionServidor + "/api/apagar");
            peticion.Proxy = null;
            peticion.Method = "POST";
            peticion.ContentLength = 0;
            peticion.Timeout = 3000;
            using (peticion.GetResponse()) { }
        }
        catch { }
        if (servidor == null) return;
        try
        {
            if (!servidor.WaitForExit(5000)) servidor.Kill();
        }
        catch { }
    }

    /** ¿Sigue abierta alguna ventana del navegador de la cabina (su perfil propio)? */
    static bool CabinaAbierta(string perfil)
    {
        try
        {
            string consulta = "SELECT CommandLine FROM Win32_Process WHERE Name = 'msedge.exe' OR Name = 'chrome.exe'";
            using (var buscador = new ManagementObjectSearcher(consulta))
            {
                foreach (ManagementObject proceso in buscador.Get())
                {
                    string linea = proceso["CommandLine"] as string;
                    if (linea != null && linea.IndexOf(perfil, StringComparison.OrdinalIgnoreCase) >= 0) return true;
                }
            }
            return false;
        }
        catch
        {
            return true; // si no se puede consultar, mejor no apagar nada
        }
    }

    static string BuscarNavegador()
    {
        string[] candidatos =
        {
            Environment.ExpandEnvironmentVariables(@"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
            Environment.ExpandEnvironmentVariables(@"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
            Environment.ExpandEnvironmentVariables(@"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
            Environment.ExpandEnvironmentVariables(@"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
            Environment.ExpandEnvironmentVariables(@"%LocalAppData%\Google\Chrome\Application\chrome.exe"),
        };
        foreach (string ruta in candidatos)
            if (File.Exists(ruta)) return ruta;
        return null;
    }

    static void Avisar(string mensaje)
    {
        MessageBox.Show(mensaje, Titulo, MessageBoxButtons.OK, MessageBoxIcon.Warning);
    }
}
