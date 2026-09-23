@echo off
rem ================================================================
rem  Sonria PJs - descarga el programa oficial de Cloudflare (gratis,
rem  sin cuenta) para que el codigo QR funcione con datos moviles o
rem  desde cualquier Wi-Fi. Solo hace falta una vez.
rem ================================================================
title Sonria PJs - Activar QR por internet
cd /d "%~dp0"

if exist "herramientas\cloudflared.exe" (
  echo.
  echo   Ya esta instalado. El QR por internet se activa solo al abrir la cabina.
  echo.
  pause
  exit /b 0
)

if not exist "herramientas" mkdir "herramientas"
echo.
echo   Descargando cloudflared desde la pagina oficial de Cloudflare en GitHub...
echo   (unos 50 MB, puede tardar un par de minutos)
echo.
curl -L --fail -o "herramientas\cloudflared.exe" "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
if errorlevel 1 (
  echo.
  echo   No se pudo descargar. Revisa tu conexion a internet e intenta de nuevo.
  if exist "herramientas\cloudflared.exe" del "herramientas\cloudflared.exe"
  echo.
  pause
  exit /b 1
)

echo.
echo   Listo. Cierra la cabina si estaba abierta y vuelve a abrirla:
echo   el codigo QR funcionara con datos moviles y desde cualquier Wi-Fi.
echo.
pause
exit /b 0
