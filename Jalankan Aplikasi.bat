@echo off
title Greenhouse Finance Pro - Launcher
cd /d "%~dp0"
echo ============================================================
echo   GREENHOUSE FINANCE PRO
echo   Manajemen Keuangan ^& Operasional Greenhouse Melon
echo ============================================================
echo.

rem Cek apakah server sudah berjalan
curl -s -o nul http://localhost:3000/api/health
if %errorlevel%==0 (
  echo Server sudah berjalan. Membuka aplikasi di browser...
  start "" http://localhost:3000
  exit /b 0
)

echo [1/2] Memulai server, mohon tunggu...
start "Greenhouse Finance Pro Server" /min cmd /c "npm run dev"

set /a tries=0
:wait
set /a tries+=1
timeout /t 2 /nobreak >nul
curl -s -o nul http://localhost:3000/api/health
if %errorlevel%==0 goto open
if %tries% geq 30 goto failed
goto wait

:open
echo [2/2] Membuka aplikasi di browser...
start "" http://localhost:3000
echo.
echo Aplikasi berjalan di http://localhost:3000
echo Jendela ini bisa ditutup. Server tetap berjalan di jendela lain.
exit /b 0

:failed
echo.
echo [!] Server gagal dimulai. Coba jalankan "npm run dev" secara manual.
pause
