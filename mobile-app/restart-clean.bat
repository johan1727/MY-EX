@echo off
echo ========================================
echo Limpiando cache de Expo y reiniciando
echo ========================================
echo.

cd /d "d:\TODO\MY EX\my-ex-coach\mobile-app"

echo [1/3] Deteniendo procesos de Node...
taskkill /F /IM node.exe /T 2>nul
timeout /t 2 /nobreak >nul

echo.
echo [2/3] Limpiando cache de Metro Bundler...
if exist .expo rmdir /s /q .expo
if exist node_modules\.cache rmdir /s /q node_modules\.cache

echo.
echo [3/3] Iniciando Expo con cache limpio...
echo.
echo ========================================
echo IMPORTANTE: Cuando veas "Metro waiting"
echo presiona 'W' para abrir en el navegador
echo ========================================
echo.

npx expo start --clear

pause
