@echo off
setlocal
title Ofertare - pornire
cd /d "%~dp0"

echo Ofertare - pornire
echo.

rem 1. PostgreSQL trebuie sa ruleze (serviciul postgresql-x64-17)
sc query postgresql-x64-17 | findstr /C:"RUNNING" >nul
if errorlevel 1 (
  echo Serviciul PostgreSQL "postgresql-x64-17" NU ruleaza.
  echo Porneste-l din aplicatia "Servicii" ^(services.msc^) - click dreapta, Start -
  echo sau, intr-un PowerShell ca Administrator:  Start-Service postgresql-x64-17
  echo Apoi ruleaza din nou pornire.cmd.
  echo.
  pause
  exit /b 1
)
echo PostgreSQL ruleaza.

rem 2. serverul (portul 4000) - nu se porneste de doua ori
netstat -ano | findstr /R /C:":4000 .*LISTENING" >nul
if errorlevel 1 (
  start "Ofertare - server" /D "%~dp0server" cmd /k npm run dev
  echo Serverul porneste in fereastra "Ofertare - server".
) else (
  echo Serverul ruleaza deja pe portul 4000.
)

rem 3. interfata (portul 5173)
netstat -ano | findstr /R /C:":5173 .*LISTENING" >nul
if errorlevel 1 (
  start "Ofertare - interfata" /D "%~dp0web" cmd /k npm run dev
  echo Interfata porneste in fereastra "Ofertare - interfata".
) else (
  echo Interfata ruleaza deja pe portul 5173.
)

rem 4. browserul
echo Se deschide browserul in cateva secunde...
timeout /t 6 /nobreak >nul
start "" http://localhost:5173

echo.
echo Gata. Ferestrele "Ofertare - server" si "Ofertare - interfata" raman deschise;
echo inchiderea lor opreste aplicatia. Aceasta fereastra se poate inchide.
timeout /t 5 >nul
endlocal
exit /b 0
