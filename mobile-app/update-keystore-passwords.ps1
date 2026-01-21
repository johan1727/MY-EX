# Script para actualizar las contraseñas del keystore en gradle.properties
# Uso: .\update-keystore-passwords.ps1

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Configurador de Contraseñas del Keystore" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Ruta al archivo gradle.properties
$gradlePropertiesPath = Join-Path $PSScriptRoot "android\gradle.properties"

# Verificar que el archivo existe
if (-not (Test-Path $gradlePropertiesPath)) {
    Write-Host "❌ ERROR: No se encontró el archivo gradle.properties" -ForegroundColor Red
    Write-Host "   Ruta esperada: $gradlePropertiesPath" -ForegroundColor Yellow
    exit 1
}

Write-Host "📁 Archivo encontrado: gradle.properties" -ForegroundColor Green
Write-Host ""
Write-Host "Necesitas obtener las contraseñas desde Expo:" -ForegroundColor Yellow
Write-Host "1. Ve a https://expo.dev" -ForegroundColor White
Write-Host "2. Selecciona tu proyecto: @jhonatanvillagomez27/my-ex-chat" -ForegroundColor White
Write-Host "3. Ve a Credentials → Android → Production" -ForegroundColor White
Write-Host "4. Busca el keystore con alias: 8be061d3916eca4c2dbc2aeb988120a1" -ForegroundColor White
Write-Host ""

# Solicitar Keystore Password
Write-Host "📝 Ingresa la información del keystore:" -ForegroundColor Cyan
Write-Host ""
$keystorePassword = Read-Host "Keystore Password (MYAPP_UPLOAD_STORE_PASSWORD)"

if ([string]::IsNullOrWhiteSpace($keystorePassword)) {
    Write-Host "❌ ERROR: La contraseña del keystore no puede estar vacía" -ForegroundColor Red
    exit 1
}

# Solicitar Key Password
$keyPassword = Read-Host "Key Password (MYAPP_UPLOAD_KEY_PASSWORD)"

if ([string]::IsNullOrWhiteSpace($keyPassword)) {
    Write-Host "❌ ERROR: La contraseña de la key no puede estar vacía" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔄 Actualizando gradle.properties..." -ForegroundColor Yellow

# Leer el contenido del archivo
$content = Get-Content $gradlePropertiesPath -Raw

# Reemplazar las contraseñas
$content = $content -replace "MYAPP_UPLOAD_STORE_PASSWORD=.*", "MYAPP_UPLOAD_STORE_PASSWORD=$keystorePassword"
$content = $content -replace "MYAPP_UPLOAD_KEY_PASSWORD=.*", "MYAPP_UPLOAD_KEY_PASSWORD=$keyPassword"

# Guardar el archivo
Set-Content -Path $gradlePropertiesPath -Value $content -NoNewline

Write-Host "✅ Contraseñas actualizadas correctamente" -ForegroundColor Green
Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  ¡Listo para generar el AAB!" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ejecuta ahora:" -ForegroundColor Yellow
Write-Host "  cd android" -ForegroundColor White
Write-Host "  .\gradlew bundleRelease" -ForegroundColor White
Write-Host ""
Write-Host "El AAB se generará en:" -ForegroundColor Yellow
Write-Host "  android\app\build\outputs\bundle\release\app-release.aab" -ForegroundColor White
Write-Host ""
