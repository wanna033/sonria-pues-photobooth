@echo off
rem ================================================================
rem  Compila "Sonria Pues.exe" con el compilador de C# que ya trae
rem  Windows (.NET Framework 4). Solo hace falta si cambias SonriaPues.cs.
rem ================================================================
cd /d "%~dp0"
set "CSC=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if not exist "%CSC%" set "CSC=%WINDIR%\Microsoft.NET\Framework\v4.0.30319\csc.exe"
"%CSC%" -nologo -target:winexe -optimize+ -win32icon:sonria.ico ^
  -r:System.Windows.Forms.dll -r:System.Management.dll ^
  -out:"..\Sonria Pues.exe" SonriaPues.cs
if errorlevel 1 (
  echo.
  echo   No se pudo compilar.
  pause
  exit /b 1
)
echo   Listo: Sonria Pues.exe
