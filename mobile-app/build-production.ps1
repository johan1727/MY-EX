#!/usr/bin/env pwsh
# Script para generar build de producción para Google Play
# Ubicación: D:\TODO\MY EX\my-ex-coach\mobile-app

Write-Host "🚀 Iniciando build de producción para Google Play..." -ForegroundColor Green

# Verificar que estamos en el directorio correcto
$projectRoot = "D:\TODO\MY EX\my-ex-coach\mobile-app"
if (Test-Path $projectRoot) {
    Set-Location $projectRoot
}
else {
    Write-Host "❌ Error: No se encontró el directorio del proyecto" -ForegroundColor Red
    exit 1
}

# Verificar que Hermes esté habilitado
$gradleProps = Get-Content "android\gradle.properties"
$hermesEnabled = $gradleProps | Select-String "hermesEnabled=true"

if (-not $hermesEnabled) {
    Write-Host "⚠️  ADVERTENCIA: hermesEnabled no está en true en gradle.properties" -ForegroundColor Yellow
    Write-Host "   Esto causará crashes. Actualizando automáticamente..." -ForegroundColor Yellow
    
    $gradleProps = $gradleProps -replace "hermesEnabled=false", "hermesEnabled=true"
    $gradleProps | Set-Content "android\gradle.properties"
    
    Write-Host "✅ hermesEnabled actualizado a true" -ForegroundColor Green
}

Write-Host "`n📋 Opciones de build:" -ForegroundColor Cyan
Write-Host "1. EAS Build (Recomendado - build en la nube)" -ForegroundColor White
Write-Host "2. Gradle Local (APK debug para testing)" -ForegroundColor White
Write-Host "3. Gradle Local (AAB release para Google Play)" -ForegroundColor White

$choice = Read-Host "`nSelecciona una opción (1-3)"

switch ($choice) {
    "1" {
        Write-Host "`n🌐 Iniciando EAS build para producción..." -ForegroundColor Green
        Write-Host "   Esto generará un AAB listo para subir a Google Play" -ForegroundColor Gray
        npx eas-cli build --platform android --profile production
    }
    "2" {
        Write-Host "`n🔨 Generando APK debug con Gradle..." -ForegroundColor Green
        Set-Location "android"
        .\gradlew clean
        .\gradlew assembleDebug
        
        $apkPath = "app\build\outputs\apk\debug\app-debug.apk"
        if (Test-Path $apkPath) {
            $apkInfo = Get-Item $apkPath
            Write-Host "`n✅ APK generado exitosamente:" -ForegroundColor Green
            Write-Host "   Ubicación: $(Resolve-Path $apkPath)" -ForegroundColor White
            Write-Host "   Tamaño: $([math]::Round($apkInfo.Length / 1MB, 2)) MB" -ForegroundColor White
        }
        Set-Location ..
    }
    "3" {
        Write-Host "`n🔨 Generando AAB release con Gradle..." -ForegroundColor Green
        Write-Host "   ⚠️  Asegúrate de tener el keystore configurado" -ForegroundColor Yellow
        Set-Location "android"
        .\gradlew clean
        .\gradlew bundleRelease
        
        $aabPath = "app\build\outputs\bundle\release\app-release.aab"
        if (Test-Path $aabPath) {
            $aabInfo = Get-Item $aabPath
            Write-Host "`n✅ AAB generado exitosamente:" -ForegroundColor Green
            Write-Host "   Ubicación: $(Resolve-Path $aabPath)" -ForegroundColor White
            Write-Host "   Tamaño: $([math]::Round($aabInfo.Length / 1MB, 2)) MB" -ForegroundColor White
            Write-Host "`n   📤 Listo para subir a Google Play Console" -ForegroundColor Cyan
        }
        Set-Location ..
    }
    default {
        Write-Host "❌ Opción inválida" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n✨ Proceso completado" -ForegroundColor Green
