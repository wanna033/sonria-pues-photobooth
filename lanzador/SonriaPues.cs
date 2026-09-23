// Sonría Pues — aplicación para Windows.
//
// Abre la cabina como un programa normal, sin ventanas negras:
//   1. arranca el servidor escondido (node\node.exe server.js), si no estaba abierto;
//   2. abre la cabina en Edge (pantalla completa) o, con --configurar, en una ventana con los ajustes;
//   3. cuando se cierra la cabina, apaga el servidor y el enlace por internet.
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

        if (!File.Exists(Path.Combine(carpeta, "server.js")))
        {
            Avisar("No encuentro los archivos de la cabina.\n\nDeja \"Sonria Pues.exe\" dentro de la carpeta del programa (junto a server.js).");
            return 1;
        }

        // 1. servidor escondido (si ya estaba abierto, se usa ese)
        Process servidor = null;
        if (!ServidorResponde())
        {
            string node = Path.Combine(carpeta, @"node\node.exe");
            if (!File.Exists(node)) node = "node";
            try
            {
                servidor = Process.Start(new ProcessStartInfo(node, "server.js")
                {
                    WorkingDirectory = carpeta,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    WindowStyle = ProcessWindowStyle.Hidden,
                });
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

        // 3. esperar a que se cierre la cabina y apagar lo que abrimos
        while (CabinaAbierta(perfil)) Thread.Sleep(2000);
        Apagar(servidor);
        return 0;
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
