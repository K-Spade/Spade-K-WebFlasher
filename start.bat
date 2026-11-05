@echo off
chcp 65001 >nul
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel% equ 0 (
  py -3 server.py
) else (
  where python >nul 2>nul
  if %errorlevel% equ 0 (
    python server.py
  ) else (
    echo Instala Python 3 o publica la carpeta en un sitio HTTPS.
  )
)
pause
