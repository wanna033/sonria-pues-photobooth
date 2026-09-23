@echo off
rem ================================================================
rem  Sonria PJs - abre la cabina en una ventana normal con los ajustes
rem  (util para preparar el evento y elegir la impresora)
rem ================================================================
title Sonria PJs - Configurar
cd /d "%~dp0"

rem Usa el Node.js incluido en la carpeta "node"; si no esta, el instalado en Windows
set "NODE=%~dp0node\node.exe"
if exist "%NODE%" goto hay_node
set "NODE=node"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   No se encontro Node.js.
  echo   Copia la carpeta completa de Sonria PJs o instala Node.js desde https://nodejs.org
  echo.
  pause
  exit /b 1
)
:hay_node

start "Sonria PJs - servidor (no cerrar)" /min "%NODE%" server.js

set /a intentos=0
:esperar
ping -n 2 127.0.0.1 >nul
curl -s -f -o nul http://localhost:5050/api/red
if not errorlevel 1 goto listo
set /a intentos+=1
if %intentos% lss 15 goto esperar
echo El servidor no respondio. Revisa la ventana "Sonria PJs - servidor".
pause
exit /b 1

:listo
set "NAVEGADOR=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%NAVEGADOR%" set "NAVEGADOR=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not exist "%NAVEGADOR%" set "NAVEGADOR=%ProgramFiles%\Google\Chrome\Application\chrome.exe"

start "" "%NAVEGADOR%" ^
  --app="http://localhost:5050/?ajustes" ^
  --window-size=1400,900 ^
  --use-fake-ui-for-media-stream ^
  --autoplay-policy=no-user-gesture-required ^
  --user-data-dir="%~dp0datos\navegador" ^
  --no-first-run ^
  --disable-features=Translate
exit /b 0
